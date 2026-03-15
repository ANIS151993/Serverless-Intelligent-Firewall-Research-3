from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Client, OSINTIndicator, ThreatEvent


router = APIRouter()


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=24)

    total_clients = db.query(func.count(Client.id)).filter(Client.active.is_(True)).scalar() or 0
    total_threats = db.query(func.count(ThreatEvent.id)).scalar() or 0
    threats_24h = db.query(func.count(ThreatEvent.id)).filter(ThreatEvent.timestamp >= since).scalar() or 0
    blocked_count = (
        db.query(func.count(ThreatEvent.id)).filter(ThreatEvent.action_taken == "block_ip").scalar() or 0
    )
    osint_indicators = (
        db.query(func.count(OSINTIndicator.id)).filter(OSINTIndicator.active.is_(True)).scalar() or 0
    )

    recent = db.query(ThreatEvent).order_by(desc(ThreatEvent.timestamp)).limit(25).all()
    distribution = (
        db.query(ThreatEvent.attack_type, func.count(ThreatEvent.id))
        .filter(ThreatEvent.timestamp >= since)
        .group_by(ThreatEvent.attack_type)
        .all()
    )

    return {
        "total_clients": total_clients,
        "total_threats": total_threats,
        "threats_24h": threats_24h,
        "blocked_count": blocked_count,
        "osint_indicators": osint_indicators,
        "attack_distribution": [{"type": row[0], "count": row[1]} for row in distribution],
        "recent_threats": [
            {
                "id": event.id,
                "timestamp": event.timestamp.isoformat(),
                "attack_type": event.attack_type,
                "source_ip": event.source_ip,
                "confidence": event.confidence,
                "action_taken": event.action_taken,
                "client_id": event.client_id,
                "model_version": event.model_version,
            }
            for event in recent
        ],
    }


@router.get("/clients/health")
def client_health(db: Session = Depends(get_db)):
    results = []
    for client in db.query(Client).filter(Client.active.is_(True)).order_by(Client.created_at.desc()).all():
        last_event = (
            db.query(ThreatEvent)
            .filter(ThreatEvent.client_id == client.id)
            .order_by(desc(ThreatEvent.timestamp))
            .first()
        )
        count = db.query(func.count(ThreatEvent.id)).filter(ThreatEvent.client_id == client.id).scalar() or 0
        results.append(
            {
                "client_id": client.id,
                "name": client.name,
                "subdomain": client.subdomain,
                "last_seen": last_event.timestamp.isoformat() if last_event else None,
                "threat_count": count,
            }
        )
    return results
