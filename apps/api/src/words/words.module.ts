import { Module } from '@nestjs/common';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';
import { DictionaryModule } from '../dictionary/dictionary.module';

@Module({
  imports: [DictionaryModule],
  providers: [WordsService],
  controllers: [WordsController],
  exports: [WordsService],
})
export class WordsModule {}
