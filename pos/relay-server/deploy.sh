#!/bin/bash
# Deploy relay server + races-sync-service to Hostinger VPS
#
# Usage:
#   ./deploy.sh [user@host]
#
# Example:
#   ./deploy.sh root@88.223.95.55
#
# Required: API_KEY environment variable for races-sync-service
#   API_KEY=xxx ./deploy.sh

set -e

HOST="${1:-root@88.223.95.55}"
REMOTE_DIR="/opt/virtual-racing-relay"

# Check API_KEY
if [ -z "$API_KEY" ]; then
  echo "WARNING: API_KEY not set. races-sync-service will not work."
  echo "Usage: API_KEY=xxx ./deploy.sh"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "=== Virtual Racing Relay + Sync Deployment ==="
echo "Target: $HOST"
echo "Remote directory: $REMOTE_DIR"
echo ""

# Create remote directory
echo "Creating remote directory..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"

# Copy files
echo "Copying files..."
scp package.json "$HOST:$REMOTE_DIR/"
scp server.js "$HOST:$REMOTE_DIR/"
scp capture.js "$HOST:$REMOTE_DIR/"
scp races-sync-service.js "$HOST:$REMOTE_DIR/"
scp Dockerfile "$HOST:$REMOTE_DIR/"
scp Dockerfile.sync "$HOST:$REMOTE_DIR/"
scp docker-compose.yml "$HOST:$REMOTE_DIR/"
scp README.md "$HOST:$REMOTE_DIR/"

# Create .env file on server with API_KEY
if [ -n "$API_KEY" ]; then
  echo "Creating .env file with API_KEY..."
  ssh "$HOST" "echo 'API_KEY=$API_KEY' > $REMOTE_DIR/.env"
fi

# Start Docker
echo "Starting Docker containers..."
ssh "$HOST" "cd $REMOTE_DIR && docker-compose down 2>/dev/null || true && docker-compose up -d --build"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services:"
echo "  relay-server:  ws://88.223.95.55:4081"
echo "  races-sync:    Running (syncs to Azure API)"
echo ""
echo "Check status:"
echo "  curl http://88.223.95.55:4082/status"
echo ""
echo "View logs:"
echo "  ssh $HOST 'docker logs -f virtual-racing-relay'"
echo "  ssh $HOST 'docker logs -f virtual-racing-sync'"
echo ""
echo "Control API:"
echo "  Pause:  curl -X POST http://88.223.95.55:4082/pause"
echo "  Resume: curl -X POST http://88.223.95.55:4082/resume"
