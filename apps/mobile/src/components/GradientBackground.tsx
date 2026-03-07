import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import FloatingParticles from './FloatingParticles';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
    /** Show floating sparkle stars (default: true) */
    sparkles?: boolean;
}

/**
 * Fondo degradado azul (fiel a la identidad de la caja del juego).
 * Opcionalmente muestra estrellas/sparkles flotantes para darle "vida".
 */
export default function GradientBackground({ children, style, sparkles = true }: Props) {
    return (
        <LinearGradient
            colors={[Colors.gradientTop, Colors.gradientMid, Colors.gradientBottom]}
            locations={[0, 0.3, 1]}
            style={[styles.gradient, style]}
        >
            {sparkles && <FloatingParticles />}
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
});
