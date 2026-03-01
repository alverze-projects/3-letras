import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WordsService } from './words.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { ValidateWordDto, ValidateWordResponseDto } from '@3letras/dtos';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Post('validate')
  validate(@Body() dto: ValidateWordDto): ValidateWordResponseDto {
    const result = this.wordsService.validate(dto.word, dto.baseLetters);
    return { result };
  }
}
