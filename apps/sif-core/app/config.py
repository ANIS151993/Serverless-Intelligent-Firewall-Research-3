from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SIF_", case_sensitive=False)

    app_name: str = "SIF Super Control System API"
    version: str = "3.0.0"
    database_url: str = "postgresql://sif_user:SIF_DB_Pass2024!@localhost/sif_platform"
    provisioner_url: str = "http://sif-client-host:8500"
    public_client_domain: str = "marcbd.site"
    broker_url: str = "amqp://sifadmin:SIF_Rabbit2024!@sif-broker:5672/"
    redis_url: str = "redis://:SIF_Redis2024!@localhost:6379/0"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
