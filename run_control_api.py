#!/usr/bin/env python3
from pathlib import Path
import argparse
import sys

REPO_ROOT = Path(__file__).resolve().parent
SRC_DIR = REPO_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from sif.api_server import serve


def main() -> int:
    parser = argparse.ArgumentParser(description="ASLF-OSINT Super/Tenant control API server")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=9000)
    args = parser.parse_args()

    try:
        serve(REPO_ROOT, host=args.host, port=args.port)
    except ValueError as exc:
        print(f"startup_configuration_error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
