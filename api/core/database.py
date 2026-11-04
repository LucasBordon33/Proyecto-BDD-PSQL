import asyncpg
from api.core.config import settings


async def create_db_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        user=settings.postgres_user,
        password=settings.postgres_password,
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=settings.postgres_db,
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        command_timeout=settings.db_command_timeout
    )

