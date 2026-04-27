/**
 * Runtime configuration helper for the browser client.
 * The frontend can read values from the Docker-generated runtime script,
 * then fall back to Vite-provided env variables for local development.
 */

import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_SERVER_KEY,
  DEFAULT_USE_SSL,
} from './constants';

export interface BrowserRuntimeConfig {
  nakamaHost?: string;
  nakamaPort?: string;
  nakamaUseSSL?: boolean | string;
  nakamaServerKey?: string;
}

export interface ResolvedAppConfig {
  nakamaHost: string;
  nakamaPort: string;
  nakamaUseSSL: boolean;
  nakamaServerKey: string;
}

/**
 * Normalizes loose boolean env values into real booleans.
 *
 * @param value The raw runtime value.
 * @returns A normalized boolean.
 */
function parseBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return value === 'true';
}

/**
 * Returns the merged browser configuration for Nakama.
 *
 * @returns Resolved host, port, SSL, and server key values.
 */
export function getAppConfig(): ResolvedAppConfig {
  const runtimeConfig =
    typeof window !== 'undefined' ? window.__APP_CONFIG__ ?? {} : {};

  return {
    nakamaHost:
      runtimeConfig.nakamaHost ??
      import.meta.env.VITE_NAKAMA_HOST ??
      DEFAULT_HOST,
    nakamaPort:
      runtimeConfig.nakamaPort ??
      import.meta.env.VITE_NAKAMA_PORT ??
      DEFAULT_PORT,
    nakamaUseSSL: parseBoolean(
      runtimeConfig.nakamaUseSSL ??
        import.meta.env.VITE_NAKAMA_USE_SSL ??
        String(DEFAULT_USE_SSL),
    ),
    nakamaServerKey:
      runtimeConfig.nakamaServerKey ??
      import.meta.env.VITE_NAKAMA_SERVER_KEY ??
      DEFAULT_SERVER_KEY,
  };
}
