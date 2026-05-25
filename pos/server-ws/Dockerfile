# WebSocket Direct Relay - Optimized for Cloud
# No Playwright = ~50MB instead of ~2GB

FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY *.ts ./
COPY tsconfig.json ./
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose ports
EXPOSE 4081 4082

# Run
CMD ["node", "dist/index.js"]
