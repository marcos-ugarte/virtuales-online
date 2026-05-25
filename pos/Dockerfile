# Virtual Racing POS - Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

# Build arguments for Vite environment variables
ARG VITE_API_URL=https://virtualracing-api.azurewebsites.net
ARG VITE_DEV_MODE=false
ARG VITE_RELAY_PATH=/pos-relay-ds

# Set as environment variables for the build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEV_MODE=$VITE_DEV_MODE
ENV VITE_RELAY_PATH=$VITE_RELAY_PATH

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production (nginx + HTTPS)
FROM nginx:alpine AS production

# Generate self-signed certificate
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/key.pem \
      -out /etc/nginx/ssl/cert.pem \
      -days 3650 -nodes \
      -subj '/CN=Virtual Racing POS' \
      -addext 'subjectAltName=IP:88.223.95.55,IP:127.0.0.1,DNS:localhost'

# Copy built files and nginx config
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# Expose port 4069
EXPOSE 4069

# Stage 3: Development (alternative)
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port 4069
EXPOSE 4069

# Run development server
CMD ["npm", "run", "dev"]
