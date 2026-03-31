#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pyinstaller >/dev/null 2>&1; then
  echo "[CyberVoid] pyinstaller no está instalado. Instálalo con: pip install pyinstaller"
  exit 1
fi

OUT_DIR="${1:-dist-offline}"

pyinstaller \
  --noconfirm \
  --clean \
  --name cybervoid-offline \
  --onefile \
  --add-data "offline:offline" \
  backend/offline_server.py

mkdir -p "$OUT_DIR"
cp -f dist/cybervoid-offline "$OUT_DIR/" || true
cp -f dist/cybervoid-offline.exe "$OUT_DIR/" || true

echo "[CyberVoid] Build listo en: $OUT_DIR"
