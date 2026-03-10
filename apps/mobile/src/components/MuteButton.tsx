import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useSound } from '../services/sound';
import { useMusic } from '../contexts/MusicContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  style?: ViewStyle;
  absolute?: boolean;
}

export default function MuteButton({ style, absolute = false }: Props) {
  const { muted: soundMuted, toggleMute: toggleSound } = useSound();
  const { toggleMute: toggleMusic } = useMusic();
  const insets = useSafeAreaInsets();

  const handleToggle = () => {
    toggleSound();
    toggleMusic();
  };

  return (
    <TouchableOpacity 
      onPress={handleToggle} 
      style={[
        styles.btn, 
        absolute && { position: 'absolute', top: Math.max(insets.top, 16), right: 16, zIndex: 999 },
        style
      ]}
    >
      <Ionicons name={soundMuted ? 'volume-mute' : 'volume-high'} size={26} color={Colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
