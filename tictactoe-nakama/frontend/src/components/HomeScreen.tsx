/**
 * Landing screen for authentication preferences and match entry actions.
 * Players choose a username, select a mode, and either queue publicly
 * or create/join a private room from this screen.
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameMode } from '../types';

interface HomeScreenProps {
  busy: boolean;
  onFindMatch: () => Promise<void>;
  onCreatePrivateRoom: () => Promise<void>;
  onJoinPrivateRoom: (roomCode: string) => Promise<void>;
}

/**
 * Renders the home screen controls for multiplayer entry.
 *
 * @param props Async action handlers for matchmaking and room flow.
 * @returns The landing page panel.
 */
export function HomeScreen({
  busy,
  onFindMatch,
  onCreatePrivateRoom,
  onJoinPrivateRoom,
}: HomeScreenProps) {
  const username = useGameStore((state) => state.username);
  const mode = useGameStore((state) => state.mode);
  const setUsername = useGameStore((state) => state.setUsername);
  const setMode = useGameStore((state) => state.setMode);
  const [roomCode, setRoomCode] = useState('');

  /**
   * Updates the selected matchmaking mode in the shared store.
   *
   * @param nextMode The mode chosen by the player.
   * @returns Nothing.
   */
  function handleModeChange(nextMode: GameMode): void {
    setMode(nextMode);
  }

  return (
    <section className="home-grid">
      <div className="hero-panel">
        <p className="eyebrow">Multiplayer Tic-Tac-Toe</p>
        <h1>Fast rounds, authoritative rules, zero client-side cheating.</h1>
        <p className="hero-copy">
          Every move is validated on the Nakama server before it ever touches
          the board. Queue for a public game or spin up a private room for a
          direct challenge.
        </p>
      </div>

      <div className="panel control-panel">
        <div className="panel-header">
          <p className="eyebrow">Play</p>
          <h2>Enter the lobby</h2>
        </div>

        <label className="field">
          <span>Username</span>
          <input
            maxLength={24}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Choose a display name"
            type="text"
            value={username}
          />
        </label>

        <div className="mode-toggle">
          <button
            className={mode === 'casual' ? 'mode-chip is-active' : 'mode-chip'}
            onClick={() => handleModeChange('casual')}
            type="button"
          >
            Classic
          </button>

          <button
            className={mode === 'timed' ? 'mode-chip is-active' : 'mode-chip'}
            onClick={() => handleModeChange('timed')}
            type="button"
          >
            Timed
          </button>
        </div>

        <div className="button-stack">
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => {
              void onFindMatch();
            }}
            type="button"
          >
            Find Match
          </button>

          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              void onCreatePrivateRoom();
            }}
            type="button"
          >
            Create Private Room
          </button>
        </div>

        <div className="join-room">
          <label className="field">
            <span>Join with Room Code</span>
            <input
              onChange={(event) => setRoomCode(event.target.value)}
              placeholder="Paste a match ID"
              type="text"
              value={roomCode}
            />
          </label>

          <button
            className="ghost-button"
            disabled={busy || roomCode.trim().length === 0}
            onClick={() => {
              void onJoinPrivateRoom(roomCode.trim());
            }}
            type="button"
          >
            Join Room
          </button>
        </div>
      </div>
    </section>
  );
}
