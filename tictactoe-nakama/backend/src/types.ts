/**
 * Type contracts for the authoritative Tic-Tac-Toe backend.
 * These interfaces describe match state, payloads, and serializable
 * responses shared across the runtime modules.
 */

import {
  GAME_MODES,
  GAME_OVER_REASONS,
  MATCH_STATUSES,
  PLAYER_SYMBOLS,
  SIGNAL_TYPES,
} from './constants';

export type PlayerSymbol =
  (typeof PLAYER_SYMBOLS)[keyof typeof PLAYER_SYMBOLS];

export type GameStatus =
  (typeof MATCH_STATUSES)[keyof typeof MATCH_STATUSES];

export type GameMode =
  (typeof GAME_MODES)[keyof typeof GAME_MODES];

export type GameOverReason =
  (typeof GAME_OVER_REASONS)[keyof typeof GAME_OVER_REASONS];

export type SignalType =
  (typeof SIGNAL_TYPES)[keyof typeof SIGNAL_TYPES];

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

export interface MovePayload {
  position: number;
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

export interface MatchEndedPayload {
  reason: string;
}

export interface TimerUpdatePayload {
  remainingMs: number;
}

export interface GameOverPayload {
  winner: string | 'draw';
  reason: GameOverReason;
  leaderboard: LeaderboardEntry[];
}

export interface MatchLabel {
  mode: GameMode;
  status: GameStatus;
  maxPlayers: number;
}

export interface MatchSignalPayload {
  type: SignalType;
  message?: string;
}

export interface MatchInitParams {
  mode?: GameMode;
  matchedUsers?: nkruntime.MatchmakerResult[];
}

export interface GameState {
  board: string[];
  players: Record<string, PlayerInfo>;
  currentTurn: string;
  status: GameStatus;
  winner: string | 'draw' | null;
  moveCount: number;
  mode: GameMode;
  winningPositions: number[];
  turnStartTime?: number;
  lastTimerBroadcastAt?: number;
  rematchRequests: Record<string, boolean>;
  nextStartingSymbol: PlayerSymbol;
}

export interface GameStateView {
  board: string[];
  players: Record<string, PlayerInfo>;
  currentTurn: string;
  status: GameStatus;
  winner: string | 'draw' | null;
  moveCount: number;
  mode: GameMode;
  winningPositions: number[];
  turnStartTime?: number;
}

export interface FindMatchRequest {
  mode?: GameMode;
}

export interface FindMatchResponse {
  ticket: string;
  mode: GameMode;
  query: string;
  minCount: number;
  maxCount: number;
  stringProperties: Record<string, string>;
}

export interface CreatePrivateRoomRequest {
  mode?: GameMode;
}

export interface CreatePrivateRoomResponse {
  matchId: string;
  mode: GameMode;
}
