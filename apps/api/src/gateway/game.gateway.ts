import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { WordsService } from '../words/words.service';
import type { IRound } from '@3letras/interfaces';
import { Game } from '../entities/game.entity';
import { GamePlayer } from '../entities/game-player.entity';
import { Round } from '../entities/round.entity';
import { Turn } from '../entities/turn.entity';
import { User } from '../entities/user.entity';
import { WS_EVENTS } from '@3letras/events/websocket.events';
import { TURN_DURATION_MS, SPECIAL_LETTERS, SpanishLetter } from '@3letras/constants/game-rules';

const VOTE_DURATION_MS = 15_000;
const DICE_DURATION_MS = 15_000;

interface AuthenticatedSocket extends Socket {
  userId: string;
  nickname: string;
  gameCode: string | null;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);

  private turnTimers = new Map<string, NodeJS.Timeout>();
  private lastValidWord = new Map<string, string | null>();
  private usedWords = new Map<string, Set<string>>(); // roundId → palabras ya usadas
  private pendingVotes = new Map<string, {
    roundId: string;
    gameId: string;
    difficulty: string;
    votes: Map<string, boolean>;
    playerCount: number;
    timer: NodeJS.Timeout;
  }>();
  private pendingDice = new Map<string, {
    rollerId: string;
    dieResult: number;
    resolve: () => void;
    timer: NodeJS.Timeout;
  }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly gamesService: GamesService,
    private readonly wordsService: WordsService,
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer) private readonly gpRepo: Repository<GamePlayer>,
    @InjectRepository(Round) private readonly roundRepo: Repository<Round>,
    @InjectRepository(Turn) private readonly turnRepo: Repository<Turn>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) { client.disconnect(); return; }

    try {
      const payload = this.jwtService.verify<{ sub: string; nickname: string }>(token);
      client.userId = payload.sub;
      client.nickname = payload.nickname;
      client.gameCode = null;
      this.logger.log(`Client connected: ${client.nickname} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.nickname} (${client.id})`);
    if (client.gameCode) {
      this.server.to(client.gameCode).emit(WS_EVENTS.SERVER.PLAYER_LEFT, {
        playerId: client.userId,
        nickname: client.nickname,
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.CLIENT.GAME_READY)
  async onGameReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { gameCode: string },
  ) {
    const code = payload.gameCode.toUpperCase();
    await client.join(code);
    client.gameCode = code;

    const state = await this.gamesService.getByCode(code);
    this.server.to(code).emit(WS_EVENTS.SERVER.PLAYER_JOINED, {
      player: state.players.find((p) => p.playerId === client.userId),
    });
    client.emit(WS_EVENTS.SERVER.GAME_STATE, { game: state });
  }

  @SubscribeMessage(WS_EVENTS.CLIENT.GAME_START)
  async onGameStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { gameCode: string; settings: { difficulty: string; totalRounds: number } },
  ) {
    const code = payload.gameCode.toUpperCase();
    const game = await this.gameRepo.findOneBy({ code });
    if (!game || game.hostId !== client.userId) return;
    if (game.status !== 'waiting') return;

    game.status = 'playing';
    game.difficulty = payload.settings.difficulty as any;
    game.totalRounds = payload.settings.totalRounds;
    await this.gameRepo.save(game);

    this.server.to(code).emit(WS_EVENTS.SERVER.GAME_STARTED, { settings: payload.settings });

    await this.startNewRound(code, game.id, game.difficulty, 1);
  }

  @SubscribeMessage(WS_EVENTS.CLIENT.TURN_SUBMIT)
  async onTurnSubmit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { gameCode: string; word: string },
  ) {
    const code = payload.gameCode.toUpperCase();
    await this.processWordSubmission(code, client.userId, client.nickname, payload.word.trim());
  }

  @SubscribeMessage(WS_EVENTS.CLIENT.TURN_SKIP)
  async onTurnSkip(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { gameCode: string },
  ) {
    const code = payload.gameCode.toUpperCase();
    await this.processWordSubmission(code, client.userId, client.nickname, null);
  }

  private async startNewRound(code: string, gameId: string, difficulty: string, roundNumber: number) {
    const round = await this.gamesService.createRound(gameId, roundNumber, difficulty as any);
    this.lastValidWord.set(round.id, null);
    this.usedWords.set(round.id, new Set());

    const players = await this.gpRepo.find({ where: { gameId }, relations: ['user'] });

    // El dado lo lanza el jugador que corresponde a esta ronda (rotación)
    const rollerIndex = (roundNumber - 1) % players.length;
    const roller = players[rollerIndex];

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingDice.has(code)) {
          this.pendingDice.delete(code);
          resolve();
        }
      }, DICE_DURATION_MS);

      this.pendingDice.set(code, { rollerId: roller.userId, dieResult: round.dieResult, resolve, timer });
      this.server.to(code).emit(WS_EVENTS.SERVER.DICE_ROLL_REQUEST, {
        rollerId: roller.userId,
        rollerNickname: roller.user.nickname,
        roundNumber,
        timeoutMs: DICE_DURATION_MS,
      });
    });

    // El jugador lanzó — emitir resultado a todos y esperar animación
    this.server.to(code).emit(WS_EVENTS.SERVER.DICE_RESULT, {
      value: round.dieResult,
      rollerNickname: roller.user.nickname,
    });

    // Dar tiempo a que la animación termine y el jugador lea el resultado (~2.3s animación + 2s lectura)
    await new Promise((r) => setTimeout(r, 4500));

    const hasSpecial = round.letters.some(
      (l) => (SPECIAL_LETTERS as readonly string[]).includes(l as string),
    );

    if (hasSpecial && (difficulty === 'basic' || difficulty === 'medium')) {
      const voteTimer = setTimeout(() => this.resolveVote(code), VOTE_DURATION_MS);
      this.pendingVotes.set(code, {
        roundId: round.id,
        gameId,
        difficulty,
        votes: new Map(),
        playerCount: players.length,
        timer: voteTimer,
      });
      this.server.to(code).emit(WS_EVENTS.SERVER.VOTE_START, {
        letters: round.letters,
        roundNumber: round.roundNumber,
        timeoutMs: VOTE_DURATION_MS,
      });
    } else {
      this.server.to(code).emit(WS_EVENTS.SERVER.ROUND_NEW, { round });
      await this.startNextTurn(code, gameId, round.id, round.letters as SpanishLetter[], players, 0, round.dieResult, 1);
    }
  }

  @SubscribeMessage(WS_EVENTS.CLIENT.VOTE_SUBMIT)
  async onVoteSubmit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { gameCode: string; accept: boolean },
  ) {
    const code = payload.gameCode.toUpperCase();
    const voteState = this.pendingVotes.get(code);
    if (!voteState || voteState.votes.has(client.userId)) return;

    voteState.votes.set(client.userId, payload.accept);

    this.server.to(code).emit(WS_EVENTS.SERVER.VOTE_UPDATE, {
      votedCount: voteState.votes.size,
      totalCount: voteState.playerCount,
    });

    if (voteState.votes.size >= voteState.playerCount) {
      clearTimeout(voteState.timer);
      await this.resolveVote(code);
    }
  }

  @SubscribeMessage(WS_EVENTS.CLIENT.DICE_ROLL)
  onDiceRoll(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { gameCode: string },
  ) {
    const code = payload.gameCode.toUpperCase();
    const pending = this.pendingDice.get(code);
    if (!pending || pending.rollerId !== client.userId) return;
    clearTimeout(pending.timer);
    this.pendingDice.delete(code);
    pending.resolve();
  }

  private async resolveVote(code: string) {
    const voteState = this.pendingVotes.get(code);
    if (!voteState) return;
    this.pendingVotes.delete(code);

    const yesCount = [...voteState.votes.values()].filter((v) => v).length;
    const noCount = voteState.votes.size - yesCount;
    const wasTie = yesCount === noCount;
    const accepted = wasTie ? Math.random() < 0.5 : yesCount > noCount;

    this.server.to(code).emit(WS_EVENTS.SERVER.VOTE_RESULT, {
      accepted,
      yesCount,
      noCount,
      wasTie,
    });

    await new Promise((r) => setTimeout(r, 2500));

    const players = await this.gpRepo.find({ where: { gameId: voteState.gameId }, relations: ['user'] });

    let round: IRound;
    if (accepted) {
      const entity = await this.roundRepo.findOneBy({ id: voteState.roundId });
      if (!entity) return;
      round = {
        id: entity.id, gameId: entity.gameId, roundNumber: entity.roundNumber,
        letters: entity.letters as any, dieResult: entity.dieResult, turns: [], isComplete: false,
      };
    } else {
      round = await this.gamesService.redrawRoundLetters(voteState.roundId, voteState.difficulty as any);
      this.lastValidWord.set(round.id, null);
      this.usedWords.set(round.id, new Set());
    }

    this.server.to(code).emit(WS_EVENTS.SERVER.ROUND_NEW, { round });
    await this.startNextTurn(code, voteState.gameId, round.id, round.letters as SpanishLetter[], players, 0, round.dieResult, 1);
  }

  private async startNextTurn(
    code: string,
    gameId: string,
    roundId: string,
    letters: SpanishLetter[],
    players: GamePlayer[],
    playerIndex: number,
    dieResult: number,
    turnNumber: number,
  ) {
    if (playerIndex >= players.length) {
      if (turnNumber < dieResult) {
        await this.startNextTurn(code, gameId, roundId, letters, players, 0, dieResult, turnNumber + 1);
      } else {
        await this.endRound(code, gameId, roundId);
      }
      return;
    }

    const currentPlayer = players[playerIndex];
    const turn = this.turnRepo.create({
      roundId,
      playerId: currentPlayer.userId,
      turnNumber,
      status: 'active',
    });
    await this.turnRepo.save(turn);

    const now = new Date();
    const timeoutAt = new Date(now.getTime() + TURN_DURATION_MS);

    this.server.to(code).emit(WS_EVENTS.SERVER.TURN_START, {
      activeTurn: {
        turnId: turn.id,
        playerId: currentPlayer.userId,
        nickname: currentPlayer.user.nickname,
        startedAt: now.toISOString(),
        timeoutAt: timeoutAt.toISOString(),
        turnNumber,
        totalTurns: dieResult,
      },
    });

    this.startTurnTimer(code, gameId, roundId, letters, players, playerIndex, dieResult, turnNumber, turn.id);
  }

  private startTurnTimer(
    code: string,
    gameId: string,
    roundId: string,
    letters: SpanishLetter[],
    players: GamePlayer[],
    playerIndex: number,
    dieResult: number,
    turnNumber: number,
    turnId: string,
  ) {
    let remaining = TURN_DURATION_MS;
    const interval = setInterval(() => {
      remaining -= 1000;
      this.server.to(code).emit(WS_EVENTS.SERVER.TURN_TIMER, {
        remainingMs: Math.max(0, remaining),
        totalMs: TURN_DURATION_MS,
      });
    }, 1000);

    const timeout = setTimeout(async () => {
      clearInterval(interval);
      this.turnTimers.delete(turnId);

      const turn = await this.turnRepo.findOneBy({ id: turnId });
      if (!turn || turn.status !== 'active') return;

      turn.status = 'timeout';
      await this.turnRepo.save(turn);

      this.server.to(code).emit(WS_EVENTS.SERVER.TURN_RESULT, {
        turn: { ...turn, submittedAt: null },
        playerNickname: players[playerIndex].user.nickname,
        playerScores: players.map((p) => ({ playerId: p.userId, totalScore: p.totalScore })),
      });

      await this.startNextTurn(code, gameId, roundId, letters, players, playerIndex + 1, dieResult, turnNumber);
    }, TURN_DURATION_MS);

    this.turnTimers.set(turnId, timeout);
    (timeout as any)._interval = interval;
  }

  private async processWordSubmission(
    code: string,
    playerId: string,
    playerNickname: string,
    word: string | null,
  ) {
    const game = await this.gameRepo.findOneBy({ code });
    if (!game) return;

    const round = await this.roundRepo.findOne({
      where: { gameId: game.id, isComplete: false },
    });
    if (!round) return;

    const turn = await this.turnRepo.findOne({
      where: { roundId: round.id, playerId, status: 'active' },
    });
    if (!turn) return;

    const existingTimer = this.turnTimers.get(turn.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      clearInterval((existingTimer as any)._interval);
      this.turnTimers.delete(turn.id);
    }

    if (!word) {
      turn.status = 'skipped';
      turn.word = null;
      turn.score = 0;
    } else {
      const normalizedWord = this.wordsService.normalize(word);
      const roundUsedWords = this.usedWords.get(round.id) ?? new Set();

      if (roundUsedWords.has(normalizedWord)) {
        turn.word = word;
        turn.isValid = false;
        turn.score = 0;
        turn.status = 'submitted';
        turn.invalidReason = 'already_used';
        turn.submittedAt = new Date();
        await this.turnRepo.save(turn);

        const players = await this.gpRepo.find({ where: { gameId: game.id }, relations: ['user'] });
        this.server.to(code).emit(WS_EVENTS.SERVER.TURN_RESULT, {
          turn, playerNickname,
          playerScores: players.map((p) => ({ playerId: p.userId, totalScore: p.totalScore })),
        });

        const currentIndex = players.findIndex((p) => p.userId === playerId);
        await this.startNextTurn(code, game.id, round.id, round.letters as SpanishLetter[], players, currentIndex + 1, round.dieResult, turn.turnNumber);
        return;
      }

      const previousWord = this.lastValidWord.get(round.id) ?? null;
      const result = this.wordsService.validate(
        word,
        round.letters as SpanishLetter[],
        game.difficulty as any,
        previousWord,
      );
      turn.word = word;
      turn.isValid = result.isValid;
      turn.score = result.score;
      turn.status = 'submitted';
      turn.invalidReason = result.invalidReason ?? null;
      turn.submittedAt = new Date();

      if (result.isValid) {
        this.lastValidWord.set(round.id, word);
        roundUsedWords.add(normalizedWord);
        await this.gpRepo.increment({ gameId: game.id, userId: playerId }, 'totalScore', result.score);
      }
    }
    await this.turnRepo.save(turn);

    const players = await this.gpRepo.find({ where: { gameId: game.id }, relations: ['user'] });
    this.server.to(code).emit(WS_EVENTS.SERVER.TURN_RESULT, {
      turn,
      playerNickname,
      playerScores: players.map((p) => ({ playerId: p.userId, totalScore: p.totalScore })),
    });

    const currentIndex = players.findIndex((p) => p.userId === playerId);
    const currentTurnNumber = turn.turnNumber;

    await this.startNextTurn(
      code, game.id, round.id,
      round.letters as SpanishLetter[],
      players, currentIndex + 1,
      round.dieResult, currentTurnNumber,
    );
  }

  private async endRound(code: string, gameId: string, roundId: string) {
    const round = await this.roundRepo.findOneBy({ id: roundId });
    if (!round) return;

    round.isComplete = true;
    await this.roundRepo.save(round);

    const players = await this.gpRepo.find({ where: { gameId }, relations: ['user'] });
    const scores = players.map((p) => ({
      playerId: p.userId,
      nickname: p.user.nickname,
      roundScore: 0,
    }));

    this.server.to(code).emit(WS_EVENTS.SERVER.ROUND_SUMMARY, {
      summary: {
        roundNumber: round.roundNumber,
        letters: round.letters as [SpanishLetter, SpanishLetter, SpanishLetter],
        dieResult: round.dieResult,
        scores,
      },
    });

    const game = await this.gameRepo.findOneBy({ id: gameId });
    if (!game) return;

    const completedRounds = await this.roundRepo.count({ where: { gameId, isComplete: true } });
    this.lastValidWord.delete(roundId);
    this.usedWords.delete(roundId);

    if (completedRounds >= game.totalRounds) {
      await this.endGame(code, gameId);
    } else {
      setTimeout(() => this.startNewRound(code, gameId, game.difficulty, round.roundNumber + 1), 3000);
    }
  }

  private async endGame(code: string, gameId: string) {
    const game = await this.gameRepo.findOneBy({ id: gameId });
    if (!game) return;

    game.status = 'finished';
    await this.gameRepo.save(game);

    const players = await this.gpRepo.find({ where: { gameId }, relations: ['user'] });
    const sorted = players
      .map((p) => ({ playerId: p.userId, nickname: p.user.nickname, totalScore: p.totalScore }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    this.server.to(code).emit(WS_EVENTS.SERVER.GAME_END, {
      finalScores: sorted,
      winnerId: sorted[0]?.playerId ?? '',
    });
  }
}
