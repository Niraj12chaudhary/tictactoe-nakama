/**
 * Authoritative Nakama match lifecycle for multiplayer Tic-Tac-Toe.
 * The server owns all state transitions here so clients can only request
 * actions and never mutate the board directly.
 */

import {
  BOARD_SIZE,
  GAME_MODES,
  GAME_OVER_REASONS,
  MATCH_LABEL_MAX_PLAYERS,
  MATCH_STATUSES,
  MATCH_TICK_RATE,
  MAX_PLAYERS,
  OP_CODES,
  PLAYER_SYMBOLS,
  SIGNAL_TYPES,
} from "./constants";
import {
  checkWinner,
  getOtherPlayer,
  getWinningPositions,
  isDraw,
  isValidMove,
} from "./gameLogic";
import { getLeaderboard, updateLeaderboard } from "./leaderboard";
import {
  clearTurnTimer,
  getRemainingTurnMs,
  hasTurnTimedOut,
  markTimerBroadcast,
  shouldBroadcastTimer,
  startTurnTimer,
} from "./timer";
import type {
  GameOverPayload,
  GameState,
  GameStateView,
  MatchInitParams,
  MatchLabel,
  MatchSignalPayload,
  MovePayload,
  PlayerInfo,
} from "./types";

/**
 * Creates a new empty board.
 *
 * @returns A blank 3x3 Tic-Tac-Toe board.
 */
function createEmptyBoard(): string[] {
  const board: string[] = [];
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    board.push("");
  }

  return board;
}

/**
 * Creates the initial authoritative state for a match instance.
 *
 * @param mode The game mode selected for the match.
 * @returns A fresh game state ready for players to join.
 */
function createInitialState(mode: string): GameState {
  return {
    board: createEmptyBoard(),
    players: {},
    currentTurn: "",
    status: MATCH_STATUSES.WAITING,
    winner: null,
    moveCount: 0,
    mode: mode === GAME_MODES.TIMED ? GAME_MODES.TIMED : GAME_MODES.CASUAL,
    winningPositions: [],
    rematchRequests: {},
    nextStartingSymbol: PLAYER_SYMBOLS.FIRST,
  };
}

/**
 * Builds the serialized match label exposed through Nakama match listings.
 *
 * @param state The authoritative match state.
 * @returns A JSON string label describing the room.
 */
function buildLabel(state: GameState): string {
  const label: MatchLabel = {
    mode: state.mode,
    status: state.status,
    maxPlayers: MATCH_LABEL_MAX_PLAYERS,
  };

  return JSON.stringify(label);
}

/**
 * Returns the public view of the authoritative state sent to clients.
 *
 * @param state The authoritative match state.
 * @returns A serializable state payload without internal rematch bookkeeping.
 */
function toGameStateView(state: GameState): GameStateView {
  const players: GameStateView["players"] = {};
  const sessionIds = Object.keys(state.players);
  for (let index = 0; index < sessionIds.length; index += 1) {
    const sessionId = sessionIds[index];
    const player = state.players[sessionId];
    players[sessionId] = {
      userId: player.userId,
      username: player.username,
      symbol: player.symbol,
      connected: player.connected,
    };
  }

  return {
    board: state.board.slice(0),
    players,
    currentTurn: state.currentTurn,
    status: state.status,
    winner: state.winner,
    moveCount: state.moveCount,
    mode: state.mode,
    winningPositions: state.winningPositions.slice(0),
    turnStartTime: state.turnStartTime,
  };
}

/**
 * Broadcasts a JSON payload to one or more match presences.
 *
 * @param dispatcher The Nakama dispatcher for match messages.
 * @param logger The Nakama logger used for error reporting.
 * @param opCode The op code to send.
 * @param payload The payload to serialize.
 * @param presences Optional target presences. When omitted, all connected presences receive the message.
 * @returns Nothing.
 */
function broadcastJson(
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  opCode: number,
  payload: unknown,
  presences?: nkruntime.Presence[],
): void {
  try {
    dispatcher.broadcastMessage(
      opCode,
      JSON.stringify(payload),
      presences ?? null,
      null,
      true,
    );
  } catch (error) {
    logger.error(
      "Failed to broadcast opCode=%d: %s",
      opCode,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Updates the exposed match label to reflect the latest state.
 *
 * @param dispatcher The Nakama dispatcher for match control actions.
 * @param logger The Nakama logger used for error reporting.
 * @param state The authoritative match state.
 * @returns Nothing.
 */
function updateMatchLabel(
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  state: GameState,
): void {
  try {
    dispatcher.matchLabelUpdate(buildLabel(state));
  } catch (error) {
    logger.error(
      "Failed to update match label: %s",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Returns the currently connected player session identifiers.
 *
 * @param state The authoritative match state.
 * @returns Session identifiers for connected players.
 */
function getConnectedSessionIds(state: GameState): string[] {
  const connectedSessionIds: string[] = [];
  const sessionIds = Object.keys(state.players);
  for (let index = 0; index < sessionIds.length; index += 1) {
    const sessionId = sessionIds[index];
    if (state.players[sessionId].connected) {
      connectedSessionIds.push(sessionId);
    }
  }

  return connectedSessionIds;
}

/**
 * Finds the session assigned to a given symbol.
 *
 * @param state The authoritative match state.
 * @param symbol The symbol to search for.
 * @returns The matching session identifier or an empty string when unavailable.
 */
function getSessionIdBySymbol(
  state: GameState,
  symbol: PlayerInfo["symbol"],
): string {
  const sessionIds = Object.keys(state.players);
  for (let index = 0; index < sessionIds.length; index += 1) {
    const sessionId = sessionIds[index];
    if (state.players[sessionId].symbol === symbol) {
      return sessionId;
    }
  }

  return "";
}

/**
 * Starts a fresh round and alternates the starting player for the next one.
 *
 * @param state The authoritative match state.
 * @returns The updated state ready for play.
 */
function startRound(state: GameState): GameState {
  const starterSessionId =
    getSessionIdBySymbol(state, state.nextStartingSymbol) ||
    getConnectedSessionIds(state)[0] ||
    "";

  state.board = createEmptyBoard();
  state.currentTurn = starterSessionId;
  state.status = MATCH_STATUSES.PLAYING;
  state.winner = null;
  state.moveCount = 0;
  state.winningPositions = [];
  state.rematchRequests = {};
  state.nextStartingSymbol =
    state.nextStartingSymbol === PLAYER_SYMBOLS.FIRST
      ? PLAYER_SYMBOLS.SECOND
      : PLAYER_SYMBOLS.FIRST;
  startTurnTimer(state, Date.now());

  return state;
}

/**
 * Sends the current authoritative state to all connected players.
 *
 * @param dispatcher The Nakama dispatcher for match messages.
 * @param logger The Nakama logger used for error reporting.
 * @param state The authoritative match state.
 * @param opCode The op code representing the state update semantic.
 * @returns Nothing.
 */
function broadcastState(
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  state: GameState,
  opCode: number,
): void {
  broadcastJson(dispatcher, logger, opCode, toGameStateView(state));
}

/**
 * Sends an invalid move response to the requesting player only.
 *
 * @param dispatcher The Nakama dispatcher for match messages.
 * @param logger The Nakama logger used for error reporting.
 * @param presence The player who submitted the invalid request.
 * @param reason The reason the action was rejected.
 * @param position The optional board position that was attempted.
 * @returns Nothing.
 */
function sendInvalidMove(
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  presence: nkruntime.Presence,
  reason: string,
  position?: number,
): void {
  broadcastJson(
    dispatcher,
    logger,
    OP_CODES.INVALID_MOVE,
    { reason, position },
    [presence],
  );
}

/**
 * Parses an incoming move payload from a match message.
 *
 * @param nk The Nakama server API for binary conversion helpers.
 * @param logger The Nakama logger used for error reporting.
 * @param message The incoming authoritative match message.
 * @returns The parsed move payload or null when invalid.
 */
function parseMovePayload(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  message: nkruntime.MatchMessage,
): MovePayload | null {
  try {
    const payload = JSON.parse(nk.binaryToString(message.data)) as MovePayload;
    if (typeof payload.position !== "number" || payload.position % 1 !== 0) {
      return null;
    }

    return payload;
  } catch (error) {
    logger.warn(
      "Failed to parse move payload from session=%s: %s",
      message.sender.sessionId,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Completes a game, updates the leaderboard when applicable, and notifies players.
 *
 * @param ctx The runtime context.
 * @param nk The Nakama server API.
 * @param dispatcher The Nakama dispatcher for match messages.
 * @param logger The Nakama logger used for error reporting.
 * @param state The authoritative match state.
 * @param winnerSessionId The winning session identifier or draw marker.
 * @param reason The reason the game ended.
 * @param loserSessionId The losing session identifier when one exists.
 * @returns The updated state.
 */
function finishGame(
  ctx: nkruntime.Context,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  state: GameState,
  winnerSessionId: string | "draw",
  reason: GameOverPayload["reason"],
  loserSessionId?: string,
): GameState {
  state.status = MATCH_STATUSES.FINISHED;
  state.winner = winnerSessionId;
  state.currentTurn = "";
  state.rematchRequests = {};
  clearTurnTimer(state);

  if (winnerSessionId !== "draw" && loserSessionId) {
    const winnerPlayer = state.players[winnerSessionId];
    const loserPlayer = state.players[loserSessionId];
    if (winnerPlayer && loserPlayer) {
      updateLeaderboard(ctx, nk, winnerPlayer.userId, loserPlayer.userId);
    }
  }

  const leaderboard = getLeaderboard(ctx, nk);
  broadcastState(dispatcher, logger, state, OP_CODES.STATE_UPDATE);
  broadcastJson(dispatcher, logger, OP_CODES.GAME_OVER, {
    winner: winnerSessionId,
    reason,
    leaderboard,
  } satisfies GameOverPayload);
  updateMatchLabel(dispatcher, logger, state);

  return state;
}

/**
 * Initializes the authoritative match instance.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param params The match creation parameters.
 * @returns The initial state, tick rate, and public label.
 */
export function init(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: MatchInitParams,
): { state: GameState; tickRate: number; label: string } {
  const state = createInitialState(params?.mode ?? GAME_MODES.CASUAL);
  logger.info(
    "Initializing match module=%s mode=%s userId=%s",
    ctx.matchId ?? "pending",
    state.mode,
    ctx.userId ?? "system",
  );

  return {
    state,
    tickRate: MATCH_TICK_RATE,
    label: buildLabel(state),
  };
}

/**
 * Handles join attempts before players are admitted into the match.
 * Nakama requires this function for authoritative matches, and it lets
 * us reject a third player before they are added to state.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param dispatcher The match dispatcher.
 * @param tick The current tick.
 * @param state The authoritative match state.
 * @param presence The player attempting to join.
 * @param metadata Join metadata sent with the request.
 * @returns The updated state plus the admission decision.
 */
export function joinAttempt(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any },
): { state: GameState; accept: boolean; rejectMessage?: string } | null {
  const existingPlayer = state.players[presence.sessionId];
  if (existingPlayer) {
    return { state, accept: true };
  }

  if (Object.keys(state.players).length >= MAX_PLAYERS) {
    logger.info(
      "Rejecting join for session=%s on match=%s because the room is full.",
      presence.sessionId,
      ctx.matchId,
    );
    return { state, accept: false, rejectMessage: "Match is full." };
  }

  if (state.status === MATCH_STATUSES.FINISHED) {
    return {
      state: state,
      accept: false,
      rejectMessage: "Match has already finished.",
    };
  }

  return { state, accept: true };
}

/**
 * Adds newly joined players to the authoritative state.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param dispatcher The match dispatcher.
 * @param tick The current tick.
 * @param state The authoritative match state.
 * @param presences The players who just joined.
 * @returns The updated match state.
 */
export function join(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presences: nkruntime.Presence[],
): { state: GameState } | null {
  for (let index = 0; index < presences.length; index += 1) {
    const presence = presences[index];
    if (state.players[presence.sessionId]) {
      state.players[presence.sessionId].connected = true;
      continue;
    }

    const symbol =
      Object.keys(state.players).length === 0
        ? PLAYER_SYMBOLS.FIRST
        : PLAYER_SYMBOLS.SECOND;

    state.players[presence.sessionId] = {
      userId: presence.userId,
      username: presence.username,
      symbol,
      connected: true,
    };
  }

  if (getConnectedSessionIds(state).length === MAX_PLAYERS) {
    startRound(state);
    broadcastState(dispatcher, logger, state, OP_CODES.GAME_START);
  }

  updateMatchLabel(dispatcher, logger, state);
  return { state };
}

/**
 * Handles player departures and awards a disconnect win when applicable.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param dispatcher The match dispatcher.
 * @param tick The current tick.
 * @param state The authoritative match state.
 * @param presences The players who left.
 * @returns The updated state or null when the match should terminate.
 */
export function leave(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  presences: nkruntime.Presence[],
): { state: GameState } | null {
  for (let index = 0; index < presences.length; index += 1) {
    const presence = presences[index];
    const player = state.players[presence.sessionId];
    if (!player) {
      continue;
    }

    player.connected = false;
    broadcastJson(dispatcher, logger, OP_CODES.PLAYER_LEFT, {
      sessionId: presence.sessionId,
      userId: player.userId,
      username: player.username,
    });
  }

  const connectedSessionIds = getConnectedSessionIds(state);
  if (connectedSessionIds.length === 0) {
    return null;
  }

  if (state.status === MATCH_STATUSES.PLAYING) {
    const winnerSessionId = connectedSessionIds[0];
    const loserSessionId = presences.length > 0 ? presences[0].sessionId : "";
    finishGame(
      ctx,
      nk,
      dispatcher,
      logger,
      state,
      winnerSessionId,
      GAME_OVER_REASONS.DISCONNECT,
      loserSessionId,
    );
  }

  return { state };
}

/**
 * Processes authoritative move and rematch messages every tick.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param dispatcher The match dispatcher.
 * @param tick The current tick.
 * @param state The authoritative match state.
 * @param messages Buffered player messages for this tick.
 * @returns The updated state, or null to terminate the match.
 */
export function loop(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  messages: nkruntime.MatchMessage[],
): { state: GameState } | null {
  if (state.status === MATCH_STATUSES.PLAYING) {
    const nowMs = Date.now();

    if (hasTurnTimedOut(state, nowMs)) {
      const losingSessionId = state.currentTurn;
      finishGame(
        ctx,
        nk,
        dispatcher,
        logger,
        state,
        getOtherPlayer(state, losingSessionId),
        GAME_OVER_REASONS.TIMEOUT,
        losingSessionId,
      );
      return { state };
    }

    if (shouldBroadcastTimer(state, nowMs)) {
      markTimerBroadcast(state, nowMs);
      broadcastJson(dispatcher, logger, OP_CODES.TIMER_UPDATE, {
        remainingMs: getRemainingTurnMs(state, nowMs),
      });
    }
  }

  for (
    let messageIndex = 0;
    messageIndex < messages.length;
    messageIndex += 1
  ) {
    const message = messages[messageIndex];
    if (message.opCode === OP_CODES.MAKE_MOVE) {
      const payload = parseMovePayload(nk, logger, message);
      if (!payload) {
        sendInvalidMove(
          dispatcher,
          logger,
          message.sender,
          "Move payload must include an integer position.",
        );
        continue;
      }

      const validation = isValidMove(
        state,
        message.sender.sessionId,
        payload.position,
      );
      if (!validation.valid) {
        sendInvalidMove(
          dispatcher,
          logger,
          message.sender,
          validation.reason ?? "Move rejected by the server.",
          payload.position,
        );
        continue;
      }

      const player = state.players[message.sender.sessionId];
      state.board[payload.position] = player.symbol;
      state.moveCount += 1;

      const winningSymbol = checkWinner(state.board);
      if (winningSymbol) {
        state.winningPositions = getWinningPositions(state.board);
        finishGame(
          ctx,
          nk,
          dispatcher,
          logger,
          state,
          message.sender.sessionId,
          GAME_OVER_REASONS.NORMAL,
          getOtherPlayer(state, message.sender.sessionId),
        );
        continue;
      }

      if (isDraw(state.board, state.moveCount)) {
        state.winningPositions = [];
        finishGame(
          ctx,
          nk,
          dispatcher,
          logger,
          state,
          "draw",
          GAME_OVER_REASONS.NORMAL,
        );
        continue;
      }

      state.currentTurn = getOtherPlayer(state, message.sender.sessionId);
      startTurnTimer(state, Date.now());
      broadcastState(dispatcher, logger, state, OP_CODES.STATE_UPDATE);
      continue;
    }

    if (message.opCode === OP_CODES.REMATCH_REQUEST) {
      if (state.status !== MATCH_STATUSES.FINISHED) {
        sendInvalidMove(
          dispatcher,
          logger,
          message.sender,
          "Rematch requests are only allowed after the game ends.",
        );
        continue;
      }

      state.rematchRequests[message.sender.sessionId] = true;
      const playerSessionIds = Object.keys(state.players);
      const allPlayersReady =
        playerSessionIds.length === MAX_PLAYERS &&
        playerSessionIds.every((sessionId) => state.rematchRequests[sessionId]);

      if (allPlayersReady) {
        startRound(state);
        updateMatchLabel(dispatcher, logger, state);
        broadcastState(dispatcher, logger, state, OP_CODES.GAME_START);
      }
      continue;
    }

    logger.warn(
      "Ignoring unsupported opCode=%d from session=%s",
      message.opCode,
      message.sender.sessionId,
    );
  }

  return { state };
}

/**
 * Performs graceful shutdown work before Nakama destroys the match.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param dispatcher The match dispatcher.
 * @param tick The current tick.
 * @param state The authoritative match state.
 * @param graceSeconds The graceful shutdown window.
 * @returns The final state for termination.
 */
export function terminate(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  graceSeconds: number,
): { state: GameState } | null {
  broadcastJson(dispatcher, logger, OP_CODES.MATCH_ENDED, {
    reason: "server_shutdown",
  });
  logger.info(
    "Terminating match=%s after graceSeconds=%d",
    ctx.matchId,
    graceSeconds,
  );

  return { state };
}

/**
 * Handles administrative signals sent to the authoritative match.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param dispatcher The match dispatcher.
 * @param tick The current tick.
 * @param state The authoritative match state.
 * @param data Arbitrary signal data encoded as a string.
 * @returns The updated state and an optional response payload.
 */
export function signal(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  data: string,
): { state: GameState; data?: string } | null {
  try {
    const payload = JSON.parse(data) as MatchSignalPayload;
    if (payload.type === SIGNAL_TYPES.STATUS) {
      return {
        state,
        data: JSON.stringify({
          matchId: ctx.matchId,
          state: toGameStateView(state),
          connectedPlayers: getConnectedSessionIds(state),
        }),
      };
    }

    if (payload.type === SIGNAL_TYPES.TERMINATE) {
      broadcastJson(dispatcher, logger, OP_CODES.MATCH_ENDED, {
        reason: payload.message ?? "terminated_by_admin",
      });
      return null;
    }
  } catch (error) {
    logger.warn(
      "Failed to parse signal payload for match=%s: %s",
      ctx.matchId,
      error instanceof Error ? error.message : String(error),
    );
  }

  return {
    state,
    data: JSON.stringify({
      acknowledged: true,
      matchId: ctx.matchId,
    }),
  };
}
