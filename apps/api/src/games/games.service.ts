import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../entities/game.entity';
import { GamePlayer } from '../entities/game-player.entity';
import { Round } from '../entities/round.entity';
import { Turn } from '../entities/turn.entity';
import { User } from '../entities/user.entity';
import { DictionaryService } from '../dictionary/dictionary.service';
import {
  SPANISH_ALPHABET, SPECIAL_LETTERS, DIE_MIN, DIE_MAX, ROOM_CODE_LENGTH, MAX_PLAYERS,
  SpanishLetter,
} from '@3letras/constants/game-rules';
import type {
  IGame, IGamePlayer, IRound, IGameSummary, DifficultyLevel, ITurn,
} from '@3letras/interfaces';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer) private readonly gpRepo: Repository<GamePlayer>,
    @InjectRepository(Round) private readonly roundRepo: Repository<Round>,
    @InjectRepository(Turn) private readonly turnRepo: Repository<Turn>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dictionaryService: DictionaryService,
  ) { }

  async create(hostId: string, difficulty: DifficultyLevel = 'medium', totalRounds = 5): Promise<IGame> {
    const code = await this.generateUniqueCode();
    const game = this.gameRepo.create({ code, hostId, difficulty, totalRounds, status: 'waiting' });
    await this.gameRepo.save(game);

    const gp = this.gpRepo.create({ gameId: game.id, userId: hostId });
    await this.gpRepo.save(gp);

    return this.toIGame(game);
  }

  async join(code: string, userId: string): Promise<IGame> {
    const game = await this.findByCode(code);
    if (game.status !== 'waiting') throw new BadRequestException('Game already started');

    const players = await this.gpRepo.find({ where: { gameId: game.id } });
    if (players.length >= MAX_PLAYERS) throw new BadRequestException('Game is full');

    const alreadyIn = players.some((p) => p.userId === userId);
    if (!alreadyIn) {
      const gp = this.gpRepo.create({ gameId: game.id, userId });
      await this.gpRepo.save(gp);
    }

    return this.getGameState(game.id);
  }

  async getByCode(code: string): Promise<IGame> {
    const game = await this.findByCode(code);
    return this.getGameState(game.id);
  }

  async getGameState(gameId: string): Promise<IGame> {
    const game = await this.gameRepo.findOneOrFail({
      where: { id: gameId },
      relations: ['gamePlayers', 'gamePlayers.user', 'rounds', 'rounds.turns'],
    });

    const currentRound = game.rounds.find((r) => !r.isComplete) ?? null;

    const players: IGamePlayer[] = game.gamePlayers.map((gp) => ({
      playerId: gp.userId,
      nickname: gp.user.nickname,
      totalScore: gp.totalScore,
      isHost: gp.userId === game.hostId,
      isConnected: true,
    }));

    return {
      id: game.id,
      code: game.code,
      status: game.status as IGame['status'],
      settings: {
        difficulty: game.difficulty as DifficultyLevel,
        totalRounds: game.totalRounds,
      },
      players,
      currentRound: currentRound ? this.toIRound(currentRound) : null,
      hostId: game.hostId,
      createdAt: game.createdAt.toISOString(),
    };
  }

  async createRound(gameId: string, roundNumber: number, difficulty: DifficultyLevel = 'medium'): Promise<IRound> {
    const letterCount = difficulty === 'basic' ? 2 : 3;
    const letters = this.drawLetters(letterCount);
    const dieResult = this.rollDie();

    const round = this.roundRepo.create({
      gameId,
      roundNumber,
      letters,
      dieResult,
      isComplete: false,
    });
    await this.roundRepo.save(round);
    return this.toIRound(round);
  }

  async forceFinish(gameId: string): Promise<void> {
    const result = await this.gameRepo.update(
      { id: gameId },
      { status: 'finished' },
    );
    if (!result.affected) throw new NotFoundException('Partida no encontrada');
  }

  async adminDelete(gameId: string): Promise<void> {
    const game = await this.gameRepo.findOneOrFail({
      where: { id: gameId },
      relations: ['gamePlayers', 'rounds', 'rounds.turns'],
    });
    await this.gameRepo.remove(game);
  }

  async getAdminDetail(gameId: string) {
    const game = await this.gameRepo.findOneOrFail({
      where: { id: gameId },
      relations: ['gamePlayers', 'gamePlayers.user', 'rounds', 'rounds.turns'],
    });

    const playerMap = new Map(game.gamePlayers.map((gp) => [gp.userId, gp]));

    return {
      id: game.id,
      code: game.code,
      status: game.status,
      difficulty: game.difficulty,
      totalRounds: game.totalRounds,
      hostId: game.hostId,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      players: game.gamePlayers
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((gp) => ({
          playerId: gp.userId,
          nickname: gp.user.nickname,
          totalScore: gp.totalScore,
          isHost: gp.userId === game.hostId,
        })),
      rounds: game.rounds
        .sort((a, b) => a.roundNumber - b.roundNumber)
        .map((r) => ({
          id: r.id,
          roundNumber: r.roundNumber,
          letters: r.letters,
          dieResult: r.dieResult,
          isComplete: r.isComplete,
          turns: (r.turns ?? [])
            .sort((a, b) => a.turnNumber - b.turnNumber)
            .map((t) => ({
              id: t.id,
              playerId: t.playerId,
              nickname: playerMap.get(t.playerId)?.user?.nickname ?? '—',
              turnNumber: t.turnNumber,
              word: t.word,
              score: t.score,
              isValid: t.isValid,
              status: t.status,
              invalidReason: t.invalidReason,
            })),
        })),
    };
  }

  async listAll(filters: { status?: string; code?: string } = {}): Promise<IGameSummary[]> {
    const qb = this.gameRepo
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.gamePlayers', 'gp')
      .orderBy('game.createdAt', 'DESC')
      .take(200);

    if (filters.status) {
      qb.andWhere('game.status = :status', { status: filters.status });
    }

    if (filters.code) {
      qb.andWhere('game.code LIKE :code', { code: `%${filters.code.toUpperCase()}%` });
    }

    const games = await qb.getMany();
    return games.map((g) => ({
      id: g.id,
      code: g.code,
      status: g.status as IGameSummary['status'],
      difficulty: g.difficulty as DifficultyLevel,
      playerCount: g.gamePlayers?.length ?? 0,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  async redrawRoundLetters(roundId: string, difficulty: DifficultyLevel): Promise<IRound> {
    const round = await this.roundRepo.findOneOrFail({ where: { id: roundId } });
    const letterCount = difficulty === 'basic' ? 2 : 3;
    round.letters = this.drawLettersNoSpecial(letterCount);
    await this.roundRepo.save(round);
    return this.toIRound(round);
  }

  private drawLetters(count: 2 | 3 = 3): string[] {
    return this.generateDynamicLetters(count, true);
  }

  private drawLettersNoSpecial(count: 2 | 3 = 3): string[] {
    return this.generateDynamicLetters(count, false);
  }

  private generateDynamicLetters(count: number, allowSpecials: boolean): string[] {
    const seedPoolSize = parseInt(process.env.GAME_CONFIG_SEED_POOL_SIZE || '100000', 10);
    const minWordsRequired = parseInt(process.env.GAME_CONFIG_MIN_WORDS_REQUIRED || '20', 10);
    const maxRetries = parseInt(process.env.GAME_CONFIG_MAX_RETRIES || '15', 10);
    const maxDictionarySize = this.dictionaryService.size;
    const effectiveSeedPool = Math.min(seedPoolSize, maxDictionarySize);

    if (effectiveSeedPool < 100) return this.fallbackRandomShuffle(count, allowSpecials);

    let bestCombination: string[] | null = null;
    let maxYield = -1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // 1. Pick a random word from the TOP N most frequent words
      // Using quadratic RNG strongly biases selection towards the heavily-used words near index 0
      const rngIndex = Math.floor(Math.pow(Math.random(), 2) * effectiveSeedPool);
      const seedWord = this.dictionaryService.getWordByIndex(rngIndex);

      if (!seedWord || seedWord.length < count) continue;

      // 2. Extract exactly 'count' letters while preserving their natural sequence
      const indices = new Set<number>();
      while (indices.size < count) {
        indices.add(Math.floor(Math.random() * seedWord.length));
      }

      const sortedIndices = Array.from(indices).sort((a, b) => a - b);
      const extractedLetters = sortedIndices.map(idx => seedWord[idx].toUpperCase());

      // Validate allowed character sets
      if (!allowSpecials) {
        const hasSpecial = extractedLetters.some((l) => (SPECIAL_LETTERS as readonly string[]).includes(l));
        if (hasSpecial) continue;
      }

      // 3. Dry-run the sequence against the entire RAM Dictionary to guarantee playability
      // Limit the internal search to `minWordsRequired` for ultra-fast performance
      const matchingWords = this.dictionaryService.searchByLetters(extractedLetters, minWordsRequired);
      const yieldCount = matchingWords.length;

      if (yieldCount >= minWordsRequired) {
        return extractedLetters; // Successful attempt: Meets the C variable guaranteed minimum
      }

      // 4. Save the highest-yielding fallback just in case we burn through all maxRetries
      if (yieldCount > maxYield) {
        maxYield = yieldCount;
        bestCombination = extractedLetters;
      }
    }

    // 5. If we exhausted retries and no set reached the minimum, fallback to the heaviest combination found
    if (bestCombination && maxYield > 0) return bestCombination;

    // 6. Absolute edge-case fallback (should mathematically never hit with a 400k CREA dictionary)
    return this.fallbackRandomShuffle(count, allowSpecials);
  }

  private fallbackRandomShuffle(count: number, allowSpecials: boolean): string[] {
    let pool = [...SPANISH_ALPHABET];
    if (!allowSpecials) pool = pool.filter((l) => !(SPECIAL_LETTERS as readonly string[]).includes(l));
    return pool.sort(() => Math.random() - 0.5).slice(0, count);
  }

  private rollDie(): number {
    return Math.floor(Math.random() * (DIE_MAX - DIE_MIN + 1)) + DIE_MIN;
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let exists: Game | null;
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join('');
      exists = await this.gameRepo.findOneBy({ code });
    } while (exists);
    return code;
  }

  private async findByCode(code: string): Promise<Game> {
    const game = await this.gameRepo.findOneBy({ code: code.toUpperCase() });
    if (!game) throw new NotFoundException(`Game with code ${code} not found`);
    return game;
  }

  private toIGame(game: Game): IGame {
    return {
      id: game.id,
      code: game.code,
      status: game.status as IGame['status'],
      settings: {
        difficulty: game.difficulty as DifficultyLevel,
        totalRounds: game.totalRounds,
      },
      players: [],
      currentRound: null,
      hostId: game.hostId,
      createdAt: game.createdAt.toISOString(),
    };
  }

  private toIRound(round: Round): IRound {
    return {
      id: round.id,
      gameId: round.gameId,
      roundNumber: round.roundNumber,
      letters: round.letters as [SpanishLetter, SpanishLetter] | [SpanishLetter, SpanishLetter, SpanishLetter],
      dieResult: round.dieResult,
      turns: (round.turns ?? []).map((t) => ({
        id: t.id,
        roundId: t.roundId,
        playerId: t.playerId,
        turnNumber: t.turnNumber,
        word: t.word,
        score: t.score,
        isValid: t.isValid,
        status: t.status as ITurn['status'],
        invalidReason: t.invalidReason ?? undefined,
        submittedAt: t.submittedAt?.toISOString() ?? null,
      })),
      isComplete: round.isComplete,
    };
  }
}
