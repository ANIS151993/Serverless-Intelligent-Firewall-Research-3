#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_LOCAL_NODE="/tmp/node-local/node-v22.14.0-linux-x64/bin/node"

NODE_BIN="${NODE_BIN:-}"
if [[ -z "${NODE_BIN}" ]]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  elif [[ -x "${DEFAULT_LOCAL_NODE}" ]]; then
    NODE_BIN="${DEFAULT_LOCAL_NODE}"
  else
    echo "Node.js not found."
    echo "Install Node.js or set NODE_BIN=/absolute/path/to/node."
    exit 1
  fi
fi

echo "Using Node.js: ${NODE_BIN} ($("${NODE_BIN}" --version))"

if command -v rg >/dev/null 2>&1; then
  mapfile -t js_files < <(cd "${ROOT_DIR}" && rg --files docs -g '*.js')
else
  mapfile -t js_files < <(cd "${ROOT_DIR}" && find docs -type f -name '*.js' | sort)
fi

if [[ ${#js_files[@]} -eq 0 ]]; then
  echo "No JavaScript files found under docs/."
  exit 0
fi

for js_file in "${js_files[@]}"; do
  echo "Checking ${js_file}"
  "${NODE_BIN}" --check "${ROOT_DIR}/${js_file}"
done

echo "All JavaScript syntax checks passed."
