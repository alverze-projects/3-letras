import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import LogoMain from '../../assets/logo_main.svg';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { gamesApi } from '../services/api';
import { soundManager } from '../services/sound';
import { loadSession, clearSession, Session } from '../services/session';
import { Colors } from '../theme/colors';
import type { DifficultyLevel } from '@3letras/interfaces';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Inicio'>,
  StackScreenProps<RootStackParamList>
>;

const ROUND_OPTIONS = [3, 5, 7, 10];

const DIFFICULTIES: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 'basic',    label: 'Básico',    description: '2 letras · Sin restricciones especiales' },
  { value: 'medium',   label: 'Medio',     description: '3 letras · Puedes construir sobre la palabra anterior' },
  { value: 'advanced', label: 'Avanzado',  description: '3 letras · Sin construir sobre anterior · Letra especial obligatoria' },
];

// 0=menú · 'mode'=solo/multi · 'multi'=crear/unirse · 1=dificultad · 2=rondas
type Step = 0 | 'mode' | 'multi' | 1 | 2;

export default function MainScreen({ navigation }: Props) {
  const [session, setSession]           = useState<Session | null>(null);
  const [step, setStep]                 = useState<Step>(0);
  const [isSolo, setIsSolo]             = useState(false);
  const [showJoin, setShowJoin]         = useState(false);
  const [code, setCode]                 = useState('');
  const [difficulty, setDifficulty]     = useState<DifficultyLevel>('medium');
  const [totalRounds, setTotalRounds]   = useState(5);
  const [customRounds, setCustomRounds] = useState('');
  const [isCustom, setIsCustom]         = useState(false);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    loadSession().then(setSession);
    soundManager.preload();
  }, []);

  function reset() {
    setStep(0); setIsSolo(false); setShowJoin(false); setCode('');
    setDifficulty('medium'); setTotalRounds(5); setCustomRounds(''); setIsCustom(false);
  }

  function selectMode(solo: boolean) {
    setIsSolo(solo);
    setStep(solo ? 1 : 'multi');
  }

  async function handleCreate() {
    if (!session) return;
    const rounds = isCustom ? parseInt(customRounds, 10) : totalRounds;
    if (!rounds || rounds < 1 || rounds > 50) {
      Alert.alert('Número de rondas inválido', 'Debe ser un número entre 1 y 50');
      return;
    }
    setLoading(true);
    try {
      const { game } = await gamesApi.create({ difficulty, totalRounds: rounds });
      navigation.navigate('Lobby', {
        gameCode: game.code, token: session.token, player: session.player,
        difficulty, totalRounds: rounds, autoStart: isSolo,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo crear la partida');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!session) return;
    if (!code.trim()) { Alert.alert('Ingresa el código de sala'); return; }
    setLoading(true);
    try {
      const { game } = await gamesApi.join(code.trim().toUpperCase());
      navigation.navigate('Lobby', {
        gameCode: game.code, token: session.token, player: session.player,
        difficulty: game.settings.difficulty, totalRounds: game.settings.totalRounds,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo unirse a la partida');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  if (!session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.nickname}>{session.player.nickname}</Text>
          {session.player.isGuest && <Text style={styles.guestBadge}>Invitado</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logo}>
        <LogoMain width={300} height={133} />
      </View>

      <View style={styles.actions}>

        {/* ── Menú principal ── */}
        {step === 0 && (
          <TouchableOpacity style={styles.btnCreate} onPress={() => { soundManager.play('button_tap'); setStep('mode'); }}>
            <Text style={styles.btnCreateText}>JUGAR</Text>
          </TouchableOpacity>
        )}

        {/* ── Elegir modo ── */}
        {step === 'mode' && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>¿Cómo quieres jugar?</Text>
            </View>

            <TouchableOpacity style={styles.modeOption} onPress={() => selectMode(true)}>
              <Text style={styles.modeIcon}>🎮</Text>
              <View style={styles.modeText}>
                <Text style={styles.modeLabel}>Solo</Text>
                <Text style={styles.modeDesc}>Practica a tu ritmo, sin timer ni límite de turnos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modeOption} onPress={() => selectMode(false)}>
              <Text style={styles.modeIcon}>👥</Text>
              <View style={styles.modeText}>
                <Text style={styles.modeLabel}>Multijugador</Text>
                <Text style={styles.modeDesc}>Compite con otros jugadores en tiempo real</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnBack} onPress={reset}>
              <Text style={styles.btnBackText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Multijugador: Crear sala / Unirse ── */}
        {step === 'multi' && !showJoin && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Multijugador</Text>
            </View>

            <TouchableOpacity style={styles.btnCreate} onPress={() => setStep(1)}>
              <Text style={styles.btnCreateText}>CREAR SALA</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnJoin} onPress={() => setShowJoin(true)}>
              <Text style={styles.btnJoinText}>UNIRSE A PARTIDA</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnBack} onPress={() => setStep('mode')}>
              <Text style={styles.btnBackText}>← Atrás</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Unirse: ingreso de código ── */}
        {step === 'multi' && showJoin && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Unirse a partida</Text>
            </View>

            <TextInput
              style={styles.codeInput}
              placeholder="Código de sala"
              placeholderTextColor={Colors.gray}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.stepButtons}>
              <TouchableOpacity style={styles.btnBack} onPress={() => { setShowJoin(false); setCode(''); }}>
                <Text style={styles.btnBackText}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleJoin} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={Colors.dark} size="small" />
                  : <Text style={styles.btnConfirmText}>UNIRSE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Paso 1: Dificultad ── */}
        {step === 1 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIndicator}>Paso 1 de 2</Text>
              <Text style={styles.stepTitle}>Elige la dificultad</Text>
            </View>

            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.difficultyOption, difficulty === d.value && styles.difficultySelected]}
                onPress={() => setDifficulty(d.value)}
              >
                <View style={styles.optionRow}>
                  <View style={[styles.radio, difficulty === d.value && styles.radioSelected]} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, difficulty === d.value && styles.optionLabelSelected]}>
                      {d.label}
                    </Text>
                    <Text style={styles.optionDesc}>{d.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.stepButtons}>
              <TouchableOpacity style={styles.btnBack} onPress={() => setStep(isSolo ? 'mode' : 'multi')}>
                <Text style={styles.btnBackText}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNext} onPress={() => setStep(2)}>
                <Text style={styles.btnNextText}>SIGUIENTE →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Paso 2: Rondas ── */}
        {step === 2 && (
          <View style={styles.stepBox}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIndicator}>Paso 2 de 2</Text>
              <Text style={styles.stepTitle}>Número de rondas</Text>
              <Text style={styles.stepSubtitle}>
                Dificultad: <Text style={styles.stepSubtitleAccent}>
                  {DIFFICULTIES.find((d) => d.value === difficulty)?.label}
                </Text>
              </Text>
            </View>

            <View style={styles.roundsGrid}>
              {ROUND_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.roundOption, !isCustom && totalRounds === n && styles.roundOptionSelected]}
                  onPress={() => { setTotalRounds(n); setIsCustom(false); }}
                >
                  <Text style={[styles.roundNumber, !isCustom && totalRounds === n && styles.roundNumberSelected]}>
                    {n}
                  </Text>
                  <Text style={[styles.roundLabel, !isCustom && totalRounds === n && styles.roundLabelSelected]}>
                    rondas
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!isCustom ? (
              <TouchableOpacity style={styles.btnCustom} onPress={() => setIsCustom(true)}>
                <Text style={styles.btnCustomText}>Personalizada</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customRoundsBox}>
                <TextInput
                  style={styles.customRoundsInput}
                  placeholder="Ej: 15"
                  placeholderTextColor={Colors.gray}
                  value={customRounds}
                  onChangeText={(t) => setCustomRounds(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                  autoFocus
                />
                <TouchableOpacity style={styles.btnCustom} onPress={() => { setIsCustom(false); setCustomRounds(''); }}>
                  <Text style={styles.btnCustomText}>Usar opciones fijas</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.stepButtons}>
              <TouchableOpacity style={styles.btnBack} onPress={() => setStep(1)}>
                <Text style={styles.btnBackText}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleCreate} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={Colors.dark} size="small" />
                  : <Text style={styles.btnConfirmText}>CREAR</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>

      {/* Enlace de instrucciones al pie */}
      {step === 0 && (
        <TouchableOpacity
          style={styles.howToPlayBtn}
          onPress={() => navigation.navigate('Instructions', { nextRoute: 'Main' })}
        >
          <Text style={styles.howToPlay}>¿Cómo se juega?  →</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: Colors.primaryLight, fontSize: 14 },
  nickname: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  guestBadge: { color: Colors.gray, fontSize: 12, marginTop: 2 },
  logout: { color: Colors.gray, fontSize: 14, textDecorationLine: 'underline', marginTop: 4 },

  logo: { alignItems: 'center', marginVertical: 36 },

  actions: { gap: 14 },

  btnCreate: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 20,
    alignItems: 'center', elevation: 4,
  },
  btnCreateText: { fontSize: 20, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },

  // Modo
  modeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  modeIcon: { fontSize: 30 },
  modeText: { flex: 1, gap: 3 },
  modeLabel: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  modeDesc: { color: Colors.primaryLight, fontSize: 12, lineHeight: 17 },

  // Steps
  stepBox: { backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 18, gap: 12 },
  stepHeader: { gap: 2, marginBottom: 4 },
  stepIndicator: { color: Colors.primaryLight, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  stepTitle: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  stepSubtitle: { color: Colors.primaryLight, fontSize: 14, marginTop: 2 },
  stepSubtitleAccent: { color: Colors.accent, fontWeight: '700' },

  // Dificultad
  difficultyOption: { borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.primaryLight },
  difficultySelected: { borderColor: Colors.accent, backgroundColor: '#1A3A6E' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.primaryLight },
  radioSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  optionText: { flex: 1 },
  optionLabel: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  optionLabelSelected: { color: Colors.accent },
  optionDesc: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },

  // Rondas
  roundsGrid: { flexDirection: 'row', gap: 10 },
  roundOption: {
    flex: 1, borderRadius: 12, paddingVertical: 18, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  roundOptionSelected: { borderColor: Colors.accent, backgroundColor: '#1A3A6E' },
  roundNumber: { color: Colors.primaryLight, fontSize: 28, fontWeight: '900' },
  roundNumberSelected: { color: Colors.accent },
  roundLabel: { color: Colors.primaryLight, fontSize: 11, marginTop: 2 },
  roundLabelSelected: { color: Colors.accent },
  btnCustom: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  btnCustomText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  customRoundsBox: { gap: 8 },
  customRoundsInput: {
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 24, fontWeight: '900', color: Colors.dark, textAlign: 'center',
    borderWidth: 2, borderColor: Colors.accent, letterSpacing: 4,
  },

  // Botones de paso
  stepButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnBack: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.gray,
  },
  btnBackText: { color: Colors.gray, fontSize: 15, fontWeight: '600' },
  btnNext: {
    flex: 2, backgroundColor: Colors.primaryLight, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnNextText: { color: Colors.dark, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  btnConfirm: {
    flex: 2, backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnConfirmText: { fontSize: 16, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },

  // Unirse
  btnJoin: {
    backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.accent,
  },
  btnJoinText: { fontSize: 18, fontWeight: '700', color: Colors.accent, letterSpacing: 2 },
  codeInput: {
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 22, fontWeight: '700', color: Colors.dark, textAlign: 'center',
    letterSpacing: 8, borderWidth: 2, borderColor: Colors.accent,
  },

  howToPlayBtn: { alignItems: 'center', paddingVertical: 20, marginTop: 8 },
  howToPlay: { color: Colors.primaryLight, fontSize: 14, textDecorationLine: 'underline' },
});
