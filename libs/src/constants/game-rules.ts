export const SPANISH_ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;

export const SPECIAL_LETTERS = ['Ñ', 'W', 'X', 'Y', 'Z'] as const;

export type SpanishLetter = typeof SPANISH_ALPHABET[number];
export type SpecialLetter = typeof SPECIAL_LETTERS[number];

export const LETTER_POINTS: Record<SpanishLetter, number> = {
  A: 2, B: 2, C: 2, D: 2, E: 2, F: 2, G: 2, H: 2, I: 2,
  J: 2, K: 2, L: 2, M: 2, N: 2, Ñ: 4, O: 2, P: 2, Q: 2,
  R: 2, S: 2, T: 2, U: 2, V: 2, W: 4, X: 4, Y: 4, Z: 4,
};

export const BONUS_RULES = {
  LONG_WORD_14: { minLength: 14, maxLength: 15, bonus: 5 },
  LONG_WORD_16: { minLength: 16, bonus: 10 },
  SPECIAL_LETTERS_3: { minSpecialCount: 3, bonus: 15 },
} as const;

export const TURN_DURATION_MS = 15_000;

export const DIE_MIN = 1;
export const DIE_MAX = 6;

export const DECKS_COUNT = 3;
export const CARDS_PER_DECK = 27;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const ROOM_CODE_LENGTH = 5;
