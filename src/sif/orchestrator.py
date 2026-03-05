from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from .types import TrafficEvent


@dataclass
class OrchestrationPlan:
    provider: str
    decision: str
    actions: List[str]


class CloudOrchestrator:
    def plan(self, event: TrafficEvent, decision: str) -> OrchestrationPlan:
        provider = event.provider.lower()
        action_map = {
            "aws": {
                "ALLOW": [
                    "retain-allow-security-group",
                    "stream-audit-cloudwatch",
                ],
                "CHALLENGE": [
                    "invoke-step-up-auth-lambda",
                    "apply-temporary-waf-rate-limit",
                ],
                "BLOCK": [
                    "attach-deny-network-acl",
                    "quarantine-source-in-vpc-firewall",
                    "emit-high-priority-securityhub-finding",
                ],
            },
            "azure": {
                "ALLOW": [
                    "retain-allow-nsg",
                    "stream-audit-log-analytics",
                ],
                "CHALLENGE": [
                    "invoke-conditional-access-policy",
                    "enable-app-gateway-rate-limit",
                ],
                "BLOCK": [
                    "apply-deny-nsg-rule",
                    "isolate-subnet",
                    "emit-high-severity-sentinel-alert",
                ],
            },
            "gcp": {
                "ALLOW": [
                    "retain-allow-firewall-rule",
                    "stream-audit-cloud-logging",
                ],
                "CHALLENGE": [
                    "trigger-identity-aware-proxy-recheck",
                    "enable-cloud-armor-throttling",
                ],
                "BLOCK": [
                    "apply-deny-vpc-firewall-rule",
                    "quarantine-source-tag",
                    "emit-critical-scc-finding",
                ],
            },
            "proxmox": {
                "ALLOW": [
                    "keep-current-pve-firewall-policy",
                    "append-log-to-journal",
                ],
                "CHALLENGE": [
                    "require-sudo-mfa-revalidation",
                    "temporarily-restrict-service-token",
                ],
                "BLOCK": [
                    "insert-drop-rule-in-pve-firewall",
                    "disable-compromised-service-account",
                    "notify-federated-control-plane",
                ],
            },
        }

        resolved = action_map.get(provider, action_map["aws"])
        actions = resolved.get(decision, resolved["CHALLENGE"])
        return OrchestrationPlan(provider=provider, decision=decision, actions=actions)

    def as_payload(self, event: TrafficEvent, plan: OrchestrationPlan) -> Dict[str, object]:
        return {
            "event_id": event.event_id,
            "provider": plan.provider,
            "decision": plan.decision,
            "actions": plan.actions,
            "timestamp": event.timestamp,
        }
