import type { SpanishLetter } from '../constants/game-rules';
import type { IWordValidationResult } from '../interfaces/word.interface';

export interface ValidateWordDto {
  word: string;
  baseLetters: [SpanishLetter, SpanishLetter, SpanishLetter] | [SpanishLetter, SpanishLetter];
}

export interface ValidateWordResponseDto {
  result: IWordValidationResult;
}
