import asyncpg
from fastapi import HTTPException
from api.repositories import vinos_repo

async def obtener_catalogo(
    pool: asyncpg.Pool, 
    limit: int, 
    offset: int, 
    tipo: str | None, 
    cepa: str | None, 
    bodega: str | None, 
    anada: int | None
) -> list[dict]:
    if anada and anada < 1900:
        raise HTTPException(status_code=400, detail="La añada ingresada no es válida.")
        
    return await vinos_repo.get_vinos_catalogo(
        pool, limit, offset, tipo, cepa, bodega, anada
    )

async def obtener_detalle_vino(pool: asyncpg.Pool, codigo_vino: str) -> dict:
    vino = await vinos_repo.get_vino_detalle(pool, codigo_vino)
    
    if not vino:
        raise HTTPException(
            status_code=404, 
            detail=f"No se encontró el vino con código '{codigo_vino}'."
        )
        
    return vino