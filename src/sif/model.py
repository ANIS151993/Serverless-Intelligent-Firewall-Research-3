from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

from .types import TrafficEvent


@dataclass
class ModelOutput:
    risk_score: float
    confidence: float
    label: str
    contributions: Dict[str, float]


class AdaptiveHybridModel:
    """Multi-paradigm scoring with lightweight online adaptation."""

    DEFAULT_WEIGHTS = {
        "behavior": 0.28,
        "anomaly": 0.30,
        "identity": 0.22,
        "threat_intel": 0.20,
    }

    def __init__(self, state_path: Path) -> None:
        self.state_path = state_path
        self.weights = dict(self.DEFAULT_WEIGHTS)
        self.learning_rate = 0.02
        self._load_state()

    def predict(self, event: TrafficEvent, intel_score: float) -> ModelOutput:
        behavior = self._behavior_score(event)
        anomaly = max(0.0, min(100.0, event.anomaly_score))
        identity = self._identity_risk(event)
        threat = max(0.0, min(100.0, intel_score))

        contributions = {
            "behavior": behavior,
            "anomaly": anomaly,
            "identity": identity,
            "threat_intel": threat,
        }

        weighted = sum(contributions[k] * self.weights[k] for k in contributions)
        severe_boost = 0.0
        if event.requests_per_second >= 900 and event.anomaly_score >= 80:
            severe_boost += 15.0
        if event.failed_auth >= 15 and event.identity_confidence < 0.5:
            severe_boost += 8.0
        if event.policy_drift >= 50:
            severe_boost += 6.0

        risk_score = max(0.0, min(100.0, weighted + severe_boost))

        if risk_score >= 80:
            label = "critical-threat"
        elif risk_score >= 60:
            label = "high-risk"
        elif risk_score >= 40:
            label = "suspicious"
        else:
            label = "benign"

        confidence = 0.65 + min(0.34, abs(risk_score - 50.0) / 180.0)
        return ModelOutput(
            risk_score=round(risk_score, 2),
            confidence=round(confidence, 4),
            label=label,
            contributions={k: round(v, 2) for k, v in contributions.items()},
        )

    def update_from_feedback(self, was_malicious: bool, output: ModelOutput) -> None:
        target = 85.0 if was_malicious else 15.0
        delta = target - output.risk_score

        adjustments = {
            "behavior": output.contributions["behavior"] / 100.0,
            "anomaly": output.contributions["anomaly"] / 100.0,
            "identity": output.contributions["identity"] / 100.0,
            "threat_intel": output.contributions["threat_intel"] / 100.0,
        }

        for key, factor in adjustments.items():
            self.weights[key] += self.learning_rate * (delta / 100.0) * (factor - 0.25)
            self.weights[key] = max(0.05, min(0.6, self.weights[key]))

        # Normalize after update so weights stay stable.
        weight_sum = sum(self.weights.values())
        self.weights = {k: v / weight_sum for k, v in self.weights.items()}
        self._save_state()

    def _behavior_score(self, event: TrafficEvent) -> float:
        score = 0.0
        score += min(35.0, event.requests_per_second * 0.045)
        score += min(24.0, event.failed_auth * 2.2)
        score += min(15.0, event.geo_velocity * 2.0)
        score += min(16.0, event.lateral_hops * 3.2)
        score += min(10.0, event.policy_drift * 0.3)
        return max(0.0, min(100.0, score))

    def _identity_risk(self, event: TrafficEvent) -> float:
        baseline = (1.0 - max(0.0, min(1.0, event.identity_confidence))) * 100.0
        if not event.mfa_verified:
            baseline += 20.0
        if event.failed_auth >= 10:
            baseline += 12.0
        return max(0.0, min(100.0, baseline))

    def _load_state(self) -> None:
        if not self.state_path.exists():
            return
        try:
            payload = json.loads(self.state_path.read_text(encoding="utf-8"))
            weights = payload.get("weights", {})
            if all(k in weights for k in self.DEFAULT_WEIGHTS):
                self.weights = {k: float(weights[k]) for k in self.DEFAULT_WEIGHTS}
        except (json.JSONDecodeError, OSError, ValueError, TypeError):
            return

    def _save_state(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"weights": self.weights}
        self.state_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def explain_weights(self) -> List[str]:
        return [f"{k}={v:.3f}" for k, v in self.weights.items()]
