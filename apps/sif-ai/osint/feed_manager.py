from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Any

import httpx
import redis
import schedule


log = logging.getLogger("sif-ai.osint")

OTX_KEY = os.getenv("OTX_API_KEY", "")
VT_KEY = os.getenv("VT_API_KEY", "")
MISP_URL = os.getenv("MISP_URL", "")
MISP_KEY = os.getenv("MISP_KEY", "")
REDIS_URL = os.getenv("SIF_REDIS_URL", "redis://:SIF_Redis2024!@sif-core:6379/0")
SUPER_CONTROL_URL = os.getenv("SIF_SUPER_CONTROL_URL", "http://sif-core:8000")


def get_redis():
    return redis.from_url(REDIS_URL, decode_responses=True)


async def ingest_alienvault_otx() -> list[dict[str, Any]]:
    if not OTX_KEY:
        log.info("OTX_API_KEY is not configured; skipping OTX cycle")
        return []

    indicators: list[dict[str, Any]] = []
    since = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://otx.alienvault.com/api/v1/pulses/subscribed",
                params={"modified_since": since},
                headers={"X-OTX-API-KEY": OTX_KEY},
            )
        response.raise_for_status()
        for pulse in response.json().get("results", []):
            for indicator in pulse.get("indicators", []):
                indicator_type = indicator.get("type")
                if indicator_type in {"IPv4", "IPv6", "domain", "hostname", "URL"}:
                    indicators.append(
                        {
                            "value": indicator.get("indicator", ""),
                            "type": indicator_type,
                            "source": "AlienVault-OTX",
                            "confidence": 0.85,
                            "ts": datetime.utcnow().isoformat(),
                        }
                    )
    except Exception as exc:
        log.error("AlienVault OTX ingestion failed: %s", exc)
        return []

    log.info("AlienVault OTX produced %d indicators", len(indicators))
    return indicators


async def ingest_virustotal_ips(ips: list[str]) -> list[dict[str, Any]]:
    if not VT_KEY:
        return []

    findings: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=15) as client:
        for ip in ips[:25]:
            try:
                response = await client.get(
                    f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                    headers={"x-apikey": VT_KEY},
                )
                if response.status_code != 200:
                    continue
                stats = response.json()["data"]["attributes"]["last_analysis_stats"]
                if stats.get("malicious", 0) > 5:
                    findings.append(
                        {
                            "value": ip,
                            "type": "IPv4",
                            "source": "VirusTotal",
                            "confidence": 0.95,
                            "ts": datetime.utcnow().isoformat(),
                        }
                    )
                await asyncio.sleep(0.25)
            except Exception as exc:
                log.debug("VirusTotal lookup failed for %s: %s", ip, exc)
    return findings


async def ingest_misp() -> list[dict[str, Any]]:
    if not (MISP_URL and MISP_KEY):
        log.info("MISP is not configured; skipping MISP cycle")
        return []

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            response = await client.post(
                f"{MISP_URL.rstrip('/')}/attributes/restSearch",
                headers={
                    "Authorization": MISP_KEY,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json={
                    "returnFormat": "json",
                    "type": ["ip-dst", "domain", "md5"],
                    "to_ids": 1,
                    "confidence": 75,
                },
            )
        response.raise_for_status()
        attributes = response.json().get("response", {}).get("Attribute", [])
        indicators = [
            {
                "value": attribute.get("value", ""),
                "type": attribute.get("type", "unknown"),
                "source": "MISP",
                "confidence": 0.90,
                "ts": datetime.utcnow().isoformat(),
            }
            for attribute in attributes
        ]
        log.info("MISP produced %d indicators", len(indicators))
        return indicators
    except Exception as exc:
        log.error("MISP ingestion failed: %s", exc)
        return []


async def publish_to_super_control(indicators: list[dict[str, Any]]):
    if not indicators:
        return
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{SUPER_CONTROL_URL}/api/v1/osint/ingest", json=indicators)
        response.raise_for_status()
    except Exception as exc:
        log.warning("Failed to publish OSINT indicators to sif-core: %s", exc)


def cache_indicators(indicators: list[dict[str, Any]]):
    redis_client = get_redis()
    redis_client.setex("osint:latest", 3600, json.dumps(indicators))
    redis_client.incr("osint:cycle:count")
    redis_client.set("osint:last_run", datetime.utcnow().isoformat())


async def run_osint_cycle() -> dict[str, Any]:
    log.info("Starting OSINT ingestion cycle")
    otx = await ingest_alienvault_otx()
    vt = await ingest_virustotal_ips([item["value"] for item in otx if item.get("type") == "IPv4"])
    misp = await ingest_misp()
    indicators = otx + vt + misp
    if indicators:
        cache_indicators(indicators)
        await publish_to_super_control(indicators)
    summary = {
        "total": len(indicators),
        "otx": len(otx),
        "virustotal": len(vt),
        "misp": len(misp),
        "completed_at": datetime.utcnow().isoformat(),
    }
    log.info("OSINT cycle completed: %s", summary)
    return summary


def schedule_osint_loop():
    def _run_sync():
        asyncio.run(run_osint_cycle())

    schedule.every(60).minutes.do(_run_sync)

    def _loop():
        _run_sync()
        while True:
            schedule.run_pending()
            time.sleep(30)

    thread = threading.Thread(target=_loop, daemon=True, name="sif-osint-scheduler")
    thread.start()
    log.info("OSINT scheduler started")
