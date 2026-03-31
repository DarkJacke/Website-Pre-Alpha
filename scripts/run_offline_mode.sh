#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-8787}"
HOST="${OFFLINE_HOST:-127.0.0.1}"

echo "[CyberVoid] Starting offline mode at http://${HOST}:${PORT}"
python backend/offline_server.py --host "${HOST}" --port "${PORT}"
