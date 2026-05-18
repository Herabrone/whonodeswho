#!/bin/bash
# Auto-deployment script that runs when code is merged to main
# Can be used as a Git post-receive hook or run manually
set -e

REPO_PATH="${1:-/root/whonodeswho}"

log() {
  echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting deployment..."

if [ ! -d "$REPO_PATH" ]; then
  log "ERROR: Repository path does not exist: $REPO_PATH"
  exit 1
fi

cd "$REPO_PATH"

log "Pulling latest changes from origin/main..."
git pull origin main

log "Building and starting Docker containers..."
docker compose up -d --build

log "Deployment complete!"
log "Services are running in the background."
log "Check status with: docker compose ps"
log "View logs with: docker compose logs -f"
