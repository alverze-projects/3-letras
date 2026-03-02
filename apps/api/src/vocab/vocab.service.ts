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
  ) {}

  async list(search: string, page: number, limit: number): Promise<VocabListResult> {
    const where = search ? { word: ILike(`%${search}%`) } : {};
    const [words, total] = await this.repo.findAndCount({
      where,
      order: { word: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { words, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(word: string): Promise<VocabEntry> {
    const normalized = word.trim();
    const exists = await this.repo.findOneBy({ word: normalized });
    if (exists) throw new ConflictException('La palabra ya existe en el diccionario');
    const entry = this.repo.create({ word: normalized });
    return this.repo.save(entry);
  }

  async update(id: string, data: { word?: string; isActive?: boolean }): Promise<VocabEntry> {
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

    return this.repo.save(entry);
  }

  async remove(id: string): Promise<void> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Palabra no encontrada');
    await this.repo.remove(entry);
  }
}
