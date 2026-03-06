import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    /** Show accent (yellow) glow border (default: false) */
    glow?: boolean;
}

/**
 * Tarjeta estilo videojuego con fondo semi-transparente y borde sutil.
 * Opcionalmente con glow amarillo dorado para destacar.
 */
export default function GameCard({ children, style, glow = false }: Props) {
    return (
        <View
            style={[
                styles.card,
                glow && styles.cardGlow,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.cardBg,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(94, 146, 243, 0.3)',
    },
    cardGlow: {
        borderColor: Colors.cardGlow,
        borderWidth: 2,
        // Simulated glow using shadow
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
});
