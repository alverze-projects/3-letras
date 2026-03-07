import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useSound } from '../services/sound';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';

export const INSTRUCTIONS_SEEN_KEY = '@tresletras_instructions_seen';

type Props = StackScreenProps<RootStackParamList, 'Instructions'>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GameCard style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </GameCard>
  );
}

function Rule({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleIcon}>{icon}</Text>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

function ScoreRow({ label, points }: { label: string; points: string }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scorePoints}>{points}</Text>
    </View>
  );
}

import { AuthContext } from '../../App';

export default function InstructionsScreen({ navigation, route }: Props) {
  const { play: playSound } = useSound();
  const { session } = React.useContext(AuthContext);
  const nextRoute = route.params?.nextRoute ?? 'Welcome';

  async function handleContinue() {
    playSound('button_tap');
    await AsyncStorage.setItem(INSTRUCTIONS_SEEN_KEY, '1');
    const targetRoute = session ? 'Main' : nextRoute;
    navigation.replace(targetRoute as any);
  }

  function handleClose() {
    playSound('button_tap');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const targetRoute = session ? 'Main' : nextRoute;
      navigation.replace(targetRoute as any);
    }
  }

  const canGoBack = navigation.canGoBack();

  return (
    <GradientBackground>
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado */}
          <View style={styles.header}>
            <Text style={styles.headerSub}>CÓMO SE JUEGA</Text>
            <Text style={styles.headerTitle}>TRES LETRAS</Text>
          </View>

          {/* Objetivo */}
          <Section title="🎯  Objetivo">
            <Text style={styles.body}>
              Forma palabras que contengan las <Text style={styles.accent}>letras base</Text> sorteadas,
              en el mismo orden en que aparecen. Gana quien acumule más puntos al final de todas las rondas.
            </Text>
          </Section>

          {/* Letras base */}
          <Section title="🔤  Las letras base">
            <Text style={styles.body}>
              Al inicio de cada ronda se sortean 2 o 3 letras. Tu palabra debe contenerlas{' '}
              <Text style={styles.accent}>en ese orden</Text>, pero pueden ir en cualquier posición
              dentro de la palabra y con otras letras entre ellas.
            </Text>
            <View style={styles.exampleBox}>
              <Text style={styles.exampleLetters}>B · A · L</Text>
              <View style={styles.exampleList}>
                <Text style={styles.exampleValid}>✓  BALÓN   (B-A-L en orden)</Text>
                <Text style={styles.exampleValid}>✓  BAILE   (B·A····L·E)</Text>
                <Text style={styles.exampleValid}>✓  CÓBALO  (···B-A···L···)</Text>
                <Text style={styles.exampleInvalid}>✗  LABIO   (L aparece antes de B)</Text>
                <Text style={styles.exampleInvalid}>✗  BRAZO   (falta la L)</Text>
              </View>
            </View>
          </Section>

          {/* El dado */}
          <Section title="🎲  El dado">
            <Text style={styles.body}>
              Al inicio de cada ronda, un jugador lanza el dado. El número obtenido indica cuántos{' '}
              <Text style={styles.accent}>turnos tiene cada jugador</Text> en esa ronda.
            </Text>
            <Text style={styles.bodySmall}>
              Si sale un 1, cada uno tendrá solo 1 turno. Si sale un 6, cada uno tendrá 6 oportunidades de sumar puntos.
            </Text>
          </Section>

          {/* Letras especiales */}
          <Section title="⭐  Letras especiales">
            <Text style={styles.body}>
              Las letras <Text style={styles.accentSpecial}>Ñ · W · X · Y · Z</Text> son especiales y valen
              el doble. Si salen como letras base, en dificultad Básica y Media los jugadores{' '}
              <Text style={styles.accent}>votan si aceptarlas</Text> (15 segundos).
            </Text>
          </Section>

          {/* Puntuación */}
          <Section title="🏆  Puntuación">
            <View style={styles.scoreTable}>
              <ScoreRow label="Letra normal (A–Z)" points="2 pts c/u" />
              <ScoreRow label="Letra especial (Ñ W X Y Z)" points="4 pts c/u" />
              <View style={styles.scoreDivider} />
              <ScoreRow label="Palabra de 14+ letras" points="+5 pts" />
              <ScoreRow label="Palabra de 16+ letras" points="+10 pts" />
              <ScoreRow label="3 o más letras especiales en la palabra" points="+15 pts" />
            </View>
          </Section>

          {/* Dificultades */}
          <Section title="⚙️  Dificultades">
            <View style={styles.difficultyList}>
              <View style={[styles.diffCard, styles.diffBasic]}>
                <Text style={styles.diffLabel}>BÁSICO</Text>
                <Rule icon="•" text="2 letras base" />
                <Rule icon="•" text="Letras especiales opcionales (se vota)" />
              </View>
              <View style={[styles.diffCard, styles.diffMedium]}>
                <Text style={styles.diffLabel}>MEDIO</Text>
                <Rule icon="•" text="3 letras base" />
                <Rule icon="•" text="Puedes construir sobre la palabra válida anterior" />
                <Rule icon="•" text="Letras especiales opcionales (se vota)" />
              </View>
              <View style={[styles.diffCard, styles.diffAdvanced]}>
                <Text style={styles.diffLabel}>AVANZADO</Text>
                <Rule icon="•" text="3 letras base" />
                <Rule icon="•" text="No puedes construir sobre la palabra anterior" />
                <Rule icon="•" text="Letra especial obligatoria si sale" />
              </View>
            </View>
          </Section>

          {/* Modo solitario */}
          <Section title="👤  Modo solitario">
            <Text style={styles.body}>
              Si inicias una partida solo, el juego se adapta: no hay dado ni votación, y{' '}
              <Text style={styles.accent}>no hay límite de tiempo</Text> por turno. Toca{' '}
              <Text style={styles.accent}>"Terminar ronda"</Text> cuando quieras pasar a la siguiente.
            </Text>
          </Section>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Botón fijo en la parte inferior */}
        <View style={styles.footer}>
          {canGoBack ? (
            <GameButton title="Cerrar" variant="secondary" onPress={handleClose} />
          ) : (
            <GameButton title="¡ENTENDIDO, A JUGAR!" onPress={handleContinue} shadowHeight={5} />
          )}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },

  header: { alignItems: 'center', marginBottom: 28 },
  headerSub: {
    color: Colors.primaryLight, fontSize: 12, fontWeight: '700',
    letterSpacing: 4, marginBottom: 4,
  },
  headerTitle: {
    fontSize: 48, fontWeight: '900', color: Colors.accent,
    letterSpacing: 4, lineHeight: 52,
    textShadowColor: 'rgba(255,214,0,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },

  section: { marginBottom: 14, gap: 10 },
  sectionTitle: {
    color: Colors.white, fontSize: 16, fontWeight: '900', marginBottom: 2,
  },
  body: { color: Colors.white, fontSize: 14, lineHeight: 22 },
  bodySmall: { color: Colors.primaryLight, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  accent: { color: Colors.accent, fontWeight: '700' },
  accentSpecial: { color: Colors.red, fontWeight: '900' },

  exampleBox: {
    backgroundColor: 'rgba(0, 33, 113, 0.6)', borderRadius: 10, padding: 12, gap: 6,
  },
  exampleLetters: {
    color: Colors.accent, fontSize: 20, fontWeight: '900',
    letterSpacing: 6, textAlign: 'center', marginBottom: 4,
  },
  exampleList: { gap: 3 },
  exampleValid: { color: '#A5D6A7', fontSize: 13, fontWeight: '600' },
  exampleInvalid: { color: '#EF9A9A', fontSize: 13, fontWeight: '600' },

  ruleRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ruleIcon: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 1 },
  ruleText: { flex: 1, color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 20 },

  scoreTable: { gap: 0 },
  scoreRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(94, 146, 243, 0.2)',
  },
  scoreLabel: { color: Colors.white, fontSize: 13, flex: 1 },
  scorePoints: { color: Colors.accent, fontSize: 13, fontWeight: '900' },
  scoreDivider: { height: 6 },

  difficultyList: { gap: 10 },
  diffCard: { borderRadius: 12, padding: 14, gap: 4 },
  diffBasic: { backgroundColor: 'rgba(27, 94, 32, 0.8)' },
  diffMedium: { backgroundColor: 'rgba(230, 81, 0, 0.8)' },
  diffAdvanced: { backgroundColor: 'rgba(183, 28, 28, 0.8)' },
  diffLabel: {
    color: Colors.white, fontSize: 14, fontWeight: '900',
    letterSpacing: 2, marginBottom: 6,
  },

  footer: {
    paddingHorizontal: 20, paddingVertical: 16,
    paddingBottom: 32,
  },
});
