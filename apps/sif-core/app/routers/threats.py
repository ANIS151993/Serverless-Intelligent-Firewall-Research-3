from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ThreatEvent
from app.schemas import ThreatEventIngest, ThreatEventRead


router = APIRouter()


@router.get("/", response_model=list[ThreatEventRead])
def list_threats(
    client_id: str | None = None,
    attack_type: str | None = None,
    hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(ThreatEvent).filter(ThreatEvent.timestamp >= since)
    if client_id:
        query = query.filter(ThreatEvent.client_id == client_id)
    if attack_type:
        query = query.filter(ThreatEvent.attack_type == attack_type)
    return query.order_by(desc(ThreatEvent.timestamp)).limit(limit).all()


@router.post("/ingest")
def ingest_threat(event: ThreatEventIngest, db: Session = Depends(get_db)):
    row = ThreatEvent(**event.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": "stored"}


@router.get("/stats")
def threat_stats(db: Session = Depends(get_db)):
    rows = (
        db.query(
            ThreatEvent.attack_type,
            func.count(ThreatEvent.id).label("count"),
            func.avg(ThreatEvent.confidence).label("avg_confidence"),
        )
        .group_by(ThreatEvent.attack_type)
        .all()
    )
    return [
        {
            "attack_type": row[0],
            "count": row[1],
            "avg_confidence": round(float(row[2] or 0.0), 4),
        }
        for row in rows
    ]


@router.get("/live")
def live_feed(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    rows = db.query(ThreatEvent).order_by(desc(ThreatEvent.timestamp)).limit(limit).all()
    return [
        {
            "id": row.id,
            "timestamp": row.timestamp.isoformat(),
            "attack_type": row.attack_type,
            "source_ip": row.source_ip,
            "confidence": row.confidence,
            "trust_score": row.trust_score,
            "action_taken": row.action_taken,
            "client_id": row.client_id,
            "model_version": row.model_version,
        }
        for row in rows
    ]
