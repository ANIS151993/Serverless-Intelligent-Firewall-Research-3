from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict

from .config import load_runtime_config, load_threat_intel_config
from .federation import FederationCoordinator
from .model import AdaptiveHybridModel
from .orchestrator import CloudOrchestrator
from .threat_intel import ThreatIntelClient
from .types import TrafficEvent
from .zero_trust import FederatedZeroTrustEngine


class ServerlessIntelligentFirewall:
    def __init__(self, repo_root: Path) -> None:
        runtime_cfg = load_runtime_config(repo_root)
        intel_cfg = load_threat_intel_config(repo_root)

        self.repo_root = repo_root
        self.threat_intel = ThreatIntelClient(intel_cfg)
        self.model = AdaptiveHybridModel(runtime_cfg.model_state_path)
        self.policy = FederatedZeroTrustEngine(repo_root / "config" / "policy.json")
        self.orchestrator = CloudOrchestrator()
        self.federation = FederationCoordinator(runtime_cfg.peers, dry_run=runtime_cfg.dry_run_mode)

    def evaluate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        event = TrafficEvent.from_dict(payload)

        intel = self.threat_intel.lookup(event)
        model_output = self.model.predict(event, intel.score)
        decision = self.policy.evaluate(event, model_output.risk_score)
        orchestration = self.orchestrator.plan(event, decision.decision)
        federation_payload = self.orchestrator.as_payload(event, orchestration)
        federation_result = self.federation.propagate(federation_payload)

        return {
            "event": asdict(event),
            "threat_intel": {
                "score": round(intel.score, 2),
                "indicators": intel.indicators,
                "sources": intel.sources,
            },
            "model": {
                "risk_score": model_output.risk_score,
                "confidence": model_output.confidence,
                "label": model_output.label,
                "contributions": model_output.contributions,
                "weights": self.model.explain_weights(),
            },
            "decision": {
                "action": decision.decision,
                "rationale": decision.rationale,
                "obligations": decision.obligations,
            },
            "orchestration": {
                "provider": orchestration.provider,
                "actions": orchestration.actions,
            },
            "federation": {
                "peers_attempted": federation_result.peers_attempted,
                "peers_acknowledged": federation_result.peers_acknowledged,
                "peer_status": federation_result.peer_status,
            },
        }

    def learn(self, payload: Dict[str, Any], is_malicious: bool) -> Dict[str, Any]:
        event = TrafficEvent.from_dict(payload)
        intel = self.threat_intel.lookup(event)
        model_output = self.model.predict(event, intel.score)
        self.model.update_from_feedback(was_malicious=is_malicious, output=model_output)
        return {
            "status": "updated",
            "weights": self.model.explain_weights(),
            "feedback_label": "malicious" if is_malicious else "benign",
        }
