import { Injectable } from '@nestjs/common';
import { DictionaryService } from '../dictionary/dictionary.service';
import {
  LETTER_POINTS,
  BONUS_RULES,
  SPECIAL_LETTERS,
  SpanishLetter,
} from '@3letras/constants/game-rules';
import type { DifficultyLevel } from '@3letras/interfaces';
import type { IWordValidationResult } from '@3letras/interfaces';

@Injectable()
export class WordsService {
  constructor(private readonly dictionary: DictionaryService) { }

  validate(
    word: string,
    baseLetters: SpanishLetter[],
    difficulty: DifficultyLevel = 'medium',
    previousWord: string | null = null,
  ): IWordValidationResult {
    const normalized = this.dictionary.normalize(word);

    if (normalized.includes(' ')) {
      return this.invalid(word, 'compound_word');
    }

    if (!this.dictionary.hasLettersInOrder(normalized, baseLetters)) {
      return this.invalid(word, 'order');
    }

    if (!this.dictionary.exists(normalized)) {
      return this.invalid(word, 'not_found');
    }

    const correctWord = this.dictionary.getOriginal(normalized);

    // Avanzado: si las letras base incluyen una especial, la palabra debe contenerla
    if (difficulty === 'advanced') {
      const baseHasSpecial = baseLetters.some(
        (l) => (SPECIAL_LETTERS as readonly string[]).includes(l),
      );
      if (baseHasSpecial) {
        const wordHasSpecial = normalized.split('').some(
          (c) => (SPECIAL_LETTERS as readonly string[]).includes(c),
        );
        if (!wordHasSpecial) return this.invalid(word, 'no_special_letter');
      }
    }

    // Avanzado: no puede construir sobre la palabra anterior (contenerla)
    if (difficulty === 'advanced' && previousWord) {
      const normalizedPrev = this.dictionary.normalize(previousWord);
      if (normalized.includes(normalizedPrev)) {
        return this.invalid(correctWord, 'builds_on_previous');
      }
    }

    return this.calculateScore(correctWord, normalized);
  }

  normalize(word: string): string {
    return this.dictionary.normalize(word);
  }

  private calculateScore(originalWord: string, normalizedWord: string): IWordValidationResult {
    const letterBreakdown: Array<{ letter: string; points: number }> = [];
    let baseScore = 0;

    for (const char of normalizedWord) {
      const letter = char as SpanishLetter;
      const points = LETTER_POINTS[letter] ?? 2;
      letterBreakdown.push({ letter: char, points });
      baseScore += points;
    }

    const bonuses: Array<{ reason: string; points: number }> = [];
    const wordLength = normalizedWord.length;
    const specialCount = normalizedWord
      .split('')
      .filter((c) => (SPECIAL_LETTERS as readonly string[]).includes(c)).length;

    if (wordLength >= BONUS_RULES.LONG_WORD_16.minLength) {
      bonuses.push({ reason: `${wordLength} letras (≥16)`, points: BONUS_RULES.LONG_WORD_16.bonus });
    } else if (wordLength >= BONUS_RULES.LONG_WORD_14.minLength) {
      bonuses.push({ reason: `${wordLength} letras (≥14)`, points: BONUS_RULES.LONG_WORD_14.bonus });
    }

    if (specialCount >= BONUS_RULES.SPECIAL_LETTERS_3.minSpecialCount) {
      bonuses.push({
        reason: `${specialCount} letras especiales (≥3)`,
        points: BONUS_RULES.SPECIAL_LETTERS_3.bonus,
      });
    }

    const totalBonus = bonuses.reduce((sum, b) => sum + b.points, 0);

    return {
      word: originalWord,
      isValid: true,
      score: baseScore + totalBonus,
      letterBreakdown,
      bonuses,
    };
  }

  private invalid(
    word: string,
    reason: 'order' | 'not_found' | 'compound_word' | 'no_special_letter' | 'builds_on_previous',
  ): IWordValidationResult {
    return {
      word,
      isValid: false,
      score: 0,
      letterBreakdown: [],
      bonuses: [],
      invalidReason: reason,
    };
  }
}
