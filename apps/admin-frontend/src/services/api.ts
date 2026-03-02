import axios from 'axios';
import type { IGameSummary } from '@3letras/interfaces';

const TOKEN_KEY = 'admin_token';

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface IAdminTurn {
  id: string;
  playerId: string;
  nickname: string;
  turnNumber: number;
  word: string | null;
  score: number;
  isValid: boolean;
  status: string;
  invalidReason: string | null;
}

export interface IAdminRound {
  id: string;
  roundNumber: number;
  letters: string[];
  dieResult: number;
  isComplete: boolean;
  turns: IAdminTurn[];
}

export interface IAdminPlayer {
  playerId: string;
  nickname: string;
  totalScore: number;
  isHost: boolean;
}

export interface IAdminGameDetail {
  id: string;
  code: string;
  status: string;
  difficulty: string;
  totalRounds: number;
  hostId: string;
  createdAt: string;
  updatedAt: string;
  players: IAdminPlayer[];
  rounds: IAdminRound[];
}

export const adminApi = {
  login: (email: string, password: string) =>
    http.post<{ accessToken: string }>('/auth/login', { email, password }).then((r) => r.data),

  listGames: () =>
    http.get<{ games: IGameSummary[]; total: number }>('/games/all').then((r) => r.data),

  getGameDetail: (id: string) =>
    http.get<IAdminGameDetail>(`/games/admin/${id}`).then((r) => r.data),
};
