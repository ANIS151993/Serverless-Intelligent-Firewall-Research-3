from __future__ import annotations

import ipaddress
import json
import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
from urllib import error, parse, request

from .config import ThreatIntelConfig
from .types import TrafficEvent


@dataclass
class ThreatIntelResult:
    score: float
    indicators: List[str] = field(default_factory=list)
    sources: Dict[str, str] = field(default_factory=dict)


class ThreatIntelClient:
    """REST-API-driven open-source threat intelligence adapter."""

    def __init__(self, config: ThreatIntelConfig) -> None:
        self.config = config
        self._cache: Dict[str, Tuple[float, ThreatIntelResult]] = {}
        self._cache_ttl_seconds = 300.0

    def lookup(self, event: TrafficEvent) -> ThreatIntelResult:
        cached = self._cache.get(event.src_ip)
        now = time.time()
        if cached and (now - cached[0]) < self._cache_ttl_seconds:
            return cached[1]

        result = ThreatIntelResult(score=self._heuristic_score(event), indicators=[])
        self._enrich_from_abuseipdb(event, result)
        self._enrich_from_otx(event, result)

        if event.failed_auth > 8:
            result.indicators.append("high_failed_auth")
            result.score += 6
        if event.policy_drift > 35:
            result.indicators.append("policy_drift_alert")
            result.score += 7

        result.score = max(0.0, min(100.0, result.score))
        self._cache[event.src_ip] = (now, result)
        return result

    def _heuristic_score(self, event: TrafficEvent) -> float:
        score = 0.0
        try:
            ip = ipaddress.ip_address(event.src_ip)
            if not ip.is_private:
                score += 8.0
        except ValueError:
            score += 10.0

        if event.requests_per_second > 500:
            score += 12.0
        if event.anomaly_score > 70:
            score += 15.0
        if event.payload_entropy > 8.2:
            score += 8.0
        return score

    def _enrich_from_abuseipdb(self, event: TrafficEvent, result: ThreatIntelResult) -> None:
        if not self.config.abuseipdb_api_key:
            result.sources["abuseipdb"] = "skipped:no_api_key"
            return

        params = parse.urlencode({"ipAddress": event.src_ip, "maxAgeInDays": 90}).encode("utf-8")
        req = request.Request(
            self.config.abuseipdb_base_url,
            data=params,
            headers={
                "Accept": "application/json",
                "Key": self.config.abuseipdb_api_key,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.config.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
            abuse_conf = float(payload.get("data", {}).get("abuseConfidenceScore", 0.0))
            result.score += abuse_conf * 0.35
            result.sources["abuseipdb"] = f"ok:{abuse_conf:.2f}"
            if abuse_conf >= 50:
                result.indicators.append("abuseipdb_high_confidence")
        except (error.HTTPError, error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
            result.sources["abuseipdb"] = "error"

    def _enrich_from_otx(self, event: TrafficEvent, result: ThreatIntelResult) -> None:
        if not self.config.otx_api_key:
            result.sources["otx"] = "skipped:no_api_key"
            return

        target_url = self.config.otx_base_url.format(ip=parse.quote(event.src_ip))
        req = request.Request(
            target_url,
            headers={
                "Accept": "application/json",
                "X-OTX-API-KEY": self.config.otx_api_key,
            },
            method="GET",
        )

        try:
            with request.urlopen(req, timeout=self.config.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
            pulse_info = payload.get("pulse_info", {})
            pulse_count = int(pulse_info.get("count", 0))
            result.score += min(20.0, pulse_count * 2.5)
            result.sources["otx"] = f"ok:pulses={pulse_count}"
            if pulse_count > 0:
                result.indicators.append("otx_pulse_match")
        except (error.HTTPError, error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
            result.sources["otx"] = "error"
