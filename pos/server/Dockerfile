# Relay Server Dockerfile
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy server code
COPY server/ ./server/
COPY tsconfig*.json ./

# Expose relay server ports
EXPOSE 4081 4082

# Run the relay server
CMD ["npx", "tsx", "server/index.ts"]
