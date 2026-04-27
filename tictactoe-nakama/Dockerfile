# Stage 1: Build the TypeScript backend
FROM node:18-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 2: Create the production Nakama image
FROM heroiclabs/nakama:3.22.0

COPY --from=builder /app/dist/main.js /nakama/data/modules/main.js
COPY backend/config.yml /nakama/data/config.yml

# Setup entrypoint to automatically run migrations then start the server
USER root
RUN echo '#!/bin/sh\n/nakama/nakama migrate up\nexec /nakama/nakama --config /nakama/data/config.yml' > /nakama/run.sh && chmod +x /nakama/run.sh
USER nakama

ENTRYPOINT ["/nakama/run.sh"]