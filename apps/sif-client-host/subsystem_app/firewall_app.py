"""
Per-client autonomous firewall instance.

The client runtime forwards flow features to the AI engine, stores a rolling event
buffer for the tenant dashboard, persists a small dashboard configuration document,
and reacts to model update broadcasts from RabbitMQ.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
import uuid
from collections import deque
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
import pika
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")
log = logging.getLogger("sif-client.firewall")

CLIENT_ID = os.getenv("CLIENT_ID", "unknown-client")
API_KEY = os.getenv("API_KEY", "")
AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://sif-ai-engine:8001")
CONTROL_URL = os.getenv("SUPER_CONTROL_URL", "http://sif-core:8000")
BROKER_URL = os.getenv("BROKER_URL", "amqp://sifadmin:SIF_Rabbit2024!@sif-broker:5672/")
MODEL_VERSION_FILE = Path("/models/current_version.json")
STATE_FILE = Path("/models/client_dashboard_state.json")
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATE_FILE = BASE_DIR / "templates" / "client-dashboard.html"

app = FastAPI(title=f"SIF Client Firewall [{CLIENT_ID}]", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
app.mount("/assets", StaticFiles(directory=str(STATIC_DIR)), name="client-assets")

events: deque[dict[str, Any]] = deque(maxlen=250)
model_version = "3.0.0-base"
state_lock = threading.Lock()

DEFAULT_STATE: dict[str, Any] = {
    "profile": {
        "company_name": CLIENT_ID.replace("-", " ").title(),
        "company_logo": "",
        "primary_contact": "",
        "environment": "production",
    },
    "protection": {
        "block_threshold": 0.30,
        "challenge_threshold": 0.70,
        "auto_block_osint": True,
        "strict_mode": False,
        "rate_limit": 2500,
    },
    "notifications": {
        "emails": [],
        "slack_webhook": "",
        "pagerduty_key": "",
        "quiet_hours": "",
        "severity": "warning",
    },
    "assets": [],
    "blocklist": [],
    "whitelist": [],
    "rules": [],
    "team": [],
}

dashboard_state: dict[str, Any] = deepcopy(DEFAULT_STATE)


class FlowRequest(BaseModel):
    features: list[float]
    source_ip: str = ""
    destination_ip: str = ""
    protocol: int = 6


class DashboardStatePatch(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)
    protection: dict[str, Any] = Field(default_factory=dict)
    notifications: dict[str, Any] = Field(default_factory=dict)
    assets: list[dict[str, Any]] | None = None
    team: list[dict[str, Any]] | None = None


class ValueEntry(BaseModel):
    value: str


class RuleCreate(BaseModel):
    name: str
    condition: str
    action: str
    enabled: bool = True


def _load_model_version():
    global model_version
    if MODEL_VERSION_FILE.exists():
        try:
            model_version = json.loads(MODEL_VERSION_FILE.read_text(encoding="utf-8")).get("version", model_version)
        except Exception:
            pass


def _store_model_version(version: str):
    global model_version
    model_version = version
    MODEL_VERSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    MODEL_VERSION_FILE.write_text(
        json.dumps({"version": version, "updated_at": datetime.utcnow().isoformat()}),
        encoding="utf-8",
    )


def _normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    state = deepcopy(DEFAULT_STATE)
    if not raw:
        return state
    for key, default_value in DEFAULT_STATE.items():
        value = raw.get(key)
        if isinstance(default_value, dict):
            merged = dict(default_value)
            if isinstance(value, dict):
                merged.update(value)
            state[key] = merged
        elif isinstance(default_value, list):
            state[key] = value if isinstance(value, list) else list(default_value)
        else:
            state[key] = value if value is not None else default_value
    return state


def _load_dashboard_state():
    global dashboard_state
    if not STATE_FILE.exists():
        dashboard_state = deepcopy(DEFAULT_STATE)
        return
    try:
        dashboard_state = _normalize_state(json.loads(STATE_FILE.read_text(encoding="utf-8")))
    except Exception as exc:
        log.warning("Failed to load client dashboard state: %s", exc)
        dashboard_state = deepcopy(DEFAULT_STATE)


def _save_dashboard_state():
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(dashboard_state, indent=2), encoding="utf-8")


def _snapshot_state() -> dict[str, Any]:
    with state_lock:
        return deepcopy(dashboard_state)


def _update_state(mutator):
    with state_lock:
        mutator(dashboard_state)
        _save_dashboard_state()
        return deepcopy(dashboard_state)


def _record_event(payload: dict[str, Any]):
    payload = payload.copy()
    payload["timestamp"] = datetime.utcnow().isoformat()
    events.appendleft(payload)


async def _report_to_super_control(payload: dict[str, Any]):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(f"{CONTROL_URL}/api/v1/threats/ingest", json=payload)
        response.raise_for_status()
    except Exception as exc:
        log.debug("Threat report failed: %s", exc)


def start_model_update_consumer():
    def _consume():
        while True:
            try:
                connection = pika.BlockingConnection(pika.URLParameters(BROKER_URL))
                channel = connection.channel()
                channel.exchange_declare(exchange="model_updates", exchange_type="fanout", durable=True)
                queue = channel.queue_declare(queue="", exclusive=True)
                channel.queue_bind(exchange="model_updates", queue=queue.method.queue)

                def on_message(ch, method, _properties, body):
                    try:
                        update = json.loads(body.decode("utf-8"))
                        version = update.get("version", model_version)
                        _store_model_version(version)
                        log.info("Applied model update %s for %s", version, CLIENT_ID)
                    finally:
                        ch.basic_ack(delivery_tag=method.delivery_tag)

                channel.basic_consume(queue=queue.method.queue, on_message_callback=on_message)
                log.info("Subscribed to model_updates exchange for %s", CLIENT_ID)
                channel.start_consuming()
            except Exception as exc:
                log.warning("Model update consumer failed: %s", exc)
                import time

                time.sleep(15)

    thread = threading.Thread(target=_consume, daemon=True, name="model-update-consumer")
    thread.start()


def _render_dashboard(section: str) -> HTMLResponse:
    safe_section = section if section in {"overview", "traffic", "threats", "protection", "reports", "settings"} else "overview"
    bootstrap = {
        "clientId": CLIENT_ID,
        "section": safe_section,
        "modelVersion": model_version,
        "apiKeyPresent": bool(API_KEY),
    }
    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    html = template.replace("__BOOTSTRAP__", json.dumps(bootstrap))
    return HTMLResponse(html)


@app.on_event("startup")
async def startup():
    _load_model_version()
    _load_dashboard_state()
    start_model_update_consumer()


@app.get("/")
def root():
    return RedirectResponse(url="/dashboard/overview", status_code=307)


@app.get("/dashboard")
def dashboard_root():
    return RedirectResponse(url="/dashboard/overview", status_code=307)


@app.get("/dashboard/{section}", response_class=HTMLResponse)
def dashboard(section: str):
    return _render_dashboard(section)


@app.get("/api/v1/status")
def status():
    return {
        "client_id": CLIENT_ID,
        "service": "SIF-Client-Firewall",
        "status": "operational",
        "model_version": model_version,
    }


@app.get("/health")
def health():
    return {
        "client_id": CLIENT_ID,
        "status": "healthy",
        "event_count": len(events),
        "model_version": model_version,
    }


@app.get("/api/v1/events")
def list_events():
    return {"client_id": CLIENT_ID, "count": len(events), "events": list(events)}


@app.get("/api/v1/dashboard/state")
def get_dashboard_state():
    return _snapshot_state()


@app.patch("/api/v1/dashboard/state")
def patch_dashboard_state(payload: DashboardStatePatch):
    def mutator(state: dict[str, Any]):
        if payload.profile:
            state["profile"].update(payload.profile)
        if payload.protection:
            state["protection"].update(payload.protection)
        if payload.notifications:
            state["notifications"].update(payload.notifications)
        if payload.assets is not None:
            state["assets"] = payload.assets
        if payload.team is not None:
            state["team"] = payload.team

    return _update_state(mutator)


@app.post("/api/v1/dashboard/blocklist")
def add_blocklist_entry(entry: ValueEntry):
    value = entry.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="Value is required")

    def mutator(state: dict[str, Any]):
        if value not in state["blocklist"]:
            state["blocklist"].append(value)

    return {"status": "ok", "state": _update_state(mutator)}


@app.delete("/api/v1/dashboard/blocklist/{value}")
def remove_blocklist_entry(value: str):
    def mutator(state: dict[str, Any]):
        state["blocklist"] = [item for item in state["blocklist"] if item != value]

    return {"status": "ok", "state": _update_state(mutator)}


@app.post("/api/v1/dashboard/whitelist")
def add_whitelist_entry(entry: ValueEntry):
    value = entry.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="Value is required")

    def mutator(state: dict[str, Any]):
        if value not in state["whitelist"]:
            state["whitelist"].append(value)

    return {"status": "ok", "state": _update_state(mutator)}


@app.delete("/api/v1/dashboard/whitelist/{value}")
def remove_whitelist_entry(value: str):
    def mutator(state: dict[str, Any]):
        state["whitelist"] = [item for item in state["whitelist"] if item != value]

    return {"status": "ok", "state": _update_state(mutator)}


@app.post("/api/v1/dashboard/rules")
def create_rule(payload: RuleCreate):
    def mutator(state: dict[str, Any]):
        state["rules"].append(
            {
                "id": str(uuid.uuid4()),
                "name": payload.name,
                "condition": payload.condition,
                "action": payload.action,
                "enabled": payload.enabled,
                "created_at": datetime.utcnow().isoformat(),
            }
        )

    return {"status": "ok", "state": _update_state(mutator)}


@app.delete("/api/v1/dashboard/rules/{rule_id}")
def delete_rule(rule_id: str):
    def mutator(state: dict[str, Any]):
        state["rules"] = [rule for rule in state["rules"] if rule.get("id") != rule_id]

    return {"status": "ok", "state": _update_state(mutator)}


@app.post("/api/v1/detect")
async def detect(request: FlowRequest):
    result = {
        "attack_type": "BENIGN",
        "confidence": 0.0,
        "trust_score": 0.5,
        "action_taken": "allow",
        "model_version": model_version,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{AI_ENGINE_URL}/detect",
                json={
                    "features": request.features,
                    "source_ip": request.source_ip,
                    "client_id": CLIENT_ID,
                },
            )
        response.raise_for_status()
        result = response.json()
    except Exception as exc:
        log.warning("AI engine request failed: %s", exc)

    event = {
        "client_id": CLIENT_ID,
        "attack_type": result.get("attack_type", "BENIGN"),
        "source_ip": request.source_ip,
        "destination_ip": request.destination_ip,
        "confidence": result.get("confidence", 0.0),
        "trust_score": result.get("trust_score", 0.5),
        "action_taken": result.get("action_taken", "allow"),
        "model_version": result.get("model_version", model_version),
        "protocol": request.protocol,
        "bytes": max(256, int(sum(request.features[:5]) * 12)) if request.features else 256,
        "packets": max(4, int(sum(request.features[:3]) * 2)) if request.features else 4,
        "duration_ms": max(1, int(request.features[0] if request.features else 1)),
    }
    _record_event(event)

    if event["attack_type"] != "BENIGN":
        asyncio.create_task(_report_to_super_control(event))

    return result
