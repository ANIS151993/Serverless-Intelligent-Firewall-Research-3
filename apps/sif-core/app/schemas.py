from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    api_key: str
    subsystem_id: str
    subdomain: str
    created_at: datetime
    active: bool
    config: dict[str, Any]


class ThreatEventIngest(BaseModel):
    client_id: str | None = None
    attack_type: str
    source_ip: str = ""
    destination_ip: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    action_taken: str = "allow"
    shap_values: dict[str, Any] | None = None
    raw_features: dict[str, Any] | None = None
    model_version: str | None = None


class ThreatEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str | None
    timestamp: datetime
    attack_type: str
    source_ip: str
    destination_ip: str
    confidence: float
    trust_score: float
    action_taken: str
    model_version: str | None


class OSINTIndicatorIn(BaseModel):
    value: str
    type: str
    source: str
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    ts: str | None = None


class PolicyUpdateIn(BaseModel):
    version: str
    model_path: str | None = None
    affected_clients: list[str] = Field(default_factory=list)
    status: str = "deployed"
