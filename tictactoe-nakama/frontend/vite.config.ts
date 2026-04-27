/**
 * Vite configuration for the Tic-Tac-Toe frontend.
 * This exposes the Nakama environment variables through process.env
 * so the browser client can follow the assignment's requested API shape.
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    define: {
      'process.env.VITE_NAKAMA_HOST': JSON.stringify(
        env.VITE_NAKAMA_HOST ?? 'localhost',
      ),
      'process.env.VITE_NAKAMA_PORT': JSON.stringify(
        env.VITE_NAKAMA_PORT ?? '7350',
      ),
      'process.env.VITE_NAKAMA_USE_SSL': JSON.stringify(
        env.VITE_NAKAMA_USE_SSL ?? 'false',
      ),
      'process.env.VITE_NAKAMA_SERVER_KEY': JSON.stringify(
        env.VITE_NAKAMA_SERVER_KEY ?? 'defaultkey',
      ),
    },
  };
});
