import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import LogoMain from '../../assets/logo_main.svg';

interface Props {
    width?: number;
    height?: number;
}

/**
 * Logo animado con:
 * 1. Balanceo suave tipo péndulo (±6°)
 * 2. Pulso sutil de escala (1 → 1.04 → 1)
 * 3. Glow/sombra amarilla animada detrás
 */
export default function AnimatedLogo({ width = 300, height = 133 }: Props) {
    const swingAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Swing pendulum
        const swing = Animated.loop(
            Animated.sequence([
                Animated.timing(swingAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(swingAnim, {
                    toValue: -1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(swingAnim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );

        // Subtle pulse
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.04,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );

        swing.start();
        pulse.start();
        return () => { swing.stop(); pulse.stop(); };
    }, [swingAnim, pulseAnim]);

    const rotate = swingAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-6deg', '0deg', '6deg'],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ rotate }, { scale: pulseAnim }],
                },
            ]}
        >
            <LogoMain width={width} height={height} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {},
});
