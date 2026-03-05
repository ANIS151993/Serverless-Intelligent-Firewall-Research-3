from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

from .types import TrafficEvent


@dataclass
class PolicyDecision:
    decision: str
    rationale: List[str]
    obligations: List[str]


class FederatedZeroTrustEngine:
    """Policy decision point for allow/challenge/block decisions."""

    def __init__(self, policy_path: Path) -> None:
        self.policy_path = policy_path
        self.policy = self._load_policy()

    def evaluate(self, event: TrafficEvent, risk_score: float) -> PolicyDecision:
        cfg = self.policy
        rationale: List[str] = []
        obligations: List[str] = []

        if not event.mfa_verified and cfg.get("require_mfa", True):
            rationale.append("mfa_not_verified")
            obligations.append("require_step_up_auth")

        if event.identity_confidence < cfg.get("identity_confidence_floor", 0.65):
            rationale.append("low_identity_confidence")
            obligations.append("invalidate_tokens")

        if event.policy_drift > cfg.get("policy_drift_limit", 30):
            rationale.append("policy_drift_high")
            obligations.append("resync_federated_policy")

        if risk_score >= cfg.get("block_threshold", 80):
            rationale.append("risk_above_block_threshold")
            obligations.extend(["block_source", "trigger_incident_response"])
            return PolicyDecision("BLOCK", sorted(set(rationale)), sorted(set(obligations)))

        if risk_score >= cfg.get("challenge_threshold", 55):
            rationale.append("risk_above_challenge_threshold")
            obligations.extend(["challenge_user", "increase_telemetry_level"])
            return PolicyDecision("CHALLENGE", sorted(set(rationale)), sorted(set(obligations)))

        if rationale:
            return PolicyDecision("CHALLENGE", sorted(set(rationale)), sorted(set(obligations)))

        return PolicyDecision("ALLOW", ["risk_within_limits"], ["continuous_verification"])

    def _load_policy(self) -> Dict[str, float]:
        if not self.policy_path.exists():
            return {
                "block_threshold": 80,
                "challenge_threshold": 55,
                "identity_confidence_floor": 0.65,
                "policy_drift_limit": 30,
                "require_mfa": True,
            }

        payload = json.loads(self.policy_path.read_text(encoding="utf-8"))
        return {
            "block_threshold": float(payload.get("block_threshold", 80)),
            "challenge_threshold": float(payload.get("challenge_threshold", 55)),
            "identity_confidence_floor": float(payload.get("identity_confidence_floor", 0.65)),
            "policy_drift_limit": float(payload.get("policy_drift_limit", 30)),
            "require_mfa": bool(payload.get("require_mfa", True)),
        }
