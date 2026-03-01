import axios from 'axios';
import type { IGameSummary } from '@3letras/interfaces';

const http = axios.create({ baseURL: '/api' });

export const adminApi = {
  listGames: () =>
    http.get<{ games: IGameSummary[]; total: number }>('/games/all').then((r) => r.data),
};
