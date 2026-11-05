import asyncpg
from fastapi import HTTPException

async def insert_transferencia(pool: asyncpg.Pool, id_sala: int) -> dict:
    query = """
        INSERT INTO transferencia (id_sala)
        VALUES ($1)
        RETURNING nro_transferencia, id_sala, fecha_confeccion, estado::text;
    """
    async with pool.acquire() as conn:
        record = await conn.fetchrow(query, id_sala)
        return dict(record)

async def insert_renglon_transferencia(pool: asyncpg.Pool, nro_transferencia: int, datos: dict) -> dict:
    async with pool.acquire() as conn:
        estado = await conn.fetchval(
            "SELECT estado FROM transferencia WHERE nro_transferencia = $1", 
            nro_transferencia
        )
        
        if not estado:
            raise HTTPException(status_code=404, detail=f"No se encontró la transferencia N° {nro_transferencia}.")
            
        if estado != "en_confeccion":
            raise HTTPException(
                status_code=400, 
                detail=f"No se pueden agregar renglones. La transferencia está en estado '{estado}'."
            )

        query = """
            INSERT INTO transferencia_vino (nro_transferencia, codigo_vino, cantidad)
            VALUES ($1, $2, $3)
            RETURNING codigo_vino, cantidad;
        """
        record = await conn.fetchrow(query, nro_transferencia, datos["codigo_vino"], datos["cantidad"])
        return dict(record)

async def update_estado_terminar(pool: asyncpg.Pool, nro_transferencia: int) -> bool:
    query = """
        UPDATE transferencia 
        SET estado = 'terminado' 
        WHERE nro_transferencia = $1 AND estado = 'en_confeccion';
    """
    async with pool.acquire() as conn:
        result = await conn.execute(query, nro_transferencia)
        return result == "UPDATE 1"

async def call_procesar_transferencia(pool: asyncpg.Pool, nro_transferencia: int) -> None:
    # La instrucción CALL ejecuta el procedimiento almacenado definido en PostgreSQL.
    # Cualquier RAISE EXCEPTION dentro de PL/pgSQL será capturado por tu manejador global en main.py.
    query = "CALL procesar_transferencia($1);"
    async with pool.acquire() as conn:
        await conn.execute(query, nro_transferencia)