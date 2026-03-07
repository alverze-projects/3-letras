import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocabEntry } from '../entities/vocab-entry.entity';

@Injectable()
export class DictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryService.name);
  private words: Set<string> = new Set();
  private orderedWords: string[] = [];

  constructor(
    @InjectRepository(VocabEntry)
    private readonly vocabRepo: Repository<VocabEntry>,
  ) { }

  async onModuleInit() {
    await this.loadFromDatabase();
  }

  private async loadFromDatabase(): Promise<void> {
    try {
      const startMs = Date.now();

      // Stream rows in batches to keep memory pressure low during loading
      // DB ordered by ID naturally represents the CREA_Total frequency ranking
      const BATCH = 10_000;
      let offset = 0;
      let fetched: VocabEntry[];

      do {
        fetched = await this.vocabRepo
          .createQueryBuilder('v')
          .select(['v.word', 'v.frequency'])
          .where('v.isActive = :active', { active: true })
          .orderBy('v.frequency', 'DESC')
          .skip(offset)
          .take(BATCH)
          .getMany();

        for (const entry of fetched) {
          const w = entry.word.toLowerCase();
          this.words.add(w);
          this.orderedWords.push(w);
        }
        offset += BATCH;
      } while (fetched.length === BATCH);

      const elapsed = Date.now() - startMs;
      this.logger.log(
        `Dictionary loaded from DB: ${this.words.size} active words in ${elapsed}ms`,
      );
    } catch (err) {
      this.logger.error('Failed to load dictionary from database', err);
    }
  }

  /** Reload the in-memory dictionary (useful after admin changes) */
  async reload(): Promise<number> {
    this.words.clear();
    this.orderedWords = [];
    await this.loadFromDatabase();
    return this.words.size;
  }

  /** O(1) Fetch of a word by its frequency rank (index) */
  getWordByIndex(index: number): string | null {
    if (index < 0 || index >= this.orderedWords.length) return null;
    return this.orderedWords[index];
  }

  /**
   * Find all active dictionary words that contain the given letters in order
   * (same rule as the mobile game).
   */
  searchByLetters(letters: string[], limit = 200): string[] {
    const upperLetters = letters.map((l) => l.toUpperCase());
    const results: string[] = [];

    for (const word of this.words) {
      if (this.hasLettersInOrder(word.toUpperCase(), upperLetters)) {
        results.push(word);
        if (results.length >= limit) break;
      }
    }

    return results.sort((a, b) => a.localeCompare(b, 'es'));
  }

  private hasLettersInOrder(word: string, targetLetters: string[]): boolean {
    if (targetLetters.length === 0) return true;
    if (word.length < targetLetters.length) return false;

    let targetIdx = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const currentTarget = targetLetters[targetIdx];

      if (char === currentTarget) {
        targetIdx++;
        if (targetIdx === targetLetters.length) return true;
      } else {
        // Strict Sequence Rule: If the current character is ANY of the remaining
        // target letters in the sequence, it's breaking the order because
        // it appeared before the required `currentTarget`. 
        // Example: Searching 'LAC' in 'abalance'. Encountering 'a' while looking for 'L' is invalid.
        if (targetLetters.includes(char, targetIdx)) {
          return false;
        }
      }
    }
    return false;
  }

  exists(word: string): boolean {
    return this.words.has(word.toLowerCase().trim());
  }

  get size(): number {
    return this.words.size;
  }
}
