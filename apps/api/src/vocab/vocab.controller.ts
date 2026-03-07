import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { VocabService } from './vocab.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('vocab')
@UseGuards(JwtAuthGuard, AdminGuard)
export class VocabController {
  constructor(
    private readonly vocabService: VocabService,
    private readonly dictionaryService: DictionaryService,
  ) { }

  @Get('search-by-letters')
  searchByLetters(
    @Query('letters') letters: string,
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
  ) {
    const letterArray = (letters ?? '').toUpperCase().split('').filter(Boolean);
    if (letterArray.length === 0) return { words: [], count: 0 };
    const words = this.dictionaryService.searchByLetters(letterArray, Math.min(limit, 500));
    return { words, count: words.length };
  }

  @Get()
  list(
    @Query('search') search = '',
    @Query('letters') letters = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    if (letters) {
      const matchingWords = this.dictionaryService.searchByLetters(
        letters.toUpperCase().split('').filter(Boolean),
        10_000,
      );
      return this.vocabService.listByWords(matchingWords, page, Math.min(limit, 200));
    }
    return this.vocabService.list(search, page, Math.min(limit, 200));
  }

  @Post()
  create(@Body('word') word: string, @Body('frequency') frequency?: number) {
    return this.vocabService.create(word, frequency);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { word?: string; isActive?: boolean; frequency?: number },
  ) {
    return this.vocabService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.vocabService.remove(id);
  }
}
