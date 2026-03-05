import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import LogoTape from '../../assets/logo_tape.svg';

const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

// Velocidades de cada paso: empieza rápido, va frenando
const STEPS_MS = [45, 48, 52, 58, 66, 78, 95, 118, 148, 186, 232, 290];

interface Props {
  targetLetter: string;
  delay?: number;    // retardo de inicio (stagger entre cartas)
  isSpecial?: boolean;
  size?: number;     // tamaño del card (default 80)
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

  // translateY anima dentro del clip (letras entran desde arriba)
  const translateY = useRef(new Animated.Value(0)).current;
  // scale anima el card entero al hacer "clic" final
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset al cambiar targetLetter (nueva ronda)
    setLocked(false);
    setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    scale.setValue(1);
    translateY.setValue(0);

    const startTimer = setTimeout(() => {
      let idx = 0;

      function tick() {
        if (idx < STEPS_MS.length) {
          const duration = STEPS_MS[idx];
          // Cambia la letra
          setDisplayLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
          // Desliza desde arriba
          translateY.setValue(-size);
          Animated.timing(translateY, {
            toValue: 0,
            duration: Math.round(duration * 0.7),
            useNativeDriver: true,
          }).start();

          setTimeout(tick, duration);
          idx++;
        } else {
          // Bloquea en la letra objetivo
          setDisplayLetter(targetLetter);
          setLocked(true);
          translateY.setValue(-size);
          Animated.timing(translateY, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }).start(() => {
            // Pequeño rebote de escala al asentarse
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
        {/* Logo tape en la parte superior */}
        <View style={styles.logoTop}>
          <LogoTape width={logoWidth} height={logoHeight} />
        </View>

        {/* Letra centrada en el cuadrado */}
        <Animated.View style={[styles.letterWrap, { transform: [{ translateY }] }]}>
          <Text
            style={[
              styles.letter,
              { fontSize: size * 0.45 },
              isSpecial && styles.letterSpecial,
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
    backgroundColor: Colors.white,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardSpecial: {
    borderWidth: 3,
    borderColor: Colors.red,
    backgroundColor: '#FFF3F3',
    elevation: 6,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cardSpecialLocked: {
    shadowOpacity: 0.55,
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
});
