import type { IGamePlayer } from './player.interface';
import type { IRound } from './round.interface';

export type GameStatus = 'waiting' | 'playing' | 'finished';
export type DifficultyLevel = 'basic' | 'medium' | 'advanced';

export interface IGameSettings {
  difficulty: DifficultyLevel;
  totalRounds: number;
}

export interface IGame {
  id: string;
  code: string;
  status: GameStatus;
  settings: IGameSettings;
  players: IGamePlayer[];
  currentRound: IRound | null;
  hostId: string;
  createdAt: string;
}

export interface IGameSummary {
  id: string;
  code: string;
  status: GameStatus;
  difficulty: DifficultyLevel;
  playerCount: number;
  createdAt: string;
}
