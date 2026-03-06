import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';

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
}

const MusicContext = createContext<MusicContextValue>({
    muted: false,
    toggleMute: async () => { },
    play: async () => { },
    stop: async () => { },
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

    menuPlayer.loop = true;
    gamePlayer.loop = true;

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

    // Web: unlock audio on first user interaction
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        function handleInteraction() {
            if (audioUnlocked.current) return;
            audioUnlocked.current = true;
            if (initDone.current && pendingTrack.current) {
                playTrack(pendingTrack.current, muted);
            }
            document.removeEventListener('click', handleInteraction, true);
            document.removeEventListener('touchstart', handleInteraction, true);
            document.removeEventListener('keydown', handleInteraction, true);
        }

        document.addEventListener('click', handleInteraction, true);
        document.addEventListener('touchstart', handleInteraction, true);
        document.addEventListener('keydown', handleInteraction, true);

        return () => {
            document.removeEventListener('click', handleInteraction, true);
            document.removeEventListener('touchstart', handleInteraction, true);
            document.removeEventListener('keydown', handleInteraction, true);
        };
    }, [muted]);

    const playTrack = (track: MusicTrack, isMuted: boolean) => {
        // Use ref for reliable previous track detection (avoids stale closure)
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
            try { nextPlayer.seekTo(0); } catch { /* */ }
            try { nextPlayer.play(); } catch { /* */ }
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
        if (!initDone.current || !audioUnlocked.current) return;
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

    return (
        <MusicContext.Provider value={{ muted, toggleMute, play, stop }}>
            {children}
        </MusicContext.Provider>
    );
}

export function useMusic() {
    return useContext(MusicContext);
}
