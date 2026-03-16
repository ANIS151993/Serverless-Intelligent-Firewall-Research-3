import logging
import os
import re
import socket
import shutil
import subprocess

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")
log = logging.getLogger("sif-client.provisioner")

app = FastAPI(title="SIF Client Provisioner", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
Instrumentator().instrument(app).expose(app)

TEMPLATE = "/opt/sif-client-host/templates/client-stack.yml"
STACKS = "/opt/sif-client-host/stacks"
PUBLIC_BASE_DOMAIN = os.getenv("PUBLIC_BASE_DOMAIN", "marcbd.site")
ROUTE_HELPER = os.getenv("ROUTE_HELPER", "/usr/local/bin/sif-client-route")


class ProvisionRequest(BaseModel):
    client_id: str
    subdomain: str
    api_key: str


def run_docker_compose(compose_file: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["docker", "compose", "-f", compose_file, *args],
        check=False,
        capture_output=True,
        cwd=os.path.dirname(compose_file),
        text=True,
    )


def pick_host_port() -> int:
    for port in range(20080, 21080):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("No free client dashboard host ports available in the 20080-21079 range")


@app.get("/")
def root():
    return {
        "service": "SIF-Provisioner",
        "status": "operational",
        "public_base_domain": PUBLIC_BASE_DOMAIN,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/stacks")
def list_stacks():
    os.makedirs(STACKS, exist_ok=True)
    return {"stacks": sorted(os.listdir(STACKS)), "count": len(os.listdir(STACKS))}


@app.post("/provision")
def provision(request: ProvisionRequest):
    os.makedirs(STACKS, exist_ok=True)
    stack_dir = os.path.join(STACKS, request.client_id)
    os.makedirs(stack_dir, exist_ok=True)
    fqdn = f"{request.subdomain}.{PUBLIC_BASE_DOMAIN}"
    host_port = pick_host_port()

    with open(TEMPLATE, "r", encoding="utf-8") as handle:
        compose = handle.read()
    compose = compose.replace("CLIENT_ID_VALUE", request.client_id)
    compose = compose.replace("CLIENT_ID", request.client_id)
    compose = compose.replace("API_KEY_VAL", request.api_key)
    compose = compose.replace("CLIENT_HOST_PORT", str(host_port))

    compose_file = os.path.join(stack_dir, "docker-compose.yml")
    with open(compose_file, "w", encoding="utf-8") as handle:
        handle.write(compose)

    result = run_docker_compose(compose_file, "up", "-d", "--remove-orphans")
    if result.returncode != 0:
        log.error("Docker compose failed for %s: %s", request.client_id, result.stderr.strip())
        return {
            "container_id": request.client_id,
            "status": "compose_queued",
            "warning": result.stderr.strip()[:300],
        }

    route_result = subprocess.run(
        ["sudo", ROUTE_HELPER, "up", request.client_id, fqdn, str(host_port)],
        check=False,
        capture_output=True,
        text=True,
    )
    if route_result.returncode != 0:
        log.error("Nginx route helper failed for %s: %s", request.client_id, route_result.stderr.strip())
        run_docker_compose(compose_file, "down", "-v", "--remove-orphans")
        shutil.rmtree(stack_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Route helper failed: {route_result.stderr.strip()[:300]}")

    return {
        "container_id": request.client_id,
        "status": "provisioned",
        "subdomain": request.subdomain,
        "public_url": f"https://{fqdn}",
        "host_port": host_port,
    }


@app.get("/stacks/{client_id}")
def inspect_stack(client_id: str):
    stack_dir = os.path.join(STACKS, client_id)
    compose_file = os.path.join(stack_dir, "docker-compose.yml")
    if not os.path.exists(compose_file):
        raise HTTPException(status_code=404, detail="Stack not found")

    compose_text = open(compose_file, "r", encoding="utf-8").read()
    port_match = re.search(r"127\.0\.0\.1:(\d+):8080", compose_text)
    route_config = f"/etc/nginx/conf.d/sif-client-{client_id}.conf"
    public_url = None
    if os.path.exists(route_config):
        route_text = open(route_config, "r", encoding="utf-8").read()
        fqdn_match = re.search(r"server_name\s+([^;]+);", route_text)
        if fqdn_match:
            public_url = f"https://{fqdn_match.group(1).strip()}"
    result = run_docker_compose(compose_file, "ps")
    return {
        "client_id": client_id,
        "stack_dir": stack_dir,
        "compose_exists": True,
        "public_url": public_url,
        "host_port": int(port_match.group(1)) if port_match else None,
        "docker_ps": result.stdout,
    }


@app.delete("/deprovision/{client_id}")
def deprovision(client_id: str):
    stack_dir = os.path.join(STACKS, client_id)
    compose_file = os.path.join(stack_dir, "docker-compose.yml")
    subprocess.run(
        ["sudo", ROUTE_HELPER, "down", client_id],
        check=False,
        capture_output=True,
        text=True,
    )
    if os.path.exists(compose_file):
        run_docker_compose(compose_file, "down", "-v", "--remove-orphans")
    shutil.rmtree(stack_dir, ignore_errors=True)
    return {"status": "deprovisioned", "client_id": client_id}
