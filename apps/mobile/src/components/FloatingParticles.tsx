import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STAR_COUNT = 18;

interface StarConfig {
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
}

function generateStars(): StarConfig[] {
    return Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * SCREEN_W,
        y: Math.random() * SCREEN_H,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 3000,
        duration: 2000 + Math.random() * 2000,
    }));
}

function Star({ config }: { config: StarConfig }) {
    const opacity = useRef(new Animated.Value(0.15)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(config.delay),
                Animated.timing(opacity, {
                    toValue: 0.8,
                    duration: config.duration,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.15,
                    duration: config.duration,
                    useNativeDriver: true,
                }),
            ]),
        );
        animation.start();
        return () => animation.stop();
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
    const stars = useRef(generateStars()).current;

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
    },
});
