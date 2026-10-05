#!/usr/bin/env bash
# Production startup script for Kalp Intelligence Pvt Ltd
# The monitor cron runs inside the Next.js process via instrumentation.ts
# No external cron service or separate process needed.

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

echo "=== Kalp Intelligence Pvt Ltd Production Start ==="
echo "Directory: $DIR"
echo "Node:      $(node -v)"
echo "==============================="

# Ensure .env.local exists
if [ ! -f .env.local ]; then
  echo "WARNING: .env.local not found. Copy .env.example and fill in values."
fi

# Build if .next doesn't exist or FORCE_BUILD is set
if [ ! -d .next ] || [ "${FORCE_BUILD}" = "1" ]; then
  echo "[build] Building Next.js..."
  npm run build
  echo "[build] Done."
fi

echo "[start] Starting server with built-in monitor cron..."
echo "[start] Monitor checks run every 2 minutes automatically."
echo "[start] Real-time updates pushed via Socket.io."

exec npm run start
