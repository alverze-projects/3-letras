import type { DifficultyLevel, IGame, IGameSummary } from '../interfaces/game.interface';

export interface CreateGameDto {
  difficulty?: DifficultyLevel;
  totalRounds?: number;
}

export interface JoinGameDto {
  code: string;
}

export interface CreateGameResponseDto {
  game: IGame;
}

export interface JoinGameResponseDto {
  game: IGame;
}

export interface GetGameResponseDto {
  game: IGame;
}

export interface ListGamesResponseDto {
  games: IGameSummary[];
  total: number;
}
