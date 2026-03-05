from __future__ import annotations

import json
import secrets
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .firewall import ServerlessIntelligentFirewall


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_version(version: str) -> List[int]:
    nums = []
    for token in version.split('.'):
        try:
            nums.append(int(token))
        except ValueError:
            nums.append(0)
    return nums


def version_is_newer(target: str, current: str) -> bool:
    t = _normalize_version(target)
    c = _normalize_version(current)
    width = max(len(t), len(c))
    t.extend([0] * (width - len(t)))
    c.extend([0] * (width - len(c)))
    return t > c


@dataclass
class ClientAsset:
    asset_id: str
    asset_type: str
    provider: str
    name: str
    endpoint: str
    criticality: str
    tags: List[str]
    created_at: str


@dataclass
class TenantAccount:
    tenant_id: str
    organization_name: str
    admin_email: str
    api_token: str
    created_at: str
    subsystem_version: str
    installed_version: str
    connection_mode: str
    sync_interval_seconds: int
    assets: List[ClientAsset]
    event_count: int
    blocked_count: int
    challenged_count: int
    allow_count: int
    avg_risk_score: float

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["assets"] = [asdict(asset) for asset in self.assets]
        return payload


class SuperControlSystem:
    """Central operator plane for all corporate clients."""

    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root
        self.state_path = repo_root / "state" / "super_control.json"
        self.state_path.parent.mkdir(parents=True, exist_ok=True)

        self.global_policy: Dict[str, Any] = {
            "block_threshold": 80,
            "challenge_threshold": 55,
            "identity_confidence_floor": 0.65,
            "policy_drift_limit": 30,
            "mandatory_mfa": True,
        }
        self.platform_version = "3.0.0"
        self.upgrade_log: List[Dict[str, Any]] = []
        self.tenants: Dict[str, TenantAccount] = {}
        self.telemetry: Dict[str, List[Dict[str, Any]]] = {}
        self._load_state()

    def create_tenant(self, organization_name: str, admin_email: str) -> Dict[str, Any]:
        tenant_id = f"tenant-{secrets.token_hex(4)}"
        token = secrets.token_urlsafe(24)
        tenant = TenantAccount(
            tenant_id=tenant_id,
            organization_name=organization_name,
            admin_email=admin_email,
            api_token=token,
            created_at=_utc_now(),
            subsystem_version=self.platform_version,
            installed_version=self.platform_version,
            connection_mode="hybrid-autonomous",
            sync_interval_seconds=120,
            assets=[],
            event_count=0,
            blocked_count=0,
            challenged_count=0,
            allow_count=0,
            avg_risk_score=0.0,
        )
        self.tenants[tenant_id] = tenant
        self.telemetry[tenant_id] = []
        self._save_state()
        return {
            "tenant_id": tenant_id,
            "api_token": token,
            "bootstrap": self.bootstrap_subsystem(tenant_id),
        }

    def bootstrap_subsystem(self, tenant_id: str) -> Dict[str, Any]:
        tenant = self._get_tenant(tenant_id)
        return {
            "tenant_id": tenant.tenant_id,
            "super_control_endpoint": "/tenant/{tenant_id}/sync",
            "assigned_version": self.platform_version,
            "policy_bundle": self.global_policy,
            "sync_interval_seconds": tenant.sync_interval_seconds,
            "mode": tenant.connection_mode,
        }

    def list_tenants(self) -> List[Dict[str, Any]]:
        return [tenant.to_dict() for tenant in self.tenants.values()]

    def add_asset(
        self,
        tenant_id: str,
        *,
        asset_type: str,
        provider: str,
        name: str,
        endpoint: str,
        criticality: str = "medium",
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        tenant = self._get_tenant(tenant_id)
        asset = ClientAsset(
            asset_id=f"asset-{secrets.token_hex(4)}",
            asset_type=asset_type,
            provider=provider,
            name=name,
            endpoint=endpoint,
            criticality=criticality,
            tags=tags or [],
            created_at=_utc_now(),
        )
        tenant.assets.append(asset)
        self._save_state()
        return asdict(asset)

    def publish_upgrade(self, version: str, release_notes: str, policy_patch: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not version_is_newer(version, self.platform_version):
            return {
                "status": "ignored",
                "reason": "version_not_newer",
                "current_version": self.platform_version,
            }

        self.platform_version = version
        if policy_patch:
            self.global_policy.update(policy_patch)

        release = {
            "version": version,
            "release_notes": release_notes,
            "policy": self.global_policy,
            "published_at": _utc_now(),
        }
        self.upgrade_log.append(release)
        self._save_state()
        return {"status": "published", "release": release}

    def sync_tenant(self, tenant_id: str, installed_version: str) -> Dict[str, Any]:
        tenant = self._get_tenant(tenant_id)
        if version_is_newer(self.platform_version, installed_version):
            tenant.installed_version = self.platform_version
            tenant.subsystem_version = self.platform_version
            self._save_state()
            return {
                "upgrade_available": True,
                "target_version": self.platform_version,
                "policy_bundle": self.global_policy,
                "release": self.upgrade_log[-1] if self.upgrade_log else None,
            }
        return {
            "upgrade_available": False,
            "target_version": installed_version,
            "policy_bundle": self.global_policy,
        }

    def ingest_telemetry(self, tenant_id: str, event: Dict[str, Any], evaluation: Dict[str, Any]) -> Dict[str, Any]:
        tenant = self._get_tenant(tenant_id)
        decision = evaluation.get("decision", {}).get("action", "ALLOW")
        risk = float(evaluation.get("model", {}).get("risk_score", 0.0))

        entry = {
            "timestamp": _utc_now(),
            "tenant_id": tenant_id,
            "event_id": event.get("event_id", f"evt-{secrets.token_hex(4)}"),
            "provider": event.get("provider", "unknown"),
            "decision": decision,
            "risk_score": risk,
            "label": evaluation.get("model", {}).get("label", "unknown"),
        }
        self.telemetry.setdefault(tenant_id, []).append(entry)
        self.telemetry[tenant_id] = self.telemetry[tenant_id][-5000:]

        tenant.event_count += 1
        if decision == "BLOCK":
            tenant.blocked_count += 1
        elif decision == "CHALLENGE":
            tenant.challenged_count += 1
        else:
            tenant.allow_count += 1

        prev_total = max(tenant.event_count - 1, 0)
        tenant.avg_risk_score = ((tenant.avg_risk_score * prev_total) + risk) / max(tenant.event_count, 1)
        self._save_state()

        return {
            "status": "recorded",
            "tenant_id": tenant_id,
            "event_count": tenant.event_count,
        }

    def super_dashboard(self) -> Dict[str, Any]:
        tenant_cards = []
        total_events = 0
        total_blocks = 0
        total_challenges = 0
        total_allows = 0

        for tenant in self.tenants.values():
            total_events += tenant.event_count
            total_blocks += tenant.blocked_count
            total_challenges += tenant.challenged_count
            total_allows += tenant.allow_count
            tenant_cards.append(
                {
                    "tenant_id": tenant.tenant_id,
                    "organization": tenant.organization_name,
                    "assets": len(tenant.assets),
                    "version": tenant.installed_version,
                    "events": tenant.event_count,
                    "blocked": tenant.blocked_count,
                    "challenged": tenant.challenged_count,
                    "allowed": tenant.allow_count,
                    "avg_risk_score": round(tenant.avg_risk_score, 2),
                }
            )

        return {
            "platform_version": self.platform_version,
            "tenant_count": len(self.tenants),
            "total_events": total_events,
            "total_blocked": total_blocks,
            "total_challenged": total_challenges,
            "total_allowed": total_allows,
            "global_policy": self.global_policy,
            "recent_releases": self.upgrade_log[-10:],
            "tenants": tenant_cards,
            "generated_at": _utc_now(),
        }

    def tenant_dashboard(self, tenant_id: str) -> Dict[str, Any]:
        tenant = self._get_tenant(tenant_id)
        stream = self.telemetry.get(tenant_id, [])[-200:]

        per_provider: Dict[str, int] = {}
        per_decision: Dict[str, int] = {"ALLOW": 0, "CHALLENGE": 0, "BLOCK": 0}
        timeseries = []

        for item in stream:
            provider = str(item.get("provider", "unknown"))
            decision = str(item.get("decision", "ALLOW"))
            per_provider[provider] = per_provider.get(provider, 0) + 1
            per_decision[decision] = per_decision.get(decision, 0) + 1
            timeseries.append(
                {
                    "t": item.get("timestamp"),
                    "risk": item.get("risk_score", 0),
                    "decision": decision,
                }
            )

        return {
            "tenant": tenant.to_dict(),
            "provider_distribution": per_provider,
            "decision_distribution": per_decision,
            "risk_timeseries": timeseries,
            "assets": [asdict(asset) for asset in tenant.assets],
            "generated_at": _utc_now(),
        }

    def _get_tenant(self, tenant_id: str) -> TenantAccount:
        if tenant_id not in self.tenants:
            raise KeyError(f"unknown tenant_id: {tenant_id}")
        return self.tenants[tenant_id]

    def _load_state(self) -> None:
        if not self.state_path.exists():
            return
        try:
            payload = json.loads(self.state_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return

        self.platform_version = payload.get("platform_version", self.platform_version)
        self.global_policy = payload.get("global_policy", self.global_policy)
        self.upgrade_log = payload.get("upgrade_log", [])

        tenants_payload = payload.get("tenants", {})
        self.tenants = {}
        for tenant_id, item in tenants_payload.items():
            assets = [ClientAsset(**asset) for asset in item.get("assets", [])]
            self.tenants[tenant_id] = TenantAccount(
                tenant_id=tenant_id,
                organization_name=item.get("organization_name", "Unknown"),
                admin_email=item.get("admin_email", ""),
                api_token=item.get("api_token", ""),
                created_at=item.get("created_at", _utc_now()),
                subsystem_version=item.get("subsystem_version", self.platform_version),
                installed_version=item.get("installed_version", self.platform_version),
                connection_mode=item.get("connection_mode", "hybrid-autonomous"),
                sync_interval_seconds=int(item.get("sync_interval_seconds", 120)),
                assets=assets,
                event_count=int(item.get("event_count", 0)),
                blocked_count=int(item.get("blocked_count", 0)),
                challenged_count=int(item.get("challenged_count", 0)),
                allow_count=int(item.get("allow_count", 0)),
                avg_risk_score=float(item.get("avg_risk_score", 0.0)),
            )

        self.telemetry = payload.get("telemetry", {})

    def _save_state(self) -> None:
        payload = {
            "platform_version": self.platform_version,
            "global_policy": self.global_policy,
            "upgrade_log": self.upgrade_log,
            "tenants": {tenant_id: tenant.to_dict() for tenant_id, tenant in self.tenants.items()},
            "telemetry": self.telemetry,
        }
        self.state_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


class TenantSubsystem:
    """Tenant-local compact subsystem connected to super control."""

    def __init__(self, repo_root: Path, tenant_id: str, installed_version: str = "3.0.0") -> None:
        self.repo_root = repo_root
        self.tenant_id = tenant_id
        self.installed_version = installed_version
        self.local_firewall = ServerlessIntelligentFirewall(repo_root)
        self.local_policy: Dict[str, Any] = {}
        self.last_sync_time: Optional[str] = None

    def sync_with_super(self, super_control: SuperControlSystem) -> Dict[str, Any]:
        sync = super_control.sync_tenant(self.tenant_id, self.installed_version)
        self.local_policy = sync.get("policy_bundle", self.local_policy)
        if sync.get("upgrade_available"):
            self.installed_version = sync["target_version"]
        self.last_sync_time = _utc_now()
        return {
            "tenant_id": self.tenant_id,
            "installed_version": self.installed_version,
            "upgrade_available": sync.get("upgrade_available", False),
            "last_sync_time": self.last_sync_time,
        }

    def protect_event(self, event_payload: Dict[str, Any], super_control: SuperControlSystem) -> Dict[str, Any]:
        result = self.local_firewall.evaluate(event_payload)
        super_control.ingest_telemetry(self.tenant_id, event_payload, result)
        return result
