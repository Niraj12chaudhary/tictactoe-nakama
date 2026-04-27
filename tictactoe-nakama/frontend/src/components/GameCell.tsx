/**
 * Single interactive cell for the Tic-Tac-Toe board.
 * The cell is intentionally dumb: it receives its visual state and click
 * behavior from the parent board so authority stays centralized.
 */

import type { MouseEventHandler } from 'react';

interface GameCellProps {
  value: string;
  disabled: boolean;
  highlighted: boolean;
  pending: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Renders one board button with pending and win-state styling.
 *
 * @param props Visual state and click handler for the cell.
 * @returns A styled board cell button.
 */
export function GameCell({
  value,
  disabled,
  highlighted,
  pending,
  onClick,
}: GameCellProps) {
  const className = [
    'game-cell',
    highlighted ? 'is-highlighted' : '',
    pending ? 'is-pending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span>{value}</span>
    </button>
  );
}
