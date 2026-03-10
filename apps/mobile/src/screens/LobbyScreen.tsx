import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Share, ActivityIndicator, Animated,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { connectSocket, WS_EVENTS } from '../services/socket';
import { Colors } from '../theme/colors';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';
import type { IGamePlayer } from '@3letras/interfaces';
import type { Socket } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = StackScreenProps<RootStackParamList, 'Lobby'>;

const DIFF_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'BÁSICO', color: '#43A047' },
  medium: { label: 'MEDIO', color: '#FF9800' },
  advanced: { label: 'AVANZADO', color: '#E53935' },
};

export default function LobbyScreen({ navigation, route }: Props) {
  const { gameCode, token, player, difficulty, totalRounds, autoStart } = route.params;
  const insets = useSafeAreaInsets();
  const [players, setPlayers] = useState<IGamePlayer[]>([]);
  const playersRef = useRef<IGamePlayer[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Pulsing dots for "waiting"
  const dotAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const s = connectSocket(token);
    setSocket(s);

    s.emit(WS_EVENTS.CLIENT.GAME_READY, { gameCode });

    s.on(WS_EVENTS.SERVER.GAME_STATE, ({ game }) => {
      playersRef.current = game.players;
      setPlayers(game.players);
      const iAmHost = game.hostId === player.id;
      setIsHost(iAmHost);

      if (autoStart && iAmHost) {
        s.emit(WS_EVENTS.CLIENT.GAME_START, {
          gameCode,
          settings: { difficulty, totalRounds },
        });
      }
    });

    s.on(WS_EVENTS.SERVER.PLAYER_JOINED, ({ player: newPlayer }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.playerId === newPlayer?.playerId)) return prev;
        const next = [...prev, newPlayer];
        playersRef.current = next;
        return next;
      });
    });

    s.on(WS_EVENTS.SERVER.PLAYER_LEFT, ({ playerId }) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    });

    s.on(WS_EVENTS.SERVER.GAME_STARTED, ({ settings }) => {
      navigation.replace('Game', { gameCode, token, player, settings, initialPlayers: playersRef.current });
    });

    // Dot pulse anim
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    return () => {
      s.off(WS_EVENTS.SERVER.GAME_STATE);
      s.off(WS_EVENTS.SERVER.PLAYER_JOINED);
      pulse.stop();
    };
  }, [gameCode, token]);

  function handleStart() {
    if (isStarting) return;
    setIsStarting(true);
    socket?.emit(WS_EVENTS.CLIENT.GAME_START, {
      gameCode,
      settings: { difficulty, totalRounds },
    });
  }

  async function handleShare() {
    await Share.share({ message: `¡Únete a mi partida de Tres Letras! Código: ${gameCode}` });
  }

  const diffInfo = DIFF_LABELS[difficulty] || DIFF_LABELS.medium;

  if (autoStart) {
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
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Text style={styles.title}>SALA DE ESPERA</Text>

        <GameCard glow>
          <TouchableOpacity onPress={handleShare}>
            <Text style={styles.codeLabel}>Código de sala</Text>
            <Text style={styles.code}>{gameCode}</Text>
            <Text style={styles.codeHint}>Toca para compartir</Text>
          </TouchableOpacity>
        </GameCard>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: diffInfo.color }]}>
            <Text style={styles.badgeText}>{diffInfo.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#1A237E' }]}>
            <Text style={styles.badgeText}>{totalRounds} RONDAS</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Jugadores ({players.length}/8)</Text>
        <FlatList
          data={players}
          keyExtractor={(p) => p.playerId}
          renderItem={({ item }) => (
            <View style={styles.playerRow}>
              <Animated.View style={[
                styles.playerDot,
                item.isConnected && styles.playerDotActive,
                item.isConnected && { opacity: dotAnim },
              ]} />
              <Text style={styles.playerName}>{item.nickname}</Text>
              {item.isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>HOST</Text>
                </View>
              )}
            </View>
          )}
          style={styles.playerList}
        />

        {isHost ? (
          <GameButton
            title={isStarting ? "INICIANDO..." : "INICIAR JUEGO"}
            onPress={handleStart}
            shadowHeight={5}
            textStyle={{ fontSize: 20 }}
            disabled={isStarting}
          />
        ) : (
          <View style={styles.waitingMsg}>
            <Text style={styles.waitingText}>Esperando que el host inicie...</Text>
          </View>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 24 },
  title: {
    fontSize: 28, fontWeight: '900', color: Colors.white, textAlign: 'center',
    marginTop: 40, letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  codeLabel: { color: Colors.primaryLight, fontSize: 13, marginBottom: 4, textAlign: 'center' },
  code: {
    fontSize: 40, fontWeight: '900', color: Colors.accent, letterSpacing: 10, textAlign: 'center',
    textShadowColor: 'rgba(255,214,0,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  codeHint: { color: Colors.gray, fontSize: 12, marginTop: 4, textAlign: 'center' },
  badgesRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 16 },
  badge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3,
  },
  badgeText: { color: Colors.white, fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  sectionTitle: {
    color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  playerList: { flex: 1 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.cardBg, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(94, 146, 243, 0.2)',
  },
  playerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gray },
  playerDotActive: { backgroundColor: Colors.green },
  playerName: { flex: 1, color: Colors.white, fontSize: 16, fontWeight: '600' },
  hostBadge: {
    backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderBottomWidth: 2, borderBottomColor: Colors.buttonShadow,
  },
  hostBadgeText: { color: Colors.dark, fontSize: 11, fontWeight: '900' },
  waitingMsg: { alignItems: 'center', paddingVertical: 20 },
  waitingText: { color: Colors.primaryLight, fontSize: 15, fontStyle: 'italic' },
});
