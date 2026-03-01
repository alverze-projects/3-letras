import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../theme/colors';

// Posiciones de los puntos para cada cara [fila (0-2), col (0-2)] en una cuadrícula 3x3
const FACE_DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// Pasos de animación: ms por fotograma, de rápido a lento
const ROLL_STEPS = [50, 55, 60, 68, 80, 95, 114, 138, 168, 204, 248, 300, 360];

interface Props {
  targetValue: number; // 1–6
  onDone?: () => void;
}

function DiceFace({ value, size }: { value: number; size: number }) {
  const dots = FACE_DOTS[value] ?? [];
  const cellSize = size / 3;
  const dotRadius = cellSize * 0.28;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {dots.map(([row, col], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: dotRadius * 2,
            height: dotRadius * 2,
            borderRadius: dotRadius,
            backgroundColor: Colors.dark,
            top: row * cellSize + cellSize / 2 - dotRadius,
            left: col * cellSize + cellSize / 2 - dotRadius,
          }}
        />
      ))}
    </View>
  );
}

export default function DiceAnimation({ targetValue, onDone }: Props) {
  const [face, setFace] = useState(1);
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const DICE_SIZE = 110;

  useEffect(() => {
    setFace(Math.ceil(Math.random() * 6));
    scale.setValue(1);
    rotate.setValue(0);

    let idx = 0;

    function tick() {
      if (idx < ROLL_STEPS.length) {
        const duration = ROLL_STEPS[idx];
        // Cambia cara aleatoria
        setFace(Math.ceil(Math.random() * 6));

        // Ligero "golpe" de escala en cada tick
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.88, duration: duration * 0.3, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.06, duration: duration * 0.4, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: duration * 0.3, useNativeDriver: true }),
        ]).start();

        // Pequeña rotación aleatoria durante el rolleo
        Animated.timing(rotate, {
          toValue: (Math.random() - 0.5) * 0.25,
          duration: duration * 0.5,
          useNativeDriver: true,
        }).start();

        setTimeout(tick, duration);
        idx++;
      } else {
        // Cara final
        setFace(targetValue);

        // Rebote de asentamiento con timing fijo (predecible, no springs que se alargan)
        Animated.parallel([
          Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.28, duration: 160, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.93, duration: 110, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1,    duration: 90,  useNativeDriver: true }),
          ]),
        ]).start(() => onDone?.());
      }
    }

    tick();
  }, [targetValue]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-60deg', '60deg'],
  });

  return (
    <Animated.View
      style={[
        styles.dice,
        { width: DICE_SIZE, height: DICE_SIZE, borderRadius: DICE_SIZE * 0.18 },
        { transform: [{ scale }, { rotate: rotateInterpolate }] },
      ]}
    >
      <DiceFace value={face} size={DICE_SIZE * 0.76} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dice: {
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.cardBorderAccent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
