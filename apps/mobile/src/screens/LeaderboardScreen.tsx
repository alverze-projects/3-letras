import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { leaderboardApi, LeaderboardEntry, LeaderboardDifficulty } from '../services/api';
import { loadSession } from '../services/session';
import { Colors } from '../theme/colors';

const TABS: { key: LeaderboardDifficulty; label: string }[] = [
  { key: 'general',  label: 'General' },
  { key: 'basic',    label: 'Básico' },
  { key: 'medium',   label: 'Medio' },
  { key: 'advanced', label: 'Avanzado' },
];

const MEDAL = ['🥇', '🥈', '🥉'];

const DIFF_COLOR: Record<LeaderboardDifficulty, string> = {
  general:  Colors.accent,
  basic:    '#66BB6A',
  medium:   '#FFA726',
  advanced: '#EF5350',
};

export default function LeaderboardScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<LeaderboardDifficulty>('general');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadSession().then((s) => setUserId(s?.player.id ?? null));
  }, []);

  const load = useCallback(async (difficulty: LeaderboardDifficulty, uid: string | null) => {
    setLoading(true);
    setError(false);
    try {
      const data = await leaderboardApi.get(difficulty, uid ?? undefined);
      setEntries(data.entries);
      setMyEntry(data.myEntry);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar al enfocar el tab o cambiar el tab de dificultad
  useFocusEffect(
    useCallback(() => {
      load(tab, userId);
    }, [tab, userId]),
  );

  // ¿El usuario ya aparece dentro del top visible?
  const myEntryInList = myEntry && userId ? entries.some((e) => e.userId === userId) : false;
  const accentColor = DIFF_COLOR[tab];

  function renderItem({ item }: { item: LeaderboardEntry }) {
    const isMe = !!userId && item.userId === userId;
    const isTop3 = item.rank <= 3;
    return (
      <View style={[styles.row, isTop3 && styles.rowTop, isMe && styles.rowMe]}>
        <View style={styles.rankCol}>
          {isTop3
            ? <Text style={styles.medal}>{MEDAL[item.rank - 1]}</Text>
            : <Text style={[styles.rank, isMe && { color: accentColor }]}>{item.rank}</Text>
          }
        </View>
        <Text style={[styles.nickname, isTop3 && styles.nicknameTop, isMe && { color: accentColor }]} numberOfLines={1}>
          {item.nickname}{isMe ? '  (tú)' : ''}
        </Text>
        <View style={styles.statsCol}>
          <Text style={[styles.score, { color: isMe ? accentColor : DIFF_COLOR[tab] }]}>
            {item.totalScore.toLocaleString('es-CL')}
          </Text>
          <Text style={styles.games}>{item.gamesCount} {item.gamesCount === 1 ? 'partida' : 'partidas'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CLASIFICACIÓN</Text>
      </View>

      {/* Tabs de dificultad */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && { borderBottomColor: DIFF_COLOR[t.key], borderBottomWidth: 3 }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && { color: DIFF_COLOR[t.key], fontWeight: '900' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cabecera de columnas */}
      <View style={styles.colHeader}>
        <View style={styles.rankCol}>
          <Text style={styles.colLabel}>#</Text>
        </View>
        <Text style={[styles.colLabel, { flex: 1 }]}>Jugador</Text>
        <Text style={[styles.colLabel, styles.colRight]}>Puntos</Text>
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo cargar la clasificación</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(tab, userId)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 && !myEntry ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyText}>Aún no hay partidas finalizadas</Text>
          <Text style={styles.emptySubtext}>¡Sé el primero en aparecer aquí!</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.userId + item.rank}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />

          {/* Mi posición fija al pie, solo si NO estoy en el top visible */}
          {myEntry && !myEntryInList && (
            <View style={styles.myEntryWrapper}>
              <View style={styles.myEntrySeparator}>
                <View style={styles.myEntrySeparatorLine} />
                <Text style={styles.myEntrySeparatorText}>Tu posición</Text>
                <View style={styles.myEntrySeparatorLine} />
              </View>
              <View style={[styles.row, styles.rowMe]}>
                <View style={styles.rankCol}>
                  <Text style={[styles.rank, { color: accentColor }]}>{myEntry.rank}</Text>
                </View>
                <Text style={[styles.nickname, { color: accentColor }]} numberOfLines={1}>
                  {myEntry.nickname}  (tú)
                </Text>
                <View style={styles.statsCol}>
                  <Text style={[styles.score, { color: accentColor }]}>
                    {myEntry.totalScore.toLocaleString('es-CL')}
                  </Text>
                  <Text style={styles.games}>{myEntry.gamesCount} {myEntry.gamesCount === 1 ? 'partida' : 'partidas'}</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    alignItems: 'center',
  },
  title: { color: Colors.white, fontSize: 20, fontWeight: '900', letterSpacing: 3 },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Colors.primaryDark,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },

  colHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryDark,
  },
  rankCol: { width: 44, alignItems: 'center' },
  colLabel: { color: Colors.primaryLight, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  colRight: { width: 90, textAlign: 'right' },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryDark,
  },
  rowTop: { backgroundColor: 'rgba(255, 214, 0, 0.05)', borderRadius: 8, marginVertical: 1 },
  rowMe: { backgroundColor: 'rgba(255, 214, 0, 0.08)', borderRadius: 8 },

  rank: { color: Colors.primaryLight, fontSize: 16, fontWeight: '700' },
  medal: { fontSize: 22 },

  nickname: { flex: 1, color: Colors.white, fontSize: 15, marginLeft: 4 },
  nicknameTop: { fontWeight: '700' },

  statsCol: { width: 90, alignItems: 'flex-end' },
  score: { fontSize: 16, fontWeight: '900' },
  games: { color: Colors.primaryLight, fontSize: 11, marginTop: 1 },

  myEntryWrapper: {
    paddingHorizontal: 16, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: Colors.primaryDark,
  },
  myEntrySeparator: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10,
  },
  myEntrySeparatorLine: { flex: 1, height: 1, backgroundColor: Colors.primaryDark },
  myEntrySeparatorText: { color: Colors.primaryLight, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: Colors.primaryLight, fontSize: 15 },
  retryBtn: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  retryText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: Colors.primaryLight, fontSize: 13, fontStyle: 'italic' },
});
