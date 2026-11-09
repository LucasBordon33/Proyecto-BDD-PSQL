import asyncpg
from fastapi import HTTPException
from api.models.schemas import VinoCreate, VinoUpdate
from api.repositories import vinos_repo

async def obtener_catalogo(pool, limit: int, offset: int, tipo: str | None, cepa: str | None, bodega: str | None, anada: int | None, nombre: str | None = None):
    return await vinos_repo.get_vinos_catalogo(pool, limit, offset, tipo, cepa, bodega, anada, nombre)

async def obtener_detalle_vino(pool: asyncpg.Pool, codigo_vino: str) -> dict:
    vino = await vinos_repo.get_vino_detalle(pool, codigo_vino)
    if not vino:
        raise HTTPException(status_code=404, detail=f"No se encontró el vino '{codigo_vino}'.")
    return vino

async def crear_vino(pool: asyncpg.Pool, vino: VinoCreate) -> dict:
    if sum(c.porcentaje for c in vino.cepas) != 100.0:
        raise HTTPException(status_code=400, detail="Los porcentajes de corte deben sumar exactamente 100.")

    datos_vino = vino.model_dump()
    async with pool.acquire() as conn:
        async with conn.transaction():
            codigo = await vinos_repo.insert_vino_completo(conn, datos_vino)

    return {"mensaje": "Vino creado exitosamente.", "codigo_vino": codigo}

async def modificar_vino(pool: asyncpg.Pool, codigo_vino: str, vino: VinoUpdate) -> dict:
    if sum(c.porcentaje for c in vino.cepas) != 100.0:
        raise HTTPException(status_code=400, detail="Los porcentajes de corte deben sumar exactamente 100.")

    datos_vino = vino.model_dump()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exito = await vinos_repo.update_vino_completo(conn, codigo_vino, datos_vino)

    if not exito:
        raise HTTPException(status_code=404, detail=f"No se encontró el vino '{codigo_vino}' para modificar.")

    return {"mensaje": f"Vino '{codigo_vino}' modificado exitosamente."}

async def eliminar_vino(pool: asyncpg.Pool, codigo_vino: str) -> dict:
    fue_borrado = await vinos_repo.delete_vino(pool, codigo_vino)
    if not fue_borrado:
        raise HTTPException(status_code=404, detail=f"No se encontró el vino '{codigo_vino}' para eliminar.")
    return {"mensaje": f"El vino '{codigo_vino}' fue eliminado exitosamente."}