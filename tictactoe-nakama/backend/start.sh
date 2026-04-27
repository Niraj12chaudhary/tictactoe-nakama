#!/bin/sh
set -eu

DB_HOST="${NAKAMA_DATABASE_HOST:-postgres}"
DB_PORT="${NAKAMA_DATABASE_PORT:-5432}"
DB_USER="${NAKAMA_DATABASE_USER:-postgres}"
DB_PASSWORD="${NAKAMA_DATABASE_PASSWORD:-password}"
DB_NAME="${NAKAMA_DATABASE_NAME:-nakama}"
DB_ADDRESS="${NAKAMA_DATABASE_ADDRESS:-${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}}"

/nakama/nakama migrate up --database.address "$DB_ADDRESS"
exec /nakama/nakama \
  --config /nakama/data/config.yml \
  --name "${NAKAMA_NAME:-tictactoe-nakama}" \
  --database.address "$DB_ADDRESS" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-defaultkey}" \
  --runtime.http_key "${NAKAMA_RUNTIME_HTTP_KEY:-change-me-runtime-http-key}" \
  --session.encryption_key "${NAKAMA_SESSION_ENCRYPTION_KEY:-change-me-session-encryption-key}" \
  --session.refresh_encryption_key "${NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY:-change-me-refresh-encryption-key}" \
  --console.username "${NAKAMA_CONSOLE_USERNAME:-admin}" \
  --console.password "${NAKAMA_CONSOLE_PASSWORD:-admin123}"
