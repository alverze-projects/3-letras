export type TurnStatus = 'pending' | 'active' | 'submitted' | 'skipped' | 'timeout';

export interface ITurn {
  id: string;
  roundId: string;
  playerId: string;
  turnNumber: number;
  word: string | null;
  score: number;
  isValid: boolean;
  status: TurnStatus;
  invalidReason?: string;
  submittedAt: string | null;
}

export interface IActiveTurn {
  turnId: string;
  playerId: string;
  nickname: string;
  startedAt: string;
  timeoutAt: string;
}
