import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { authApi, gamesApi, setAuthToken } from '../services/api';
import { Colors } from '../theme/colors';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!nickname.trim()) { Alert.alert('Ingresa tu nickname'); return; }
    setLoading(true);
    try {
      const auth = await authApi.guest({ nickname: nickname.trim() });
      setAuthToken(auth.accessToken);
      const { game } = await gamesApi.create({ difficulty: 'medium', totalRounds: 5 });
      navigation.replace('Lobby', { gameCode: game.code, token: auth.accessToken, player: auth.player });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo crear la partida');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!nickname.trim()) { Alert.alert('Ingresa tu nickname'); return; }
    if (!code.trim()) { Alert.alert('Ingresa el código de sala'); return; }
    setLoading(true);
    try {
      const auth = await authApi.guest({ nickname: nickname.trim() });
      setAuthToken(auth.accessToken);
      const { game } = await gamesApi.join(code.trim().toUpperCase());
      navigation.replace('Lobby', { gameCode: game.code, token: auth.accessToken, player: auth.player });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo unirse a la partida');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>TRES</Text>
        <Text style={styles.titleAccent}>LETRAS</Text>
        <Text style={styles.subtitle}>¡Forma palabras y suma puntos!</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre de jugador"
          placeholderTextColor={Colors.gray}
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.btnCreate} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.dark} /> : <Text style={styles.btnCreateText}>CREAR PARTIDA</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o únete con código</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={[styles.input, styles.inputCode]}
          placeholder="Código de sala (ej: AB3K7)"
          placeholderTextColor={Colors.gray}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.btnJoin} onPress={handleJoin} disabled={loading}>
          <Text style={styles.btnJoinText}>UNIRSE</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 64, fontWeight: '900', color: Colors.accent, letterSpacing: 4, lineHeight: 64 },
  titleAccent: { fontSize: 48, fontWeight: '900', color: Colors.white, letterSpacing: 6, marginTop: -8 },
  subtitle: { color: Colors.primaryLight, fontSize: 16, marginTop: 12, fontStyle: 'italic' },
  form: { gap: 14 },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.dark, borderWidth: 2, borderColor: Colors.primaryLight,
  },
  inputCode: { textAlign: 'center', fontSize: 20, fontWeight: '700', letterSpacing: 6 },
  btnCreate: {
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', elevation: 4,
  },
  btnCreateText: { fontSize: 18, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },
  btnJoin: {
    backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.accent,
  },
  btnJoinText: { fontSize: 18, fontWeight: '700', color: Colors.accent, letterSpacing: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.primaryLight },
  dividerText: { color: Colors.primaryLight, fontSize: 13 },
});
