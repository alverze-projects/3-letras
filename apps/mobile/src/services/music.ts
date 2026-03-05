import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MusicTrack = 'menu' | 'game';

const TRACKS: Record<MusicTrack, number> = {
    menu: require('../../assets/music/lo-fi_game.mp3'),
    game: require('../../assets/music/puzzle_game.mp3'),
};

const MUTE_KEY = '@tresletras_music_muted';
const FADE_STEPS = 15;
const FADE_INTERVAL = 40; // ms per step → ~600ms total fade
const DEFAULT_VOLUME = 0.35;

class MusicManager {
    private sounds: Partial<Record<MusicTrack, Audio.Sound>> = {};
    private currentTrack: MusicTrack | null = null;
    private muted = false;
    private volume = DEFAULT_VOLUME;
    private fading = false;

    /** Load mute preference from storage */
    async init(): Promise<void> {
        try {
            const val = await AsyncStorage.getItem(MUTE_KEY);
            this.muted = val === '1';
        } catch { /* ignore */ }
    }

    /** Play a track with optional crossfade from the current one */
    async play(track: MusicTrack): Promise<void> {
        if (this.currentTrack === track) return;

        // Fade out current
        if (this.currentTrack && this.sounds[this.currentTrack]) {
            await this.fadeOut(this.sounds[this.currentTrack]!);
        }

        this.currentTrack = track;

        // Create or reuse the sound
        if (!this.sounds[track]) {
            try {
                const { sound } = await Audio.Sound.createAsync(TRACKS[track], {
                    shouldPlay: false,
                    isLooping: true,
                    volume: 0,
                });
                this.sounds[track] = sound;
            } catch {
                return;
            }
        }

        const sound = this.sounds[track]!;

        try {
            await sound.setPositionAsync(0);
            await sound.setVolumeAsync(0);
            if (!this.muted) {
                await sound.playAsync();
                await this.fadeIn(sound);
            }
        } catch { /* ignore */ }
    }

    /** Stop all music */
    async stop(): Promise<void> {
        if (this.currentTrack && this.sounds[this.currentTrack]) {
            await this.fadeOut(this.sounds[this.currentTrack]!);
        }
        this.currentTrack = null;
    }

    /** Toggle mute and persist the preference */
    async toggleMute(): Promise<boolean> {
        this.muted = !this.muted;
        try {
            await AsyncStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
        } catch { /* ignore */ }

        if (this.currentTrack && this.sounds[this.currentTrack]) {
            const sound = this.sounds[this.currentTrack]!;
            if (this.muted) {
                await this.fadeOut(sound);
            } else {
                await sound.playAsync();
                await this.fadeIn(sound);
            }
        }
        return this.muted;
    }

    get isMuted(): boolean {
        return this.muted;
    }

    /** Gradually increase volume */
    private fadeIn(sound: Audio.Sound): Promise<void> {
        return new Promise((resolve) => {
            if (this.fading) { resolve(); return; }
            this.fading = true;
            let step = 0;
            const interval = setInterval(async () => {
                step++;
                const vol = (step / FADE_STEPS) * this.volume;
                try { await sound.setVolumeAsync(Math.min(vol, this.volume)); } catch { /* */ }
                if (step >= FADE_STEPS) {
                    clearInterval(interval);
                    this.fading = false;
                    resolve();
                }
            }, FADE_INTERVAL);
        });
    }

    /** Gradually decrease volume then pause */
    private fadeOut(sound: Audio.Sound): Promise<void> {
        return new Promise((resolve) => {
            let step = FADE_STEPS;
            const interval = setInterval(async () => {
                step--;
                const vol = (step / FADE_STEPS) * this.volume;
                try { await sound.setVolumeAsync(Math.max(vol, 0)); } catch { /* */ }
                if (step <= 0) {
                    clearInterval(interval);
                    try { await sound.pauseAsync(); } catch { /* */ }
                    resolve();
                }
            }, FADE_INTERVAL);
        });
    }

    /** Unload all sounds */
    async unload(): Promise<void> {
        for (const s of Object.values(this.sounds)) {
            try { await s?.unloadAsync(); } catch { /* */ }
        }
        this.sounds = {};
        this.currentTrack = null;
    }
}

export const musicManager = new MusicManager();
