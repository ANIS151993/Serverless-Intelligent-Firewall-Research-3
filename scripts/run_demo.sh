#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -eq 0 ]]; then
  EVENT="examples/events/benign.json"
else
  EVENT="$1"
fi

PYTHONPATH="$ROOT_DIR/src" python3 run_firewall.py evaluate --event "$EVENT"
