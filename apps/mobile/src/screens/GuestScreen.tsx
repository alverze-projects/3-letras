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
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';
import { AuthContext } from '../../App';

type Props = StackScreenProps<RootStackParamList, 'Guest'>;

export default function GuestScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSession } = useContext(AuthContext);

  async function handleGuest() {
    if (!nickname.trim()) { Alert.alert('Ingresa tu nombre de jugador'); return; }
    setLoading(true);
    try {
      const auth = await authApi.guest({ nickname: nickname.trim() });
      await saveSession({ token: auth.accessToken, player: auth.player });
      setSession({ token: auth.accessToken, player: auth.player });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>¿CÓMO TE LLAMAS?</Text>
        <Text style={styles.subtitle}>Elige tu nombre de jugador</Text>

        <GameCard glow>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre de jugador"
              placeholderTextColor={Colors.gray}
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
              autoCorrect={false}
              autoFocus
            />
            <GameButton title="JUGAR" onPress={handleGuest} loading={loading} />
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
    marginBottom: 8, letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  subtitle: { color: Colors.primaryLight, fontSize: 15, textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
  form: { gap: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: Colors.dark, fontWeight: '700',
    borderWidth: 2, borderColor: Colors.primaryLight,
  },
});
