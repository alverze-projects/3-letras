import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { Colors } from '../theme/colors';
import MainScreen from '../screens/MainScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import RecordsScreen from '../screens/RecordsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.primaryDark,
          borderTopWidth: 1,
          borderTopColor: '#1A3A6E',
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.primaryLight,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="trophy" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inicio"
        component={MainScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Records"
        component={RecordsScreen}
        options={{
          tabBarLabel: 'Récords',
          tabBarIcon: ({ color }) => (
            <Ionicons name="ribbon" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
