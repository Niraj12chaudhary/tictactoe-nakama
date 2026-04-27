/**
 * Leaderboard presentation component for end-of-match rankings.
 * It keeps ranking display concerns separate from modal/layout code
 * so the same panel can be reused elsewhere in the app later.
 */

import type { LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

/**
 * Renders the current leaderboard rows with local-player highlighting.
 *
 * @param props Leaderboard entries and the current user identifier.
 * @returns A leaderboard panel section.
 */
export function LeaderboardPanel({
  entries,
  currentUserId,
}: LeaderboardPanelProps) {
  return (
    <section className="leaderboard-panel">
      <div className="panel-header">
        <p className="eyebrow">Leaderboard</p>
        <h3>Top Tic-Tac-Toe Players</h3>
      </div>

      <div className="leaderboard-table">
        <div className="leaderboard-row leaderboard-row--header">
          <span>Rank</span>
          <span>Player</span>
          <span>Score</span>
        </div>

        {entries.length === 0 ? (
          <div className="leaderboard-empty">No leaderboard entries yet.</div>
        ) : (
          entries.map((entry) => (
            <div
              className={[
                'leaderboard-row',
                entry.ownerId === currentUserId ? 'is-current-user' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={`${entry.ownerId}-${entry.rank}`}
            >
              <span>#{entry.rank}</span>
              <span>{entry.username}</span>
              <span>{entry.score}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
