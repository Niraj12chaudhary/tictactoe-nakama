/**
 * Shared frontend types for the multiplayer Tic-Tac-Toe client.
 * These interfaces mirror the server payloads and UI state so the
 * React app can stay type-safe across networking, state, and rendering.
 */

export type PlayerSymbol = 'X' | 'O';
export type GameMode = 'casual' | 'timed';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type Screen = 'home' | 'lobby' | 'game';
export type WinnerId = string | 'draw' | null;
export type GameOverReason = 'normal' | 'disconnect' | 'timeout';

export interface PlayerInfo {
  userId: string;
  username: string;
  symbol: PlayerSymbol;
  connected: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  ownerId: string;
}

export interface GameStatePayload {
  board: string[];
  players: Record<string, PlayerInfo>;
  currentTurn: string;
  status: GameStatus;
  winner: WinnerId;
  moveCount: number;
  mode: GameMode;
  winningPositions: number[];
  turnStartTime?: number;
}

export interface GameOverPayload {
  winner: string | 'draw';
  reason: GameOverReason;
  leaderboard: LeaderboardEntry[];
}

export interface InvalidMovePayload {
  reason: string;
  position?: number;
}

export interface PlayerLeftPayload {
  sessionId: string;
  userId: string;
  username: string;
}

export interface TimerUpdatePayload {
  remainingMs: number;
}

export interface MatchEndedPayload {
  reason: string;
}

export interface FindMatchRpcResponse {
  ticket: string;
  mode: GameMode;
  query: string;
  minCount: number;
  maxCount: number;
  stringProperties: Record<string, string>;
}

export interface CreatePrivateRoomResponse {
  matchId: string;
  mode: GameMode;
}

export interface StoredSession {
  token: string;
  refreshToken: string;
}

export interface ToastMessage {
  id: number;
  message: string;
}
