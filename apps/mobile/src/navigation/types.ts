import type { IGameSettings } from '@3letras/interfaces';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Guest: undefined;
  Main: undefined;
  Lobby: {
    gameCode: string;
    token: string;
    player: { id: string; nickname: string; isGuest: boolean };
    difficulty: 'basic' | 'medium' | 'advanced';
    totalRounds: number;
  };
  Game: {
    gameCode: string;
    token: string;
    player: { id: string; nickname: string; isGuest: boolean };
    settings: IGameSettings;
  };
  Results: {
    gameCode: string;
    finalScores: Array<{ playerId: string; nickname: string; totalScore: number; rank: number }>;
    winnerId: string;
  };
};
