import type { IGame, IGameSettings } from '../interfaces/game.interface';
import type { IGamePlayer } from '../interfaces/player.interface';
import type { IRound, IRoundSummary } from '../interfaces/round.interface';
import type { IActiveTurn, ITurn } from '../interfaces/turn.interface';

// ─── Events: Client → Server ─────────────────────────────────────────────────

export interface ClientGameReadyEvent {
  gameCode: string;
}

export interface ClientGameStartEvent {
  gameCode: string;
  settings: IGameSettings;
}

export interface ClientTurnSubmitEvent {
  gameCode: string;
  word: string;
}

export interface ClientTurnSkipEvent {
  gameCode: string;
}

export interface ClientVoteSubmitEvent {
  gameCode: string;
  accept: boolean;
}

export interface ClientDiceRollEvent {
  gameCode: string;
}

// ─── Events: Server → Client ─────────────────────────────────────────────────

export interface ServerGameStateEvent {
  game: IGame;
}

export interface ServerPlayerJoinedEvent {
  player: IGamePlayer;
}

export interface ServerPlayerLeftEvent {
  playerId: string;
  nickname: string;
}

export interface ServerGameStartedEvent {
  settings: IGameSettings;
}

export interface ServerRoundNewEvent {
  round: IRound;
}

export interface ServerTurnStartEvent {
  activeTurn: IActiveTurn;
}

export interface ServerTurnTimerEvent {
  remainingMs: number;
  totalMs: number;
}

export interface ServerTurnResultEvent {
  turn: ITurn;
  playerNickname: string;
}

export interface ServerRoundSummaryEvent {
  summary: IRoundSummary;
}

export interface ServerGameEndEvent {
  finalScores: Array<{
    playerId: string;
    nickname: string;
    totalScore: number;
    rank: number;
  }>;
  winnerId: string;
}

export interface ServerVoteStartEvent {
  letters: string[];
  roundNumber: number;
  timeoutMs: number;
}

export interface ServerVoteUpdateEvent {
  votedCount: number;
  totalCount: number;
}

export interface ServerVoteResultEvent {
  accepted: boolean;
  yesCount: number;
  noCount: number;
  wasTie: boolean;
}

export interface ServerDiceRollRequestEvent {
  rollerId: string;
  rollerNickname: string;
  roundNumber: number;
}

export interface ServerDiceResultEvent {
  value: number;
  rollerNickname: string;
}

export interface ServerErrorEvent {
  code: string;
  message: string;
}

// ─── Event Name Map ───────────────────────────────────────────────────────────

export const WS_EVENTS = {
  // Client → Server
  CLIENT: {
    GAME_READY: 'game:ready',
    GAME_START: 'game:start',
    TURN_SUBMIT: 'turn:submit',
    TURN_SKIP: 'turn:skip',
    VOTE_SUBMIT: 'vote:submit',
    DICE_ROLL: 'dice:roll',
  },
  // Server → Client
  SERVER: {
    GAME_STATE: 'game:state',
    PLAYER_JOINED: 'game:player-joined',
    PLAYER_LEFT: 'game:player-left',
    GAME_STARTED: 'game:started',
    ROUND_NEW: 'round:new',
    TURN_START: 'turn:start',
    TURN_TIMER: 'turn:timer',
    TURN_RESULT: 'turn:result',
    ROUND_SUMMARY: 'round:summary',
    GAME_END: 'game:end',
    VOTE_START: 'vote:start',
    VOTE_UPDATE: 'vote:update',
    VOTE_RESULT: 'vote:result',
    DICE_ROLL_REQUEST: 'dice:roll_request',
    DICE_RESULT: 'dice:result',
    ERROR: 'error',
  },
} as const;
