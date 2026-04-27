import { MATCH_HANDLER_NAME } from "./constants";
import { ensureLeaderboard } from "./leaderboard";
import {
  init,
  joinAttempt,
  join,
  leave,
  loop,
  terminate,
  signal,
} from "./matchHandler";
import { createPrivateRoom, findMatch } from "./rpc";

function matchmakerMatched(
  context: nkruntime.Context,
  matchmakerLogger: nkruntime.Logger,
  nakama: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[],
) {
  let mode = "casual";
  if (
    matches.length > 0 &&
    matches[0].properties &&
    matches[0].properties.mode
  ) {
    mode = matches[0].properties.mode;
  }

  return nakama.matchCreate(MATCH_HANDLER_NAME, { mode });
}

export function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
): void {
  // Ensure the global leaderboard is created on server start
  ensureLeaderboard(logger, nk);

  // Register the fully-featured match handler from your domain files
  initializer.registerMatch(MATCH_HANDLER_NAME, {
    matchInit: init,
    matchJoinAttempt: joinAttempt,
    matchJoin: join,
    matchLeave: leave,
    matchLoop: loop,
    matchTerminate: terminate,
    matchSignal: signal,
  });

  // Register RPC endpoints
  initializer.registerRpc("find_match", findMatch);
  initializer.registerRpc("create_private_room", createPrivateRoom);

  // Intercept matchmaker pairing and automatically create an authoritative match
  initializer.registerMatchmakerMatched(matchmakerMatched);

  logger.info("Tic-Tac-Toe module loaded successfully.");
}
