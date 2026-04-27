/**
 * Vite import.meta.env declarations for the browser client.
 * Vite replaces import.meta.env.VITE_* at build time so the
 * compiled bundle carries the correct values baked in.
 */

interface ImportMetaEnv {
  readonly VITE_NAKAMA_HOST?: string;
  readonly VITE_NAKAMA_PORT?: string;
  readonly VITE_NAKAMA_USE_SSL?: string;
  readonly VITE_NAKAMA_SERVER_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __APP_CONFIG__?: {
    nakamaHost?: string;
    nakamaPort?: string;
    nakamaUseSSL?: boolean | string;
    nakamaServerKey?: string;
  };
}
