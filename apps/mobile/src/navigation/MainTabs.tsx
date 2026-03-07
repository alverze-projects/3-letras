import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, Text, Animated, Easing, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// @ts-ignore - Expo vector icons typing issue
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { Colors } from '../theme/colors';
import { useSound } from '../services/sound';
import { useMusic } from '../contexts/MusicContext';
import MainScreen from '../screens/MainScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import RecordsScreen from '../screens/RecordsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const USE_NATIVE = Platform.OS !== 'web';

function TabIcon({ name, color, focused, label }: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  label: string;
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  const translateAnim = useRef(new Animated.Value(focused ? -10 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Stop any running pulse
    if (pulseRef.current) {
      pulseRef.current.stop();
      pulseRef.current = null;
    }

    if (focused) {
      // Bounce in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 2.5,
          tension: 350,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.spring(translateAnim, {
          toValue: -10,
          friction: 4,
          tension: 200,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.spring(dotScale, {
          toValue: 1,
          friction: 3,
          tension: 350,
          useNativeDriver: USE_NATIVE,
        }),
      ]).start(() => {
        // Start gentle pulse after bounce finishes
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: USE_NATIVE,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: USE_NATIVE,
            }),
          ]),
        );
        pulseRef.current = pulse;
        pulse.start();
      });
    } else {
      // Shrink out
      pulseAnim.setValue(1);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(dotScale, {
          toValue: 0,
          duration: 100,
          useNativeDriver: USE_NATIVE,
        }),
      ]).start();
    }

    return () => {
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseRef.current = null;
      }
    };
  }, [focused]);

  return (
    <Animated.View
      style={[
        styles.tabItem,
        {
          transform: [
            { translateY: translateAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >

      <Animated.View
        style={[
          focused ? styles.iconBubble : styles.iconBubbleInactive,
          focused && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Ionicons
          name={focused ? name : (`${String(name)}-outline` as keyof typeof Ionicons.glyphMap)}
          size={focused ? 28 : 24}
          color={focused ? '#FFF' : color}
        />
      </Animated.View>

      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>

      {/* Active dot indicator */}
      <Animated.View
        style={[
          styles.activeDot,
          { transform: [{ scale: dotScale }], opacity: dotScale },
        ]}
      />
    </Animated.View>
  );
}

export default function MainTabs() {
  const { play: playMusic } = useMusic();
  const { play: playSound } = useSound();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    playMusic('menu');
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Inicio"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0B1D42',
            borderTopWidth: 0,
            height: (Platform.OS === 'ios' ? 88 : 72) + insets.bottom,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
            paddingTop: 10,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.25,
            shadowRadius: 14,
            elevation: 20,
          },
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: 'rgba(150,180,255,0.45)',
        }}
      >
        <Tab.Screen
          name="Clasificacion"
          component={LeaderboardScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="trophy" color={color} focused={focused} label="Ranking" />
            ),
            tabBarLabel: 'Ranking',
          }}
          listeners={{
            tabPress: () => playSound('tick'),
          }}
        />
        <Tab.Screen
          name="Inicio"
          component={MainScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="game-controller" color={color} focused={focused} label="Jugar" />
            ),
            tabBarLabel: 'Jugar',
          }}
          listeners={{
            tabPress: () => playSound('tick'),
          }}
        />
        <Tab.Screen
          name="Records"
          component={RecordsScreen}
          options={{
            title: 'Récords',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="ribbon" color={color} focused={focused} label="Récords" />
            ),
            tabBarLabel: 'Récords',
          }}
          listeners={({ navigation, route }) => ({
            tabPress: () => playSound('tick'),
          })}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    gap: 4,
  },

  iconBubble: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#B89A00',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
  },
  iconBubbleInactive: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(94,146,243,0.15)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(150,180,255,0.45)',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.accent,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(255,214,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 1,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  muteButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: 16,
    zIndex: 100,
    elevation: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11,29,66,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(94,146,243,0.2)',
  },
});
