from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List


@dataclass
class TrafficEvent:
    event_id: str
    timestamp: str
    src_ip: str
    dst_service: str
    protocol: str
    provider: str
    requests_per_second: float
    failed_auth: int
    geo_velocity: int
    anomaly_score: float
    lateral_hops: int
    policy_drift: float
    payload_entropy: float
    identity_confidence: float
    mfa_verified: bool
    user_id: str

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "TrafficEvent":
        now = datetime.now(timezone.utc).isoformat()
        return cls(
            event_id=str(payload.get("event_id", "evt-unknown")),
            timestamp=str(payload.get("timestamp", now)),
            src_ip=str(payload.get("src_ip", "0.0.0.0")),
            dst_service=str(payload.get("dst_service", "unknown")),
            protocol=str(payload.get("protocol", "tcp")).lower(),
            provider=str(payload.get("provider", "aws")).lower(),
            requests_per_second=float(payload.get("requests_per_second", 0.0)),
            failed_auth=int(payload.get("failed_auth", 0)),
            geo_velocity=int(payload.get("geo_velocity", 1)),
            anomaly_score=float(payload.get("anomaly_score", 0.0)),
            lateral_hops=int(payload.get("lateral_hops", 0)),
            policy_drift=float(payload.get("policy_drift", 0.0)),
            payload_entropy=float(payload.get("payload_entropy", 0.0)),
            identity_confidence=float(payload.get("identity_confidence", 1.0)),
            mfa_verified=bool(payload.get("mfa_verified", True)),
            user_id=str(payload.get("user_id", "anonymous")),
        )

    def feature_vector(self) -> List[float]:
        return [
            self.requests_per_second,
            float(self.failed_auth),
            float(self.geo_velocity),
            self.anomaly_score,
            float(self.lateral_hops),
            self.policy_drift,
            self.payload_entropy,
            self.identity_confidence,
            1.0 if self.mfa_verified else 0.0,
        ]
