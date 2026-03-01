import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryService.name);
  private words: Set<string> = new Set();

  onModuleInit() {
    const filePath = process.env.DICTIONARY_PATH
      ?? join(process.cwd(), '..', '..', 'files', 'palabras.json');
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const wordList: string[] = JSON.parse(raw);
      this.words = new Set(wordList.map((w) => w.toLowerCase()));
      this.logger.log(`Dictionary loaded: ${this.words.size} words`);
    } catch (err) {
      this.logger.error('Failed to load dictionary', err);
    }
  }

  exists(word: string): boolean {
    return this.words.has(word.toLowerCase().trim());
  }

  get size(): number {
    return this.words.size;
  }
}
