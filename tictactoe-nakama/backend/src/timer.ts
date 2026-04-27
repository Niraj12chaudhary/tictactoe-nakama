/**
 * Turn timer helpers for timed Tic-Tac-Toe matches.
 * The authoritative match loop uses these utilities to enforce per-turn
 * deadlines from the server so clients cannot manipulate local clocks.
 */

import {
  GAME_MODES,
  MATCH_STATUSES,
  TIMER_BROADCAST_INTERVAL_MS,
  TURN_TIMEOUT_MS,
} from './constants';
import type { GameState } from './types';

/**
 * Starts or resets the active turn timer.
 *
 * @param state The authoritative match state.
 * @param nowMs The current epoch time in milliseconds.
 * @returns The updated state.
 */
export function startTurnTimer(state: GameState, nowMs: number): GameState {
  if (state.mode !== GAME_MODES.TIMED) {
    state.turnStartTime = undefined;
    state.lastTimerBroadcastAt = undefined;
    return state;
  }

  state.turnStartTime = nowMs;
  state.lastTimerBroadcastAt = 0;
  return state;
}

/**
 * Clears the timer fields when a timed turn is no longer active.
 *
 * @param state The authoritative match state.
 * @returns The updated state.
 */
export function clearTurnTimer(state: GameState): GameState {
  state.turnStartTime = undefined;
  state.lastTimerBroadcastAt = undefined;
  return state;
}

/**
 * Returns the remaining time for the active turn.
 *
 * @param state The authoritative match state.
 * @param nowMs The current epoch time in milliseconds.
 * @returns The remaining time in milliseconds.
 */
export function getRemainingTurnMs(
  state: GameState,
  nowMs: number,
): number {
  if (
    state.mode !== GAME_MODES.TIMED ||
    state.status !== MATCH_STATUSES.PLAYING ||
    typeof state.turnStartTime !== 'number'
  ) {
    return TURN_TIMEOUT_MS;
  }

  return Math.max(TURN_TIMEOUT_MS - (nowMs - state.turnStartTime), 0);
}

/**
 * Determines whether the current player has run out of time.
 *
 * @param state The authoritative match state.
 * @param nowMs The current epoch time in milliseconds.
 * @returns True when the current turn timer has expired.
 */
export function hasTurnTimedOut(state: GameState, nowMs: number): boolean {
  return getRemainingTurnMs(state, nowMs) === 0;
}

/**
 * Determines whether the timer should be rebroadcast this tick.
 *
 * @param state The authoritative match state.
 * @param nowMs The current epoch time in milliseconds.
 * @returns True when a new timer update should be sent to clients.
 */
export function shouldBroadcastTimer(
  state: GameState,
  nowMs: number,
): boolean {
  if (
    state.mode !== GAME_MODES.TIMED ||
    state.status !== MATCH_STATUSES.PLAYING ||
    typeof state.turnStartTime !== 'number'
  ) {
    return false;
  }

  const currentSlot = Math.floor(nowMs / TIMER_BROADCAST_INTERVAL_MS);
  const lastSlot = Math.floor(
    (state.lastTimerBroadcastAt ?? 0) / TIMER_BROADCAST_INTERVAL_MS,
  );

  return currentSlot > lastSlot;
}

/**
 * Records the time of the latest timer broadcast.
 *
 * @param state The authoritative match state.
 * @param nowMs The current epoch time in milliseconds.
 * @returns The updated state.
 */
export function markTimerBroadcast(state: GameState, nowMs: number): GameState {
  state.lastTimerBroadcastAt = nowMs;
  return state;
}
