import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useSound } from '../services/sound';
import { useMusic } from '../contexts/MusicContext';
import AnimatedLogo from '../components/AnimatedLogo';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';

type Props = StackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  // Entrada animada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const { play: playSound } = useSound();
  const { play: playMusic, unlockAudioWeb } = useMusic();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    playMusic('menu');

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 600, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <AnimatedLogo width={280} height={124} />
          <Text style={styles.subtitle}>¡Forma palabras y suma puntos!</Text>
        </Animated.View>

        <Animated.View style={[styles.buttons, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <GameButton
            title="INICIAR SESIÓN"
            variant="primary"
            onPress={() => { unlockAudioWeb(); playSound('button_tap'); navigation.navigate('Login'); }}
          />
          <GameButton
            title="REGISTRARSE"
            variant="secondary"
            onPress={() => { unlockAudioWeb(); playSound('button_tap'); navigation.navigate('Register'); }}
          />
          <TouchableOpacity style={styles.guestBtn} onPress={() => { unlockAudioWeb(); playSound('button_tap'); navigation.navigate('Guest'); }}>
            <Text style={styles.guestText}>Jugar como invitado  →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 56 },
  subtitle: { color: Colors.accent, fontSize: 16, marginTop: 14, fontStyle: 'italic', fontWeight: '600' },
  buttons: { gap: 14 },
  guestBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  guestText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
