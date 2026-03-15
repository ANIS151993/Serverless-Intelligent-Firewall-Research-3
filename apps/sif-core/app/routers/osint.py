from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import OSINTIndicator
from app.schemas import OSINTIndicatorIn


router = APIRouter()


@router.post("/ingest")
def ingest_indicators(indicators: list[OSINTIndicatorIn], db: Session = Depends(get_db)):
    stored = 0
    for indicator in indicators:
        existing = (
            db.query(OSINTIndicator)
            .filter(OSINTIndicator.value == indicator.value, OSINTIndicator.source == indicator.source)
            .first()
        )
        if existing:
            existing.confidence = indicator.confidence
            existing.active = True
            existing.ioc_type = indicator.type
        else:
            db.add(
                OSINTIndicator(
                    value=indicator.value,
                    ioc_type=indicator.type,
                    source=indicator.source,
                    confidence=indicator.confidence,
                )
            )
        stored += 1
    db.commit()
    return {"stored": stored, "status": "ok"}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    by_source = (
        db.query(OSINTIndicator.source, func.count(OSINTIndicator.id))
        .filter(OSINTIndicator.active.is_(True))
        .group_by(OSINTIndicator.source)
        .all()
    )
    recent = db.query(OSINTIndicator).order_by(desc(OSINTIndicator.ingested_at)).limit(50).all()
    return {
        "active_total": db.query(func.count(OSINTIndicator.id)).filter(OSINTIndicator.active.is_(True)).scalar() or 0,
        "by_source": [{"source": row[0], "count": row[1]} for row in by_source],
        "recent": [
            {
                "value": indicator.value,
                "type": indicator.ioc_type,
                "source": indicator.source,
                "confidence": indicator.confidence,
                "ingested_at": indicator.ingested_at.isoformat(),
            }
            for indicator in recent
        ],
    }
