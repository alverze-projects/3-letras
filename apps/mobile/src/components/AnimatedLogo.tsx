import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import LogoMain from '../../assets/logo_main.svg';

interface Props {
    width?: number;
    height?: number;
}

/**
 * Logo con animación de balanceo suave (tipo péndulo).
 * Gira ±6° de forma continua y sin fin usando una interpolación
 * de tipo ease-in-out para que se sienta natural y fluido.
 */
export default function AnimatedLogo({ width = 300, height = 133 }: Props) {
    const swingAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
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
        swing.start();
        return () => swing.stop();
    }, [swingAnim]);

    const rotate = swingAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-6deg', '0deg', '6deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate }] }}>
            <LogoMain width={width} height={height} />
        </Animated.View>
    );
}
