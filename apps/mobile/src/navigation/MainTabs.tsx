import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { Colors } from '../theme/colors';
import MainScreen from '../screens/MainScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import RecordsScreen from '../screens/RecordsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; focused: boolean }) {
  return (
    <View style={focused ? styles.activeIconContainer : undefined}>
      <Ionicons name={name} size={focused ? 24 : 22} color={color} />
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.gradientTop,
          borderTopWidth: 1,
          borderTopColor: 'rgba(94, 146, 243, 0.25)',
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          // Shadow effect on top of tab bar
          shadowColor: Colors.accent,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.primaryLight,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tab.Screen
        name="Clasificacion"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Clasificación',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trophy" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Inicio"
        component={MainScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Records"
        component={RecordsScreen}
        options={{
          tabBarLabel: 'Récords',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="ribbon" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    // Subtle glow under the active tab icon
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
});
