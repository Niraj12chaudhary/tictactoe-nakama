/**
 * Shared backend constants for the Tic-Tac-Toe Nakama runtime.
 * This keeps op codes, gameplay settings, and identifiers in one place
 * so the match loop and RPCs do not rely on scattered magic values.
 */

export const OP_CODES = Object.freeze({
  MAKE_MOVE: 1,
  REMATCH_REQUEST: 2,
  GAME_START: 3,
  STATE_UPDATE: 4,
  GAME_OVER: 5,
  PLAYER_LEFT: 6,
  MATCH_ENDED: 7,
  INVALID_MOVE: 8,
  TIMER_UPDATE: 9,
});

export const MATCH_HANDLER_NAME = 'authoritative_tictactoe';
export const LEADERBOARD_ID = 'global_tictactoe';
export const MATCH_LABEL_MAX_PLAYERS = 2;
export const MATCH_TICK_RATE = 1;
export const BOARD_SIZE = 9;
export const MAX_PLAYERS = 2;
export const TURN_TIMEOUT_MS = 30_000;
export const TIMER_BROADCAST_INTERVAL_MS = 1_000;
export const LEADERBOARD_WIN_POINTS = 10;
export const LEADERBOARD_LOSS_POINTS = 0;
export const LEADERBOARD_FETCH_LIMIT = 10;

export const GAME_MODES = Object.freeze({
  CASUAL: 'casual',
  TIMED: 'timed',
});

export const PLAYER_SYMBOLS = Object.freeze({
  FIRST: 'X',
  SECOND: 'O',
});

export const MATCH_STATUSES = Object.freeze({
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
});

export const GAME_OVER_REASONS = Object.freeze({
  NORMAL: 'normal',
  DISCONNECT: 'disconnect',
  TIMEOUT: 'timeout',
});

export const INVALID_MOVE_REASONS = Object.freeze({
  NOT_PLAYING: 'Game is not currently accepting moves.',
  NOT_YOUR_TURN: 'It is not your turn.',
  OUT_OF_RANGE: 'Selected position is outside the board.',
  OCCUPIED: 'Selected position is already occupied.',
  UNKNOWN_PLAYER: 'Player is not part of this match.',
});

export const SIGNAL_TYPES = Object.freeze({
  STATUS: 'admin:status',
  TERMINATE: 'admin:terminate',
});

export const WINNING_LINES = Object.freeze([
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]);
