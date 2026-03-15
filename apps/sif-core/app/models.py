from datetime import datetime
import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, String

from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    api_key = Column(String, unique=True, nullable=False)
    subsystem_id = Column(String, unique=True, nullable=False)
    subdomain = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    config = Column(JSON, default=dict, nullable=False)


class ThreatEvent(Base):
    __tablename__ = "threat_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    attack_type = Column(String, index=True, nullable=False)
    source_ip = Column(String, index=True, default="", nullable=False)
    destination_ip = Column(String, default="", nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    trust_score = Column(Float, default=0.5, nullable=False)
    action_taken = Column(String, default="allow", nullable=False)
    shap_values = Column(JSON, nullable=True)
    raw_features = Column(JSON, nullable=True)
    model_version = Column(String, nullable=True)


class PolicyUpdate(Base):
    __tablename__ = "policy_updates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    version = Column(String, nullable=False)
    model_path = Column(String, nullable=True)
    pushed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    affected_clients = Column(JSON, default=list, nullable=False)
    status = Column(String, default="deployed", nullable=False)


class OSINTIndicator(Base):
    __tablename__ = "osint_indicators"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    value = Column(String, index=True, nullable=False)
    ioc_type = Column(String, nullable=False)
    source = Column(String, nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
