import asyncpg
from fastapi import HTTPException

async def insert_ingreso(pool: asyncpg.Pool, datos: dict) -> dict:
    query = """
        INSERT INTO ingreso (cod_transportista, cuit_bodega)
        VALUES ($1, $2)
        RETURNING codigo, fecha, estado::text, cod_transportista, cuit_bodega;
    """
    async with pool.acquire() as conn:
        record = await conn.fetchrow(query, datos["cod_transportista"], datos["cuit_bodega"])
        return dict(record)

async def insert_renglon_ingreso(pool: asyncpg.Pool, codigo_ingreso: int, datos: dict) -> dict:
    async with pool.acquire() as conn:
        estado = await conn.fetchval(
            "SELECT estado FROM ingreso WHERE codigo = $1", 
            codigo_ingreso
        )
        
        if not estado:
            raise HTTPException(status_code=404, detail=f"No se encontró el ingreso N° {codigo_ingreso}.")
            
        if estado != "en_confeccion":
            raise HTTPException(
                status_code=400, 
                detail=f"No se pueden agregar renglones. El ingreso está en estado '{estado}'."
            )

        query = """
            INSERT INTO ingreso_vino (codigo_ingreso, codigo_vino, cantidad)
            VALUES ($1, $2, $3)
            RETURNING codigo_vino, cantidad;
        """
        record = await conn.fetchrow(query, codigo_ingreso, datos["codigo_vino"], datos["cantidad"])
        return dict(record)

async def update_estado_terminar_ingreso(pool: asyncpg.Pool, codigo_ingreso: int) -> bool:
    query = """
        UPDATE ingreso 
        SET estado = 'terminado' 
        WHERE codigo = $1 AND estado = 'en_confeccion';
    """
    async with pool.acquire() as conn:
        result = await conn.execute(query, codigo_ingreso)
        return result == "UPDATE 1"

async def call_procesar_ingreso(pool: asyncpg.Pool, codigo_ingreso: int) -> None:
    query = "CALL procesar_ingreso($1);"
    async with pool.acquire() as conn:
        await conn.execute(query, codigo_ingreso)