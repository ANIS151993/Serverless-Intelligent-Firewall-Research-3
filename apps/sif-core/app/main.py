import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, engine
from app.routers import clients, dashboard, osint, policies, threats


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)

settings = get_settings()


def initialize_database():
    # Multiple workers can start concurrently. Serialize create_all with a DB advisory lock.
    with engine.begin() as connection:
        connection.execute(text("SELECT pg_advisory_lock(922337)"))
        try:
            Base.metadata.create_all(bind=connection)
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(922337)"))


initialize_database()

app = FastAPI(
    title=settings.app_name,
    description="ASLF-OSINT central control plane",
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router, prefix="/api/v1/clients", tags=["clients"])
app.include_router(threats.router, prefix="/api/v1/threats", tags=["threats"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(osint.router, prefix="/api/v1/osint", tags=["osint"])
app.include_router(policies.router, prefix="/api/v1/policies", tags=["policies"])

Instrumentator().instrument(app).expose(app)


@app.get("/", tags=["status"])
def root():
    return {
        "platform": "SIF-ASLF-OSINT",
        "version": settings.version,
        "status": "operational",
    }


@app.get("/health", tags=["status"])
def health():
    return {"status": "healthy", "service": "sif-core", "version": settings.version}
