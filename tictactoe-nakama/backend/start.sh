#!/bin/sh
set -x

log() { printf '[start.sh] %s\n' "$*" >&2; }

log "=== CONTAINER STARTED ==="
log "USER=$(id)"
log "PORT=${PORT}"

# NAKAMA_DATABASE_ADDRESS is now the full internalConnectionString from Render.
# Append ?sslmode=require if it's not already in the URL.
RAW_ADDR="${NAKAMA_DATABASE_ADDRESS:-}"
if [ -z "${RAW_ADDR}" ]; then
  log "ERROR: NAKAMA_DATABASE_ADDRESS is not set. Check render.yaml fromDatabase config."
  exit 1
fi

# Ensure sslmode is appended
case "${RAW_ADDR}" in
  *sslmode=*) DB_ADDRESS="${RAW_ADDR}" ;;
  *\?*)       DB_ADDRESS="${RAW_ADDR}&sslmode=${NAKAMA_DATABASE_SSL:-require}" ;;
  *)          DB_ADDRESS="${RAW_ADDR}?sslmode=${NAKAMA_DATABASE_SSL:-require}" ;;
esac

PUBLIC_PORT="${PORT:-7350}"
log "DB_ADDRESS (redacted): $(echo "${DB_ADDRESS}" | sed 's|://[^:]*:[^@]*@|://***:***@|')"
log "PUBLIC_PORT=${PUBLIC_PORT}"

log "==> Running migrate up..."
/nakama/nakama migrate up --database.address "${DB_ADDRESS}" 2>&1
MIGRATE_EXIT=$?
log "migrate exit code: ${MIGRATE_EXIT}"

if [ "${MIGRATE_EXIT}" -ne 0 ]; then
  log "ERROR: Migration failed."
  exit 1
fi

log "==> Starting Nakama on 0.0.0.0:${PUBLIC_PORT}"
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
