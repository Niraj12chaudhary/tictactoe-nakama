/**
 * End-of-match modal for win, draw, disconnect, and timeout outcomes.
 * It combines the result summary with the leaderboard panel so players
 * can immediately see both outcome and progression after a round ends.
 */

import { LeaderboardPanel } from './LeaderboardPanel';
import type { GameOverReason, LeaderboardEntry, PlayerInfo } from '../types';

interface GameOverModalProps {
  winner: string | 'draw' | null;
  reason: GameOverReason | null;
  mySessionId: string;
  players: Record<string, PlayerInfo>;
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  rematchRequested: boolean;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

/**
 * Builds the headline text shown for the match result.
 *
 * @param winner The winner session ID or draw marker.
 * @param reason The reason the game ended.
 * @param mySessionId The local player's realtime session ID.
 * @param players The current player roster.
 * @returns The result title and supporting subtitle.
 */
function getResultCopy(
  winner: string | 'draw' | null,
  reason: GameOverReason | null,
  mySessionId: string,
  players: Record<string, PlayerInfo>,
): { title: string; subtitle: string } {
  if (winner === 'draw') {
    return {
      title: 'Draw!',
      subtitle: 'Nobody claimed the board this round.',
    };
  }

  if (!winner) {
    return {
      title: 'Game Over',
      subtitle: 'The match has finished.',
    };
  }

  if (reason === 'timeout') {
    return winner === mySessionId
      ? {
          title: 'You win!',
          subtitle: 'Time ran out for your opponent.',
        }
      : {
          title: 'Time ran out!',
          subtitle: 'Your turn timer expired before a move was made.',
        };
  }

  if (reason === 'disconnect') {
    return winner === mySessionId
      ? {
          title: 'You win!',
          subtitle: 'Your opponent disconnected before the match finished.',
        }
      : {
          title: 'Opponent left',
          subtitle: 'The match ended because a player disconnected.',
        };
  }

  return winner === mySessionId
    ? {
        title: 'You win!',
        subtitle: 'Clean lines, clean victory.',
      }
    : {
        title: `${players[winner]?.username ?? 'Opponent'} wins`,
        subtitle: 'The server confirmed the final board state.',
      };
}

/**
 * Renders the post-game modal and leaderboard summary.
 *
 * @param props Match result data and action callbacks.
 * @returns The game over modal overlay.
 */
export function GameOverModal({
  winner,
  reason,
  mySessionId,
  players,
  leaderboard,
  currentUserId,
  rematchRequested,
  onPlayAgain,
  onBackToHome,
}: GameOverModalProps) {
  const resultCopy = getResultCopy(winner, reason, mySessionId, players);
  const awardedPoints = winner === mySessionId ? '+10 pts' : '+0 pts';

  return (
    <div className="modal-backdrop">
      <div className="game-over-modal">
        <div className="panel-header">
          <p className="eyebrow">Round Complete</p>
          <h2>{resultCopy.title}</h2>
          <p className="panel-copy">{resultCopy.subtitle}</p>
        </div>

        <div className="result-pill">Score awarded: {awardedPoints}</div>

        <div className="modal-actions">
          <button
            className="primary-button"
            disabled={rematchRequested}
            onClick={onPlayAgain}
            type="button"
          >
            {rematchRequested ? 'Rematch Requested' : 'Play Again'}
          </button>

          <button
            className="secondary-button"
            onClick={onBackToHome}
            type="button"
          >
            Back to Home
          </button>
        </div>

        <LeaderboardPanel
          currentUserId={currentUserId}
          entries={leaderboard}
        />
      </div>
    </div>
  );
}
