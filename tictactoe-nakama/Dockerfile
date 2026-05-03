# Stage 1: Build the TypeScript backend
FROM node:18-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 2: Create the production Nakama image
FROM heroiclabs/nakama:3.22.0

COPY --from=builder /app/dist/main.js /nakama/data/modules/dist/main.js
COPY backend/config.yml /nakama/data/config.yml
COPY backend/start.sh /nakama/data/modules/start.sh

USER root
# Ensure LF line endings at build time and set permissions
RUN sed -i 's/\r//' /nakama/data/modules/start.sh \
 && chmod +x /nakama/data/modules/start.sh \
 && ls -la /nakama/data/modules/ \
 && head -3 /nakama/data/modules/start.sh
USER nakama

# Use sh -x so every line is traced in Render logs
ENTRYPOINT ["/bin/sh", "-x", "/nakama/data/modules/start.sh"]
