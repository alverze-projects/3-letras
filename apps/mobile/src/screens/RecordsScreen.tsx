import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { recordsApi, GameRecord } from '../services/api';
import { Colors } from '../theme/colors';
import GradientBackground from '../components/GradientBackground';
import GameCard from '../components/GameCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECORD_META: Record<string, { icon: string; title: string; description: string; unit: (n: number) => string }> = {
  most_words_in_round: {
    icon: '📝',
    title: 'Más palabras en una ronda',
    description: 'Mayor cantidad de palabras válidas formadas con una misma combinación de letras en una sola ronda.',
    unit: (n) => `${n} ${n === 1 ? 'palabra' : 'palabras'}`,
  },
};

function RecordCard({ record }: { record: GameRecord }) {
  const meta = RECORD_META[record.type];
  if (!meta) return null;

  const date = new Date(record.achievedAt).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <GameCard glow>
      {/* Ícono + título */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{meta.icon}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          <Text style={styles.cardDescription}>{meta.description}</Text>
        </View>
      </View>

      {/* Separador */}
      <View style={styles.divider} />

      {/* Récord actual */}
      <View style={styles.holderRow}>
        <View style={styles.crownBadge}>
          <Text style={styles.crownIcon}>👑</Text>
        </View>
        <View style={styles.holderInfo}>
          <Text style={styles.holderNickname}>{record.holderNickname}</Text>
          <Text style={styles.holderValue}>{meta.unit(record.value)}</Text>
        </View>
        <View style={styles.lettersBox}>
          {record.letters.map((l, i) => (
            <View key={i} style={styles.letterChip}>
              <Text style={styles.letterChipText}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.achievedAt}>Logrado el {date}</Text>
    </GameCard>
  );
}

function EmptyCard({ type }: { type: string }) {
  const meta = RECORD_META[type];
  if (!meta) return null;
  return (
    <GameCard style={{ opacity: 0.7 }}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{meta.icon}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{meta.title}</Text>
          <Text style={styles.cardDescription}>{meta.description}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.emptyHolder}>
        <Text style={styles.emptyHolderIcon}>🏅</Text>
        <Text style={styles.emptyHolderText}>¡Nadie lo tiene aún!</Text>
        <Text style={styles.emptyHolderSub}>Sé el primero en establecer este récord.</Text>
      </View>
    </GameCard>
  );
}

export default function RecordsScreen() {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await recordsApi.getAll();
      setRecords(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  const knownTypes = Object.keys(RECORD_META);
  const recordByType = Object.fromEntries(records.map((r) => [r.type, r]));

  return (
    <GradientBackground sparkles={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RÉCORDS</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>No se pudieron cargar los récords</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 40) }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>Récords mundiales de todos los jugadores</Text>
            {knownTypes.map((type) =>
              recordByType[type]
                ? <RecordCard key={type} record={recordByType[type]} />
                : <EmptyCard key={type} type={type} />
            )}
          </ScrollView>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    color: Colors.white, fontSize: 20, fontWeight: '900', letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },

  subtitle: {
    color: Colors.primaryLight, fontSize: 13, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 20,
  },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  cardHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  cardIcon: { fontSize: 32, marginTop: 2 },
  cardHeaderText: { flex: 1, gap: 4 },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: '900' },
  cardDescription: { color: Colors.primaryLight, fontSize: 12, lineHeight: 18 },

  divider: { height: 1, backgroundColor: 'rgba(94, 146, 243, 0.2)', marginVertical: 14 },

  holderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crownBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,214,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  crownIcon: { fontSize: 24 },
  holderInfo: { flex: 1 },
  holderNickname: { color: Colors.white, fontSize: 18, fontWeight: '900' },
  holderValue: {
    color: Colors.accent, fontSize: 15, fontWeight: '700', marginTop: 2,
    textShadowColor: 'rgba(255,214,0,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4,
  },

  lettersBox: { flexDirection: 'row', gap: 5 },
  letterChip: {
    backgroundColor: 'rgba(255,214,0,0.15)', borderRadius: 8,
    width: 30, height: 34, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,214,0,0.3)',
  },
  letterChipText: { color: Colors.accent, fontSize: 14, fontWeight: '900' },

  achievedAt: {
    color: Colors.primaryLight, fontSize: 11,
    marginTop: 12, textAlign: 'right', fontStyle: 'italic',
  },

  emptyHolder: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  emptyHolderIcon: { fontSize: 28 },
  emptyHolderText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  emptyHolderSub: { color: Colors.primaryLight, fontSize: 12, fontStyle: 'italic', textAlign: 'center' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: Colors.primaryLight, fontSize: 15 },
  retryBtn: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  retryText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
});
