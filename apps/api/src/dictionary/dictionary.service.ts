import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocabEntry } from '../entities/vocab-entry.entity';

@Injectable()
export class DictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryService.name);
  private words: Set<string> = new Set();

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
      const BATCH = 10_000;
      let offset = 0;
      let fetched: VocabEntry[];

      do {
        fetched = await this.vocabRepo
          .createQueryBuilder('v')
          .select('v.word')
          .where('v.isActive = :active', { active: true })
          .skip(offset)
          .take(BATCH)
          .getMany();

        for (const entry of fetched) {
          this.words.add(entry.word.toLowerCase());
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
    await this.loadFromDatabase();
    return this.words.size;
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

  private hasLettersInOrder(word: string, letters: string[]): boolean {
    let searchFrom = 0;
    for (const letter of letters) {
      const idx = word.indexOf(letter, searchFrom);
      if (idx === -1) return false;
      searchFrom = idx + 1;
    }
    return true;
  }

  exists(word: string): boolean {
    return this.words.has(word.toLowerCase().trim());
  }

  get size(): number {
    return this.words.size;
  }
}
