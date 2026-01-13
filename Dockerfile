# Use active LTS: node:22-alpine (or node:20-alpine if you prefer stability over newest features)
# ~80-110 MB final size, excellent security & performance
FROM node:22-alpine

# Optional but useful: metadata labels
LABEL maintainer="Nibras <your-contact>"
LABEL org.opencontainers.image.source="https://github.com/nib99/facebook-pro-backend"
LABEL org.opencontainers.image.description="Real-time social backend (Express + Socket.io + MongoDB)"

WORKDIR /app

# Copy package files first → excellent layer caching
COPY package*.json ./

# Install prod deps only + clean cache in one layer
RUN npm ci --omit=dev --ignore-scripts --prefer-offline && \
    npm cache clean --force

# Copy source code with correct ownership from the start (critical fix!)
COPY --chown=node:node . .

# Ensure runtime dirs exist and are correctly owned
# (volumes in compose will often mount over them anyway)
RUN mkdir -p uploads logs && \
    chown -R node:node uploads logs

# Switch to non-root (security best practice)
USER node

EXPOSE 5000

# Reliable healthcheck using built-in wget (no extra packages needed)
# Adjust path if your health endpoint is /health instead of /api/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Production defaults (override via compose/env_file if needed)
ENV NODE_ENV=production \
    PORT=5000

CMD ["node", "server.js"]
