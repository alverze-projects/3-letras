import React from 'react';
import {
  View, Text, ScrollView, StyleSheet
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useSound } from '../services/sound';
import GradientBackground from '../components/GradientBackground';
import GameButton from '../components/GameButton';
import GameCard from '../components/GameCard';
import AnimatedLogo from '../components/AnimatedLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
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
            <AnimatedLogo width={280} height={100} />
          </View>

          {/* Objetivo */}
          <Section title="🎯  Objetivo">
            <Text style={styles.body}>
              Formar palabras que contengan las tres letras base sorteadas respetando el orden en el que aparecen.{'\n'}
              Gana quien acumule más puntos al final de todas las rondas.
            </Text>
          </Section>

          {/* Letras base */}
          <Section title="🔤  Las letras base">
            <Text style={styles.body}>
              Al inicio de cada ronda se sortean 2 o 3 letras (depende del nivel). Tu palabra debe contenerlas{' '}
              <Text style={styles.accent}>en ese orden</Text> (no tienen que estar seguidas) pero puedes añadir otras letras antes, en medio o después de cada letra base para formar la palabra.
            </Text>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleLetters}>C – A – S</Text>
              <View style={styles.exampleList}>
                <Text style={styles.exampleValid}>✔ Válidas: CASA, CARACAS, CLASIFICAR</Text>
                <Text style={styles.exampleInvalid}>✘ No válidas: SACA, ACCIONES, SECCIONAR (no respetan el orden de aparición)</Text>
              </View>
            </View>

            <View style={[styles.exampleBox, { marginTop: 12 }]}>
              <Text style={styles.exampleLetters}>A – R – O</Text>
              <View style={styles.exampleList}>
                <Text style={styles.exampleValid}>✔ Válidas: AEROPUERTO, CATARRO, APARTAMENTO</Text>
                <Text style={styles.exampleInvalid}>✘ No válidas: ROMA, RAMON, RADIO</Text>
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
              <ScoreRow label="Letra normal: (A-Z)" points="2 pts" />
              <ScoreRow label="Letra especial: (Ñ, W, X, Y, Z)" points="4 pts" />
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
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 32) }]}>
          {canGoBack ? (
            <GameButton title="Cerrar" variant="secondary" onPress={handleClose} />
          ) : (
            <GameButton title="¡ENTENDIDO, A JUGAR!" onPress={handleContinue} shadowHeight={5} />
          )}
        </View>
      </View>
    </GradientBackground >
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },

  header: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 280,
    height: 100,
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
