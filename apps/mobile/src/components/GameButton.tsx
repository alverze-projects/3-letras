import React, { useRef } from 'react';
import {
    TouchableOpacity, Text, StyleSheet, Animated,
    ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { Colors } from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
    title: string;
    onPress: () => void;
    variant?: Variant;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    /** Scale amount of the 3D shadow (default 4) */
    shadowHeight?: number;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; shadow: string; border?: string }> = {
    primary: { bg: Colors.accent, text: Colors.dark, shadow: Colors.buttonShadow },
    secondary: { bg: 'transparent', text: Colors.accent, shadow: 'transparent', border: Colors.accent },
    danger: { bg: Colors.red, text: Colors.white, shadow: Colors.buttonShadowRed },
    ghost: { bg: 'transparent', text: Colors.primaryLight, shadow: 'transparent' },
};

/**
 * Botón estilo videojuego con sombra 3D inferior y microanimación press.
 * Inspirado en los botones de los juegos de referencia (Wordling).
 */
export default function GameButton({
    title, onPress, variant = 'primary', loading, disabled,
    style, textStyle, shadowHeight = 4,
}: Props) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const v = VARIANT_STYLES[variant];

    function handlePressIn() {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    }

    function handlePressOut() {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 6,
        }).start();
    }

    const showShadow = variant !== 'ghost' && variant !== 'secondary';

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={0.85}
                style={[
                    styles.button,
                    {
                        backgroundColor: v.bg,
                        borderBottomWidth: showShadow ? shadowHeight : 0,
                        borderBottomColor: v.shadow,
                        borderWidth: v.border ? 2 : 0,
                        borderColor: v.border,
                    },
                    disabled && styles.disabled,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={v.text} size="small" />
                ) : (
                    <Text style={[styles.text, { color: v.text }, textStyle]}>{title}</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
    },
    disabled: {
        opacity: 0.5,
    },
});
