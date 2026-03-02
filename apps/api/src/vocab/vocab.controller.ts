import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { VocabService } from './vocab.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('vocab')
@UseGuards(JwtAuthGuard, AdminGuard)
export class VocabController {
  constructor(private readonly vocabService: VocabService) {}

  @Get()
  list(
    @Query('search') search = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.vocabService.list(search, page, Math.min(limit, 200));
  }

  @Post()
  create(@Body('word') word: string) {
    return this.vocabService.create(word);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { word?: string; isActive?: boolean },
  ) {
    return this.vocabService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.vocabService.remove(id);
  }
}
