/**
 * Nakama REST and realtime client setup for the React application.
 * This module owns device authentication, session persistence, and
 * socket connection lifecycle so the UI can stay focused on gameplay.
 */

import {
  Client,
  Session,
  type Socket,
} from '@heroiclabs/nakama-js';
import {
  MAX_USERNAME_LENGTH,
  STORAGE_KEYS,
} from './constants';
import { getAppConfig } from './appConfig';
import type { StoredSession } from '../types';

const appConfig = getAppConfig();

export const client = new Client(
  appConfig.nakamaServerKey,
  appConfig.nakamaHost,
  appConfig.nakamaPort,
  appConfig.nakamaUseSSL,
);

export let socket: Socket | null = null;

/**
 * Reads the persisted session from localStorage.
 *
 * @returns A restored Nakama session or null when none is stored.
 */
function readStoredSession(): Session | null {
  const rawValue = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredSession;
    if (!parsed.token || !parsed.refreshToken) {
      return null;
    }

    return Session.restore(parsed.token, parsed.refreshToken);
  } catch {
    return null;
  }
}

/**
 * Persists a Nakama session in localStorage.
 *
 * @param session The authenticated session to store.
 * @returns Nothing.
 */
function persistSession(session: Session): void {
  localStorage.setItem(
    STORAGE_KEYS.SESSION,
    JSON.stringify({
      token: session.token,
      refreshToken: session.refresh_token,
    } satisfies StoredSession),
  );
}

/**
 * Ensures the browser has a stable device identifier for authentication.
 *
 * @returns The stored or newly generated device identifier.
 */
function getOrCreateDeviceId(): string {
  const existingDeviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, newDeviceId);
  return newDeviceId;
}

/**
 * Normalizes the username the client uses for device auth and display.
 *
 * @param username The raw username from localStorage or user input.
 * @returns A trimmed username that fits Nakama account constraints.
 */
function sanitizeUsername(username?: string): string {
  const fallback = `Player-${getOrCreateDeviceId().slice(-4)}`;
  const trimmed = (username ?? fallback).trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, MAX_USERNAME_LENGTH);
}

/**
 * Synchronizes the current Nakama account username with the UI preference.
 *
 * @param session The active Nakama session.
 * @param username The preferred username from the UI.
 * @returns The updated session.
 */
async function syncUsername(
  session: Session,
  username?: string,
): Promise<Session> {
  const normalizedUsername = sanitizeUsername(username);
  localStorage.setItem(STORAGE_KEYS.USERNAME, normalizedUsername);

  if (session.username === normalizedUsername) {
    return session;
  }

  await client.updateAccount(session, {
    username: normalizedUsername,
  });
  session.username = normalizedUsername;
  return session;
}

/**
 * Authenticates the browser with Nakama using a persisted device ID.
 *
 * @param preferredUsername The preferred username to use for the account.
 * @returns The active Nakama session.
 */
export async function authenticateDevice(
  preferredUsername?: string,
): Promise<Session> {
  const nowInSeconds = Date.now() / 1000;
  const storedSession = readStoredSession();

  if (storedSession && !storedSession.isexpired(nowInSeconds)) {
    persistSession(storedSession);
    return syncUsername(storedSession, preferredUsername);
  }

  if (
    storedSession &&
    storedSession.refresh_token &&
    !storedSession.isrefreshexpired(nowInSeconds)
  ) {
    const refreshedSession = await client.sessionRefresh(storedSession);
    persistSession(refreshedSession);
    return syncUsername(refreshedSession, preferredUsername);
  }

  const username = sanitizeUsername(preferredUsername);
  const authenticatedSession = await client.authenticateDevice(
    getOrCreateDeviceId(),
    true,
    username,
  );
  persistSession(authenticatedSession);
  return syncUsername(authenticatedSession, username);
}

/**
 * Opens a realtime socket connection for the current user session.
 *
 * @param session The authenticated Nakama session.
 * @returns The connected socket singleton.
 */
export async function connectSocket(session: Session): Promise<Socket> {
  if (socket) {
    socket.disconnect(false);
    socket = null;
  }

  socket = client.createSocket(appConfig.nakamaUseSSL, false);
  await socket.connect(session, true);
  return socket;
}

/**
 * Returns the connected socket or throws when unavailable.
 *
 * @returns The current Nakama socket singleton.
 */
export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket is not connected.');
  }

  return socket;
}

/**
 * Disconnects the realtime socket cleanly.
 *
 * @returns Nothing.
 */
export function disconnectSocket(): void {
  if (!socket) {
    return;
  }

  socket.disconnect(false);
  socket = null;
}
