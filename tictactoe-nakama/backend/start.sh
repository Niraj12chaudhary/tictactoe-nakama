#!/bin/sh
# -x = print every command before running (full trace for debugging)
set -x

# Give Render's log streamer time to attach before any crash
sleep 2

DB_HOST="${NAKAMA_DATABASE_HOST:-postgres}"
DB_PORT="${NAKAMA_DATABASE_PORT:-5432}"
DB_USER="${NAKAMA_DATABASE_USER:-postgres}"
DB_PASSWORD="${NAKAMA_DATABASE_PASSWORD:-password}"
DB_NAME="${NAKAMA_DATABASE_NAME:-nakama}"
DB_SSL="${NAKAMA_DATABASE_SSL:-disable}"
PUBLIC_PORT="${PORT:-7350}"
DB_ADDRESS="${NAKAMA_DATABASE_ADDRESS:-${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSL}}"

echo "==> DB_HOST=${DB_HOST} DB_PORT=${DB_PORT} DB_NAME=${DB_NAME} DB_SSL=${DB_SSL} PORT=${PUBLIC_PORT}"

echo "==> Running migrate up..."
/nakama/nakama migrate up --database.address "${DB_ADDRESS}" 2>&1
echo "==> migrate exit code: $?"

echo "==> Starting Nakama server..."
exec /nakama/nakama \
  --config /nakama/data/config.yml \
  --name "${NAKAMA_NAME:-tictactoe-nakama}" \
  --database.address "${DB_ADDRESS}" \
  --logger.level "INFO" \
  --socket.address "0.0.0.0" \
  --socket.port "${PUBLIC_PORT}" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-defaultkey}" \
  --runtime.http_key "${NAKAMA_RUNTIME_HTTP_KEY:-change-me}" \
  --session.encryption_key "${NAKAMA_SESSION_ENCRYPTION_KEY:-change-me}" \
  --session.refresh_encryption_key "${NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY:-change-me}" \
  --console.username "${NAKAMA_CONSOLE_USERNAME:-admin}" \
  --console.password "${NAKAMA_CONSOLE_PASSWORD:-admin123}" 2>&1
