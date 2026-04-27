/**
 * Leaderboard helpers for the Tic-Tac-Toe authoritative backend.
 * This module owns leaderboard creation, score updates, and read paths
 * so match logic stays focused on gameplay rather than persistence details.
 */

import {
  LEADERBOARD_FETCH_LIMIT,
  LEADERBOARD_ID,
  LEADERBOARD_LOSS_POINTS,
  LEADERBOARD_WIN_POINTS,
} from "./constants";
import type { LeaderboardEntry } from "./types";

/**
 * Creates the global Tic-Tac-Toe leaderboard if it does not already exist.
 *
 * @param logger The Nakama logger.
 * @param nk The Nakama server API.
 * @returns Nothing.
 */
export function ensureLeaderboard(
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
): void {
  try {
    nk.leaderboardCreate(LEADERBOARD_ID, true, "desc", "best");
    logger.info("Ensured leaderboard exists: %s", LEADERBOARD_ID);
  } catch (error) {
    logger.warn(
      "Leaderboard create skipped for id=%s: %s",
      LEADERBOARD_ID,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Reads current stored scores for the supplied owners.
 *
 * @param nk The Nakama server API.
 * @param ownerIds The users whose scores should be fetched.
 * @returns A lookup of owner ID to stored leaderboard score.
 */
function getCurrentScores(
  nk: nkruntime.Nakama,
  ownerIds: string[],
): Record<string, number> {
  if (ownerIds.length === 0) {
    return {};
  }

  const result = nk.leaderboardRecordsList(
    LEADERBOARD_ID,
    ownerIds,
    ownerIds.length,
  );
  const scores: Record<string, number> = {};
  const ownerRecords = result.ownerRecords ?? [];

  for (let index = 0; index < ownerRecords.length; index += 1) {
    const record = ownerRecords[index];
    scores[record.ownerId] = record.score;
  }

  return scores;
}

/**
 * Resolves usernames for a set of user IDs before leaderboard writes.
 *
 * @param nk The Nakama server API.
 * @param ownerIds The users to resolve.
 * @returns A lookup of owner ID to username.
 */
function getUsernames(
  nk: nkruntime.Nakama,
  ownerIds: string[],
): Record<string, string> {
  if (ownerIds.length === 0) {
    return {};
  }

  const users = nk.usersGetId(ownerIds);
  const usernames: Record<string, string> = {};

  for (let index = 0; index < users.length; index += 1) {
    const user = users[index];
    usernames[user.userId] = user.username;
  }

  return usernames;
}

/**
 * Converts Nakama leaderboard records into frontend-friendly entries.
 *
 * @param records Leaderboard records returned by Nakama.
 * @returns Ordered leaderboard entries with rank, name, and score.
 */
function mapRecords(
  records: nkruntime.LeaderboardRecord[],
): LeaderboardEntry[] {
  return records.map((record) => ({
    rank: record.rank,
    username: record.username,
    score: record.score,
    ownerId: record.ownerId,
  }));
}

/**
 * Updates winner and loser records after a completed game.
 *
 * @param ctx The runtime context.
 * @param nk The Nakama server API.
 * @param winnerId The user ID of the winning player.
 * @param loserId The user ID of the losing player.
 * @returns Nothing.
 */
export function updateLeaderboard(
  ctx: nkruntime.Context,
  nk: nkruntime.Nakama,
  winnerId: string,
  loserId: string,
): void {
  const ownerIds = [winnerId, loserId].filter(
    (value): value is string => value.length > 0,
  );
  const currentScores = getCurrentScores(nk, ownerIds);
  const usernames = getUsernames(nk, ownerIds);

  nk.leaderboardRecordWrite(
    LEADERBOARD_ID,
    winnerId,
    usernames[winnerId],
    (currentScores[winnerId] ?? 0) + LEADERBOARD_WIN_POINTS,
    0,
    {
      updatedBy: ctx.userId ?? "system",
      result: "win",
    },
    "best",
  );

  nk.leaderboardRecordWrite(
    LEADERBOARD_ID,
    loserId,
    usernames[loserId],
    currentScores[loserId] ?? LEADERBOARD_LOSS_POINTS,
    0,
    {
      updatedBy: ctx.userId ?? "system",
      result: "loss",
    },
    "best",
  );
}

/**
 * Fetches the top leaderboard entries for the game over experience.
 *
 * @param ctx The runtime context.
 * @param nk The Nakama server API.
 * @returns The top leaderboard entries.
 */
export function getLeaderboard(
  ctx: nkruntime.Context,
  nk: nkruntime.Nakama,
): LeaderboardEntry[] {
  const records = nk.leaderboardRecordsList(
    LEADERBOARD_ID,
    undefined,
    LEADERBOARD_FETCH_LIMIT,
  );
  return mapRecords(records.records ?? []);
}
