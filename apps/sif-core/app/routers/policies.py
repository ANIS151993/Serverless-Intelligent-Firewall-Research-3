from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PolicyUpdate
from app.schemas import PolicyUpdateIn


router = APIRouter()


@router.post("/publish")
def publish_policy(update: PolicyUpdateIn, db: Session = Depends(get_db)):
    row = PolicyUpdate(
        version=update.version,
        model_path=update.model_path,
        affected_clients=update.affected_clients,
        status=update.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": "stored", "version": row.version}


@router.get("/")
def list_policy_updates(db: Session = Depends(get_db)):
    rows = db.query(PolicyUpdate).order_by(desc(PolicyUpdate.pushed_at)).limit(50).all()
    return [
        {
            "id": row.id,
            "version": row.version,
            "model_path": row.model_path,
            "pushed_at": row.pushed_at.isoformat(),
            "affected_clients": row.affected_clients,
            "status": row.status,
        }
        for row in rows
    ]
