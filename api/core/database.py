import asyncpg
from api.core.config import settings, validar_configuracion_obligatoria


async def create_db_pool() -> asyncpg.Pool:
    # Falla de forma controlada si faltan variables de entorno obligatorias
    validar_configuracion_obligatoria()
    return await asyncpg.create_pool(
        user=settings.postgres_user,
        password=settings.postgres_password,
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=settings.postgres_db,
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        command_timeout=settings.db_command_timeout,
        ssl=settings.ssl_context(),
    )
