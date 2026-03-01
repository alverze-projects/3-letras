import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { authApi } from '../services/api';
import { saveSession } from '../services/session';
import { Colors } from '../theme/colors';

type Props = StackScreenProps<RootStackParamList, 'Guest'>;

export default function GuestScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGuest() {
    if (!nickname.trim()) { Alert.alert('Ingresa tu nombre de jugador'); return; }
    setLoading(true);
    try {
      const auth = await authApi.guest({ nickname: nickname.trim() });
      await saveSession({ token: auth.accessToken, player: auth.player });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>¿CÓMO TE LLAMAS?</Text>
      <Text style={styles.subtitle}>Elige tu nombre de jugador</Text>

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
        <TouchableOpacity style={styles.btn} onPress={handleGuest} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.dark} />
            : <Text style={styles.btnText}>JUGAR</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 24 },
  backText: { color: Colors.primaryLight, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white, textAlign: 'center', marginBottom: 8, letterSpacing: 3 },
  subtitle: { color: Colors.primaryLight, fontSize: 15, textAlign: 'center', marginBottom: 36, fontStyle: 'italic' },
  form: { gap: 14 },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: Colors.dark, borderWidth: 2, borderColor: Colors.primaryLight,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { fontSize: 18, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },
});
