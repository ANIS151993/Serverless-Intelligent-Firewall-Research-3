from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from .firewall import ServerlessIntelligentFirewall


_REPO_ROOT = Path(__file__).resolve().parents[2]
_FIREWALL = ServerlessIntelligentFirewall(_REPO_ROOT)


def lambda_handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    return {
        "statusCode": 200,
        "body": _FIREWALL.evaluate(event),
    }
