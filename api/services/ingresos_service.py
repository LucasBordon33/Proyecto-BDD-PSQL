import asyncpg
from fastapi import HTTPException
from api.models.schemas import IngresoCreate, IngresoRenglonCreate
from api.repositories import ingresos_repo

async def crear_ingreso(pool: asyncpg.Pool, ingreso_in: IngresoCreate) -> dict:
    datos = ingreso_in.model_dump()
    resultado = await ingresos_repo.insert_ingreso(pool, datos)
    return {
        "mensaje": "Ingreso iniciado en estado 'en_confeccion'.",
        "data": resultado
    }

async def agregar_renglon_ingreso(pool: asyncpg.Pool, codigo: int, renglon_in: IngresoRenglonCreate) -> dict:
    datos = renglon_in.model_dump()
    resultado = await ingresos_repo.insert_renglon_ingreso(pool, codigo, datos)
    return {
        "mensaje": "Renglón agregado correctamente al ingreso.",
        "data": resultado
    }

async def terminar_ingreso(pool: asyncpg.Pool, codigo: int) -> dict:
    exito = await ingresos_repo.update_estado_terminar_ingreso(pool, codigo)
    if not exito:
        raise HTTPException(
            status_code=400, 
            detail=f"No se pudo terminar el ingreso {codigo}. Verifique que exista y esté 'en_confeccion'."
        )
    return {"mensaje": f"Ingreso N° {codigo} marcado como 'terminado'."}

async def procesar_ingreso(pool: asyncpg.Pool, codigo: int) -> dict:
    await ingresos_repo.call_procesar_ingreso(pool, codigo)
    return {"mensaje": f"Ingreso N° {codigo} procesado exitosamente. Stock sumado al depósito."}