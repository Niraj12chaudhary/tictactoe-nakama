/**
 * Socket event wiring for authoritative match updates.
 * This module listens to realtime Nakama messages and translates them
 * into store updates, leaderboard fetches, and UI navigation.
 */

import type {
  LeaderboardRecord,
  Match,
  MatchData,
  MatchmakerMatched,
  Socket,
} from '@heroiclabs/nakama-js';
import { client } from './nakamaClient';
import { GAME_MODES, LEADERBOARD_ID, OP_CODES } from './constants';
import { useGameStore } from '../store/gameStore';
import type {
  GameOverPayload,
  GameStatePayload,
  InvalidMovePayload,
  LeaderboardEntry,
  MatchEndedPayload,
  PlayerLeftPayload,
  TimerUpdatePayload,
} from '../types';

const textDecoder = new TextDecoder();

/**
 * Decodes a binary match message payload into a typed JSON object.
 *
 * @param data The binary payload supplied by the socket event.
 * @returns The parsed object.
 */
function decodePayload<T>(data: Uint8Array): T {
  return JSON.parse(textDecoder.decode(data)) as T;
}

/**
 * Maps Nakama leaderboard records into the UI leaderboard format.
 *
 * @param records The records returned by the Nakama client.
 * @returns Simplified leaderboard entries.
 */
function mapLeaderboardRecords(
  records: LeaderboardRecord[],
): LeaderboardEntry[] {
  return records.map((record) => ({
    rank: record.rank ?? 0,
    username: record.username ?? 'Unknown',
    score: record.score ?? 0,
    ownerId: record.owner_id ?? '',
  }));
}

/**
 * Fetches the top leaderboard plus the current player's own rank when needed.
 *
 * @returns The merged leaderboard rows for the UI.
 */
async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const store = useGameStore.getState();
  if (!store.session || !store.session.user_id) {
    return [];
  }

  const topRecords = await client.listLeaderboardRecords(
    store.session,
    LEADERBOARD_ID,
    undefined,
    10,
  );
  const topEntries = mapLeaderboardRecords(topRecords.records ?? []);

  if (
    topEntries.some((entry) => entry.ownerId === store.session?.user_id)
  ) {
    return topEntries;
  }

  const aroundOwner = await client.listLeaderboardRecordsAroundOwner(
    store.session,
    LEADERBOARD_ID,
    store.session.user_id,
    1,
  );
  const ownerEntries = mapLeaderboardRecords(aroundOwner.owner_records ?? []);
  if (ownerEntries.length === 0) {
    return topEntries;
  }

  return topEntries.concat(ownerEntries);
}

/**
 * Handles authoritative state snapshots from the backend.
 *
 * @param payload The current authoritative game state.
 * @returns Nothing.
 */
function applyGameState(payload: GameStatePayload): void {
  const store = useGameStore.getState();
  store.applyGameState(payload);

  const player = payload.players[store.mySessionId];
  if (player) {
    store.setMySymbol(player.symbol);
  }
}

/**
 * Joins a matched authoritative room after the matchmaker pairs players.
 *
 * @param socket The connected Nakama socket.
 * @param matched The authoritative matchmaking result.
 * @returns Nothing.
 */
async function handleMatchmakerMatched(
  socket: Socket,
  matched: MatchmakerMatched,
): Promise<void> {
  const joinedMatch: Match = await socket.joinMatch(
    matched.match_id,
    matched.token || undefined,
  );
  const store = useGameStore.getState();
  store.setJoinedMatch(joinedMatch.match_id, joinedMatch.self.session_id);
  store.setScreen('game');
}

/**
 * Handles authoritative match data op codes from the server.
 *
 * @param matchData The socket event payload from Nakama.
 * @returns Nothing.
 */
export async function onMatchData(matchData: MatchData): Promise<void> {
  const store = useGameStore.getState();

  switch (matchData.op_code) {
    case OP_CODES.GAME_START: {
      const payload = decodePayload<GameStatePayload>(matchData.data);
      applyGameState(payload);
      store.setStatus('playing');
      store.setScreen('game');
      return;
    }

    case OP_CODES.STATE_UPDATE: {
      const payload = decodePayload<GameStatePayload>(matchData.data);
      applyGameState(payload);
      store.setStatus(
        payload.status === 'finished' ? 'finished' : 'playing',
      );
      return;
    }

    case OP_CODES.GAME_OVER: {
      const payload = decodePayload<GameOverPayload>(matchData.data);
      store.setGameOver(payload.winner, payload.reason);
      try {
        const leaderboard = await fetchLeaderboard();
        store.setLeaderboard(leaderboard.length > 0 ? leaderboard : payload.leaderboard);
      } catch {
        store.setLeaderboard(payload.leaderboard);
      }
      return;
    }

    case OP_CODES.PLAYER_LEFT: {
      const payload = decodePayload<PlayerLeftPayload>(matchData.data);
      store.setToast(`${payload.username} disconnected.`);
      return;
    }

    case OP_CODES.MATCH_ENDED: {
      const payload = decodePayload<MatchEndedPayload>(matchData.data);
      store.setToast(`Match ended: ${payload.reason}.`);
      store.resetMatchState();
      store.setScreen('home');
      return;
    }

    case OP_CODES.INVALID_MOVE: {
      const payload = decodePayload<InvalidMovePayload>(matchData.data);
      store.setToast(payload.reason);
      return;
    }

    case OP_CODES.TIMER_UPDATE: {
      const payload = decodePayload<TimerUpdatePayload>(matchData.data);
      store.setRemainingMs(payload.remainingMs);
      return;
    }

    default: {
      return;
    }
  }
}

/**
 * Registers all realtime socket event handlers for the app.
 *
 * @param socket The connected Nakama socket.
 * @returns Nothing.
 */
export function registerSocketHandlers(socket: Socket): void {
  socket.onmatchdata = (matchData) => {
    void onMatchData(matchData);
  };

  socket.onmatchmakermatched = (matched) => {
    void handleMatchmakerMatched(socket, matched);
  };

  socket.ondisconnect = () => {
    const store = useGameStore.getState();
    store.setToast('Socket disconnected.');
    store.setStatus('idle');
  };

  socket.onerror = () => {
    useGameStore.getState().setToast('A realtime socket error occurred.');
  };
}
