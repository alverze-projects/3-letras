import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { VocabEntry } from '../entities/vocab-entry.entity';

export interface VocabListResult {
  words: VocabEntry[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable()
export class VocabService {
  constructor(
    @InjectRepository(VocabEntry) private readonly repo: Repository<VocabEntry>,
  ) { }

  async list(search: string, page: number, limit: number): Promise<VocabListResult> {
    const where = search ? { word: ILike(`%${search}%`) } : {};
    const [words, total] = await this.repo.findAndCount({
      where,
      order: { frequency: 'DESC', word: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { words, total, page, totalPages: Math.ceil(total / limit) };
  }

  async listByWords(matchingWords: string[], page: number, limit: number): Promise<VocabListResult> {
    if (matchingWords.length === 0) {
      return { words: [], total: 0, page, totalPages: 0 };
    }

    // Paginate over the pre-filtered word list
    const total = matchingWords.length;
    const totalPages = Math.ceil(total / limit);
    const pageWords = matchingWords.slice((page - 1) * limit, page * limit);

    if (pageWords.length === 0) {
      return { words: [], total, page, totalPages };
    }

    // Fetch full VocabEntry objects for this page's words
    const entries = await this.repo
      .createQueryBuilder('v')
      .where('LOWER(v.word) IN (:...words)', { words: pageWords.map((w) => w.toLowerCase()) })
      .orderBy('v.frequency', 'DESC')
      .addOrderBy('v.word', 'ASC')
      .getMany();

    return { words: entries, total, page, totalPages };
  }

  async create(word: string, frequency: number = 0): Promise<VocabEntry> {
    const normalized = word.trim();
    const exists = await this.repo.findOneBy({ word: normalized });
    if (exists) throw new ConflictException('La palabra ya existe en el diccionario');
    const entry = this.repo.create({ word: normalized, frequency });
    return this.repo.save(entry);
  }

  async update(id: string, data: { word?: string; isActive?: boolean; frequency?: number }): Promise<VocabEntry> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Palabra no encontrada');

    if (data.word !== undefined) {
      const normalized = data.word.trim();
      if (normalized !== entry.word) {
        const exists = await this.repo.findOneBy({ word: normalized });
        if (exists) throw new ConflictException('La palabra ya existe en el diccionario');
        entry.word = normalized;
      }
    }

    if (data.isActive !== undefined) entry.isActive = data.isActive;
    if (data.frequency !== undefined) entry.frequency = data.frequency;

    return this.repo.save(entry);
  }

  async remove(id: string): Promise<void> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Palabra no encontrada');
    await this.repo.remove(entry);
  }
}
