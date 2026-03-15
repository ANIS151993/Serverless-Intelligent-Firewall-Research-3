from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime
from typing import Any

import numpy as np
import pika
import redis
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_fastapi_instrumentator import Instrumentator


sys.path.insert(0, "/opt/sif-ai")

from models.detector import ASLFDetector, DAWMADriftDetector, compute_zta_trust_score  # noqa: E402
from osint.feed_manager import get_redis, run_osint_cycle, schedule_osint_loop  # noqa: E402


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")
log = logging.getLogger("sif-ai.app")

BROKER_URL = os.getenv("SIF_BROKER_URL", "amqp://sifadmin:SIF_Rabbit2024!@sif-broker:5672/")
SUPER_CONTROL_URL = os.getenv("SIF_SUPER_CONTROL_URL", "http://sif-core:8000")

app = FastAPI(
    title="SIF AI Engine",
    description="ASLF-OSINT multi-paradigm AI engine",
    version="3.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

detector = ASLFDetector()
drift_monitor = DAWMADriftDetector()
last_osint_summary: dict[str, Any] = {"status": "awaiting_first_cycle"}


class FlowRequest(BaseModel):
    features: list[float]
    source_ip: str = ""
    client_id: str = ""


class BatchRequest(BaseModel):
    flows: list[FlowRequest]


class PublishRequest(BaseModel):
    version: str = Field(default="3.0.0-base")
    model_path: str | None = None
    affected_clients: list[str] = Field(default_factory=list)


def get_cached_osint_values() -> set[str]:
    try:
        raw = get_redis().get("osint:latest")
        if not raw:
            return set()
        return {item.get("value", "") for item in json.loads(raw)}
    except Exception:
        return set()


def publish_model_update(payload: PublishRequest):
    body = {
        "version": payload.version,
        "model_path": payload.model_path,
        "affected_clients": payload.affected_clients,
        "published_at": datetime.utcnow().isoformat(),
    }
    parameters = pika.URLParameters(BROKER_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.exchange_declare(exchange="model_updates", exchange_type="fanout", durable=True)
    channel.basic_publish(exchange="model_updates", routing_key="", body=json.dumps(body).encode("utf-8"))
    connection.close()
    return body


def record_policy_update(body: dict[str, Any]):
    import httpx

    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(f"{SUPER_CONTROL_URL}/api/v1/policies/publish", json=body | {"status": "published"})
        response.raise_for_status()
    except Exception as exc:
        log.warning("Failed to record policy update in sif-core: %s", exc)


@app.on_event("startup")
async def startup():
    schedule_osint_loop()
    log.info("AI Engine started with version=%s trained=%s", detector.version, detector.is_trained)


@app.get("/")
def root():
    return {
        "service": "SIF-AI-Engine",
        "version": detector.version,
        "model_trained": detector.is_trained,
        "status": "operational",
        "paradigms": [
            "XGBoost+BiGRU",
            "PPO-RL",
            "DAWMA-SSF",
            "Prototypical-Networks",
            "FedNova",
        ],
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "sif-ai-engine", "model_version": detector.version}


@app.post("/detect")
async def detect(request: FlowRequest):
    features = np.array([request.features], dtype=np.float32)
    result = detector.classify(features)[0]
    pkt_rate = float(request.features[5]) if len(request.features) > 5 else 0.0
    trust = compute_zta_trust_score(
        request.source_ip or "0.0.0.0",
        {"flow_packets_per_s": pkt_rate},
        osint_values=get_cached_osint_values(),
    )

    if result.attack_type != "BENIGN" and result.confidence >= 0.85:
        action = "block_ip"
    elif trust < 0.3:
        action = "block_ip"
    elif trust < 0.7:
        action = "require_auth"
    else:
        action = "allow"

    drift_monitor.update(action != "allow")

    return {
        "attack_type": result.attack_type,
        "confidence": result.confidence,
        "trust_score": trust,
        "action_taken": action,
        "model_version": detector.version,
        "probabilities": result.probabilities,
    }


@app.post("/detect/batch")
async def detect_batch(request: BatchRequest):
    outputs = []
    for flow in request.flows:
        outputs.append(await detect(flow))
    return {"count": len(outputs), "results": outputs}


@app.get("/model/version")
def model_version():
    return {"version": detector.version, "trained": detector.is_trained}


@app.post("/model/publish")
def model_publish(request: PublishRequest):
    try:
        payload = publish_model_update(request)
        detector.version = request.version
        if request.model_path:
            detector.save(request.version)
        record_policy_update(payload)
        return {"status": "published", **payload}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to publish model update: {exc}") from exc


@app.post("/osint/run")
async def osint_run():
    global last_osint_summary
    last_osint_summary = await run_osint_cycle()
    return last_osint_summary


@app.get("/osint/status")
def osint_status():
    try:
        redis_client = get_redis()
        indicators = json.loads(redis_client.get("osint:latest") or "[]")
        cycles = int(redis_client.get("osint:cycle:count") or 0)
        last_run = redis_client.get("osint:last_run")
    except redis.RedisError:
        indicators = []
        cycles = 0
        last_run = None

    return {
        "indicator_count": len(indicators),
        "cycle_count": cycles,
        "last_run": last_run,
        "last_summary": last_osint_summary,
    }


@app.get("/drift/status")
def drift_status():
    return {
        "drift_detected": drift_monitor.drift,
        "recent_window_size": len(drift_monitor.recent),
        "history_window_size": len(drift_monitor.history),
    }


Instrumentator().instrument(app).expose(app)
