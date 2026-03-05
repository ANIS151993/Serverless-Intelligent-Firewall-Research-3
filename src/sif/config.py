from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class ThreatIntelConfig:
    abuseipdb_api_key: str
    abuseipdb_base_url: str
    otx_api_key: str
    otx_base_url: str
    timeout_seconds: float


@dataclass
class RuntimeConfig:
    peers: List[str]
    dry_run_mode: bool
    model_state_path: Path


def _load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def load_threat_intel_config(repo_root: Path) -> ThreatIntelConfig:
    file_cfg = _load_json(repo_root / "config" / "threat_intel.json")
    return ThreatIntelConfig(
        abuseipdb_api_key=os.getenv("ABUSEIPDB_API_KEY", file_cfg.get("abuseipdb_api_key", "")),
        abuseipdb_base_url=os.getenv(
            "ABUSEIPDB_BASE_URL", file_cfg.get("abuseipdb_base_url", "https://api.abuseipdb.com/api/v2/check")
        ),
        otx_api_key=os.getenv("OTX_API_KEY", file_cfg.get("otx_api_key", "")),
        otx_base_url=os.getenv(
            "OTX_BASE_URL",
            file_cfg.get("otx_base_url", "https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/general"),
        ),
        timeout_seconds=float(os.getenv("THREAT_INTEL_TIMEOUT_SECONDS", file_cfg.get("timeout_seconds", 2.5))),
    )


def load_runtime_config(repo_root: Path) -> RuntimeConfig:
    file_cfg = _load_json(repo_root / "config" / "runtime.json")
    peers = os.getenv("SIF_FEDERATION_PEERS", "")
    if peers:
        peer_list = [item.strip() for item in peers.split(",") if item.strip()]
    else:
        peer_list = file_cfg.get("peers", [])

    dry_run_value = os.getenv("SIF_DRY_RUN", str(file_cfg.get("dry_run_mode", "true"))).lower()
    dry_run_mode = dry_run_value in {"1", "true", "yes", "y"}

    model_state = os.getenv("SIF_MODEL_STATE_PATH", str(file_cfg.get("model_state_path", "state/model_state.json")))

    return RuntimeConfig(
        peers=peer_list,
        dry_run_mode=dry_run_mode,
        model_state_path=repo_root / model_state,
    )
