import { Audio } from 'expo-av';

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
  valid_word:   require('../../assets/sounds/valid_word.wav'),
  invalid_word: require('../../assets/sounds/invalid_word.wav'),
  skip:         require('../../assets/sounds/skip.wav'),
  turn_start:   require('../../assets/sounds/turn_start.wav'),
  tick:         require('../../assets/sounds/tick.wav'),
  timer_end:    require('../../assets/sounds/timer_end.wav'),
  round_start:  require('../../assets/sounds/round_start.wav'),
  round_end:    require('../../assets/sounds/round_end.wav'),
  victory:      require('../../assets/sounds/victory.wav'),
  defeat:       require('../../assets/sounds/defeat.wav'),
  button_tap:   require('../../assets/sounds/button_tap.wav'),
  record:       require('../../assets/sounds/record.wav'),
};

class SoundManager {
  private cache: Partial<Record<SoundName, Audio.Sound>> = {};
  private ready = false;

  async preload(): Promise<void> {
    if (this.ready) return;
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    await Promise.all(
      (Object.keys(FILES) as SoundName[]).map(async (name) => {
        const { sound } = await Audio.Sound.createAsync(FILES[name], { shouldPlay: false });
        this.cache[name] = sound;
      }),
    );
    this.ready = true;
  }

  play(name: SoundName): void {
    const sound = this.cache[name];
    if (!sound) return;
    sound.setPositionAsync(0).then(() => sound.playAsync()).catch(() => {});
  }

  async unload(): Promise<void> {
    await Promise.all(Object.values(this.cache).map((s) => s?.unloadAsync()));
    this.cache = {};
    this.ready = false;
  }
}

export const soundManager = new SoundManager();
