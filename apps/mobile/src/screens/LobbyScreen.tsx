import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, Share,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { connectSocket, WS_EVENTS } from '../services/socket';
import { Colors } from '../theme/colors';
import type { IGamePlayer } from '@3letras/interfaces';
import type { Socket } from 'socket.io-client';

type Props = StackScreenProps<RootStackParamList, 'Lobby'>;

export default function LobbyScreen({ navigation, route }: Props) {
  const { gameCode, token, player, difficulty, totalRounds } = route.params;
  const [players, setPlayers] = useState<IGamePlayer[]>([]);
  const playersRef = useRef<IGamePlayer[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const s = connectSocket(token);
    setSocket(s);

    s.emit(WS_EVENTS.CLIENT.GAME_READY, { gameCode });

    s.on(WS_EVENTS.SERVER.GAME_STATE, ({ game }) => {
      playersRef.current = game.players;
      setPlayers(game.players);
      setIsHost(game.hostId === player.id);
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

    return () => { s.off(WS_EVENTS.SERVER.GAME_STATE); s.off(WS_EVENTS.SERVER.PLAYER_JOINED); };
  }, [gameCode, token]);

  function handleStart() {
    if (players.length < 2) { Alert.alert('Se necesitan al menos 2 jugadores'); return; }
    socket?.emit(WS_EVENTS.CLIENT.GAME_START, {
      gameCode,
      settings: { difficulty, totalRounds },
    });
  }

  async function handleShare() {
    await Share.share({ message: `¡Únete a mi partida de Tres Letras! Código: ${gameCode}` });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SALA DE ESPERA</Text>

      <TouchableOpacity style={styles.codeBox} onPress={handleShare}>
        <Text style={styles.codeLabel}>Código de sala</Text>
        <Text style={styles.code}>{gameCode}</Text>
        <Text style={styles.codeHint}>Toca para compartir</Text>
      </TouchableOpacity>

      <View style={styles.badgesRow}>
        <View style={[styles.difficultyBadge, styles[`difficulty_${difficulty}`]]}>
          <Text style={styles.difficultyText}>
            {difficulty === 'basic' ? 'BÁSICO'
              : difficulty === 'medium' ? 'MEDIO'
              : 'AVANZADO'}
          </Text>
        </View>
        <View style={styles.roundsBadge}>
          <Text style={styles.difficultyText}>{totalRounds} RONDAS</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Jugadores ({players.length}/8)</Text>
      <FlatList
        data={players}
        keyExtractor={(p) => p.playerId}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={[styles.playerDot, item.isConnected && styles.playerDotActive]} />
            <Text style={styles.playerName}>{item.nickname}</Text>
            {item.isHost && <Text style={styles.hostBadge}>HOST</Text>}
          </View>
        )}
        style={styles.playerList}
      />

      {isHost ? (
        <TouchableOpacity
          style={[styles.startBtn, players.length < 2 && styles.startBtnDisabled]}
          onPress={handleStart}
        >
          <Text style={styles.startBtnText}>INICIAR JUEGO</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.waitingMsg}>
          <Text style={styles.waitingText}>Esperando que el host inicie...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white, textAlign: 'center', marginTop: 40, letterSpacing: 4 },
  codeBox: {
    backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 20,
    alignItems: 'center', marginVertical: 24, borderWidth: 2, borderColor: Colors.accent,
  },
  codeLabel: { color: Colors.primaryLight, fontSize: 13, marginBottom: 4 },
  code: { fontSize: 40, fontWeight: '900', color: Colors.accent, letterSpacing: 10 },
  codeHint: { color: Colors.gray, fontSize: 12, marginTop: 4 },
  badgesRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  difficultyBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  roundsBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1A237E',
  },
  difficulty_basic: { backgroundColor: '#1B5E20' },
  difficulty_medium: { backgroundColor: '#E65100' },
  difficulty_advanced: { backgroundColor: '#B71C1C' },
  difficultyText: { color: Colors.white, fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  playerList: { flex: 1 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryDark, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  playerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gray },
  playerDotActive: { backgroundColor: Colors.green },
  playerName: { flex: 1, color: Colors.white, fontSize: 16, fontWeight: '600' },
  hostBadge: {
    backgroundColor: Colors.accent, color: Colors.dark, fontSize: 11,
    fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  startBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginTop: 16,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { fontSize: 20, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },
  waitingMsg: { alignItems: 'center', paddingVertical: 20 },
  waitingText: { color: Colors.primaryLight, fontSize: 15, fontStyle: 'italic' },
});
