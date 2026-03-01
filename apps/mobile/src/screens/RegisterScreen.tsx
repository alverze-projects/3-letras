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

type Props = StackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nickname.trim() || !email.trim() || !password) { Alert.alert('Completa todos los campos'); return; }
    if (password.length < 6) { Alert.alert('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const auth = await authApi.register({ nickname: nickname.trim(), email: email.trim(), password });
      await saveSession({ token: auth.accessToken, player: auth.player });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>REGISTRARSE</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre de jugador"
          placeholderTextColor={Colors.gray}
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          autoCorrect={false}
        />
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
          placeholder="Contraseña (mínimo 6 caracteres)"
          placeholderTextColor={Colors.gray}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.dark} />
            : <Text style={styles.btnText}>CREAR CUENTA</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 24 },
  backText: { color: Colors.primaryLight, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white, textAlign: 'center', marginBottom: 36, letterSpacing: 3 },
  form: { gap: 14 },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.dark, borderWidth: 2, borderColor: Colors.primaryLight,
  },
  btn: {
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnText: { fontSize: 18, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },
});
