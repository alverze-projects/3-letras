import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Animated,
} from 'react-native';
import AnimatedLogo from '../components/AnimatedLogo';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { gamesApi } from '../services/api';
import { useSound } from '../services/sound';
import { loadSession, clearSession, Session } from '../services/session';
import { Colors } from '../theme/colors';
import type { DifficultyLevel } from '@3letras/interfaces';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Inicio'>,
  StackScreenProps<RootStackParamList>
>;

const ROUND_OPTIONS = [3, 5, 7, 10];

const DIFFICULTIES: { value: DifficultyLevel; label: string; description: string; color: string }[] = [
  { value: 'basic', label: 'Básico', description: '2 letras · Sin restricciones especiales', color: '#43A047' },
  { value: 'medium', label: 'Medio', description: '3 letras · Puedes construir sobre la palabra anterior', color: '#FF9800' },
  { value: 'advanced', label: 'Avanzado', description: '3 letras · Sin construir sobre anterior · Letra especial obligatoria', color: '#E53935' },
];

// 0=menú · 'mode'=solo/multi · 'multi'=crear/unirse · 1=dificultad · 2=rondas
type Step = 0 | 'mode' | 'multi' | 1 | 2;

export default function MainScreen({ navigation }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [isSolo, setIsSolo] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [totalRounds, setTotalRounds] = useState<number | null>(null);
  const [customRounds, setCustomRounds] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const { play: playSound } = useSound();

  // Pulsing play button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSession().then(setSession);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  function reset() {
    setStep(0); setIsSolo(false); setShowJoin(false); setCode('');
    setDifficulty(null); setTotalRounds(null); setCustomRounds(''); setIsCustom(false);
  }

  function selectMode(solo: boolean) {
    playSound('button_tap');
    setIsSolo(solo);
    setStep(solo ? 1 : 'multi');
  }

  async function handleCreate(overrideRounds?: number) {
    if (!session) return;

    // Fallback if not set
    const userDiff = difficulty || 'medium';
    const rounds = overrideRounds ?? (isCustom ? parseInt(customRounds, 10) : (totalRounds || 5));

    if (!rounds || rounds < 1 || rounds > 50) {
      Alert.alert('Número de rondas inválido', 'Debe ser un número entre 1 y 50');
      return;
    }

    setLoading(true);
    try {
      const { game } = await gamesApi.create({ difficulty: userDiff, totalRounds: rounds });
      navigation.navigate('Lobby', {
        gameCode: game.code, token: session.token, player: session.player,
        difficulty: userDiff, totalRounds: rounds, autoStart: isSolo,
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
    navigation.reset({ index: 0, routes: [{ name: 'Inicio' }] });
  }

  if (!session) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
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
          <AnimatedLogo width={300} height={133} />
        </View>

        <View style={styles.actions}>

          {/* ── Menú principal ── */}
          {step === 0 && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <GameButton
                title="JUGAR"
                onPress={() => { playSound('button_tap'); setStep('mode'); }}
                shadowHeight={6}
                textStyle={{ fontSize: 24 }}
              />
            </Animated.View>
          )}

          {/* ── Elegir modo ── */}
          {step === 'mode' && (
            <GameCard glow>
              <View style={styles.stepHeaderWithBack}>
                <TouchableOpacity onPress={() => { playSound('button_tap'); reset(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.accent} />
                </TouchableOpacity>
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

            </GameCard>
          )}

          {/* ── Multijugador: Crear sala / Unirse ── */}
          {step === 'multi' && !showJoin && (
            <GameCard glow>
              <View style={styles.stepHeaderWithBack}>
                <TouchableOpacity onPress={() => { playSound('button_tap'); setStep('mode'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.accent} />
                </TouchableOpacity>
                <Text style={styles.stepTitle}>Multijugador</Text>
              </View>

              <GameButton title="CREAR SALA" onPress={() => { playSound('button_tap'); setStep(1); }} />
              <View style={{ height: 10 }} />
              <GameButton title="UNIRSE A PARTIDA" variant="secondary" onPress={() => { playSound('button_tap'); setShowJoin(true); }} />
            </GameCard>
          )}

          {/* ── Unirse: ingreso de código ── */}
          {step === 'multi' && showJoin && (
            <GameCard glow>
              <View style={styles.stepHeaderWithBack}>
                <TouchableOpacity onPress={() => { playSound('button_tap'); setShowJoin(false); setCode(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.accent} />
                </TouchableOpacity>
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
              <View style={[styles.stepButtons, { marginTop: 12 }]}>
                <GameButton title="UNIRSE" onPress={handleJoin} loading={loading} style={{ flex: 1 }} />
              </View>
            </GameCard>
          )}

          {/* ── Paso 1: Dificultad ── */}
          {step === 1 && (
            <GameCard>
              <View style={styles.stepHeaderWithBack}>
                <TouchableOpacity onPress={() => { playSound('button_tap'); setStep(isSolo ? 'mode' : 'multi'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.accent} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.stepIndicator}>PASO 1 DE 2</Text>
                  <Text style={styles.stepTitle}>Elige la dificultad</Text>
                </View>
              </View>

              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.difficultyOption, difficulty === d.value && { borderColor: d.color, backgroundColor: 'rgba(255,255,255,0.07)' }]}
                  onPress={() => {
                    playSound('tick');
                    setDifficulty(d.value);
                    // Automatically next step
                    setTimeout(() => setStep(2), 50);
                  }}
                >
                  <View style={styles.optionRow}>
                    <View style={[styles.radio, difficulty === d.value && { borderColor: d.color, backgroundColor: d.color }]} />
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, difficulty === d.value && { color: d.color }]}>
                        {d.label}
                      </Text>
                      <Text style={styles.optionDesc}>{d.description}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </GameCard>
          )}

          {/* ── Paso 2: Rondas ── */}
          {step === 2 && (
            <GameCard>
              <View style={styles.stepHeaderWithBack}>
                <TouchableOpacity onPress={() => { playSound('button_tap'); setStep(1); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="arrow-back" size={24} color={Colors.accent} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.stepIndicator}>PASO 2 DE 2</Text>
                  <Text style={styles.stepTitle}>Número de rondas</Text>
                  <Text style={styles.stepSubtitle}>
                    Dificultad: <Text style={styles.stepSubtitleAccent}>
                      {DIFFICULTIES.find((d) => d.value === difficulty)?.label}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={styles.roundsGrid}>
                {ROUND_OPTIONS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.roundOption, !isCustom && totalRounds === n && styles.roundOptionSelected]}
                    onPress={() => {
                      playSound('tick');
                      setTotalRounds(n);
                      setIsCustom(false);
                      // Automatically create
                      handleCreate(n);
                    }}
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
                <TouchableOpacity style={styles.btnCustom} onPress={() => { playSound('button_tap'); setIsCustom(true); }}>
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
                  <View style={[styles.stepButtons, { marginBottom: 16 }]}>
                    <GameButton title="JUGAR" onPress={() => { playSound('round_start'); handleCreate(); }} loading={loading} style={{ flex: 1 }} />
                  </View>
                  <TouchableOpacity style={[styles.btnCustom, { marginTop: 0 }]} onPress={() => { playSound('button_tap'); setIsCustom(false); setCustomRounds(''); }}>
                    <Text style={styles.btnCustomText}>Usar opciones fijas</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GameCard>
          )}

        </View>

        {/* Enlace de instrucciones al pie */}
        {step === 0 && (
          <TouchableOpacity
            style={styles.howToPlayBtn}
            onPress={() => { playSound('button_tap'); navigation.navigate('Instructions', { nextRoute: 'Main' }); }}
          >
            <Text style={styles.howToPlay}>¿Cómo se juega?  →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: Colors.primaryLight, fontSize: 14 },
  nickname: {
    color: Colors.white, fontSize: 20, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  guestBadge: { color: Colors.gray, fontSize: 12, marginTop: 2 },
  logout: { color: Colors.gray, fontSize: 14, textDecorationLine: 'underline', marginTop: 4 },

  logo: { alignItems: 'center', marginVertical: 36 },

  actions: { gap: 14 },

  // Steps
  stepHeader: { gap: 2, marginBottom: 12 },
  stepHeaderWithBack: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  stepIndicator: { color: Colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  stepTitle: {
    color: Colors.white, fontSize: 22, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
  },
  stepSubtitle: { color: Colors.primaryLight, fontSize: 14, marginTop: 2 },
  stepSubtitleAccent: { color: Colors.accent, fontWeight: '700' },

  // Mode
  modeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(94, 146, 243, 0.4)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modeIcon: { fontSize: 30 },
  modeText: { flex: 1, gap: 3 },
  modeLabel: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  modeDesc: { color: Colors.primaryLight, fontSize: 12, lineHeight: 17 },

  // Dificultad
  difficultyOption: {
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'rgba(94, 146, 243, 0.3)',
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.primaryLight },
  optionText: { flex: 1 },
  optionLabel: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  optionDesc: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },

  // Rondas
  roundsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  roundOption: {
    flex: 1, borderRadius: 12, paddingVertical: 18, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(94, 146, 243, 0.3)',
  },
  roundOptionSelected: { borderColor: Colors.accent, backgroundColor: 'rgba(255,214,0,0.1)' },
  roundNumber: { color: Colors.primaryLight, fontSize: 28, fontWeight: '900' },
  roundNumberSelected: { color: Colors.accent },
  roundLabel: { color: Colors.primaryLight, fontSize: 11, marginTop: 2 },
  roundLabelSelected: { color: Colors.accent },
  btnCustom: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(94, 146, 243, 0.3)',
  },
  btnCustomText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  customRoundsBox: { gap: 8 },
  customRoundsInput: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 24, fontWeight: '900', color: Colors.dark, textAlign: 'center',
    borderWidth: 2, borderColor: Colors.accent, letterSpacing: 4,
  },

  // Botones de paso
  stepButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },

  // Unirse
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 22, fontWeight: '700', color: Colors.dark, textAlign: 'center',
    letterSpacing: 8, borderWidth: 2, borderColor: Colors.accent,
    marginBottom: 12,
  },

  howToPlayBtn: { alignItems: 'center', paddingVertical: 20, marginTop: 8 },
  howToPlay: { color: Colors.primaryLight, fontSize: 14, textDecorationLine: 'underline' },
});
