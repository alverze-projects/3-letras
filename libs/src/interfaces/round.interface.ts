import type { SpanishLetter } from '../constants/game-rules';
import type { ITurn } from './turn.interface';

export interface IRound {
  id: string;
  gameId: string;
  roundNumber: number;
  letters: [SpanishLetter, SpanishLetter] | [SpanishLetter, SpanishLetter, SpanishLetter];
  dieResult: number;
  turns: ITurn[];
  isComplete: boolean;
}

export interface IRoundSummary {
  roundNumber: number;
  letters: [SpanishLetter, SpanishLetter] | [SpanishLetter, SpanishLetter, SpanishLetter];
  dieResult: number;
  scores: Array<{ playerId: string; nickname: string; roundScore: number }>;
}
