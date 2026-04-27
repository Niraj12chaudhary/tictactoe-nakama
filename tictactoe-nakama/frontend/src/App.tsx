/**
 * Root application component for the multiplayer Tic-Tac-Toe frontend.
 * It coordinates authentication, socket setup, screen transitions, and
 * high-level game actions while delegating rendering to smaller components.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Match, RpcResponse, Session, Socket } from '@heroiclabs/nakama-js';
import { GameBoard } from './components/GameBoard';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { RPC_IDS } from './lib/constants';
import {
  client,
  authenticateDevice,
  connectSocket,
  disconnectSocket,
  getSocket,
} from './lib/nakamaClient';
import { registerSocketHandlers } from './lib/socketHandlers';
import { useGameStore } from './store/gameStore';
import type { CreatePrivateRoomResponse, FindMatchRpcResponse } from './types';

/**
 * Safely parses a typed RPC payload from the Nakama client response.
 *
 * @param response The raw Nakama RPC response.
 * @returns The typed RPC payload.
 */
function parseRpcPayload<T>(response: RpcResponse): T {
  return (response.payload ?? {}) as T;
}

/**
 * Ensures the client has a fresh session and active socket connection.
 *
 * @param username The preferred username from the store.
 * @returns The active session and connected socket.
 */
async function ensureRealtimeClient(
  username: string,
): Promise<{ session: Session; socket: Socket }> {
  const session = await authenticateDevice(username);
  useGameStore.getState().setSession(session);

  try {
    return {
      session,
      socket: getSocket(),
    };
  } catch {
    const socket = await connectSocket(session);
    registerSocketHandlers(socket);
    return { session, socket };
  }
}

/**
 * Leaves the active match if one is connected and resets the local state.
 *
 * @returns A promise that resolves after the local reset completes.
 */
async function leaveActiveMatch(): Promise<void> {
  const store = useGameStore.getState();

  try {
    if (store.matchId) {
      await getSocket().leaveMatch(store.matchId);
    }
  } catch {
    store.setToast('Unable to notify the server about leaving the match.');
  }

  store.resetMatchState();
  store.setScreen('home');
}

/**
 * Root React component.
 *
 * @returns The application shell for the selected screen.
 */
function App() {
  const screen = useGameStore((state) => state.screen);
  const username = useGameStore((state) => state.username);
  const mode = useGameStore((state) => state.mode);
  const session = useGameStore((state) => state.session);
  const toast = useGameStore((state) => state.toast);
  const matchmakerTicket = useGameStore((state) => state.matchmakerTicket);
  const privateRoomCode = useGameStore((state) => state.privateRoomCode);
  const clearToast = useGameStore((state) => state.clearToast);
  const setSearching = useGameStore((state) => state.setSearching);
  const setPrivateRoomCode = useGameStore((state) => state.setPrivateRoomCode);
  const setJoinedMatch = useGameStore((state) => state.setJoinedMatch);
  const setScreen = useGameStore((state) => state.setScreen);
  const setToast = useGameStore((state) => state.setToast);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);

  /**
   * Bootstraps authentication and the socket on first app load.
   *
   * @returns Nothing.
   */
  useEffect(() => {
    let active = true;

    async function bootstrap(): Promise<void> {
      try {
        await ensureRealtimeClient(useGameStore.getState().username);
      } catch {
        useGameStore.getState().setToast(
          'Unable to connect to Nakama. Check your server settings.',
        );
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
      disconnectSocket();
    };
  }, []);

  /**
   * Clears toast messages after a short timeout.
   *
   * @returns Nothing.
   */
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearToast();
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast, clearToast]);

  /**
   * Starts public matchmaking for the selected mode.
   *
   * @returns A promise that resolves after the ticket is issued.
   */
  async function handleFindMatch(): Promise<void> {
    setBusy(true);

    try {
      const { session: currentSession, socket } = await ensureRealtimeClient(
        useGameStore.getState().username,
      );
      const rpcResponse = await client.rpc(currentSession, RPC_IDS.FIND_MATCH, {
        mode: useGameStore.getState().mode,
      });
      const payload = parseRpcPayload<FindMatchRpcResponse>(rpcResponse);
      const ticket = await socket.addMatchmaker(
        payload.query,
        payload.minCount,
        payload.maxCount,
        payload.stringProperties,
        {},
      );
      setSearching(ticket.ticket);
    } catch {
      setToast('Unable to start matchmaking.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Creates and joins a private room owned by the current player.
   *
   * @returns A promise that resolves once the room is joined.
   */
  async function handleCreatePrivateRoom(): Promise<void> {
    setBusy(true);

    try {
      const { session: currentSession, socket } = await ensureRealtimeClient(
        useGameStore.getState().username,
      );
      const rpcResponse = await client.rpc(
        currentSession,
        RPC_IDS.CREATE_PRIVATE_ROOM,
        {
          mode: useGameStore.getState().mode,
        },
      );
      const payload = parseRpcPayload<CreatePrivateRoomResponse>(rpcResponse);
      const match: Match = await socket.joinMatch(payload.matchId);
      setJoinedMatch(match.match_id, match.self.session_id);
      setPrivateRoomCode(payload.matchId);
      setScreen('lobby');
    } catch {
      setToast('Unable to create a private room.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Joins an existing private room by match identifier.
   *
   * @param roomCode The room code entered by the player.
   * @returns A promise that resolves once the room is joined.
   */
  async function handleJoinPrivateRoom(roomCode: string): Promise<void> {
    setBusy(true);

    try {
      const { socket } = await ensureRealtimeClient(useGameStore.getState().username);
      const match: Match = await socket.joinMatch(roomCode);
      setJoinedMatch(match.match_id, match.self.session_id);
      setScreen('lobby');
    } catch {
      setToast('Unable to join that room.');
    } finally {
      setBusy(false);
    }
  }

  const modeLabel = useMemo(
    () => (mode === 'timed' ? 'Timed' : 'Classic'),
    [mode],
  );

  if (booting) {
    return (
      <div className="app-shell">
        <section className="panel boot-panel">
          <p className="eyebrow">Connecting</p>
          <h1>Booting multiplayer client...</h1>
          <p className="panel-copy">
            Authenticating the device and opening a realtime socket.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" />
          <div>
            <p className="eyebrow">Nakama</p>
            <h2>Tic-Tac-Toe Arena</h2>
          </div>
        </div>

        <div className="session-chip">
          {(session?.username ?? username) || 'Guest'}
        </div>
      </header>

      <main className="page-stage">
        {screen === 'home' ? (
          <HomeScreen
            busy={busy}
            onCreatePrivateRoom={handleCreatePrivateRoom}
            onFindMatch={handleFindMatch}
            onJoinPrivateRoom={handleJoinPrivateRoom}
          />
        ) : null}

        {screen === 'lobby' ? (
          <LobbyScreen
            matchmakerTicket={matchmakerTicket}
            modeLabel={modeLabel}
            privateRoomCode={privateRoomCode}
          />
        ) : null}

        {screen === 'game' ? (
          <GameBoard
            onBackToHome={() => {
              void leaveActiveMatch();
            }}
          />
        ) : null}
      </main>

      {toast ? <div className="toast-shell">{toast.message}</div> : null}
    </div>
  );
}

export default App;
