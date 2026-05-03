#!/bin/sh
# Production startup script for Nakama on Render.
# Uses the external DB connection string (public FQDN) which resolves correctly
# inside Docker containers. Includes retry logic for DB readiness.

log() { printf '[nakama] %s\n' "$*" >&2; }

PUBLIC_PORT="${PORT:-7350}"

# ── Validate required env vars ─────────────────────────────────────────────
if [ -z "${NAKAMA_DATABASE_ADDRESS:-}" ]; then
  log "FATAL: NAKAMA_DATABASE_ADDRESS is not set. Check render.yaml."
  exit 1
fi

# ── Ensure sslmode is in the connection string ─────────────────────────────
RAW_ADDR="${NAKAMA_DATABASE_ADDRESS}"
case "${RAW_ADDR}" in
  *sslmode=*) DB_ADDRESS="${RAW_ADDR}" ;;
  *\?*)       DB_ADDRESS="${RAW_ADDR}&sslmode=${NAKAMA_DATABASE_SSL:-require}" ;;
  *)          DB_ADDRESS="${RAW_ADDR}?sslmode=${NAKAMA_DATABASE_SSL:-require}" ;;
esac

REDACTED="$(printf '%s' "${DB_ADDRESS}" | sed 's|://[^:]*:[^@]*@|://***:***@|')"
log "DB_ADDRESS : ${REDACTED}"
log "PUBLIC_PORT: ${PUBLIC_PORT}"

# ── Retry migrate up (up to 10 attempts, 5s apart) ────────────────────────
MAX_RETRIES=10
RETRY_DELAY=5
attempt=1

while [ "${attempt}" -le "${MAX_RETRIES}" ]; do
  log "Migration attempt ${attempt}/${MAX_RETRIES}..."
  /nakama/nakama migrate up --database.address "${DB_ADDRESS}" 2>&1
  MIGRATE_EXIT=$?

  if [ "${MIGRATE_EXIT}" -eq 0 ]; then
    log "Migration succeeded."
    break
  fi

  log "Migration failed (exit ${MIGRATE_EXIT}). Retrying in ${RETRY_DELAY}s..."
  sleep "${RETRY_DELAY}"
  attempt=$((attempt + 1))
done

if [ "${MIGRATE_EXIT}" -ne 0 ]; then
  log "FATAL: Migration failed after ${MAX_RETRIES} attempts. Giving up."
  exit 1
fi

# ── Start Nakama server ───────────────────────────────────────────────────
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
