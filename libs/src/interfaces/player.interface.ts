export interface IPlayer {
  id: string;
  nickname: string;
  isGuest: boolean;
  email?: string;
  createdAt: string;
}

export interface IGamePlayer {
  playerId: string;
  nickname: string;
  totalScore: number;
  isHost: boolean;
  isConnected: boolean;
}
