import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { authApi } from '../services/api';
import { saveSession } from '../services/session';
import { Colors } from '../theme/colors';
import GradientBackground from '../components/GradientBackground';
import MuteButton from '../components/MuteButton';
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';
import { AuthContext } from '../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    if (!email.trim() || !password) { Alert.alert('Completa todos los campos'); return; }
    setLoading(true);
    try {
      const auth = await authApi.login({ email: email.trim(), password });
      await saveSession({ token: auth.accessToken, player: auth.player });
      setSession({ token: auth.accessToken, player: auth.player });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <MuteButton absolute />
      <KeyboardAvoidingView style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>INICIAR SESIÓN</Text>

        <GameCard glow>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <GameButton title="ENTRAR" onPress={handleLogin} loading={loading} />
          </View>
        </GameCard>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 24, zIndex: 10 },
  backText: { color: Colors.primaryLight, fontSize: 16, fontWeight: '600' },
  title: {
    fontSize: 28, fontWeight: '900', color: Colors.white, textAlign: 'center',
    marginBottom: 24, letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  form: { gap: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.dark,
    borderWidth: 2, borderColor: Colors.primaryLight,
  },
});
