import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import LogoMain from '../../assets/logo_main.svg';

type Props = StackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LogoMain width={280} height={124} />
        <Text style={styles.subtitle}>¡Forma palabras y suma puntos!</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnPrimaryText}>INICIAR SESIÓN</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.btnSecondaryText}>REGISTRARSE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Guest')}>
          <Text style={styles.btnGhostText}>Jugar como invitado</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 56 },
  subtitle: { color: Colors.primaryLight, fontSize: 16, marginTop: 14, fontStyle: 'italic' },
  buttons: { gap: 14 },
  btnPrimary: {
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', elevation: 4,
  },
  btnPrimaryText: { fontSize: 18, fontWeight: '900', color: Colors.dark, letterSpacing: 2 },
  btnSecondary: {
    backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.accent,
  },
  btnSecondaryText: { fontSize: 18, fontWeight: '700', color: Colors.accent, letterSpacing: 2 },
  btnGhost: { alignItems: 'center', paddingVertical: 14 },
  btnGhostText: { color: Colors.primaryLight, fontSize: 16, textDecorationLine: 'underline' },
});
