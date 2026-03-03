import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

const VALID_DIFFICULTIES = ['general', 'basic', 'medium', 'advanced'];

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
    @Query('difficulty') difficulty: string = 'general',
    @Query('userId') userId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'general';
    const safeLimit = Math.min(limit, 100);

    const [entries, myEntry] = await Promise.all([
      this.leaderboardService.getLeaderboard(safeDifficulty, safeLimit),
      userId ? this.leaderboardService.getMyEntry(userId, safeDifficulty) : Promise.resolve(null),
    ]);

    return { entries, myEntry };
  }
}
