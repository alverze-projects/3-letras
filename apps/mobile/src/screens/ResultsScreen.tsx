import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';

type Props = StackScreenProps<RootStackParamList, 'Results'>;

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ResultsScreen({ navigation, route }: Props) {
  const { finalScores, winnerId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡FIN DEL JUEGO!</Text>
      <Text style={styles.subtitle}>Resultados finales</Text>

      <FlatList
        data={finalScores}
        keyExtractor={(item) => item.playerId}
        renderItem={({ item }) => (
          <View style={[styles.scoreRow, item.playerId === winnerId && styles.winnerRow]}>
            <Text style={styles.rank}>{MEDALS[item.rank - 1] ?? `#${item.rank}`}</Text>
            <Text style={styles.nickname}>{item.nickname}</Text>
            <Text style={styles.score}>{item.totalScore} pts</Text>
          </View>
        )}
        style={styles.list}
      />

      <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}>
        <Text style={styles.homeBtnText}>VOLVER AL INICIO</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  title: { fontSize: 36, fontWeight: '900', color: Colors.accent, textAlign: 'center', marginTop: 60, letterSpacing: 4 },
  subtitle: { color: Colors.primaryLight, fontSize: 16, textAlign: 'center', marginBottom: 32 },
  list: { flex: 1 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primaryDark, borderRadius: 12, padding: 16, marginBottom: 10,
  },
  winnerRow: { borderWidth: 2, borderColor: Colors.accent, backgroundColor: '#1A3A6E' },
  rank: { fontSize: 28, width: 40 },
  nickname: { flex: 1, color: Colors.white, fontSize: 18, fontWeight: '600' },
  score: { color: Colors.accent, fontSize: 20, fontWeight: '900' },
  homeBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginTop: 16,
  },
  homeBtnText: { fontSize: 18, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },
});
