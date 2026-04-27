/**
 * Zustand store for multiplayer Tic-Tac-Toe client state.
 * The store keeps UI concerns and authoritative game snapshots together
 * while still routing all actual mutations through the Nakama backend.
 */

import { create } from 'zustand';
import type { Session } from '@heroiclabs/nakama-js';
import { OP_CODES, STORAGE_KEYS, TURN_TIMEOUT_MS } from '../lib/constants';
import { getSocket } from '../lib/nakamaClient';
import type {
  GameMode,
  GameOverReason,
  GameStatePayload,
  LeaderboardEntry,
  PlayerInfo,
  PlayerSymbol,
  Screen,
  ToastMessage,
  WinnerId,
} from '../types';

type StoreStatus = 'idle' | 'searching' | 'playing' | 'finished';

interface GameStore {
  session: Session | null;
  screen: Screen;
  username: string;
  matchId: string | null;
  matchmakerTicket: string | null;
  privateRoomCode: string | null;
  mySessionId: string;
  mySymbol: PlayerSymbol | null;
  board: string[];
  currentTurn: string;
  status: StoreStatus;
  winner: WinnerId;
  players: Record<string, PlayerInfo>;
  leaderboard: LeaderboardEntry[];
  remainingMs: number;
  mode: GameMode;
  winningPositions: number[];
  gameOverReason: GameOverReason | null;
  toast: ToastMessage | null;
  pendingMoves: number[];
  rematchRequested: boolean;
  setSession: (session: Session | null) => void;
  setScreen: (screen: Screen) => void;
  setUsername: (username: string) => void;
  setMode: (mode: GameMode) => void;
  setStatus: (status: StoreStatus) => void;
  setSearching: (ticket: string) => void;
  setPrivateRoomCode: (roomCode: string | null) => void;
  setJoinedMatch: (matchId: string, mySessionId: string) => void;
  setMySymbol: (symbol: PlayerSymbol | null) => void;
  applyGameState: (payload: GameStatePayload) => void;
  setGameOver: (winner: string | 'draw', reason: GameOverReason) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setRemainingMs: (remainingMs: number) => void;
  setToast: (message: string) => void;
  clearToast: () => void;
  resetMatchState: () => void;
  sendMove: (position: number) => Promise<void>;
  requestRematch: () => Promise<void>;
}

/**
 * Creates a fresh empty board for store initialization and resets.
 *
 * @returns A blank 3x3 board array.
 */
function createEmptyBoard(): string[] {
  return ['', '', '', '', '', '', '', '', ''];
}

/**
 * Calculates the best local remaining turn time from a server timestamp.
 *
 * @param turnStartTime The epoch milliseconds sent by the server.
 * @returns A clamped remaining duration.
 */
function calculateRemainingMs(turnStartTime?: number): number {
  if (!turnStartTime) {
    return TURN_TIMEOUT_MS;
  }

  const elapsed = Date.now() - turnStartTime;
  return Math.max(TURN_TIMEOUT_MS - elapsed, 0);
}

/**
 * Returns the username persisted in localStorage for initial hydration.
 *
 * @returns The preferred local username.
 */
function readStoredUsername(): string {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) ?? '';
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  screen: 'home',
  username: readStoredUsername(),
  matchId: null,
  matchmakerTicket: null,
  privateRoomCode: null,
  mySessionId: '',
  mySymbol: null,
  board: createEmptyBoard(),
  currentTurn: '',
  status: 'idle',
  winner: null,
  players: {},
  leaderboard: [],
  remainingMs: TURN_TIMEOUT_MS,
  mode: 'casual',
  winningPositions: [],
  gameOverReason: null,
  toast: null,
  pendingMoves: [],
  rematchRequested: false,

  /**
   * Stores the active authenticated session.
   *
   * @param session The Nakama session to store.
   * @returns Nothing.
   */
  setSession: (session) => {
    set({
      session,
      username: session?.username ?? get().username,
    });
  },

  /**
   * Switches the current top-level screen.
   *
   * @param screen The screen to render.
   * @returns Nothing.
   */
  setScreen: (screen) => {
    set({ screen });
  },

  /**
   * Stores the preferred local username.
   *
   * @param username The username typed by the player.
   * @returns Nothing.
   */
  setUsername: (username) => {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    set({ username });
  },

  /**
   * Stores the selected game mode.
   *
   * @param mode The matchmaking mode selected in the UI.
   * @returns Nothing.
   */
  setMode: (mode) => {
    set({ mode });
  },

  /**
   * Updates the current UI status.
   *
   * @param status The lifecycle status to expose in the UI.
   * @returns Nothing.
   */
  setStatus: (status) => {
    set({ status });
  },

  /**
   * Marks the player as searching and stores the current ticket.
   *
   * @param ticket The active matchmaker ticket.
   * @returns Nothing.
   */
  setSearching: (ticket) => {
    set({
      screen: 'lobby',
      status: 'searching',
      matchmakerTicket: ticket,
      privateRoomCode: null,
      leaderboard: [],
      gameOverReason: null,
      winner: null,
    });
  },

  /**
   * Stores the private room code displayed in the lobby.
   *
   * @param roomCode The room code to display.
   * @returns Nothing.
   */
  setPrivateRoomCode: (roomCode) => {
    set({ privateRoomCode: roomCode });
  },

  /**
   * Stores the joined match identifier and local session identity.
   *
   * @param matchId The authoritative match identifier.
   * @param mySessionId The current player's realtime session ID.
   * @returns Nothing.
   */
  setJoinedMatch: (matchId, mySessionId) => {
    set({
      matchId,
      mySessionId,
      status: 'searching',
      screen: 'lobby',
    });
  },

  /**
   * Stores the player's assigned symbol.
   *
   * @param symbol The symbol controlled by the local user.
   * @returns Nothing.
   */
  setMySymbol: (symbol) => {
    set({ mySymbol: symbol });
  },

  /**
   * Applies an authoritative state snapshot from the server.
   *
   * @param payload The server-owned match state.
   * @returns Nothing.
   */
  applyGameState: (payload) => {
    set({
      board: payload.board,
      currentTurn: payload.currentTurn,
      players: payload.players,
      winner: payload.winner,
      status: payload.status === 'finished' ? 'finished' : 'playing',
      mode: payload.mode,
      winningPositions: payload.winningPositions,
      remainingMs: calculateRemainingMs(payload.turnStartTime),
      pendingMoves: [],
      rematchRequested: false,
    });
  },

  /**
   * Stores the game over summary used by the modal.
   *
   * @param winner The winner session ID or draw marker.
   * @param reason The reason the game ended.
   * @returns Nothing.
   */
  setGameOver: (winner, reason) => {
    set({
      winner,
      status: 'finished',
      gameOverReason: reason,
      pendingMoves: [],
    });
  },

  /**
   * Stores leaderboard rows for the game over panel.
   *
   * @param leaderboard The leaderboard rows to display.
   * @returns Nothing.
   */
  setLeaderboard: (leaderboard) => {
    set({ leaderboard });
  },

  /**
   * Updates the current timer display.
   *
   * @param remainingMs The remaining turn time in milliseconds.
   * @returns Nothing.
   */
  setRemainingMs: (remainingMs) => {
    set({ remainingMs });
  },

  /**
   * Shows a transient toast message in the UI.
   *
   * @param message The message to display.
   * @returns Nothing.
   */
  setToast: (message) => {
    set({
      toast: {
        id: Date.now(),
        message,
      },
    });
  },

  /**
   * Clears the active toast message.
   *
   * @returns Nothing.
   */
  clearToast: () => {
    set({ toast: null });
  },

  /**
   * Resets match-specific state while keeping authentication and preferences.
   *
   * @returns Nothing.
   */
  resetMatchState: () => {
    set({
      matchId: null,
      matchmakerTicket: null,
      privateRoomCode: null,
      mySessionId: '',
      mySymbol: null,
      board: createEmptyBoard(),
      currentTurn: '',
      status: 'idle',
      winner: null,
      players: {},
      leaderboard: [],
      remainingMs: TURN_TIMEOUT_MS,
      winningPositions: [],
      gameOverReason: null,
      pendingMoves: [],
      rematchRequested: false,
    });
  },

  /**
   * Sends a server-authoritative move request for the selected board position.
   *
   * @param position The board cell index requested by the player.
   * @returns A promise that resolves after the socket send completes.
   */
  sendMove: async (position) => {
    const state = get();
    if (
      state.status !== 'playing' ||
      state.currentTurn !== state.mySessionId ||
      !state.matchId
    ) {
      return;
    }

    try {
      await getSocket().sendMatchState(
        state.matchId,
        OP_CODES.MAKE_MOVE,
        JSON.stringify({ position }),
      );
      set({
        pendingMoves: state.pendingMoves.concat(position),
      });
    } catch {
      get().setToast('Unable to send move.');
    }
  },

  /**
   * Sends a rematch request to the server after game over.
   *
   * @returns A promise that resolves after the socket send completes.
   */
  requestRematch: async () => {
    const state = get();
    if (state.status !== 'finished' || !state.matchId) {
      return;
    }

    try {
      await getSocket().sendMatchState(
        state.matchId,
        OP_CODES.REMATCH_REQUEST,
        JSON.stringify({}),
      );
      set({ rematchRequested: true });
    } catch {
      get().setToast('Unable to request rematch.');
    }
  },
}));
