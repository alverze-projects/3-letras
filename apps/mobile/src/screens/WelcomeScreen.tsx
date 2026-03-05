import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import AnimatedLogo from '../components/AnimatedLogo';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';

type Props = StackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  // Entrada animada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
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
      <View style={styles.container}>
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <AnimatedLogo width={280} height={124} />
          <Text style={styles.subtitle}>¡Forma palabras y suma puntos!</Text>
        </Animated.View>

        <Animated.View style={[styles.buttons, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <GameButton
            title="INICIAR SESIÓN"
            variant="primary"
            onPress={() => navigation.navigate('Login')}
          />
          <GameButton
            title="REGISTRARSE"
            variant="secondary"
            onPress={() => navigation.navigate('Register')}
          />
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Guest')}>
            <Text style={styles.btnGhostText}>Jugar como invitado</Text>
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
  btnGhost: { alignItems: 'center', paddingVertical: 14 },
  btnGhostText: { color: Colors.primaryLight, fontSize: 16, textDecorationLine: 'underline' },
});
