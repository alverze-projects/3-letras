import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';

export type SoundName =
  | 'button_tap'
  | 'card_flip'
  | 'card_match'
  | 'victory'
  | 'defeat'
  | 'error'
  | 'success'
  | 'tick'
  | 'round_start'
  | 'turn_start'
  | 'valid_word'
  | 'invalid_word'
  | 'skip'
  | 'timer_end'
  | 'round_end';

const FILES: Record<SoundName, number> = {
  button_tap: require('../../assets/sounds/button_tap.wav'),
  card_flip: require('../../assets/sounds/button_tap.wav'),
  card_match: require('../../assets/sounds/valid_word.wav'),
  victory: require('../../assets/sounds/victory.wav'),
  defeat: require('../../assets/sounds/defeat.wav'),
  error: require('../../assets/sounds/invalid_word.wav'),
  success: require('../../assets/sounds/valid_word.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  round_start: require('../../assets/sounds/round_start.wav'),
  turn_start: require('../../assets/sounds/turn_start.wav'),
  valid_word: require('../../assets/sounds/valid_word.wav'),
  invalid_word: require('../../assets/sounds/invalid_word.wav'),
  skip: require('../../assets/sounds/skip.wav'),
  timer_end: require('../../assets/sounds/timer_end.wav'),
  round_end: require('../../assets/sounds/round_end.wav'),
};

const MUTE_KEY = '@tresletras_sound_muted';
const SOUND_VOLUME = 0.5;

interface SoundContextValue {
  muted: boolean;
  toggleMute: () => Promise<void>;
  play: (name: SoundName) => void;
}

const SoundContext = createContext<SoundContextValue>({
  muted: false,
  toggleMute: async () => { },
  play: () => { },
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
        });
      } catch (err) {
        console.warn('Silent Mode init error SFX', err);
      }
    };
    initAudio();
  }, []);

  // Create all players via useAudioPlayer hook (now safe with patched ExpoAudio.js)
  const pButtonTap = useAudioPlayer(FILES.button_tap);
  const pCardFlip = useAudioPlayer(FILES.card_flip);
  const pCardMatch = useAudioPlayer(FILES.card_match);
  const pVictory = useAudioPlayer(FILES.victory);
  const pDefeat = useAudioPlayer(FILES.defeat);
  const pError = useAudioPlayer(FILES.error);
  const pSuccess = useAudioPlayer(FILES.success);
  const pTick = useAudioPlayer(FILES.tick);
  const pRoundStart = useAudioPlayer(FILES.round_start);
  const pTurnStart = useAudioPlayer(FILES.turn_start);
  const pValidWord = useAudioPlayer(FILES.valid_word);
  const pInvalidWord = useAudioPlayer(FILES.invalid_word);
  const pSkip = useAudioPlayer(FILES.skip);
  const pTimerEnd = useAudioPlayer(FILES.timer_end);
  const pRoundEnd = useAudioPlayer(FILES.round_end);

  const playersRef = useRef<Record<SoundName, AudioPlayer>>({
    button_tap: pButtonTap,
    card_flip: pCardFlip,
    card_match: pCardMatch,
    victory: pVictory,
    defeat: pDefeat,
    error: pError,
    success: pSuccess,
    tick: pTick,
    round_start: pRoundStart,
    turn_start: pTurnStart,
    valid_word: pValidWord,
    invalid_word: pInvalidWord,
    skip: pSkip,
    timer_end: pTimerEnd,
    round_end: pRoundEnd,
  });

  useEffect(() => {
    playersRef.current = {
      button_tap: pButtonTap,
      card_flip: pCardFlip,
      card_match: pCardMatch,
      victory: pVictory,
      defeat: pDefeat,
      error: pError,
      success: pSuccess,
      tick: pTick,
      round_start: pRoundStart,
      turn_start: pTurnStart,
      valid_word: pValidWord,
      invalid_word: pInvalidWord,
      skip: pSkip,
      timer_end: pTimerEnd,
      round_end: pRoundEnd,
    };
  }, [
    pButtonTap, pCardFlip, pCardMatch, pVictory, pDefeat, pError, pSuccess,
    pTick, pRoundStart, pTurnStart, pValidWord, pInvalidWord, pSkip, pTimerEnd, pRoundEnd,
  ]);

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY).then((val) => {
      setMuted(val === '1');
    });
  }, []);

  const toggleMute = async () => {
    const newMute = !muted;
    setMuted(newMute);
    try {
      await AsyncStorage.setItem(MUTE_KEY, newMute ? '1' : '0');
    } catch { /* ignore */ }
  };

  const play = React.useCallback((name: SoundName) => {
    if (muted) return;
    const player = playersRef.current[name];
    if (!player) return;

    player.volume = SOUND_VOLUME;
    try { player.seekTo(0); } catch { /* ignore */ }
    try { player.play(); } catch { /* ignore */ }
  }, [muted]);

  return (
    <SoundContext.Provider value={{ muted, toggleMute, play }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}
