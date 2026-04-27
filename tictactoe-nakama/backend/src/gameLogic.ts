/**
 * Pure Tic-Tac-Toe rules for the authoritative backend.
 * The helpers in this file intentionally avoid Nakama dependencies
 * so the core game behavior stays deterministic and easy to test.
 */

import {
  BOARD_SIZE,
  INVALID_MOVE_REASONS,
  MATCH_STATUSES,
  WINNING_LINES,
} from './constants';
import type { GameState } from './types';

/**
 * Checks whether the current board contains a winning line.
 *
 * @param board The 3x3 game board represented as a flat array.
 * @returns The winning symbol when a line is completed, otherwise null.
 */
export function checkWinner(board: string[]): string | null {
  for (let index = 0; index < WINNING_LINES.length; index += 1) {
    const first = WINNING_LINES[index][0];
    const second = WINNING_LINES[index][1];
    const third = WINNING_LINES[index][2];
    const symbol = board[first];
    if (symbol !== '' && symbol === board[second] && symbol === board[third]) {
      return symbol;
    }
  }

  return null;
}

/**
 * Finds the winning positions for the current board.
 *
 * @param board The 3x3 game board represented as a flat array.
 * @returns The winning cell indexes, or an empty array when there is no winner.
 */
export function getWinningPositions(board: string[]): number[] {
  for (let index = 0; index < WINNING_LINES.length; index += 1) {
    const line = WINNING_LINES[index];
    const first = line[0];
    const second = line[1];
    const third = line[2];
    const symbol = board[first];
    if (symbol !== '' && symbol === board[second] && symbol === board[third]) {
      return [line[0], line[1], line[2]];
    }
  }

  return [];
}

/**
 * Determines whether the game has ended in a draw.
 *
 * @param board The 3x3 game board represented as a flat array.
 * @param moveCount The number of valid moves applied so far.
 * @returns True when the board is full and no player has won.
 */
export function isDraw(board: string[], moveCount: number): boolean {
  return moveCount === BOARD_SIZE && checkWinner(board) === null;
}

/**
 * Returns the opposing player's session identifier.
 *
 * @param state The authoritative game state.
 * @param currentSessionId The session currently taking action.
 * @returns The other player's session identifier, or an empty string if none exists.
 */
export function getOtherPlayer(
  state: GameState,
  currentSessionId: string,
): string {
  const sessionIds = Object.keys(state.players);
  for (let index = 0; index < sessionIds.length; index += 1) {
    const sessionId = sessionIds[index];
    if (sessionId !== currentSessionId) {
      return sessionId;
    }
  }

  return '';
}

/**
 * Validates whether a move can be applied for the given player and position.
 *
 * @param state The authoritative game state.
 * @param sessionId The session attempting to make the move.
 * @param position The board index being targeted.
 * @returns An object describing whether the move is valid and, if not, why.
 */
export function isValidMove(
  state: GameState,
  sessionId: string,
  position: number,
): { valid: boolean; reason?: string } {
  if (state.status !== MATCH_STATUSES.PLAYING) {
    return { valid: false, reason: INVALID_MOVE_REASONS.NOT_PLAYING };
  }

  if (!state.players[sessionId]) {
    return { valid: false, reason: INVALID_MOVE_REASONS.UNKNOWN_PLAYER };
  }

  if (state.currentTurn !== sessionId) {
    return { valid: false, reason: INVALID_MOVE_REASONS.NOT_YOUR_TURN };
  }

  if (position < 0 || position >= BOARD_SIZE) {
    return { valid: false, reason: INVALID_MOVE_REASONS.OUT_OF_RANGE };
  }

  if (state.board[position] !== '') {
    return { valid: false, reason: INVALID_MOVE_REASONS.OCCUPIED };
  }

  return { valid: true };
}
