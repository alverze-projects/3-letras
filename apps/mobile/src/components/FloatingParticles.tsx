import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Dimensions, View, Easing, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STAR_COUNT = 28;
const USE_NATIVE = Platform.OS !== 'web';

interface StarConfig {
    x: number;
    y: number;
    size: number;
    delay: number;
    twinkleDuration: number;
    driftX: number;
    driftY: number;
    driftDuration: number;
    scalePulse: number;
}

function generateStars(): StarConfig[] {
    return Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * SCREEN_W,
        y: Math.random() * SCREEN_H,
        size: 2 + Math.random() * 5,
        delay: Math.random() * 4000,
        twinkleDuration: 1200 + Math.random() * 2000,
        // Drift: random direction and distance
        driftX: (Math.random() - 0.5) * 80,
        driftY: (Math.random() - 0.5) * 60,
        driftDuration: 4000 + Math.random() * 6000,
        scalePulse: 1.3 + Math.random() * 0.7,
    }));
}

function Star({ config }: { config: StarConfig }) {
    const opacity = useRef(new Animated.Value(0.1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Twinkle: fade in/out
        const twinkle = Animated.loop(
            Animated.sequence([
                Animated.delay(config.delay),
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: config.twinkleDuration,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(opacity, {
                    toValue: 0.1,
                    duration: config.twinkleDuration,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
            ]),
        );

        // Drift horizontally
        const driftH = Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: config.driftX,
                    duration: config.driftDuration,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(translateX, {
                    toValue: -config.driftX * 0.6,
                    duration: config.driftDuration * 1.2,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: config.driftDuration * 0.8,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
            ]),
        );

        // Drift vertically
        const driftV = Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, {
                    toValue: config.driftY,
                    duration: config.driftDuration * 0.9,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(translateY, {
                    toValue: -config.driftY * 0.7,
                    duration: config.driftDuration * 1.1,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: config.driftDuration * 0.7,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
            ]),
        );

        // Scale pulse
        const scalePulse = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: config.scalePulse,
                    duration: config.twinkleDuration * 1.2,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(scale, {
                    toValue: 0.6,
                    duration: config.twinkleDuration * 1.4,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
                Animated.timing(scale, {
                    toValue: 1,
                    duration: config.twinkleDuration * 0.8,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: USE_NATIVE,
                }),
            ]),
        );

        twinkle.start();
        driftH.start();
        driftV.start();
        scalePulse.start();

        return () => {
            twinkle.stop();
            driftH.stop();
            driftV.stop();
            scalePulse.stop();
        };
    }, []);

    return (
        <Animated.View
            style={[
                styles.star,
                {
                    left: config.x,
                    top: config.y,
                    width: config.size,
                    height: config.size,
                    borderRadius: config.size / 2,
                    opacity,
                    transform: [
                        { translateX },
                        { translateY },
                        { scale },
                    ],
                },
            ]}
        />
    );
}

/**
 * Estrellas/sparkles decorativos que flotan en el fondo.
 * Inspirados en las estrellas de la caja oficial del juego.
 */
export default function FloatingParticles() {
    const stars = useMemo(() => generateStars(), []);

    return (
        <View style={styles.container} pointerEvents="none">
            {stars.map((config, i) => (
                <Star key={i} config={config} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    star: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        // Glow effect
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 2,
    },
});
