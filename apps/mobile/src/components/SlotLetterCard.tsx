import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { soundManager } from '../services/sound';
import LogoTape from '../../assets/logo_tape.svg';

const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

// Velocidades de cada paso: empieza rápido, va frenando
const STEPS_MS = [45, 48, 52, 58, 66, 78, 95, 118, 148, 186, 232, 290];

interface Props {
  targetLetter: string;
  delay?: number;
  isSpecial?: boolean;
  size?: number;
}

export default function SlotLetterCard({
  targetLetter,
  delay = 0,
  isSpecial = false,
  size = 80,
}: Props) {
  const [displayLetter, setDisplayLetter] = useState(
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  );
  const [locked, setLocked] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Idle breathing animation for the letter once locked
  const breathe = useRef(new Animated.Value(0)).current;
  // Subtle card shimmer/glow pulse
  const glowPulse = useRef(new Animated.Value(0)).current;

  // Start idle animations once locked
  useEffect(() => {
    if (!locked) return;

    // Floating up/down
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    breatheLoop.start();
    glowLoop.start();

    return () => {
      breatheLoop.stop();
      glowLoop.stop();
    };
  }, [locked]);

  useEffect(() => {
    setLocked(false);
    setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    scale.setValue(1);
    translateY.setValue(0);
    breathe.setValue(0);
    glowPulse.setValue(0);

    const startTimer = setTimeout(() => {
      let idx = 0;

      function tick() {
        if (idx < STEPS_MS.length) {
          const duration = STEPS_MS[idx];
          setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
          soundManager.play('tick');
          translateY.setValue(-size);
          Animated.timing(translateY, {
            toValue: 0,
            duration: Math.round(duration * 0.7),
            useNativeDriver: true,
          }).start();

          setTimeout(tick, duration);
          idx++;
        } else {
          setDisplayLetter(targetLetter);
          setLocked(true);
          translateY.setValue(-size);
          Animated.timing(translateY, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }).start(() => {
            Animated.sequence([
              Animated.spring(scale, {
                toValue: 1.18,
                useNativeDriver: true,
                friction: 4,
                tension: 220,
              }),
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
                tension: 120,
              }),
            ]).start();
          });
        }
      }

      tick();
    }, delay);

    return () => clearTimeout(startTimer);
  }, [targetLetter, delay, size]);

  const cardSize = { width: size, height: size, borderRadius: size * 0.15 };
  const logoWidth = size * 1.0;
  const logoHeight = logoWidth * (317 / 1349);

  // Breathing float: -8px
  const letterFloat = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [3, -8],
  });

  // Letter scale breathing
  const letterScale = breathe.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });

  // Glow opacity: 0.1 to 0.6
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.6],
  });

  const gradientColors: [string, string, string] = isSpecial
    ? ['#FFF0F0', '#FFD6D6', '#FFBABA']
    : ['#FFFFFF', '#F0F4FF', '#DDE8FF'];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={[
          styles.clip,
          cardSize,
          isSpecial ? styles.cardSpecial : styles.card,
          locked && isSpecial && styles.cardSpecialLocked,
        ]}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Pulsing glow overlay */}
        {locked && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isSpecial ? 'rgba(255,0,0,0.08)' : 'rgba(94,146,243,0.08)',
                opacity: glowOpacity,
              },
            ]}
          />
        )}

        {/* Logo tape en la parte superior */}
        <View style={styles.logoTop}>
          <LogoTape width={logoWidth} height={logoHeight} />
        </View>

        {/* Letra centrada con animación de flotación */}
        <Animated.View
          style={[
            styles.letterWrap,
            {
              transform: [
                { translateY: locked ? letterFloat : translateY },
                { scale: locked ? letterScale : 1 },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.letter,
              { fontSize: size * 0.45 },
              isSpecial && styles.letterSpecial,
              locked && styles.letterLocked,
              locked && isSpecial && styles.letterSpecialLocked,
            ]}
          >
            {displayLetter}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderWidth: 3,
    borderColor: Colors.cardBorderAccent,
    elevation: 8,
    shadowColor: Colors.cardBorderAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cardSpecial: {
    borderWidth: 3,
    borderColor: Colors.red,
    elevation: 8,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cardSpecialLocked: {
    shadowOpacity: 0.6,
  },
  logoTop: {
    position: 'absolute',
    top: 4,
    alignItems: 'center',
  },
  letterWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontWeight: '900',
    color: Colors.dark,
  },
  letterSpecial: {
    color: Colors.red,
  },
  letterLocked: {
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  letterSpecialLocked: {
    textShadowColor: 'rgba(255,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
