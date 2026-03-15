"""
Per-client autonomous firewall instance.

The service forwards flow features to the AI engine, stores a rolling in-memory event
buffer for the client mini-dashboard, and listens for model update broadcasts from
RabbitMQ so each client stack can react to new model versions without manual restarts.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
from collections import deque
from datetime import datetime
from pathlib import Path

import httpx
import pika
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.responses import RedirectResponse
from pydantic import BaseModel


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")
log = logging.getLogger("sif-client.firewall")

CLIENT_ID = os.getenv("CLIENT_ID", "unknown-client")
API_KEY = os.getenv("API_KEY", "")
AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://sif-ai-engine:8001")
CONTROL_URL = os.getenv("SUPER_CONTROL_URL", "http://sif-core:8000")
BROKER_URL = os.getenv("BROKER_URL", "amqp://sifadmin:SIF_Rabbit2024!@sif-broker:5672/")
MODEL_VERSION_FILE = Path("/models/current_version.json")

app = FastAPI(title=f"SIF Client Firewall [{CLIENT_ID}]", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

events: deque[dict] = deque(maxlen=200)
model_version = "3.0.0-base"


class FlowRequest(BaseModel):
    features: list[float]
    source_ip: str = ""
    destination_ip: str = ""
    protocol: int = 6


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
    MODEL_VERSION_FILE.write_text(json.dumps({"version": version, "updated_at": datetime.utcnow().isoformat()}))


def _record_event(payload: dict):
    payload = payload.copy()
    payload["timestamp"] = datetime.utcnow().isoformat()
    events.appendleft(payload)


async def _report_to_super_control(payload: dict):
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


@app.on_event("startup")
async def startup():
    _load_model_version()
    start_model_update_consumer()


@app.get("/")
def root():
    return RedirectResponse(url="/dashboard", status_code=307)


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


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard():
    return f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SIF Client Dashboard</title>
    <style>
      body {{
        font-family: "Segoe UI", sans-serif;
        margin: 0;
        color: #ecfeff;
        background: radial-gradient(circle at top left, #164e63, #082f49 45%, #020617 100%);
      }}
      main {{ max-width: 1100px; margin: 0 auto; padding: 24px; }}
      .panel {{
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(125, 211, 252, 0.18);
        border-radius: 18px;
        padding: 18px;
        backdrop-filter: blur(10px);
      }}
      table {{ width: 100%; border-collapse: collapse; }}
      th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid rgba(148, 163, 184, 0.15); }}
      .badge {{ display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; }}
      .block {{ background: rgba(220, 38, 38, 0.18); color: #fecaca; }}
      .auth {{ background: rgba(202, 138, 4, 0.18); color: #fde68a; }}
      .allow {{ background: rgba(22, 163, 74, 0.18); color: #bbf7d0; }}
    </style>
  </head>
  <body>
    <main>
      <div class="panel">
        <h1>Client Sub-Dashboard</h1>
        <p>Client <strong>{CLIENT_ID}</strong> · Model <strong id="model-version">{model_version}</strong></p>
      </div>
      <div class="panel" style="margin-top: 20px;">
        <h2>Recent Events</h2>
        <table>
          <thead>
            <tr><th>Time</th><th>Attack</th><th>Source</th><th>Confidence</th><th>Action</th></tr>
          </thead>
          <tbody id="events"></tbody>
        </table>
      </div>
    </main>
    <script>
      async function refresh() {{
        const res = await fetch('/api/v1/events');
        const data = await res.json();
        document.getElementById('events').innerHTML = data.events.map((event) => `
          <tr>
            <td>${{new Date(event.timestamp).toLocaleTimeString()}}</td>
            <td>${{event.attack_type}}</td>
            <td>${{event.source_ip || '—'}}</td>
            <td>${{Math.round((event.confidence || 0) * 100)}}%</td>
            <td><span class="badge ${{event.action_taken === 'block_ip' ? 'block' : event.action_taken === 'require_auth' ? 'auth' : 'allow'}}">${{event.action_taken}}</span></td>
          </tr>
        `).join('') || '<tr><td colspan="5">No events yet</td></tr>';
      }}
      refresh();
      setInterval(refresh, 5000);
    </script>
  </body>
</html>
"""


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
    }
    _record_event(event)

    if event["attack_type"] != "BENIGN":
        asyncio.create_task(_report_to_super_control(event))

    return result
