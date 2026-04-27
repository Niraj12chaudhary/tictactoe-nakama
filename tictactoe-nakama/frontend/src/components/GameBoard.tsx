/**
 * Main gameplay screen for the authoritative Tic-Tac-Toe match.
 * This component renders the current board, turn information, player
 * identities, and the end-of-game modal when the round is complete.
 */

import { useGameStore } from '../store/gameStore';
import { TURN_TIMEOUT_MS } from '../lib/constants';
import { GameCell } from './GameCell';
import { GameOverModal } from './GameOverModal';

interface GameBoardProps {
  onBackToHome: () => void;
}

/**
 * Renders the authoritative match board and related status UI.
 *
 * @param props Navigation callback used after the round finishes.
 * @returns The gameplay screen.
 */
export function GameBoard({ onBackToHome }: GameBoardProps) {
  const board = useGameStore((state) => state.board);
  const currentTurn = useGameStore((state) => state.currentTurn);
  const mySessionId = useGameStore((state) => state.mySessionId);
  const mySymbol = useGameStore((state) => state.mySymbol);
  const players = useGameStore((state) => state.players);
  const status = useGameStore((state) => state.status);
  const winner = useGameStore((state) => state.winner);
  const leaderboard = useGameStore((state) => state.leaderboard);
  const session = useGameStore((state) => state.session);
  const winningPositions = useGameStore((state) => state.winningPositions);
  const pendingMoves = useGameStore((state) => state.pendingMoves);
  const gameOverReason = useGameStore((state) => state.gameOverReason);
  const rematchRequested = useGameStore((state) => state.rematchRequested);
  const remainingMs = useGameStore((state) => state.remainingMs);
  const mode = useGameStore((state) => state.mode);
  const sendMove = useGameStore((state) => state.sendMove);
  const requestRematch = useGameStore((state) => state.requestRematch);

  const playerEntries = Object.entries(players);
  const opponentEntry = playerEntries.find(
    ([sessionId]) => sessionId !== mySessionId,
  );
  const opponent = opponentEntry?.[1];
  const yourTurn = status === 'playing' && currentTurn === mySessionId;
  const timerPercent = Math.max(
    0,
    Math.min((remainingMs / TURN_TIMEOUT_MS) * 100, 100),
  );

  return (
    <section className="game-layout">
      <div className="panel game-panel">
        <div className="game-header">
          <div>
            <p className="eyebrow">Authoritative Match</p>
            <h1>{yourTurn ? 'Your turn' : "Opponent's turn"}</h1>
            <p className="panel-copy">
              You ({mySymbol ?? '?'}) vs {opponent?.username ?? 'Opponent'} (
              {opponent?.symbol ?? '?'})
            </p>
          </div>

          <div className="turn-chip">
            {status === 'finished'
              ? 'Round complete'
              : yourTurn
                ? 'Act now'
                : 'Waiting'}
          </div>
        </div>

        {mode === 'timed' ? (
          <div className="timer-shell">
            <div className="timer-track">
              <div
                className="timer-bar"
                style={{ width: `${timerPercent}%` }}
              />
            </div>
            <span className="timer-label">
              {Math.ceil(remainingMs / 1000)}s left
            </span>
          </div>
        ) : null}

        <div className="board-grid">
          {board.map((value, index) => {
            const occupied = value !== '';
            const pending = pendingMoves.includes(index);
            const disabled =
              status !== 'playing' || !yourTurn || occupied || pending;

            return (
              <GameCell
                disabled={disabled}
                highlighted={winningPositions.includes(index)}
                key={index}
                onClick={() => {
                  void sendMove(index);
                }}
                pending={pending}
                value={value}
              />
            );
          })}
        </div>
      </div>

      {status === 'finished' ? (
        <GameOverModal
          currentUserId={session?.user_id}
          leaderboard={leaderboard}
          mySessionId={mySessionId}
          onBackToHome={onBackToHome}
          onPlayAgain={() => {
            void requestRematch();
          }}
          players={players}
          reason={gameOverReason}
          rematchRequested={rematchRequested}
          winner={winner}
        />
      ) : null}
    </section>
  );
}
