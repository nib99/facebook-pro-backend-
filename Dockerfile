# Use official Node.js LTS image (node 18 is still maintained until ~April 2025, but consider upgrading to 20/22 later)
FROM node:18-alpine

WORKDIR /app

# Copy package files first (best caching)
COPY package.json package-lock.json ./

# Install ONLY production deps — use modern flag
# (also works with NODE_ENV=production, but --omit=dev is explicit)
RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy the rest of the application
COPY . .

# Create necessary directories (still as root)
RUN mkdir -p uploads logs

# Create non-root user & set ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root
USER nodejs

EXPOSE 5000

# Health check (looks good)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENV NODE_ENV=production

CMD ["node", "server.js"]
