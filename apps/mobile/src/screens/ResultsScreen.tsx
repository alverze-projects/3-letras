import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Animated } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';

type Props = StackScreenProps<RootStackParamList, 'Results'>;

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ResultsScreen({ navigation, route }: Props) {
  const { finalScores, winnerId } = route.params;

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(titleScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Animated.Text style={[styles.title, { transform: [{ scale: titleScale }] }]}>
          ¡FIN DEL JUEGO!
        </Animated.Text>
        <Text style={styles.subtitle}>Resultados finales</Text>

        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <FlatList
            data={finalScores}
            keyExtractor={(item) => item.playerId}
            renderItem={({ item }) => (
              <GameCard
                glow={item.playerId === winnerId}
                style={[styles.scoreRow, item.playerId === winnerId && styles.winnerRow]}
              >
                <View style={styles.scoreContent}>
                  <Text style={styles.rank}>{MEDALS[item.rank - 1] ?? `#${item.rank}`}</Text>
                  <Text style={styles.nickname}>{item.nickname}</Text>
                  <Text style={styles.score}>{item.totalScore} pts</Text>
                </View>
              </GameCard>
            )}
            style={styles.list}
          />
        </Animated.View>

        <GameButton
          title="VOLVER AL INICIO"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
          shadowHeight={5}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: {
    fontSize: 36, fontWeight: '900', color: Colors.accent, textAlign: 'center',
    marginTop: 60, letterSpacing: 4,
    textShadowColor: 'rgba(255,214,0,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  subtitle: { color: Colors.primaryLight, fontSize: 16, textAlign: 'center', marginBottom: 32 },
  list: { flex: 1 },
  scoreRow: { marginBottom: 10, padding: 16 },
  winnerRow: { borderWidth: 2, borderColor: Colors.accent },
  scoreContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { fontSize: 28, width: 40 },
  nickname: { flex: 1, color: Colors.white, fontSize: 18, fontWeight: '600' },
  score: {
    color: Colors.accent, fontSize: 20, fontWeight: '900',
    textShadowColor: 'rgba(255,214,0,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6,
  },
});
