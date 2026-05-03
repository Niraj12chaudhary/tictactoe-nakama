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
RUN sed -i 's/\r//' /nakama/data/modules/start.sh \
 && chmod +x /nakama/data/modules/start.sh

# Run as root to eliminate any user-permission edge cases
# (can tighten back to nakama user once deployment is confirmed working)
USER root

# Reduce Go GC pressure so the process doesn't spike memory at startup
ENV GOGC=50
ENV GOMEMLIMIT=400MiB

ENTRYPOINT ["/bin/sh", "-x", "/nakama/data/modules/start.sh"]
