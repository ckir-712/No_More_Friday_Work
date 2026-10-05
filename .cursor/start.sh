#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8000/; then
  echo "static server already listening on :8000"
  exit 0
fi
exec python3 -m http.server 8000 --bind 0.0.0.0
