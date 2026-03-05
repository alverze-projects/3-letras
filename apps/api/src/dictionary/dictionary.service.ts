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

  exists(word: string): boolean {
    return this.words.has(word.toLowerCase().trim());
  }

  get size(): number {
    return this.words.size;
  }
}
