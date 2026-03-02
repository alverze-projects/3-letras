import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VocabEntry } from '../entities/vocab-entry.entity';
import { VocabController } from './vocab.controller';
import { VocabService } from './vocab.service';

@Module({
  imports: [TypeOrmModule.forFeature([VocabEntry])],
  controllers: [VocabController],
  providers: [VocabService],
})
export class VocabModule {}
