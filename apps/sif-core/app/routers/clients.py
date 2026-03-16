import logging
import secrets
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.cloudflare_access import CloudflareAccessManager
from app.config import get_settings
from app.database import get_db
from app.models import Client
from app.schemas import ClientRead


router = APIRouter()
log = logging.getLogger("sif-core.clients")
settings = get_settings()
access_manager = CloudflareAccessManager(settings)


def _slugify(value: str) -> str:
    slug = "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in value.lower().replace(" ", "-"))
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-") or "client"


@router.post("/provision")
async def provision_client(
    name: str = Query(..., min_length=2, max_length=120),
    email: str = Query(..., min_length=5, max_length=255),
    db: Session = Depends(get_db),
):
    if db.query(Client).filter(Client.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    api_key = secrets.token_hex(32)
    client_id = str(uuid.uuid4())
    base_slug = _slugify(name)
    subdomain = base_slug

    collision_count = 0
    while db.query(Client).filter(Client.subdomain == subdomain).first():
        collision_count += 1
        subdomain = f"{base_slug}-{collision_count}"

    subsystem_id = f"pending-{client_id[:8]}"
    dashboard_url = f"https://{subdomain}.{settings.public_client_domain}"
    payload = {"client_id": client_id, "subdomain": subdomain, "api_key": api_key}

    try:
        async with httpx.AsyncClient(timeout=60) as http:
            response = await http.post(f"{settings.provisioner_url}/provision", json=payload)
        response.raise_for_status()
        body = response.json()
        subsystem_id = body.get("container_id", subsystem_id)
    except Exception as exc:
        log.warning("Provisioner request failed for %s: %s", client_id, exc)

    client = Client(
        id=client_id,
        name=name,
        email=email,
        api_key=api_key,
        subsystem_id=subsystem_id,
        subdomain=subdomain,
        config={"dashboard_url": dashboard_url},
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    access_status = "disabled"
    access_warning = None
    try:
        access_app = await access_manager.create_client_app(subdomain=subdomain, email=email)
        if access_app:
            config = dict(client.config or {})
            config.update(
                {
                    "dashboard_url": dashboard_url,
                    "cloudflare_access_managed": True,
                    "cloudflare_access_app_id": access_app["id"],
                    "cloudflare_access_aud": access_app.get("aud"),
                    "cloudflare_access_policy_ids": access_app.get("policy_ids", []),
                }
            )
            client.config = config
            db.commit()
            db.refresh(client)
            access_status = "managed"
    except Exception as exc:
        access_warning = str(exc)[:300]
        log.warning("Cloudflare Access onboarding failed for %s: %s", client_id, exc)
        config = dict(client.config or {})
        config.update(
            {
                "dashboard_url": dashboard_url,
                "cloudflare_access_managed": False,
                "cloudflare_access_last_error": access_warning,
            }
        )
        client.config = config
        db.commit()
        db.refresh(client)

    return {
        "client_id": client.id,
        "api_key": client.api_key,
        "subdomain": client.subdomain,
        "dashboard_url": dashboard_url,
        "status": "provisioned" if not subsystem_id.startswith("pending-") else "pending",
        "access_status": access_status,
        "access_warning": access_warning,
    }


@router.get("/", response_model=list[ClientRead])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).filter(Client.active.is_(True)).order_by(Client.created_at.desc()).all()


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: str, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.delete("/{client_id}")
async def deprovision_client(client_id: str, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            await http.delete(f"{settings.provisioner_url}/deprovision/{client.subsystem_id}")
    except Exception as exc:
        log.warning("Deprovision request failed for %s: %s", client_id, exc)

    access_app_id = (client.config or {}).get("cloudflare_access_app_id")
    if access_app_id:
        try:
            await access_manager.delete_app(str(access_app_id))
        except Exception as exc:
            log.warning("Cloudflare Access cleanup failed for %s: %s", client_id, exc)

    client.active = False
    config = dict(client.config or {})
    config["cloudflare_access_managed"] = False
    config.pop("cloudflare_access_app_id", None)
    config.pop("cloudflare_access_aud", None)
    config.pop("cloudflare_access_policy_ids", None)
    client.config = config
    db.commit()
    return {"status": "deprovisioned", "client_id": client_id}
