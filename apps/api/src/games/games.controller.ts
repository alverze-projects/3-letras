import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import type {
  CreateGameDto, CreateGameResponseDto, GetGameResponseDto, JoinGameResponseDto, ListGamesResponseDto,
} from '@3letras/dtos';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  async create(
    @Body() dto: CreateGameDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CreateGameResponseDto> {
    const game = await this.gamesService.create(user.id, dto.difficulty, dto.totalRounds);
    return { game };
  }

  @Post('join')
  async join(
    @Body() dto: { code: string },
    @CurrentUser() user: CurrentUserData,
  ): Promise<JoinGameResponseDto> {
    const game = await this.gamesService.join(dto.code, user.id);
    return { game };
  }

  @Get('all')
  @UseGuards(AdminGuard)
  async listAll(): Promise<ListGamesResponseDto> {
    const games = await this.gamesService.listAll();
    return { games, total: games.length };
  }

  @Get(':code')
  async getByCode(@Param('code') code: string): Promise<GetGameResponseDto> {
    const game = await this.gamesService.getByCode(code);
    return { game };
  }
}
