import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { musicManager, type MusicTrack } from '../services/music';

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
    const pendingTrack = useRef<MusicTrack | null>(null);
    const initDone = useRef(false);
    const audioUnlocked = useRef(Platform.OS !== 'web');

    function tryPlayPending() {
        if (initDone.current && audioUnlocked.current && pendingTrack.current) {
            musicManager.play(pendingTrack.current);
        }
    }

    useEffect(() => {
        musicManager.init().then(() => {
            setMuted(musicManager.isMuted);
            initDone.current = true;
            tryPlayPending();
        });
        return () => { musicManager.unload(); };
    }, []);

    // Web: unlock audio on first user interaction
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        function handleInteraction() {
            if (audioUnlocked.current) return;
            audioUnlocked.current = true;
            tryPlayPending();
            document.removeEventListener('click', handleInteraction, true);
            document.removeEventListener('touchstart', handleInteraction, true);
            document.removeEventListener('keydown', handleInteraction, true);
        }

        // Use capture phase to catch the event as early as possible
        document.addEventListener('click', handleInteraction, true);
        document.addEventListener('touchstart', handleInteraction, true);
        document.addEventListener('keydown', handleInteraction, true);

        return () => {
            document.removeEventListener('click', handleInteraction, true);
            document.removeEventListener('touchstart', handleInteraction, true);
            document.removeEventListener('keydown', handleInteraction, true);
        };
    }, []);

    const toggleMute = useCallback(async () => {
        const newMuted = await musicManager.toggleMute();
        setMuted(newMuted);
    }, []);

    const play = useCallback(async (track: MusicTrack) => {
        pendingTrack.current = track;
        if (!initDone.current || !audioUnlocked.current) return;
        await musicManager.play(track);
    }, []);

    const stop = useCallback(async () => {
        pendingTrack.current = null;
        await musicManager.stop();
    }, []);

    return (
        <MusicContext.Provider value={{ muted, toggleMute, play, stop }}>
            {children}
        </MusicContext.Provider>
    );
}

export function useMusic() {
    return useContext(MusicContext);
}
