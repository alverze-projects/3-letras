import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type MusicTrack = 'menu' | 'game';

const MUTE_KEY = '@tresletras_music_muted';
const DEFAULT_VOLUME = 0.35;

const TRACKS = {
    menu: require('../../assets/music/lo-fi_game.mp3'),
    game: require('../../assets/music/puzzle_game.mp3'),
};

interface MusicContextValue {
    muted: boolean;
    toggleMute: () => Promise<void>;
    play: (track: MusicTrack) => Promise<void>;
    stop: () => Promise<void>;
    unlockAudioWeb: () => void;
}

const MusicContext = createContext<MusicContextValue>({
    muted: false,
    toggleMute: async () => { },
    play: async () => { },
    stop: async () => { },
    unlockAudioWeb: () => { },
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
    const [muted, setMuted] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
    const currentTrackRef = useRef<MusicTrack | null>(null);

    const pendingTrack = useRef<MusicTrack | null>(null);
    const initDone = useRef(false);
    const audioUnlocked = useRef(Platform.OS !== 'web');

    const menuPlayer = useAudioPlayer(TRACKS.menu);
    const gamePlayer = useAudioPlayer(TRACKS.game);

    if (menuPlayer) menuPlayer.loop = true;
    if (gamePlayer) gamePlayer.loop = true;

    // Initialize Global Audio Session (Production Fix)
    useEffect(() => {
        const initAudio = async () => {
            try {
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: false,
                    interruptionMode: 'doNotMix',
                });
            } catch (err) {
                console.warn('Silent Mode init error', err);
            }
        };
        initAudio();
    }, []);

    const getPlayer = (track: MusicTrack | null) => {
        if (track === 'menu') return menuPlayer;
        if (track === 'game') return gamePlayer;
        return null;
    };

    useEffect(() => {
        AsyncStorage.getItem(MUTE_KEY).then((val) => {
            const isMuted = val === '1';
            setMuted(isMuted);
            initDone.current = true;
            if (audioUnlocked.current && pendingTrack.current) {
                playTrack(pendingTrack.current, isMuted);
            }
        });
    }, []);

    // Web: unlock audio natively to bypass React Native Web's async boundaries
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleNativeInteraction = () => {
            if (audioUnlocked.current) return;
            audioUnlocked.current = true;

            // Fire synchronously inside the active browser event tick
            if (initDone.current && pendingTrack.current) {
                // Ensure React's async rendering doesn't yield before the play() natively executes
                playTrack(pendingTrack.current, muted);
            }

            document.removeEventListener('click', handleNativeInteraction, { capture: true } as EventListenerOptions);
            document.removeEventListener('touchstart', handleNativeInteraction, { capture: true } as EventListenerOptions);
        };

        document.addEventListener('click', handleNativeInteraction, { capture: true } as EventListenerOptions);
        document.addEventListener('touchstart', handleNativeInteraction, { capture: true } as EventListenerOptions);

        return () => {
            document.removeEventListener('click', handleNativeInteraction, { capture: true } as EventListenerOptions);
            document.removeEventListener('touchstart', handleNativeInteraction, { capture: true } as EventListenerOptions);
        };
    }, [menuPlayer, gamePlayer, muted]);

    const unlockAudioWeb = () => { }; // No-op now since we handle it natively

    const playTrack = async (track: MusicTrack, isMuted: boolean) => {
        const prev = currentTrackRef.current;
        if (prev && prev !== track) {
            const prevPlayer = getPlayer(prev);
            if (prevPlayer) {
                try { prevPlayer.pause(); } catch { /* */ }
            }
        }

        const nextPlayer = getPlayer(track);
        if (!nextPlayer) return;

        currentTrackRef.current = track;
        setCurrentTrack(track);

        if (!isMuted) {
            nextPlayer.volume = DEFAULT_VOLUME;

            if (Platform.OS === 'web') {
                const mediaElement = (nextPlayer as any).media as HTMLAudioElement;
                if (mediaElement) {
                    if (mediaElement.currentTime > 0) {
                        try { mediaElement.currentTime = 0; } catch { /* */ }
                    }
                    try {
                        const playPromise = mediaElement.play();
                        if (playPromise && typeof playPromise.catch === 'function') {
                            playPromise.catch(() => { });
                        }
                    } catch (e) {
                        // silent catch
                    }
                } else {
                    try { nextPlayer.seekTo(0); nextPlayer.play(); } catch { /* */ }
                }
            } else {
                try {
                    nextPlayer.seekTo(0);
                } catch { /* */ }

                try {
                    nextPlayer.play();
                } catch (e) {
                    console.warn('[Music] Native track play failed:', e);
                }
            }
        } else {
            nextPlayer.volume = 0;
        }
    };

    const toggleMute = useCallback(async () => {
        const newMuted = !muted;
        setMuted(newMuted);
        try {
            await AsyncStorage.setItem(MUTE_KEY, newMuted ? '1' : '0');
        } catch { /* ignore */ }

        if (currentTrack) {
            const player = getPlayer(currentTrack);
            if (player) {
                if (newMuted) {
                    try {
                        player.volume = 0;
                        player.pause();
                    } catch { /* */ }
                } else {
                    try {
                        player.volume = DEFAULT_VOLUME;
                        player.play();
                    } catch { /* */ }
                }
            }
        }
    }, [muted, currentTrack]);

    const play = useCallback(async (track: MusicTrack) => {
        pendingTrack.current = track;
        if (!initDone.current) return;
        if (Platform.OS === 'web' && !audioUnlocked.current) return;
        playTrack(track, muted);
    }, [muted]);

    const stop = useCallback(async () => {
        pendingTrack.current = null;
        if (currentTrack) {
            const player = getPlayer(currentTrack);
            if (player) {
                try { player.pause(); } catch { /* */ }
            }
            setCurrentTrack(null);
        }
    }, [currentTrack]);

    // Handle initial track play once players load
    useEffect(() => {
        if (!initDone.current) return;
        if (Platform.OS === 'web' && !audioUnlocked.current) return;
        if (pendingTrack.current && (menuPlayer || gamePlayer)) {
            playTrack(pendingTrack.current, muted);
        }
    }, [menuPlayer, gamePlayer, muted]);

    return (
        <MusicContext.Provider value={{ muted, toggleMute, play, stop, unlockAudioWeb }}>
            {children}
        </MusicContext.Provider>
    );
}

export function useMusic() {
    return useContext(MusicContext);
}
