import asyncpg
from fastapi import HTTPException
from api.models.schemas import TransferenciaCreate, TransferenciaRenglonCreate
from api.repositories import transferencias_repo

async def crear_transferencia(pool: asyncpg.Pool, transferencia_in: TransferenciaCreate) -> dict:
    resultado = await transferencias_repo.insert_transferencia(pool, transferencia_in.id_sala)
    return {
        "mensaje": "Transferencia iniciada en estado 'en_confeccion'.",
        "data": resultado
    }

async def agregar_renglon(pool: asyncpg.Pool, nro_transferencia: int, renglon_in: TransferenciaRenglonCreate) -> dict:
    datos = renglon_in.model_dump()
    resultado = await transferencias_repo.insert_renglon_transferencia(pool, nro_transferencia, datos)
    return {
        "mensaje": "Renglón agregado correctamente a la transferencia.",
        "data": resultado
    }

async def terminar_transferencia(pool: asyncpg.Pool, nro_transferencia: int) -> dict:
    exito = await transferencias_repo.update_estado_terminar(pool, nro_transferencia)
    if not exito:
        raise HTTPException(
            status_code=400, 
            detail=f"No se pudo terminar la transferencia {nro_transferencia}. Verifique que exista y esté 'en_confeccion'."
        )
    return {"mensaje": f"Transferencia N° {nro_transferencia} marcada como 'terminada'."}

async def procesar_transferencia(pool: asyncpg.Pool, nro_transferencia: int) -> dict:
    # El manejador de excepciones de main.py capturará errores como "Stock insuficiente" 
    # o "La transferencia debe estar terminada para procesarse" devolviendo un 409 Conflict.
    await transferencias_repo.call_procesar_transferencia(pool, nro_transferencia)
    return {"mensaje": f"Transferencia N° {nro_transferencia} procesada exitosamente. Stock movido a la sala."}