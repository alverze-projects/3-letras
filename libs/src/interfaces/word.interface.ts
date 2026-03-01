import type { SpanishLetter } from '../constants/game-rules';

export interface IWordValidationRequest {
  word: string;
  baseLetters: [SpanishLetter, SpanishLetter, SpanishLetter] | [SpanishLetter, SpanishLetter];
}

export interface IWordValidationResult {
  word: string;
  isValid: boolean;
  score: number;
  letterBreakdown: Array<{ letter: string; points: number }>;
  bonuses: Array<{ reason: string; points: number }>;
  invalidReason?: 'order' | 'not_found' | 'compound_word' | 'no_special_letter' | 'builds_on_previous' | 'already_used';
}
