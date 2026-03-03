import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './src/navigation/types';
import { loadSession } from './src/services/session';
import { Colors } from './src/theme/colors';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import GuestScreen from './src/screens/GuestScreen';
import MainScreen from './src/screens/MainScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import InstructionsScreen, { INSTRUCTIONS_SEEN_KEY } from './src/screens/InstructionsScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [instructionsNextRoute, setInstructionsNextRoute] = useState<'Welcome' | 'Main'>('Welcome');

  useEffect(() => {
    Promise.all([
      loadSession(),
      AsyncStorage.getItem(INSTRUCTIONS_SEEN_KEY),
    ]).then(([session, seen]) => {
      const next = session ? 'Main' : 'Welcome';
      if (!seen) {
        setInstructionsNextRoute(next);
        setInitialRoute('Instructions');
      } else {
        setInitialRoute(next);
      }
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false, cardStyle: { flex: 1 } }}
        >
          <Stack.Screen
            name="Instructions"
            component={InstructionsScreen}
            initialParams={{ nextRoute: instructionsNextRoute }}
          />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Guest" component={GuestScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
});
