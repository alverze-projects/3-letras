import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, AudioPlayer } from 'expo-audio';

export type SoundName =
  | 'valid_word'
  | 'invalid_word'
  | 'skip'
  | 'turn_start'
  | 'tick'
  | 'timer_end'
  | 'round_start'
  | 'round_end'
  | 'victory'
  | 'defeat'
  | 'button_tap'
  | 'record';

const FILES: Record<SoundName, number> = {
  valid_word: require('../../assets/sounds/valid_word.wav'),
  invalid_word: require('../../assets/sounds/invalid_word.wav'),
  skip: require('../../assets/sounds/skip.wav'),
  turn_start: require('../../assets/sounds/turn_start.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  timer_end: require('../../assets/sounds/timer_end.wav'),
  round_start: require('../../assets/sounds/round_start.wav'),
  round_end: require('../../assets/sounds/round_end.wav'),
  victory: require('../../assets/sounds/victory.wav'),
  defeat: require('../../assets/sounds/defeat.wav'),
  button_tap: require('../../assets/sounds/button_tap.wav'),
  record: require('../../assets/sounds/record.wav'),
};

class SoundManager {
  private cache: Partial<Record<SoundName, AudioPlayer>> = {};
  private ready = false;

  async preload(): Promise<void> {
    if (this.ready) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      await setIsAudioActiveAsync(true);
      for (const name of Object.keys(FILES) as SoundName[]) {
        const player = createAudioPlayer(FILES[name]);
        this.cache[name] = player;
      }
      this.ready = true;
    } catch (e) {
      console.warn('[SoundManager] Audio module not available:', e);
      this.ready = false;
    }
  }

  play(name: SoundName): void {
    const player = this.cache[name];
    if (!player) return;

    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      // ignore playback errors
    }
  }

  async unload(): Promise<void> {
    for (const player of Object.values(this.cache)) {
      try {
        if (player) {
          player.remove();
        }
      } catch (e) {
        // ignore
      }
    }
    this.cache = {};
    this.ready = false;
  }
}

export const soundManager = new SoundManager();
