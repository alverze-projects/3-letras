import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from './api';

const KEY = '@tresletras_session';

export type Session = {
  token: string;
  player: { id: string; nickname: string; isGuest: boolean; email?: string };
};

export async function saveSession(s: Session): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  setAuthToken(s.token);
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const s: Session = JSON.parse(raw);
    setAuthToken(s.token);
    return s;
  } catch (err) {
    console.warn('Error loading session:', err);
    return null; /* Return null on corrupted session */
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
  setAuthToken(null);
}
