import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, AudioPlayer } from 'expo-audio';

export type MusicTrack = 'menu' | 'game';

// Pre-load assets instead of requiring inline to fix Expo Go module loading
const TRACKS = {
    menu: Asset.fromModule(require('../../assets/music/lo-fi_game.mp3')),
    game: Asset.fromModule(require('../../assets/music/puzzle_game.mp3')),
};

function getTrackSource(track: MusicTrack) {
    return TRACKS[track];
}

const MUTE_KEY = '@tresletras_music_muted';
const DEFAULT_VOLUME = 0.35;

class MusicManager {
    private players: Partial<Record<MusicTrack, AudioPlayer>> = {};
    private currentTrack: MusicTrack | null = null;
    private muted = false;
    private audioReady = false;

    async init(): Promise<void> {
        try {
            const val = await AsyncStorage.getItem(MUTE_KEY);
            this.muted = val === '1';
        } catch { /* ignore */ }

        // Ensure audio mode is set
        try {
            await setAudioModeAsync({
                playsInSilentMode: true,
                shouldPlayInBackground: false,
            });
            await setIsAudioActiveAsync(true);
            this.audioReady = true;
        } catch (e) {
            console.warn('[MusicManager] Audio module not available:', e);
            this.audioReady = false;
        }
    }

    async play(track: MusicTrack): Promise<void> {
        if (!this.audioReady) return;
        if (this.currentTrack === track) return;

        // Pause current
        if (this.currentTrack && this.players[this.currentTrack]) {
            try { this.players[this.currentTrack]!.pause(); } catch { /* */ }
        }

        this.currentTrack = track;

        // Create or reuse the player
        if (!this.players[track]) {
            try {
                const player = createAudioPlayer(getTrackSource(track));
                player.loop = true;
                this.players[track] = player;
            } catch (e) {
                console.warn('[MusicManager] Failed to create player:', e);
                return;
            }
        }

        const player = this.players[track]!;

        try {
            if (!this.muted) {
                player.volume = DEFAULT_VOLUME;
                player.seekTo(0);
                player.play();
            } else {
                player.volume = 0;
            }
        } catch (e) {
            console.warn('[MusicManager] Failed to play:', e);
        }
    }

    async stop(): Promise<void> {
        if (this.currentTrack && this.players[this.currentTrack]) {
            try { this.players[this.currentTrack]!.pause(); } catch { /* */ }
            this.currentTrack = null;
        }
    }

    async toggleMute(): Promise<boolean> {
        this.muted = !this.muted;
        try {
            await AsyncStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
        } catch { /* ignore */ }

        if (this.currentTrack && this.players[this.currentTrack]) {
            const player = this.players[this.currentTrack]!;
            if (this.muted) {
                try {
                    player.volume = 0;
                    player.pause();
                } catch { /* */ }
            } else {
                try {
                    player.volume = DEFAULT_VOLUME;
                    player.play();
                } catch { /* ignore */ }
            }
        }
        return this.muted;
    }

    get isMuted(): boolean {
        return this.muted;
    }

    async unload(): Promise<void> {
        for (const player of Object.values(this.players)) {
            try { if (player) player.remove(); } catch { /* */ }
        }
        this.players = {};
        this.currentTrack = null;
    }
}

export const musicManager = new MusicManager();
