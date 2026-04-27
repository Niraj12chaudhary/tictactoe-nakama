#!/bin/sh

# Generates runtime-config.js from container environment variables.
# This lets the same static frontend image point at different Nakama
# hosts, ports, and server keys without a rebuild.

set -eu

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__APP_CONFIG__ = {
  nakamaHost: "${VITE_NAKAMA_HOST:-localhost}",
  nakamaPort: "${VITE_NAKAMA_PORT:-7350}",
  nakamaUseSSL: "${VITE_NAKAMA_USE_SSL:-false}",
  nakamaServerKey: "${VITE_NAKAMA_SERVER_KEY:-defaultkey}"
};
EOF
