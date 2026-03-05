from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from .firewall import ServerlessIntelligentFirewall


def _load_event(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="sif",
        description="Autonomous Self-Learning Serverless Intelligent Firewall CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    evaluate_cmd = sub.add_parser("evaluate", help="Evaluate one event JSON")
    evaluate_cmd.add_argument("--event", required=True, help="Path to event JSON")

    learn_cmd = sub.add_parser("learn", help="Provide feedback for online adaptation")
    learn_cmd.add_argument("--event", required=True, help="Path to event JSON")
    learn_cmd.add_argument("--label", required=True, choices=["benign", "malicious"])

    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    firewall = ServerlessIntelligentFirewall(repo_root)

    if args.command == "evaluate":
        payload = _load_event(Path(args.event))
        result = firewall.evaluate(payload)
        print(json.dumps(result, indent=2))
        return 0

    if args.command == "learn":
        payload = _load_event(Path(args.event))
        result = firewall.learn(payload, is_malicious=args.label == "malicious")
        print(json.dumps(result, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
