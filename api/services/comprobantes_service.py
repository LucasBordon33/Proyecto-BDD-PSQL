import asyncpg
from fastapi import HTTPException
from api.models.schemas import ComprobanteCreate
from api.repositories import comprobantes_repo

async def crear_comprobante(pool: asyncpg.Pool, comprobante_in: ComprobanteCreate) -> dict:
    datos = comprobante_in.model_dump()
    
    async with pool.acquire() as conn:
        async with conn.transaction():
            nro_comprobante = await comprobantes_repo.insert_venta_completa(conn, datos)
            
    return {
        "mensaje": "Venta procesada exitosamente.",
        "numero_comprobante": nro_comprobante
    }

async def obtener_comprobante(pool: asyncpg.Pool, numero: int) -> dict:
    comprobante = await comprobantes_repo.get_comprobante_detalle(pool, numero)
    if not comprobante:
        raise HTTPException(status_code=404, detail=f"No se encontró el comprobante N° {numero}.")
    return comprobante