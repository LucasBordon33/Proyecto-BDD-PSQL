import ssl

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Base de datos ---
    postgres_user: str = Field(validation_alias="DB_USER")
    postgres_password: str = Field(validation_alias="DB_PASSWORD")
    postgres_db: str = Field(validation_alias="DB_NAME")
    postgres_host: str = Field(default="db", validation_alias="DB_HOST")
    postgres_port: int = Field(default=5432, validation_alias="DB_PORT")
    db_ssl: bool = Field(default=False, validation_alias="DB_SSL")
    db_command_timeout: int = Field(default=30, validation_alias="DB_COMMAND_TIMEOUT")
    db_pool_min_size: int = Field(default=5, validation_alias="DB_POOL_MIN_SIZE")
    db_pool_max_size: int = Field(default=20, validation_alias="DB_POOL_MAX_SIZE")

    # --- Aplicación / Seguridad ---
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    api_base_url: str = Field(default="http://localhost:8000", validation_alias="API_BASE_URL")
    frontend_url: str = Field(default="http://localhost:8080", validation_alias="FRONTEND_URL")
    cors_origins: str = Field(
        default="http://localhost:8080,http://127.0.0.1:8080",
        validation_alias="CORS_ORIGINS",
    )
    secret_key: str = Field(validation_alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(
        default=30, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    @field_validator("postgres_password", "secret_key")
    @classmethod
    def _no_empty_secrets(cls, v: str) -> str:
        if not v or v.strip() in ("", "CAMBIAR_POR_SECRETO", "tu_secreto_aqui"):
            raise ValueError("La variable de entorno no puede estar vacía ni usar un placeholder.")
        return v

    @field_validator("cors_origins")
    @classmethod
    def _parse_cors_origins(cls, v: str) -> list[str]:
        return [o.strip() for o in v.split(",") if o.strip()]

    def ssl_context(self) -> ssl.SSLContext | None:
        """Contexto TLS verify-full solo en producción/cloud. Desactivado en desarrollo local."""
        if not self.db_ssl:
            return None
        return ssl.create_default_context()

    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


settings = Settings()


def validar_configuracion_obligatoria() -> None:
    """Lanza excepción controlada si faltan variables de entorno críticas."""
    requeridas = [
        ("DB_USER", settings.postgres_user),
        ("DB_PASSWORD", settings.postgres_password),
        ("DB_NAME", settings.postgres_db),
        ("DB_HOST", settings.postgres_host),
        ("SECRET_KEY", settings.secret_key),
        ("API_BASE_URL", settings.api_base_url),
        ("FRONTEND_URL", settings.frontend_url),
    ]
    faltantes = [nombre for nombre, valor in requeridas if not valor or str(valor).strip() == ""]
    if faltantes:
        raise RuntimeError(
            "Variables de entorno obligatorias no configuradas: "
            + ", ".join(faltantes)
            + ". Copie .env.example a .env y complete los valores reales."
        )


def get_config_summary() -> dict:
    """Devuelve una visión no sensible de la configuración (para logs / salud)."""
    return {
        "app_env": settings.app_env,
        "postgres_host": settings.postgres_host,
        "postgres_port": settings.postgres_port,
        "postgres_db": settings.postgres_db,
        "db_ssl": settings.db_ssl,
        "api_base_url": settings.api_base_url,
        "frontend_url": settings.frontend_url,
        "cors_origins": settings.cors_origins,
        "is_production": settings.is_production(),
    }
