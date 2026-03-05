from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, List
from urllib import error, request


@dataclass
class FederationResult:
    peers_attempted: int
    peers_acknowledged: int
    peer_status: Dict[str, str]


class FederationCoordinator:
    def __init__(self, peers: List[str], dry_run: bool = True) -> None:
        self.peers = peers
        self.dry_run = dry_run

    def propagate(self, payload: Dict[str, object]) -> FederationResult:
        if not self.peers:
            return FederationResult(peers_attempted=0, peers_acknowledged=0, peer_status={})

        status: Dict[str, str] = {}
        acknowledged = 0

        for peer in self.peers:
            if self.dry_run:
                status[peer] = "simulated"
                acknowledged += 1
                continue

            body = json.dumps(payload).encode("utf-8")
            req = request.Request(
                peer,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with request.urlopen(req, timeout=2.0) as response:
                    if 200 <= response.status < 300:
                        status[peer] = "ok"
                        acknowledged += 1
                    else:
                        status[peer] = f"http_{response.status}"
            except (error.HTTPError, error.URLError, TimeoutError):
                status[peer] = "error"

        return FederationResult(
            peers_attempted=len(self.peers),
            peers_acknowledged=acknowledged,
            peer_status=status,
        )
