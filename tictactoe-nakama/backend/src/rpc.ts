/**
 * RPC entry points for matchmaking and private room creation.
 * These handlers validate client requests and create authoritative
 * matches where the Nakama TypeScript runtime allows server control.
 */

import { GAME_MODES, MATCH_HANDLER_NAME, MAX_PLAYERS } from "./constants";
import type {
  CreatePrivateRoomRequest,
  CreatePrivateRoomResponse,
  FindMatchRequest,
  FindMatchResponse,
  GameMode,
} from "./types";

/**
 * Parses an RPC payload into a typed object.
 *
 * @param logger The Nakama logger used for warning output.
 * @param payload The raw RPC payload string.
 * @returns The parsed object or an empty object when the payload is missing.
 */
function parsePayload<T>(logger: nkruntime.Logger, payload: string): T {
  if (!payload) {
    return {} as T;
  }

  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    logger.warn(
      "Failed to parse RPC payload: %s",
      error instanceof Error ? error.message : String(error),
    );
    throw new Error("Payload must be valid JSON.");
  }
}

/**
 * Normalizes a requested mode to one of the supported matchmaking modes.
 *
 * @param mode The raw mode value supplied by the caller.
 * @returns A supported game mode.
 */
function resolveMode(mode?: string): GameMode {
  return mode === GAME_MODES.TIMED ? GAME_MODES.TIMED : GAME_MODES.CASUAL;
}

/**
 * Validates that an RPC call originates from an authenticated user.
 *
 * @param ctx The runtime context.
 * @returns Nothing.
 */
function assertAuthenticated(ctx: nkruntime.Context): void {
  if (!ctx.userId) {
    throw new Error("This RPC requires an authenticated user.");
  }
}

/**
 * Returns the canonical public matchmaking settings for the requested mode.
 * The Nakama TypeScript runtime does not expose a server-side matchmakerAdd API,
 * so the frontend uses these settings with socket.addMatchmaker().
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param payload The raw RPC payload string.
 * @returns Serialized matchmaking settings for the frontend.
 */
export function findMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  assertAuthenticated(ctx);
  const request = parsePayload<FindMatchRequest>(logger, payload);
  const mode = resolveMode(request.mode);
  const response: FindMatchResponse = {
    ticket: "",
    mode,
    query: `+properties.mode:${mode}`,
    minCount: MAX_PLAYERS,
    maxCount: MAX_PLAYERS,
    stringProperties: {
      mode,
    },
  };

  logger.info(
    "Prepared matchmaking config for userId=%s mode=%s",
    ctx.userId,
    mode,
  );

  return JSON.stringify(response);
}

/**
 * Creates a new private authoritative room that another player can join directly.
 *
 * @param ctx The runtime context.
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @param payload The raw RPC payload string.
 * @returns The created match identifier and selected mode.
 */
export function createPrivateRoom(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  assertAuthenticated(ctx);
  const request = parsePayload<CreatePrivateRoomRequest>(logger, payload);
  const mode = resolveMode(request.mode);
  const matchId = nk.matchCreate(MATCH_HANDLER_NAME, { mode });
  const response: CreatePrivateRoomResponse = {
    matchId,
    mode,
  };

  logger.info(
    "Created private room matchId=%s userId=%s mode=%s",
    matchId,
    ctx.userId,
    mode,
  );

  return JSON.stringify(response);
}
