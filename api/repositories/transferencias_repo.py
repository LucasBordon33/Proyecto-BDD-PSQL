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

async def get_todas_transferencias(pool: asyncpg.Pool, limit: int, offset: int) -> list:
    # Hacemos un cast de estado::text para que FastAPI/Pydantic lo parsee a JSON sin problemas
    query = """
        SELECT 
            nro_transferencia, 
            id_sala, 
            fecha_confeccion, 
            estado::text 
        FROM transferencia
        ORDER BY nro_transferencia DESC
        LIMIT $1 OFFSET $2;
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query, limit, offset)
        return [dict(record) for record in records]

async def get_transferencia_por_nro(pool: asyncpg.Pool, nro_transferencia: int) -> dict:
    async with pool.acquire() as conn:
        # 1. Buscamos la cabecera
        query_cabecera = """
            SELECT nro_transferencia, id_sala, fecha_confeccion, estado::text 
            FROM transferencia 
            WHERE nro_transferencia = $1;
        """
        cabecera = await conn.fetchrow(query_cabecera, nro_transferencia)
        
        if not cabecera:
            return None
            
        # 2. Buscamos los renglones (uniendo con la tabla vino para obtener el nombre)
        query_renglones = """
            SELECT r.codigo_vino, r.cantidad, v.nombre AS nombre_vino
            FROM transferencia_vino r
            LEFT JOIN vino v ON r.codigo_vino = v.codigo_vino
            WHERE r.nro_transferencia = $1;
        """
        renglones = await conn.fetch(query_renglones, nro_transferencia)
        
        # 3. Armamos el diccionario final que espera tu JavaScript
        resultado = dict(cabecera)
        resultado["renglones"] = [dict(r) for r in renglones]
        
        return resultado

async def delete_renglon(pool: asyncpg.Pool, nro_transferencia: int, codigo_vino: str):
    query = "DELETE FROM transferencia_vino WHERE nro_transferencia = $1 AND codigo_vino = $2;"
    async with pool.acquire() as conn:
        await conn.execute(query, nro_transferencia, codigo_vino)

async def update_cantidad_renglon(pool: asyncpg.Pool, nro_transferencia: int, codigo_vino: str, cantidad: int):
    query = "UPDATE transferencia_vino SET cantidad = $1 WHERE nro_transferencia = $2 AND codigo_vino = $3;"
    async with pool.acquire() as conn:
        await conn.execute(query, cantidad, nro_transferencia, codigo_vino)

async def update_sala_transferencia(pool: asyncpg.Pool, nro_transferencia: int, id_sala: int):
    query = "UPDATE transferencia SET id_sala = $1 WHERE nro_transferencia = $2;"
    async with pool.acquire() as conn:
        await conn.execute(query, id_sala, nro_transferencia)