import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Game } from '../entities/game.entity';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;   // cada 5 minutos
const WAITING_TIMEOUT_MS  = 30 * 60 * 1000;  // sala de espera: 30 min
const PLAYING_TIMEOUT_MS  = 2 * 60 * 60 * 1000; // partida activa: 2 horas

@Injectable()
export class GameCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameCleanupService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
  ) {}

  onModuleInit() {
    // Limpieza inmediata al arrancar y luego periódica
    this.cleanup();
    this.interval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  async cleanup() {
    const now = Date.now();

    const waitingCutoff = new Date(now - WAITING_TIMEOUT_MS);
    const playingCutoff = new Date(now - PLAYING_TIMEOUT_MS);

    const [waitingResult, playingResult] = await Promise.all([
      this.gameRepo.createQueryBuilder()
        .update()
        .set({ status: 'finished' })
        .where('status = :status AND updatedAt < :cutoff', { status: 'waiting', cutoff: waitingCutoff })
        .execute(),

      this.gameRepo.createQueryBuilder()
        .update()
        .set({ status: 'finished' })
        .where('status = :status AND updatedAt < :cutoff', { status: 'playing', cutoff: playingCutoff })
        .execute(),
    ]);

    const total = (waitingResult.affected ?? 0) + (playingResult.affected ?? 0);
    if (total > 0) {
      this.logger.log(
        `Limpieza: ${waitingResult.affected} en espera + ${playingResult.affected} activas → cerradas`,
      );
    }
  }
}
