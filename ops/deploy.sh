#!/bin/bash
set -e

REPO_PATH="${1:-.}"

echo "[deploy] Pulling latest changes..."
cd "$REPO_PATH"
git pull origin main

echo "[deploy] Building and starting containers..."
docker compose up -d --build

echo "[deploy] ✓ Done!"
echo "[deploy] Check status: docker compose ps"
echo "[deploy] View logs: docker compose logs -f"
