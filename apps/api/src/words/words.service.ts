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
    const normalized = this.normalize(word);

    if (normalized.includes(' ')) {
      return this.invalid(word, 'compound_word');
    }

    if (!this.hasLettersInOrder(normalized, baseLetters)) {
      return this.invalid(word, 'order');
    }

    if (!this.dictionary.exists(normalized)) {
      return this.invalid(word, 'not_found');
    }

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
      const normalizedPrev = this.normalize(previousWord);
      if (normalized.includes(normalizedPrev)) {
        return this.invalid(word, 'builds_on_previous');
      }
    }

    return this.calculateScore(word, normalized);
  }

  normalize(word: string): string {
    return word.trim().toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, (c, offset, str) => {
        const base = str[offset - 1];
        if ('AEIOU'.includes(base)) return '';
        return c;
      })
      .normalize('NFC');
  }

  private hasLettersInOrder(word: string, targetLetters: SpanishLetter[]): boolean {
    if (targetLetters.length === 0) return true;
    if (word.length < targetLetters.length) return false;

    let targetIdx = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word[i] as SpanishLetter;
      const currentTarget = targetLetters[targetIdx];

      if (char === currentTarget) {
        targetIdx++;
        if (targetIdx === targetLetters.length) return true;
      } else {
        if (targetLetters.includes(char, targetIdx)) {
          return false;
        }
      }
    }
    return false;
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
