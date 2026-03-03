import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { getSocket, WS_EVENTS } from '../services/socket';
import { Colors } from '../theme/colors';
import type { IRound, IActiveTurn, ITurn, IGamePlayer } from '@3letras/interfaces';
import { SPECIAL_LETTERS } from '@3letras/constants/game-rules';
import SlotLetterCard from '../components/SlotLetterCard';
import DiceAnimation from '../components/DiceAnimation';

type DiceRollRequest = {
  rollerId: string;
  rollerNickname: string;
  roundNumber: number;
  timeoutMs: number;
};

type DiceResult = {
  value: number;
  rollerNickname: string;
  roundNumber: number;
};

type VoteState = {
  letters: string[];
  roundNumber: number;
  timeoutMs: number;
  votedCount: number;
  totalCount: number;
  hasVoted: boolean;
};

type VoteResult = {
  accepted: boolean;
  yesCount: number;
  noCount: number;
  wasTie: boolean;
};

type Props = StackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ navigation, route }: Props) {
  const { gameCode, player, settings, initialPlayers } = route.params;
  const isSolo = (initialPlayers?.length ?? 0) === 1;
  const [round, setRound] = useState<IRound | null>(null);
  const [activeTurn, setActiveTurn] = useState<IActiveTurn | null>(null);
  const [word, setWord] = useState('');
  const [remainingMs, setRemainingMs] = useState(15000);
  const [players, setPlayers] = useState<IGamePlayer[]>(initialPlayers ?? []);
  const [lastResult, setLastResult] = useState<{ turn: ITurn; nickname: string } | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [diceRequest, setDiceRequest] = useState<DiceRollRequest | null>(null);
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [diceAnimDone, setDiceAnimDone] = useState(false);
  const [diceSecondsLeft, setDiceSecondsLeft] = useState(0);
  const diceCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [voteSecondsLeft, setVoteSecondsLeft] = useState(0);
  const voteCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [voteState, setVoteState] = useState<VoteState | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const diceRequestRef = useRef<DiceRollRequest | null>(null);
  const diceTextOpacity = useRef(new Animated.Value(0)).current;
  const diceTextSlide = useRef(new Animated.Value(18)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;

  const socket = getSocket();

  useEffect(() => {
    if (diceAnimDone) {
      Animated.parallel([
        Animated.timing(diceTextOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(diceTextSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      // Resetear para la próxima vez (nuevo dado)
      diceTextOpacity.setValue(0);
      diceTextSlide.setValue(18);
    }
  }, [diceAnimDone]);

  useEffect(() => {
    if (!socket) return;

    socket.on(WS_EVENTS.SERVER.GAME_STATE, ({ game }) => {
      setPlayers(game.players);
    });

    socket.on(WS_EVENTS.SERVER.ROUND_NEW, ({ round: newRound }) => {
      setDiceResult(null);
      setRound(newRound);
      setLastResult(null);
      setWord('');
    });

    socket.on(WS_EVENTS.SERVER.TURN_START, ({ activeTurn: at }) => {
      setActiveTurn(at);
      setIsMyTurn(at.playerId === player.id);
      setRemainingMs(15000);
      setWord('');
      Animated.timing(timerWidth, { toValue: 1, duration: 0, useNativeDriver: false }).start();
    });

    socket.on(WS_EVENTS.SERVER.TURN_TIMER, ({ remainingMs: ms }) => {
      setRemainingMs(ms);
      Animated.timing(timerWidth, {
        toValue: ms / 15000,
        duration: 900,
        useNativeDriver: false,
      }).start();

    });

    socket.on(WS_EVENTS.SERVER.TURN_RESULT, ({ turn, playerNickname, playerScores }) => {
      setLastResult({ turn, nickname: playerNickname });
      setActiveTurn(null);
      setIsMyTurn(false);
      if (playerScores) {
        setPlayers((prev) => prev.map((p) => {
          const updated = playerScores.find((s: { playerId: string; totalScore: number }) => s.playerId === p.playerId);
          return updated ? { ...p, totalScore: updated.totalScore } : p;
        }));
      }
    });

    socket.on(WS_EVENTS.SERVER.ROUND_SUMMARY, ({ summary }) => {
      setRound(null);
    });

    socket.on(WS_EVENTS.SERVER.DICE_ROLL_REQUEST, (data: DiceRollRequest) => {
      diceRequestRef.current = data;
      setDiceRequest(data);
      setDiceResult(null);

      // Countdown local
      if (diceCountdownRef.current) clearInterval(diceCountdownRef.current);
      let remaining = Math.ceil(data.timeoutMs / 1000);
      setDiceSecondsLeft(remaining);
      diceCountdownRef.current = setInterval(() => {
        remaining -= 1;
        setDiceSecondsLeft(remaining);
        if (remaining <= 0 && diceCountdownRef.current) {
          clearInterval(diceCountdownRef.current);
          diceCountdownRef.current = null;
        }
      }, 1000);
    });

    socket.on(WS_EVENTS.SERVER.DICE_RESULT, (data: { value: number; rollerNickname: string }) => {
      if (diceCountdownRef.current) {
        clearInterval(diceCountdownRef.current);
        diceCountdownRef.current = null;
      }
      const roundNumber = diceRequestRef.current?.roundNumber ?? 0;
      setDiceRequest(null);
      setDiceAnimDone(false);
      setDiceResult({ ...data, roundNumber });
    });

    socket.on(WS_EVENTS.SERVER.VOTE_START, ({ letters, roundNumber, timeoutMs }) => {
      setDiceResult(null);
      setVoteState({ letters, roundNumber, timeoutMs, votedCount: 0, totalCount: 0, hasVoted: false });
      setVoteResult(null);

      if (voteCountdownRef.current) clearInterval(voteCountdownRef.current);
      let remaining = Math.ceil(timeoutMs / 1000);
      setVoteSecondsLeft(remaining);
      voteCountdownRef.current = setInterval(() => {
        remaining -= 1;
        setVoteSecondsLeft(remaining);
        if (remaining <= 0 && voteCountdownRef.current) {
          clearInterval(voteCountdownRef.current);
          voteCountdownRef.current = null;
        }
      }, 1000);
    });

    socket.on(WS_EVENTS.SERVER.VOTE_UPDATE, ({ votedCount, totalCount }) => {
      setVoteState((prev) => prev ? { ...prev, votedCount, totalCount } : prev);
    });

    socket.on(WS_EVENTS.SERVER.VOTE_RESULT, (result: VoteResult) => {
      if (voteCountdownRef.current) {
        clearInterval(voteCountdownRef.current);
        voteCountdownRef.current = null;
      }
      setVoteResult(result);
      setVoteState(null);
      setTimeout(() => setVoteResult(null), 2500);
    });

    socket.on(WS_EVENTS.SERVER.GAME_END, ({ finalScores, winnerId }) => {
      navigation.replace('Results', { finalScores, winnerId, gameCode });
    });

    return () => {
      if (diceCountdownRef.current) clearInterval(diceCountdownRef.current);
      if (voteCountdownRef.current) clearInterval(voteCountdownRef.current);
      socket.off(WS_EVENTS.SERVER.DICE_ROLL_REQUEST);
      socket.off(WS_EVENTS.SERVER.DICE_RESULT);
      socket.off(WS_EVENTS.SERVER.ROUND_NEW);
      socket.off(WS_EVENTS.SERVER.TURN_START);
      socket.off(WS_EVENTS.SERVER.TURN_TIMER);
      socket.off(WS_EVENTS.SERVER.TURN_RESULT);
      socket.off(WS_EVENTS.SERVER.VOTE_START);
      socket.off(WS_EVENTS.SERVER.VOTE_UPDATE);
      socket.off(WS_EVENTS.SERVER.VOTE_RESULT);
    };
  }, [socket, player.id]);

  function submitWord() {
    if (!word.trim()) return;
    socket?.emit(WS_EVENTS.CLIENT.TURN_SUBMIT, { gameCode, word: word.trim() });
    setWord('');
  }

  function skipTurn() {
    socket?.emit(WS_EVENTS.CLIENT.TURN_SKIP, { gameCode });
  }

  function rollDice() {
    socket?.emit(WS_EVENTS.CLIENT.DICE_ROLL, { gameCode });
  }

  function submitVote(accept: boolean) {
    socket?.emit(WS_EVENTS.CLIENT.VOTE_SUBMIT, { gameCode, accept });
    setVoteState((prev) => prev ? { ...prev, hasVoted: true } : prev);
  }

  const timerColor = remainingMs > 9000 ? Colors.green
    : remainingMs > 4500 ? Colors.accent
    : Colors.red;

  const letters = round?.letters ?? [];

  // Overlay: animación del dado rodando (el resultado ya llegó)
  if (diceResult) {
    return (
      <View style={styles.diceOverlay}>
        <Text style={styles.diceRoundLabel}>RONDA {diceResult.roundNumber}</Text>
        <Text style={styles.diceRollerName}>{diceResult.rollerNickname} lanzó el dado</Text>
        <DiceAnimation
          targetValue={diceResult.value}
          onDone={() => setDiceAnimDone(true)}
        />
        {/* Espacio fijo: el dado no se mueve, el texto aparece con animación */}
        <Animated.View style={[
          styles.diceTextArea,
          { opacity: diceTextOpacity, transform: [{ translateY: diceTextSlide }] },
        ]}>
          <Text style={styles.diceResultNumber}>{diceResult.value}</Text>
          <Text style={styles.diceResultLabel}>
            {diceResult.value === 1
              ? 'cada jugador tendrá 1 turno con estas letras'
              : `cada jugador tendrá ${diceResult.value} turnos con estas letras`}
          </Text>
        </Animated.View>
      </View>
    );
  }

  // Overlay: esperando que el jugador lance el dado
  if (diceRequest) {
    const isRoller = diceRequest.rollerId === player.id;
    return (
      <View style={styles.diceOverlay}>
        <Text style={styles.diceRoundLabel}>RONDA {diceRequest.roundNumber}</Text>

        {isRoller ? (
          <>
            <Text style={styles.diceMyTurnTitle}>¡Te toca lanzar el dado!</Text>
            <TouchableOpacity style={styles.diceRollBtn} onPress={rollDice}>
              <Text style={styles.diceRollBtnIcon}>🎲</Text>
              <Text style={styles.diceRollBtnText}>LANZAR DADO</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.diceWaitTitle}>
              {diceRequest.rollerNickname} está lanzando el dado...
            </Text>
            <View style={styles.dicePlaceholder}>
              <Text style={styles.dicePlaceholderText}>🎲</Text>
            </View>
          </>
        )}

        <Text style={[styles.diceCountdown, diceSecondsLeft <= 5 && styles.diceCountdownUrgent]}>
          {diceSecondsLeft}s
        </Text>
      </View>
    );
  }

  // Overlay de resultado de votación
  if (voteResult) {
    return (
      <View style={styles.voteResultOverlay}>
        <Text style={styles.voteResultIcon}>{voteResult.accepted ? '✓' : '✗'}</Text>
        <Text style={styles.voteResultTitle}>
          {voteResult.accepted ? '¡Letras aceptadas!' : 'Buscando nuevas letras...'}
        </Text>
        {voteResult.wasTie && (
          <Text style={styles.voteResultTie}>Empate — decisión al azar</Text>
        )}
        <Text style={styles.voteResultCount}>
          {voteResult.yesCount} sí · {voteResult.noCount} no
        </Text>
      </View>
    );
  }

  // Overlay de votación activa
  if (voteState) {
    const voteLetters = voteState.letters;
    return (
      <View style={styles.voteOverlay}>
        <Text style={styles.voteTitle}>RONDA {voteState.roundNumber}</Text>
        <Text style={styles.voteSubtitle}>Salieron letras especiales</Text>
        <Text style={styles.voteQuestion}>¿Aceptar estas letras?</Text>

        <View style={styles.voteLettersRow}>
          {voteLetters.map((letter, i) => (
            <SlotLetterCard
              key={`vote-${voteState.roundNumber}-${i}`}
              targetLetter={letter}
              delay={i * 350}
              isSpecial={(SPECIAL_LETTERS as readonly string[]).includes(letter)}
            />
          ))}
        </View>

        {voteState.hasVoted ? (
          <View style={styles.voteWaiting}>
            <Text style={styles.voteWaitingText}>Voto enviado</Text>
            <Text style={styles.voteProgress}>
              {voteState.votedCount}/{voteState.totalCount} han votado
            </Text>
          </View>
        ) : (
          <View style={styles.voteButtons}>
            <TouchableOpacity style={styles.voteBtnYes} onPress={() => submitVote(true)}>
              <Text style={styles.voteBtnText}>✓  SÍ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voteBtnNo} onPress={() => submitVote(false)}>
              <Text style={styles.voteBtnText}>✗  NO</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.voteHint}>
          Si no hay mayoría, la decisión será al azar
        </Text>

        <Text style={[styles.diceCountdown, voteSecondsLeft <= 5 && styles.diceCountdownUrgent]}>
          {voteSecondsLeft}s
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roundLabel}>RONDA {round?.roundNumber ?? '-'}</Text>
        <View style={styles.headerRight}>
          {!isSolo && (activeTurn
            ? <Text style={styles.dieLabel}>Turno {activeTurn.turnNumber} de {activeTurn.totalTurns}</Text>
            : round && <Text style={styles.dieLabel}>{round.dieResult} turno{round.dieResult > 1 ? 's' : ''} por jugador</Text>
          )}
          <View style={[styles.difficultyBadge, styles[`difficulty_${settings.difficulty}`]]}>
            <Text style={styles.difficultyText}>
              {settings.difficulty === 'basic' ? 'BÁSICO'
                : settings.difficulty === 'medium' ? 'MEDIO'
                : 'AVANZADO'}
            </Text>
          </View>
        </View>
      </View>

      {/* Letras base — animación tragaperras al inicio de cada ronda */}
      <View style={styles.lettersRow}>
        {letters.map((letter, i) => (
          <SlotLetterCard
            key={`${round?.id ?? 'init'}-${i}`}
            targetLetter={letter}
            delay={i * 350}
            isSpecial={(SPECIAL_LETTERS as readonly string[]).includes(letter)}
          />
        ))}
      </View>

      {/* Timer — oculto en modo solo */}
      {activeTurn && !isSolo && (
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerBar, { flex: timerWidth, backgroundColor: timerColor }]} />
          <Text style={styles.timerText}>{Math.ceil(remainingMs / 1000)}s</Text>
        </View>
      )}

      {/* Turno activo */}
      {activeTurn && (
        <View style={styles.turnInfo}>
          <Text style={styles.turnWho}>
            {isMyTurn ? '¡ES TU TURNO!' : `Turno de ${activeTurn.nickname}`}
          </Text>
        </View>
      )}

      {/* Último resultado */}
      {lastResult && (
        <View style={[styles.result, lastResult.turn.isValid ? styles.resultValid : styles.resultInvalid]}>
          <Text style={styles.resultNickname}>{lastResult.nickname}</Text>
          <Text style={styles.resultWord}>
            {lastResult.turn.word ?? '(sin respuesta)'}
          </Text>
          {lastResult.turn.isValid && (
            <Text style={styles.resultScore}>+{lastResult.turn.score} pts</Text>
          )}
          {!lastResult.turn.isValid && lastResult.turn.word && (
            <Text style={styles.resultReason}>
              {lastResult.turn.invalidReason === 'order' ? 'Orden de letras incorrecto'
                : lastResult.turn.invalidReason === 'not_found' ? 'Palabra no encontrada'
                : lastResult.turn.invalidReason === 'no_special_letter' ? 'Falta letra especial (Ñ/W/X/Y/Z)'
                : lastResult.turn.invalidReason === 'builds_on_previous' ? 'No puedes construir sobre la anterior'
                : lastResult.turn.invalidReason === 'already_used' ? 'Palabra ya usada en esta ronda'
                : 'Palabra inválida'}
            </Text>
          )}
        </View>
      )}

      {/* Input */}
      {isMyTurn && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.wordInput}
            placeholder="Escribe tu palabra..."
            placeholderTextColor={Colors.gray}
            value={word}
            onChangeText={(t) => setWord(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            onSubmitEditing={submitWord}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={submitWord}>
            <Text style={styles.sendBtnText}>✓</Text>
          </TouchableOpacity>
        </View>
      )}
      {isMyTurn && (
        <TouchableOpacity style={styles.skipBtn} onPress={skipTurn}>
          <Text style={styles.skipBtnText}>{isSolo ? 'Terminar ronda' : 'Pasar turno'}</Text>
        </TouchableOpacity>
      )}

      {/* Marcador */}
      <View style={styles.scoreBoard}>
        <Text style={styles.scoreBoardTitle}>PUNTAJES</Text>
        {players.sort((a, b) => b.totalScore - a.totalScore).map((p) => (
          <View key={p.playerId} style={[styles.scoreRow, p.playerId === player.id && styles.scoreRowMe]}>
            <Text style={styles.scoreNick}>{p.nickname}</Text>
            <Text style={styles.scorePoints}>{p.totalScore}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  roundLabel: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  dieLabel: { color: Colors.primaryLight, fontSize: 14 },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  difficulty_basic: { backgroundColor: '#1B5E20' },
  difficulty_medium: { backgroundColor: '#E65100' },
  difficulty_advanced: { backgroundColor: '#B71C1C' },
  difficultyText: { color: Colors.white, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  // ── Dado ────────────────────────────────────────────────────────────────────
  diceOverlay: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 24,
  },
  diceRoundLabel: {
    color: Colors.primaryLight, fontSize: 13, fontWeight: '700', letterSpacing: 3,
  },
  diceMyTurnTitle: {
    color: Colors.accent, fontSize: 24, fontWeight: '900', textAlign: 'center',
  },
  diceWaitTitle: {
    color: Colors.white, fontSize: 20, fontWeight: '700', textAlign: 'center',
  },
  diceRollerName: {
    color: Colors.white, fontSize: 18, fontWeight: '700',
  },
  diceRollBtn: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 48,
    alignItems: 'center', gap: 6,
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  diceRollBtnIcon: { fontSize: 40 },
  diceRollBtnText: {
    color: Colors.dark, fontSize: 20, fontWeight: '900', letterSpacing: 2,
  },
  dicePlaceholder: {
    width: 110, height: 110,
    borderRadius: 20, borderWidth: 3, borderColor: Colors.primaryLight,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  dicePlaceholderText: { fontSize: 52 },
  diceCountdown: { color: Colors.primaryLight, fontSize: 22, fontWeight: '700' },
  diceCountdownUrgent: { color: Colors.red },
  diceTextArea: {
    alignItems: 'center', gap: 6,
  },
  diceResultNumber: {
    color: Colors.accent, fontSize: 72, fontWeight: '900', lineHeight: 76,
  },
  diceResultLabel: {
    color: Colors.white, fontSize: 17, fontWeight: '600',
    textAlign: 'center', opacity: 0.9,
  },
  // ── Letras ──────────────────────────────────────────────────────────────────
  lettersRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 20 },
  timerContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryDark, borderRadius: 10,
    height: 36, overflow: 'hidden', marginVertical: 8, padding: 4,
  },
  timerBar: { height: '100%', borderRadius: 6 },
  timerText: { color: Colors.white, fontWeight: '700', fontSize: 16, position: 'absolute', right: 10 },
  turnInfo: { alignItems: 'center', marginVertical: 8 },
  turnWho: { color: Colors.accent, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  result: { borderRadius: 12, padding: 14, marginVertical: 8, alignItems: 'center' },
  resultValid: { backgroundColor: '#1B5E20' },
  resultInvalid: { backgroundColor: '#B71C1C' },
  resultNickname: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  resultWord: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  resultScore: { color: Colors.accent, fontSize: 18, fontWeight: '900', marginTop: 4 },
  resultReason: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  wordInput: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16,
    fontSize: 18, fontWeight: '700', color: Colors.dark, letterSpacing: 2,
    borderWidth: 2, borderColor: Colors.accent,
  },
  sendBtn: {
    backgroundColor: Colors.accent, borderRadius: 12, width: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnText: { fontSize: 22, fontWeight: '900', color: Colors.dark },
  skipBtn: { alignItems: 'center', marginTop: 8 },
  skipBtnText: { color: Colors.gray, fontSize: 14, textDecorationLine: 'underline' },
  voteOverlay: {
    flex: 1, backgroundColor: Colors.background, justifyContent: 'center',
    alignItems: 'center', padding: 24, gap: 16,
  },
  voteTitle: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  voteSubtitle: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  voteQuestion: { color: Colors.accent, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  voteLettersRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  voteButtons: { flexDirection: 'row', gap: 16, marginTop: 8 },
  voteBtnYes: {
    backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 36,
  },
  voteBtnNo: {
    backgroundColor: '#B71C1C', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 36,
  },
  voteBtnText: { color: Colors.white, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  voteWaiting: { alignItems: 'center', gap: 8 },
  voteWaitingText: { color: Colors.primaryLight, fontSize: 16, fontStyle: 'italic' },
  voteProgress: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  voteHint: {
    color: Colors.gray, fontSize: 13, textAlign: 'center',
    marginTop: 8, fontStyle: 'italic',
  },
  voteResultOverlay: {
    flex: 1, backgroundColor: Colors.background, justifyContent: 'center',
    alignItems: 'center', gap: 12,
  },
  voteResultIcon: { fontSize: 72 },
  voteResultTitle: { color: Colors.white, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  voteResultTie: { color: Colors.accent, fontSize: 14, fontStyle: 'italic' },
  voteResultCount: { color: Colors.primaryLight, fontSize: 15 },
  scoreBoard: {
    flex: 1, marginTop: 16, backgroundColor: Colors.primaryDark,
    borderRadius: 14, padding: 14,
  },
  scoreBoardTitle: { color: Colors.primaryLight, fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  scoreRowMe: { borderLeftWidth: 3, borderLeftColor: Colors.accent, paddingLeft: 8 },
  scoreNick: { color: Colors.white, fontSize: 15 },
  scorePoints: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
});
