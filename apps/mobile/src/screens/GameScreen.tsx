import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, ScrollView, Keyboard, Platform, KeyboardAvoidingView
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { getSocket, WS_EVENTS } from '../services/socket';
import { useSound } from '../services/sound';
import { useMusic } from '../contexts/MusicContext';
import { Colors } from '../theme/colors';
import type { IRound, IActiveTurn, ITurn, IGamePlayer } from '@3letras/interfaces';
import { SPECIAL_LETTERS } from '@3letras/constants/game-rules';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SlotLetterCard from '../components/SlotLetterCard';
import DiceAnimation from '../components/DiceAnimation';

// ---- Subcomponente para Resaltar Letras Base ----
function HighlightedWord({ word, baseLetters, isValid, baseStyle, invalidStyle }: {
  word: string;
  baseLetters: string[];
  isValid: boolean;
  baseStyle?: any;
  invalidStyle?: any;
}) {
  if (!word) return <Text style={[baseStyle, !isValid && invalidStyle]}>'(sin respuesta)'</Text>;

  let targetIdx = 0;
  const elements = word.split('').map((char, i) => {
    let isMatch = false;
    if (targetIdx < baseLetters.length && char.toUpperCase() === baseLetters[targetIdx].toUpperCase()) {
      isMatch = true;
      targetIdx++;
    }

    if (isMatch) {
      return (
        <Text key={i} style={[
          baseStyle,
          !isValid && invalidStyle,
          { color: isValid ? Colors.accent : '#FF8A80', fontWeight: '900', textShadowRadius: 6 }
        ]}>
          {char}
        </Text>
      );
    }

    return (
      <Text key={i} style={[baseStyle, !isValid && invalidStyle]}>
        {char}
      </Text>
    );
  });

  return <Text>{elements}</Text>;
}
// --------------------------------------------------

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

type WordEntry = {
  word: string;
  score: number;
  nickname: string;
  isValid: boolean;
};

type Props = StackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ navigation, route }: Props) {
  const { gameCode, player, settings, initialPlayers } = route.params;
  const { play: playMusic } = useMusic();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    playMusic('game');
    return () => { playMusic('menu'); };
  }, []);
  const isSolo = (initialPlayers?.length ?? 0) === 1;
  const [round, setRound] = useState<IRound | null>(null);
  const [activeTurn, setActiveTurn] = useState<IActiveTurn | null>(null);
  const [word, setWord] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);
  const [players, setPlayers] = useState<IGamePlayer[]>(initialPlayers ?? []);
  const [lastResult, setLastResult] = useState<{ turn: ITurn; nickname: string } | null>(null);
  const [wordHistory, setWordHistory] = useState<WordEntry[]>([]);
  const [notebookTab, setNotebookTab] = useState<'scores' | 'words'>('words');
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
  const isMyTurnRef = useRef(false);
  const diceTextOpacity = useRef(new Animated.Value(0)).current;
  const diceTextSlide = useRef(new Animated.Value(18)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const socket = getSocket();
  const { play: playSound } = useSound();

  // Precargar sonidos al montar la pantalla
  useEffect(() => {
    // soundManager no longer needed since SoundProvider preloads hooks
  }, []);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Ocultar notebook cuando se abre el teclado
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

    const handleConnect = () => {
      socket.emit(WS_EVENTS.CLIENT.GAME_REJOIN as any, { gameCode });
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    socket.on(WS_EVENTS.SERVER.GAME_REJOIN_STATE as any, (state: any) => {
      if (state.game) setPlayers(state.game.players);
      if (state.round) setRound(state.round);

      if (state.wordHistory) {
        setWordHistory(state.wordHistory);
        if (state.wordHistory.length > 0) {
           const lastTurn = state.wordHistory[state.wordHistory.length - 1];
           setLastResult({ 
             turn: { word: lastTurn.word, isValid: lastTurn.isValid, score: lastTurn.score } as any, 
             nickname: lastTurn.nickname 
           });
        }
      }

      if (state.activeTurn) {
        setActiveTurn(state.activeTurn);
        const mine = state.activeTurn.playerId === player.id;
        setIsMyTurn(mine);
        isMyTurnRef.current = mine;

        let initialMs = 15000;
        if (state.activeTurn.timeoutAt) {
          initialMs = new Date(state.activeTurn.timeoutAt).getTime() - new Date().getTime();
        }
        setRemainingMs(Math.max(0, initialMs));
        Animated.timing(timerWidth, { toValue: 1, duration: 0, useNativeDriver: false }).start();
      } else {
        setActiveTurn(null);
        setIsMyTurn(false);
        isMyTurnRef.current = false;
      }

      setDiceRequest(state.diceRequest || null);
      if (state.diceRequest) {
        diceRequestRef.current = state.diceRequest;
        if (diceCountdownRef.current) clearInterval(diceCountdownRef.current);
        let remaining = Math.ceil(state.diceRequest.remainingMs / 1000);
        setDiceSecondsLeft(remaining);
        diceCountdownRef.current = setInterval(() => {
          remaining -= 1;
          setDiceSecondsLeft(remaining);
          if (remaining <= 0 && diceCountdownRef.current) {
            clearInterval(diceCountdownRef.current);
            diceCountdownRef.current = null;
          }
        }, 1000);
      }

      setVoteState(state.voteState || null);
      if (state.voteState) {
        if (voteCountdownRef.current) clearInterval(voteCountdownRef.current);
        let remaining = Math.ceil(state.voteState.remainingMs / 1000);
        setVoteSecondsLeft(remaining);
        voteCountdownRef.current = setInterval(() => {
          remaining -= 1;
          setVoteSecondsLeft(remaining);
          if (remaining <= 0 && voteCountdownRef.current) {
            clearInterval(voteCountdownRef.current);
            voteCountdownRef.current = null;
          }
        }, 1000);
      }
    });

    socket.on(WS_EVENTS.SERVER.GAME_STATE, ({ game }) => {
      setPlayers(game.players);
    });

    socket.on(WS_EVENTS.SERVER.ROUND_NEW, ({ round: newRound }) => {
      setDiceResult(null);
      setRound(newRound);
      setLastResult(null);
      setWordHistory([]);
      setWord('');
      playSound('round_start');
    });

    socket.on(WS_EVENTS.SERVER.TURN_START, ({ activeTurn: at }) => {
      setActiveTurn(at);
      const mine = at.playerId === player.id;
      setIsMyTurn(mine);
      isMyTurnRef.current = mine;

      let initialMs = 15000;
      if (at.timeoutAt && at.startedAt) {
        initialMs = new Date(at.timeoutAt).getTime() - new Date(at.startedAt).getTime();
      }
      setRemainingMs(initialMs);

      setWord('');
      Animated.timing(timerWidth, { toValue: 1, duration: 0, useNativeDriver: false }).start();
      if (mine) playSound('turn_start');
    });

    socket.on(WS_EVENTS.SERVER.TURN_TIMER, (data: any) => {
      const ms = data.remainingMs;
      const totalMs = data.totalMs || 15000;
      setRemainingMs(ms);
      Animated.timing(timerWidth, {
        toValue: ms / totalMs,
        duration: 900,
        useNativeDriver: false,
      }).start();
      if (isMyTurnRef.current && ms <= 5000 && ms > 0) playSound('tick');
    });

    socket.on(WS_EVENTS.SERVER.TURN_RESULT, ({ turn, playerNickname, playerScores }) => {
      setLastResult({ turn, nickname: playerNickname });
      if (turn.word) {
        setWordHistory((prev) => [...prev, {
          word: turn.word,
          score: turn.isValid ? turn.score : 0,
          nickname: playerNickname,
          isValid: turn.isValid,
        }]);
      }
      setActiveTurn(null);
      setIsMyTurn(false);
      isMyTurnRef.current = false;
      if (turn.isValid) {
        playSound('valid_word');
      } else if (turn.word) {
        playSound('invalid_word');
      } else {
        playSound(isSolo ? 'skip' : 'timer_end');
      }
      if (playerScores) {
        setPlayers((prev) => prev.map((p) => {
          const updated = playerScores.find((s: { playerId: string; totalScore: number }) => s.playerId === p.playerId);
          return updated ? { ...p, totalScore: updated.totalScore } : p;
        }));
      }
    });

    socket.on(WS_EVENTS.SERVER.ROUND_SUMMARY, () => {
      setRound(null);
      playSound('round_end');
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
      playSound(winnerId === player.id ? 'victory' : 'defeat');
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
      socket.off('connect', handleConnect);
      socket.off(WS_EVENTS.SERVER.GAME_REJOIN_STATE as any);
    };
  }, [socket, player.id]);

  function submitWord() {
    if (!word.trim()) return;
    socket?.emit(WS_EVENTS.CLIENT.TURN_SUBMIT, { gameCode, word: word.trim() });
    setWord('');
    if (!isSolo) {
      setIsKeyboardVisible(false);
      Keyboard.dismiss();
    }
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
      <GradientBackground style={styles.diceOverlay}>
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
      </GradientBackground>
    );
  }

  // Overlay: esperando que el jugador lance el dado
  if (diceRequest) {
    const isRoller = diceRequest.rollerId === player.id;
    return (
      <GradientBackground style={styles.diceOverlay}>
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
      </GradientBackground>
    );
  }

  // Overlay de resultado de votación
  if (voteResult) {
    return (
      <GradientBackground style={styles.voteResultOverlay}>
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
      </GradientBackground>
    );
  }

  // Overlay de votación activa
  if (voteState) {
    const voteLetters = voteState.letters;
    return (
      <GradientBackground style={styles.voteOverlay}>
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
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            <HighlightedWord
              word={lastResult.turn.word || ''}
              baseLetters={round?.letters || []}
              isValid={lastResult.turn.isValid}
              baseStyle={styles.resultWord}
            />
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

      {/* Input normal (Dummy interactivo) - Parece un input pero es un botón para no confundir el foco del OS */}
      {isMyTurn && !isKeyboardVisible && (
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={[styles.wordInput, { justifyContent: 'center' }]} 
            activeOpacity={0.8}
            onPress={() => setIsKeyboardVisible(true)}
          >
            <Text style={{ color: word ? Colors.dark : Colors.gray, fontSize: 16, fontWeight: '900', letterSpacing: 1 }}>
              {word || "Escribe tu palabra..."}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn} onPress={submitWord}>
            <Text style={styles.sendBtnText}>✓</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Panel con tabs: Puntajes / Palabras (ahora nunca se oculta) */}
      <View style={styles.notebook}>
          {/* Tabs */}
          <View style={styles.notebookTabs}>
            <TouchableOpacity
              style={[styles.notebookTab, notebookTab === 'scores' && styles.notebookTabActive]}
              onPress={() => setNotebookTab('scores')}
            >
              <Text style={[styles.notebookTabText, notebookTab === 'scores' && styles.notebookTabTextActive]}>🏆 PUNTAJES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.notebookTab, notebookTab === 'words' && styles.notebookTabActiveWords]}
              onPress={() => setNotebookTab('words')}
            >
              <Text style={[styles.notebookTabText, notebookTab === 'words' && styles.notebookTabTextActive]}>📝 PALABRAS</Text>
            </TouchableOpacity>
          </View>

          {/* Contenido */}
          <ScrollView style={styles.notebookBody} nestedScrollEnabled>
            {notebookTab === 'scores' ? (
              // Vista de puntajes
              players.sort((a, b) => b.totalScore - a.totalScore).map((p, i) => (
                <View key={p.playerId} style={[styles.scoreRow, p.playerId === player.id && styles.scoreRowMe]}>
                  <Text style={styles.scoreRank}>#{i + 1}</Text>
                  <Text style={styles.scoreNick}>{p.nickname}</Text>
                  <Text style={styles.scorePoints}>{p.totalScore} pts</Text>
                </View>
              ))
            ) : (
              // Vista de palabras
              <>
                {wordHistory.length === 0 && (
                  <View style={styles.notebookRow}>
                    <Text style={styles.notebookEmpty}>Las palabras aparecerán aquí...</Text>
                  </View>
                )}
                {[...wordHistory].reverse().map((entry, i) => {
                  const originalIdx = wordHistory.length - i;
                  return (
                    <View key={i} style={styles.notebookRow}>
                      <Text style={styles.notebookRowNum}>{originalIdx}</Text>
                      <View style={styles.notebookWordCol}>
                        <HighlightedWord
                          word={entry.word || '(nada)'}
                          baseLetters={round?.letters || []}
                          isValid={entry.isValid}
                          baseStyle={styles.notebookWord}
                          invalidStyle={styles.notebookWordInvalid}
                        />
                        <Text style={styles.notebookNickname}>{entry.nickname}</Text>
                      </View>
                      <View style={styles.notebookPointsCol}>
                        <Text style={[styles.notebookPoints, entry.isValid ? styles.notebookPointsValid : styles.notebookPointsInvalid]}>
                          {entry.isValid ? `+${entry.score}` : '✗'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </View>

      {isMyTurn && (
        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <TouchableOpacity style={styles.skipBtn} onPress={skipTurn}>
            <Text style={styles.skipBtnText}>{isSolo ? 'Terminar ronda' : 'Pasar turno'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fondo semitransparente oscuro cuando el teclado está abierto */}
      {isMyTurn && isKeyboardVisible && (
        <TouchableOpacity 
          style={styles.keyboardBackdrop} 
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            setIsKeyboardVisible(false);
          }}
        />
      )}

      {/* Input flotante cuando el teclado está abierto */}
      {isMyTurn && isKeyboardVisible && (
        <Animated.View style={{ 
          position: 'absolute', 
          bottom: keyboardHeight + (Platform.OS === 'android' ? 45 : 20),
          left: 16, 
          right: 16, 
          zIndex: 1000,
          alignItems: 'center',
          gap: 12
        }}>
          {/* Resultado de la palabra anterior (visible sobre el fondo oscuro) */}
          {lastResult && lastResult.turn.word ? (
            <View style={[styles.result, lastResult.turn.isValid ? styles.resultValid : styles.resultInvalid, { width: '100%', marginVertical: 0, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.resultWord, { fontSize: 18, letterSpacing: 1, textAlign: 'left' }]} numberOfLines={1}>
                  <HighlightedWord
                    word={lastResult.turn.word}
                    baseLetters={round?.letters || []}
                    isValid={lastResult.turn.isValid}
                    baseStyle={styles.resultWord}
                  />
                </Text>
                {!lastResult.turn.isValid && (
                  <Text style={[styles.resultReason, { fontSize: 12, marginTop: 2, textAlign: 'left' }]} numberOfLines={1}>
                    {lastResult.turn.invalidReason === 'order' ? 'Orden incorrecto'
                      : lastResult.turn.invalidReason === 'not_found' ? 'No encontrada'
                        : lastResult.turn.invalidReason === 'no_special_letter' ? 'Falta especial'
                          : lastResult.turn.invalidReason === 'builds_on_previous' ? 'No puedes construir'
                            : lastResult.turn.invalidReason === 'already_used' ? 'Ya usada en esta ronda'
                              : 'Inválida'}
                  </Text>
                )}
              </View>
              {lastResult.turn.isValid ? (
                <Text style={[styles.resultScore, { fontSize: 20, marginTop: 0 }]}>+{lastResult.turn.score}</Text>
              ) : (
                <Text style={{ fontSize: 24 }}>❌</Text>
              )}
            </View>
          ) : null}

          <TouchableOpacity style={[styles.skipBtn, { marginTop: 0, backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]} onPress={skipTurn}>
            <Text style={styles.skipBtnText}>{isSolo ? 'Terminar ronda' : 'Pasar turno'}</Text>
          </TouchableOpacity>
          
          <View style={[
            styles.inputRow, 
            { 
              marginTop: 0,
              width: '100%',
              backgroundColor: Colors.white,
              padding: 8,
              borderRadius: 18,
              borderWidth: 4,
              borderColor: Colors.accent,
              shadowColor: Colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              elevation: 10
            }
          ]}>
            <TextInput
              style={[styles.wordInput, { borderWidth: 0, elevation: 0, shadowOpacity: 0 }]}
              placeholder="Escribe tu palabra..."
              placeholderTextColor={Colors.gray}
              value={word}
              onChangeText={(t) => setWord(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={submitWord}
              autoFocus
            />
            <TouchableOpacity style={styles.sendBtn} onPress={submitWord}>
              <Text style={styles.sendBtnText}>✓</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 40, marginBottom: 4,
  },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  roundLabel: {
    color: Colors.accent, fontSize: 24, fontWeight: '900', letterSpacing: 2,
    textShadowColor: 'rgba(255,214,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  dieLabel: {
    color: Colors.primaryLight, fontSize: 14, fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  difficultyBadge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  difficulty_basic: { backgroundColor: '#2E7D32' },
  difficulty_medium: { backgroundColor: '#EF6C00' },
  difficulty_advanced: { backgroundColor: '#C62828' },
  difficultyText: { color: Colors.white, fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  // ── Dado ────────────────────────────────────────────────────────────────────
  diceOverlay: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 28,
  },
  diceRoundLabel: {
    color: Colors.accent, fontSize: 14, fontWeight: '900', letterSpacing: 4,
    textShadowColor: 'rgba(255,214,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  diceMyTurnTitle: {
    color: Colors.accent, fontSize: 26, fontWeight: '900', textAlign: 'center',
    textShadowColor: 'rgba(255,214,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  diceWaitTitle: {
    color: Colors.white, fontSize: 22, fontWeight: '700', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  diceRollerName: {
    color: Colors.white, fontSize: 20, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  diceRollBtn: {
    backgroundColor: Colors.accent, borderRadius: 22,
    paddingVertical: 22, paddingHorizontal: 52,
    alignItems: 'center', gap: 8,
    elevation: 10,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    borderBottomWidth: 5,
    borderBottomColor: '#C6A700',
  },
  diceRollBtnIcon: { fontSize: 44 },
  diceRollBtnText: {
    color: Colors.dark, fontSize: 22, fontWeight: '900', letterSpacing: 3,
  },
  dicePlaceholder: {
    width: 120, height: 120,
    borderRadius: 24, borderWidth: 3, borderColor: 'rgba(94,146,243,0.5)',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dicePlaceholderText: { fontSize: 56 },
  diceCountdown: {
    color: Colors.primaryLight, fontSize: 24, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  diceCountdownUrgent: { color: Colors.red },
  diceTextArea: {
    alignItems: 'center', gap: 8,
  },
  diceResultNumber: {
    color: Colors.accent, fontSize: 80, fontWeight: '900', lineHeight: 84,
    textShadowColor: 'rgba(255,214,0,0.6)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 12,
  },
  diceResultLabel: {
    color: Colors.white, fontSize: 18, fontWeight: '600',
    textAlign: 'center', opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  // ── Letras ──────────────────────────────────────────────────────────────────
  lettersRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 20,
  },
  // ── Timer ───────────────────────────────────────────────────────────────────
  timerContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14, height: 40, overflow: 'hidden', marginVertical: 10, padding: 4,
    borderWidth: 2, borderColor: 'rgba(94,146,243,0.3)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  timerBar: {
    height: '100%', borderRadius: 10,
    elevation: 2,
  },
  timerText: {
    color: Colors.white, fontWeight: '900', fontSize: 17,
    position: 'absolute', right: 12,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  // ── Turno ───────────────────────────────────────────────────────────────────
  turnInfo: {
    alignItems: 'center', marginVertical: 10,
    backgroundColor: 'rgba(255,214,0,0.1)',
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,214,0,0.25)',
  },
  turnWho: {
    color: Colors.accent, fontSize: 22, fontWeight: '900', letterSpacing: 2,
    textShadowColor: 'rgba(255,214,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  // ── Resultado ───────────────────────────────────────────────────────────────
  result: {
    borderRadius: 16, padding: 16, marginVertical: 10, alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    borderWidth: 1,
  },
  resultValid: {
    backgroundColor: '#1B5E20',
    borderColor: 'rgba(76,175,80,0.4)',
  },
  resultInvalid: {
    backgroundColor: '#B71C1C',
    borderColor: 'rgba(244,67,54,0.4)',
  },
  resultNickname: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4, fontWeight: '600',
  },
  resultWord: {
    color: Colors.white, fontSize: 24, fontWeight: '900', letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  resultScore: {
    color: Colors.accent, fontSize: 20, fontWeight: '900', marginTop: 4,
    textShadowColor: 'rgba(255,214,0,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  resultReason: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  // ── Input ───────────────────────────────────────────────────────────────────
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  wordInput: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, fontWeight: '900', color: Colors.dark, letterSpacing: 1,
    borderWidth: 3, borderColor: Colors.accent,
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, width: 56, height: 56,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    borderBottomWidth: 4,
    borderBottomColor: '#C6A700',
  },
  sendBtnText: { fontSize: 26, fontWeight: '900', color: Colors.dark },
  skipBtn: {
    alignItems: 'center', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700', letterSpacing: 1,
  },
  // ── Vote ─────────────────────────────────────────────────────────────────────
  voteOverlay: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 24, gap: 18,
  },
  voteTitle: {
    color: Colors.accent, fontSize: 15, fontWeight: '900', letterSpacing: 4,
    textShadowColor: 'rgba(255,214,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  voteSubtitle: {
    color: Colors.white, fontSize: 24, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  voteQuestion: {
    color: Colors.accent, fontSize: 20, fontWeight: '800', marginBottom: 8,
    textShadowColor: 'rgba(255,214,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  voteLettersRow: { flexDirection: 'row', gap: 12, marginVertical: 12 },
  voteButtons: { flexDirection: 'row', gap: 20, marginTop: 12 },
  voteBtnYes: {
    backgroundColor: '#2E7D32', borderRadius: 18, paddingVertical: 20, paddingHorizontal: 40,
    elevation: 8,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderBottomWidth: 5,
    borderBottomColor: '#1B5E20',
  },
  voteBtnNo: {
    backgroundColor: '#C62828', borderRadius: 18, paddingVertical: 20, paddingHorizontal: 40,
    elevation: 8,
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderBottomWidth: 5,
    borderBottomColor: '#8E0000',
  },
  voteBtnText: { color: Colors.white, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  voteWaiting: {
    alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  voteWaitingText: { color: Colors.primaryLight, fontSize: 17, fontWeight: '600', fontStyle: 'italic' },
  voteProgress: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  voteHint: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center',
    marginTop: 10, fontStyle: 'italic',
  },
  // ── Vote result ──────────────────────────────────────────────────────────────
  voteResultOverlay: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', gap: 16,
  },
  voteResultIcon: { fontSize: 80 },
  voteResultTitle: {
    color: Colors.white, fontSize: 28, fontWeight: '900', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  voteResultTie: { color: Colors.accent, fontSize: 15, fontWeight: '600', fontStyle: 'italic' },
  voteResultCount: {
    color: Colors.primaryLight, fontSize: 16, fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  // ── Cuaderno (notebook panel) ────────────────────────────────────────────────
  notebook: {
    flex: 1, marginTop: 16,
    backgroundColor: '#FFFEF8',
    borderRadius: 16,
    borderWidth: 3, borderColor: Colors.accent,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  notebookTabs: {
    flexDirection: 'row',
  },
  notebookTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  notebookTabActive: {
    backgroundColor: '#C62828',
  },
  notebookTabActiveWords: {
    backgroundColor: Colors.primary,
  },
  notebookTabText: {
    color: 'rgba(0,0,0,0.35)', fontWeight: '900', fontSize: 12, letterSpacing: 1.5,
  },
  notebookTabTextActive: {
    color: Colors.white,
  },
  notebookBody: {
    flex: 1,
    paddingHorizontal: 0,
  },
  // Score rows (PUNTAJES tab)
  scoreRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(100,140,220,0.15)',
  },
  scoreRowMe: {
    backgroundColor: 'rgba(255,214,0,0.12)',
  },
  scoreRank: {
    width: 32,
    color: 'rgba(0,0,0,0.3)', fontSize: 14, fontWeight: '900',
  },
  scoreNick: {
    flex: 1,
    color: Colors.dark, fontSize: 16, fontWeight: '700',
  },
  scorePoints: {
    color: Colors.primary, fontSize: 16, fontWeight: '900',
  },
  // Word rows (PALABRAS tab)
  notebookRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(100,140,220,0.2)',
  },
  notebookRowNum: {
    width: 28,
    color: 'rgba(0,0,0,0.3)', fontSize: 13, fontWeight: '700',
  },
  notebookEmpty: {
    flex: 1,
    color: 'rgba(0,0,0,0.25)', fontSize: 14, fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  notebookWordCol: {
    flex: 1,
  },
  notebookWord: {
    color: Colors.dark, fontSize: 16, fontWeight: '800', letterSpacing: 1,
  },
  notebookWordInvalid: {
    color: '#C62828', textDecorationLine: 'line-through', opacity: 0.6,
  },
  notebookNickname: {
    color: 'rgba(0,0,0,0.4)', fontSize: 11, fontWeight: '600', marginTop: 1,
  },
  notebookPointsCol: {
    width: 90, alignItems: 'center',
    borderLeftWidth: 1, borderLeftColor: 'rgba(100,140,220,0.2)',
  },
  notebookPoints: {
    fontSize: 16, fontWeight: '900',
  },
  notebookPointsValid: {
    color: '#2E7D32',
  },
  notebookPointsInvalid: {
    color: '#C62828',
  },
  // ── Keyboard Backdrop ───────────────────────────────────────────────────────
  keyboardBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 900,
  },
});
