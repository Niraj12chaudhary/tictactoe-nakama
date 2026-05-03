#!/bin/sh
set -x

# Write to stderr explicitly — bypasses any stdout buffering
log() { printf '[start.sh] %s\n' "$*" >&2; }

log "=== CONTAINER STARTED ==="
log "USER=$(id)"
log "PORT=${PORT}"
log "NAKAMA_DATABASE_HOST=${NAKAMA_DATABASE_HOST}"
log "GOGC=${GOGC}"

sleep 2

DB_HOST="${NAKAMA_DATABASE_HOST:-postgres}"
DB_PORT="${NAKAMA_DATABASE_PORT:-5432}"
DB_USER="${NAKAMA_DATABASE_USER:-postgres}"
DB_PASSWORD="${NAKAMA_DATABASE_PASSWORD:-password}"
DB_NAME="${NAKAMA_DATABASE_NAME:-nakama}"
DB_SSL="${NAKAMA_DATABASE_SSL:-disable}"
PUBLIC_PORT="${PORT:-7350}"
DB_ADDRESS="${NAKAMA_DATABASE_ADDRESS:-${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSL}}"

log "DB_ADDRESS built (password redacted): ${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSL}"
log "Starting migrate up..."

/nakama/nakama migrate up --database.address "${DB_ADDRESS}" 2>&1
MIGRATE_EXIT=$?
log "migrate up exit code: ${MIGRATE_EXIT}"

if [ "${MIGRATE_EXIT}" -ne 0 ]; then
  log "ERROR: Migration failed. Check DB credentials above."
  exit 1
fi

log "Starting Nakama server on 0.0.0.0:${PUBLIC_PORT}..."
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
