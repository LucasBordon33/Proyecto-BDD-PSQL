""" Configuración del proyecto"""

from pydantic_settings import BaseSettings, SettingsConfigDict


""" Ajustes leídos desde el .env"""
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "db" 
    postgres_port: int = 5432


    http_timeout: float = 30.0
    http_retries: int = 3
    max_connections: int = 20

