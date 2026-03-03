import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Record } from '../entities/record.entity';
import { Turn } from '../entities/turn.entity';
import { User } from '../entities/user.entity';

export const RECORD_TYPES = {
  MOST_WORDS_IN_ROUND: 'most_words_in_round',
} as const;

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record) private readonly recordRepo: Repository<Record>,
    @InjectRepository(Turn)   private readonly turnRepo: Repository<Turn>,
    @InjectRepository(User)   private readonly userRepo: Repository<User>,
  ) {}

  async getAll(): Promise<Record[]> {
    return this.recordRepo.find();
  }

  /**
   * Llamado al finalizar cada ronda. Cuenta las palabras válidas por jugador
   * y actualiza el récord si alguien lo supera.
   */
  async checkMostWordsInRound(
    roundId: string,
    gameId: string,
    letters: string[],
  ): Promise<void> {
    // Contar palabras válidas (submitted + isValid) por jugador en esta ronda
    const turns = await this.turnRepo.find({
      where: { roundId, isValid: true, status: 'submitted' },
    });

    if (turns.length === 0) return;

    const countByPlayer = new Map<string, number>();
    for (const turn of turns) {
      countByPlayer.set(turn.playerId, (countByPlayer.get(turn.playerId) ?? 0) + 1);
    }

    // Mejor jugador de esta ronda
    let bestPlayerId = '';
    let bestCount = 0;
    for (const [playerId, count] of countByPlayer) {
      if (count > bestCount) { bestCount = count; bestPlayerId = playerId; }
    }

    if (bestCount === 0) return;

    // Comparar con el récord actual
    const current = await this.recordRepo.findOneBy({ type: RECORD_TYPES.MOST_WORDS_IN_ROUND });
    if (current && bestCount <= current.value) return;

    const user = await this.userRepo.findOneBy({ id: bestPlayerId });
    if (!user) return;

    if (current) {
      current.holderId      = bestPlayerId;
      current.holderNickname = user.nickname;
      current.value          = bestCount;
      current.gameId         = gameId;
      current.roundId        = roundId;
      current.letters        = letters;
      await this.recordRepo.save(current);
    } else {
      await this.recordRepo.save(this.recordRepo.create({
        type:            RECORD_TYPES.MOST_WORDS_IN_ROUND,
        holderId:        bestPlayerId,
        holderNickname:  user.nickname,
        value:           bestCount,
        gameId,
        roundId,
        letters,
      }));
    }
  }
}
