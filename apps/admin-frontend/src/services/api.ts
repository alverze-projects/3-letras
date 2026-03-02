import axios from 'axios';
import type { IGameSummary } from '@3letras/interfaces';

const TOKEN_KEY = 'admin_token';

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminApi = {
  login: (email: string, password: string) =>
    http.post<{ accessToken: string }>('/auth/login', { email, password }).then((r) => r.data),

  listGames: () =>
    http.get<{ games: IGameSummary[]; total: number }>('/games/all').then((r) => r.data),
};
