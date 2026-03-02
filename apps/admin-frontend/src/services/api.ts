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

export interface IUserSummary {
  id: string;
  nickname: string;
  email: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  gamesPlayed: number;
  createdAt: string;
}

export interface CreateUserDto {
  nickname: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

export interface UpdateUserDto {
  nickname?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
}

export const adminApi = {
  login: (email: string, password: string) =>
    http.post<{ accessToken: string }>('/auth/login', { email, password }).then((r) => r.data),

  listGames: (filters?: { status?: string; code?: string }) =>
    http.get<{ games: IGameSummary[]; total: number }>('/games/all', { params: filters }).then((r) => r.data),

  getGameDetail: (id: string) =>
    http.get<IAdminGameDetail>(`/games/admin/${id}`).then((r) => r.data),

  forceFinishGame: (id: string) =>
    http.patch(`/games/admin/${id}/finish`),

  deleteGame: (id: string) =>
    http.delete(`/games/admin/${id}`),

  listUsers: () =>
    http.get<{ users: IUserSummary[]; total: number }>('/users').then((r) => r.data),

  createUser: (dto: CreateUserDto) =>
    http.post<IUserSummary>('/users', dto).then((r) => r.data),

  updateUser: (id: string, dto: UpdateUserDto) =>
    http.patch<IUserSummary>(`/users/${id}`, dto).then((r) => r.data),

  deleteUser: (id: string) =>
    http.delete(`/users/${id}`),

  getUserGames: (id: string) =>
    http.get<IUserGame[]>(`/users/${id}/games`).then((r) => r.data),

  getAdmob: () =>
    http.get<IAdmobConfig>('/admob').then((r) => r.data),

  updateAdmob: (dto: Partial<IAdmobConfig>) =>
    http.put<IAdmobConfig>('/admob', dto).then((r) => r.data),

  listVocab: (params: { search?: string; page?: number; limit?: number }) =>
    http.get<IVocabList>('/vocab', { params }).then((r) => r.data),

  createVocabWord: (word: string) =>
    http.post<IVocabEntry>('/vocab', { word }).then((r) => r.data),

  updateVocabWord: (id: string, data: { word?: string; isActive?: boolean }) =>
    http.patch<IVocabEntry>(`/vocab/${id}`, data).then((r) => r.data),

  deleteVocabWord: (id: string) =>
    http.delete(`/vocab/${id}`),
};

export interface IVocabEntry {
  id: string;
  word: string;
  isActive: boolean;
  createdAt: string;
}

export interface IVocabList {
  words: IVocabEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IAdmobConfig {
  id: string;
  enabled: boolean;
  testMode: boolean;
  androidAppId: string | null;
  bannerAndroid: string | null;
  interstitialAndroid: string | null;
  rewardedAndroid: string | null;
  iosAppId: string | null;
  bannerIos: string | null;
  interstitialIos: string | null;
  rewardedIos: string | null;
  updatedAt: string;
}

export interface IUserGame {
  id: string;
  code: string;
  status: string;
  difficulty: string;
  totalRounds: number;
  score: number;
  isHost: boolean;
  createdAt: string;
}
