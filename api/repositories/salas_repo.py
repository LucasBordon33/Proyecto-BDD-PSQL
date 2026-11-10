import asyncpg

async def get_salas(pool: asyncpg.Pool) -> list[dict]:
    # Unimos calle y numero y lo llamamos 'nombre' para que coincida con el frontend
    query = """
        SELECT 
            id_sala, 
            CONCAT(calle, ' ', numero) AS nombre 
        FROM sala_venta 
        ORDER BY calle;
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query)
        return [dict(record) for record in records]