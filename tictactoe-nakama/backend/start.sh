#!/bin/sh
# Intentionally NOT using set -eu so that we can log failures before exiting.

DB_HOST="${NAKAMA_DATABASE_HOST:-postgres}"
DB_PORT="${NAKAMA_DATABASE_PORT:-5432}"
DB_USER="${NAKAMA_DATABASE_USER:-postgres}"
DB_PASSWORD="${NAKAMA_DATABASE_PASSWORD:-password}"
DB_NAME="${NAKAMA_DATABASE_NAME:-nakama}"
DB_SSL="${NAKAMA_DATABASE_SSL:-disable}"
PUBLIC_PORT="${PORT:-7350}"

# Allow a fully-formed override via NAKAMA_DATABASE_ADDRESS
DB_ADDRESS="${NAKAMA_DATABASE_ADDRESS:-${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSL}}"

echo "=============================="
echo "Nakama startup diagnostics"
echo "=============================="
echo "DB_HOST      = ${DB_HOST}"
echo "DB_PORT      = ${DB_PORT}"
echo "DB_USER      = ${DB_USER}"
echo "DB_NAME      = ${DB_NAME}"
echo "DB_SSL       = ${DB_SSL}"
echo "PUBLIC_PORT  = ${PUBLIC_PORT}"
echo "NAKAMA_NAME  = ${NAKAMA_NAME:-tictactoe-nakama}"
echo "=============================="

echo "--> Running: migrate up"
/nakama/nakama migrate up --database.address "${DB_ADDRESS}"
MIGRATE_EXIT=$?
echo "--> migrate up exited with code: ${MIGRATE_EXIT}"

if [ "${MIGRATE_EXIT}" -ne 0 ]; then
  echo "ERROR: Database migration failed! Check DB credentials and SSL above."
  exit 1
fi

echo "--> Starting Nakama server on 0.0.0.0:${PUBLIC_PORT}"
exec /nakama/nakama \
  --config /nakama/data/config.yml \
  --name "${NAKAMA_NAME:-tictactoe-nakama}" \
  --database.address "${DB_ADDRESS}" \
  --logger.level "INFO" \
  --socket.address "0.0.0.0" \
  --socket.port "${PUBLIC_PORT}" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-defaultkey}" \
  --runtime.http_key "${NAKAMA_RUNTIME_HTTP_KEY:-change-me-runtime-http-key}" \
  --session.encryption_key "${NAKAMA_SESSION_ENCRYPTION_KEY:-change-me-session-encryption-key}" \
  --session.refresh_encryption_key "${NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY:-change-me-refresh-encryption-key}" \
  --console.username "${NAKAMA_CONSOLE_USERNAME:-admin}" \
  --console.password "${NAKAMA_CONSOLE_PASSWORD:-admin123}"
