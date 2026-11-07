import asyncpg
from fastapi import HTTPException
from api.repositories import reportes_repo

async def obtener_ranking_vinos(pool: asyncpg.Pool) -> list[dict]:
    ranking = await reportes_repo.get_ranking_vinos(pool)
    return ranking

# /top-vinos consume la misma consulta S1 que /ranking-vinos
async def obtener_top_vinos(pool: asyncpg.Pool) -> list[dict]:
    return await reportes_repo.get_ranking_vinos(pool)

async def obtener_ventas_por_sala(pool: asyncpg.Pool) -> list[dict]:
    return await reportes_repo.get_ventas_por_sala(pool)

async def obtener_vinos_sin_stock(pool: asyncpg.Pool, id_sala: int) -> list[dict]:
    return await reportes_repo.get_vinos_sin_stock(pool, id_sala)

async def obtener_transportista_activo(pool: asyncpg.Pool) -> dict:
    transportista = await reportes_repo.get_transportista_activo(pool)
    if not transportista:
        raise HTTPException(status_code=404, detail="No hay transportistas con actividad registrada en el último mes.")
    return transportista

async def obtener_trazabilidad_vino(pool: asyncpg.Pool, codigo_vino: str) -> dict:
    ficha = await reportes_repo.get_trazabilidad_vino(pool, codigo_vino)
    if not ficha:
        raise HTTPException(status_code=404, detail=f"No se encontró el vino '{codigo_vino}'.")
    return ficha
