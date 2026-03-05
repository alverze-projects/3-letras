import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VocabEntry } from '../entities/vocab-entry.entity';
import { DictionaryService } from './dictionary.service';

@Module({
  imports: [TypeOrmModule.forFeature([VocabEntry])],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule { }
