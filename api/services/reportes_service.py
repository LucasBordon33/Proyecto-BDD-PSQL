import asyncpg
from api.repositories import reportes_repo

async def obtener_ranking_vinos(pool: asyncpg.Pool) -> list[dict]:
    ranking = await reportes_repo.get_ranking_vinos(pool)
    return ranking