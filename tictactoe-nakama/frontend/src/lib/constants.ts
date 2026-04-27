/**
 * Frontend constants for the Tic-Tac-Toe Nakama client.
 * These values mirror backend op codes and shared identifiers so
 * the browser can react to authoritative messages consistently.
 */

export const STORAGE_KEYS = Object.freeze({
  DEVICE_ID: 'nakama_device_id',
  SESSION: 'nakama_session',
  USERNAME: 'nakama_username',
});

export const RPC_IDS = Object.freeze({
  FIND_MATCH: 'find_match',
  CREATE_PRIVATE_ROOM: 'create_private_room',
});

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

export const GAME_MODES = Object.freeze({
  CASUAL: 'casual',
  TIMED: 'timed',
});

export const LEADERBOARD_ID = 'global_tictactoe';
export const DEFAULT_PORT = '7350';
export const DEFAULT_HOST = 'localhost';
export const DEFAULT_USE_SSL = false;
export const DEFAULT_SERVER_KEY = 'defaultkey';
export const MAX_USERNAME_LENGTH = 24;
export const MATCHMAKER_MAX_COUNT = 2;
export const MATCHMAKER_MIN_COUNT = 2;
export const TURN_TIMEOUT_MS = 30_000;
