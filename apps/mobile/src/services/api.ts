import axios from 'axios';
import type { AuthResponseDto, GuestLoginDto, LoginDto, RegisterDto } from '@3letras/dtos';
import type { CreateGameDto, CreateGameResponseDto, GetGameResponseDto, JoinGameResponseDto } from '@3letras/dtos';
import type { ValidateWordDto, ValidateWordResponseDto } from '@3letras/dtos';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const http = axios.create({ baseURL: API_URL });

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
  if (token) {
    http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common['Authorization'];
  }
}

export const authApi = {
  guest: (dto: GuestLoginDto) =>
    http.post<AuthResponseDto>('/auth/guest', dto).then((r) => r.data),
  register: (dto: RegisterDto) =>
    http.post<AuthResponseDto>('/auth/register', dto).then((r) => r.data),
  login: (dto: LoginDto) =>
    http.post<AuthResponseDto>('/auth/login', dto).then((r) => r.data),
};

export const gamesApi = {
  create: (dto: CreateGameDto = {}) =>
    http.post<CreateGameResponseDto>('/games', dto).then((r) => r.data),
  join: (code: string) =>
    http.post<JoinGameResponseDto>('/games/join', { code }).then((r) => r.data),
  get: (code: string) =>
    http.get<GetGameResponseDto>(`/games/${code}`).then((r) => r.data),
};

export const wordsApi = {
  validate: (dto: ValidateWordDto) =>
    http.post<ValidateWordResponseDto>('/words/validate', dto).then((r) => r.data),
};

export type LeaderboardDifficulty = 'general' | 'basic' | 'medium' | 'advanced';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  totalScore: number;
  gamesCount: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
}

export interface GameRecord {
  id: string;
  type: string;
  holderId: string;
  holderNickname: string;
  value: number;
  letters: string[];
  achievedAt: string;
}

export const recordsApi = {
  getAll: () =>
    http.get<GameRecord[]>('/records').then((r) => r.data),
};

export const leaderboardApi = {
  get: (difficulty: LeaderboardDifficulty = 'general', userId?: string) =>
    http.get<LeaderboardResponse>('/leaderboard', { params: { difficulty, userId } }).then((r) => r.data),
};
