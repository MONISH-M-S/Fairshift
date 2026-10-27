# Production Dockerfile for FairShift on Google Cloud Run
FROM node:24-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code and assets
COPY server.js ./
COPY src ./src
COPY views ./views
COPY public ./public

# Run as non-root node user for container security
USER node

# Expose standard Cloud Run port
EXPOSE 8080

# Launch server
CMD ["node", "server.js"]
