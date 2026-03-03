import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamePlayer } from '../entities/game-player.entity';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  totalScore: number;
  gamesCount: number;
}

export type LeaderboardDifficulty = 'general' | 'basic' | 'medium' | 'advanced';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(GamePlayer) private readonly gpRepo: Repository<GamePlayer>,
  ) {}

  async getLeaderboard(difficulty: string, limit: number): Promise<LeaderboardEntry[]> {
    const qb = this.gpRepo
      .createQueryBuilder('gp')
      .select('gp.userId', 'userId')
      .addSelect('u.nickname', 'nickname')
      .addSelect('SUM(gp.totalScore)', 'totalScore')
      .addSelect('COUNT(gp.id)', 'gamesCount')
      .innerJoin('gp.user', 'u')
      .innerJoin('gp.game', 'g')
      .where('g.status = :status', { status: 'finished' })
      .groupBy('gp.userId')
      .addGroupBy('u.nickname')
      .orderBy('SUM(gp.totalScore)', 'DESC')
      .limit(limit);

    if (difficulty !== 'general') {
      qb.andWhere('g.difficulty = :difficulty', { difficulty });
    }

    const raw = await qb.getRawMany();

    return raw.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: r.nickname,
      totalScore: parseInt(r.totalScore, 10) || 0,
      gamesCount: parseInt(r.gamesCount, 10) || 0,
    }));
  }

  async getMyEntry(userId: string, difficulty: string): Promise<LeaderboardEntry | null> {
    // Puntuación y partidas del usuario
    const myQb = this.gpRepo
      .createQueryBuilder('gp')
      .select('u.nickname', 'nickname')
      .addSelect('SUM(gp.totalScore)', 'totalScore')
      .addSelect('COUNT(gp.id)', 'gamesCount')
      .innerJoin('gp.user', 'u')
      .innerJoin('gp.game', 'g')
      .where('g.status = :status', { status: 'finished' })
      .andWhere('gp.userId = :userId', { userId })
      .groupBy('gp.userId')
      .addGroupBy('u.nickname');

    if (difficulty !== 'general') {
      myQb.andWhere('g.difficulty = :difficulty', { difficulty });
    }

    const myRaw = await myQb.getRawOne();
    if (!myRaw) return null;

    const myScore = parseInt(myRaw.totalScore, 10) || 0;

    // Contar cuántos jugadores tienen más puntos que yo → mi posición = ese número + 1
    const diffFilter = difficulty !== 'general' ? `AND g.difficulty = '${difficulty}'` : '';
    const countRaw: Array<{ cnt: string }> = await this.gpRepo.manager.query(`
      SELECT COUNT(*) as cnt FROM (
        SELECT gp.userId
        FROM game_players gp
        INNER JOIN games g ON gp.gameId = g.id
        WHERE g.status = 'finished' ${diffFilter}
        GROUP BY gp.userId
        HAVING SUM(gp.totalScore) > ?
      )
    `, [myScore]);

    const rank = (parseInt(countRaw[0]?.cnt ?? '0', 10) || 0) + 1;

    return {
      rank,
      userId,
      nickname: myRaw.nickname,
      totalScore: myScore,
      gamesCount: parseInt(myRaw.gamesCount, 10) || 0,
    };
  }
}
