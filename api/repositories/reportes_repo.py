import asyncpg


async def get_ranking_vinos(pool: asyncpg.Pool) -> list[dict]:
    # S1: Ranking de los 10 vinos con mayor cantidad de botellas vendidas en toda la red de salas.
    query = """
        SELECT v.codigo_vino, v.nombre, SUM(vc.cantidad) AS total_vendido
        FROM vino v
        JOIN vino_comprobante vc ON v.codigo_vino = vc.codigo_vino
        GROUP BY v.codigo_vino, v.nombre
        ORDER BY total_vendido DESC
        LIMIT 10;
    """

    async with pool.acquire() as conn:
        records = await conn.fetch(query)
        # Convertimos cada registro de asyncpg a un diccionario
        return [dict(record) for record in records]

async def get_ventas_por_sala(pool: asyncpg.Pool) -> list[dict]:
    # S8: Monto total de ventas por sala en el último trimestre, en orden descendente.
    query = """
        SELECT s.id_sala, s.calle, SUM(c.total) AS monto_total_ventas
        FROM comprobante c
        JOIN sala_venta s ON c.id_sala = s.id_sala
        WHERE c.fecha >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY s.id_sala, s.calle
        ORDER BY monto_total_ventas DESC;
    """

    async with pool.acquire() as conn:
        records = await conn.fetch(query)
        return [dict(record) for record in records]

async def get_vinos_sin_stock(pool: asyncpg.Pool, id_sala: int) -> list[dict]:
    # S6: Vinos sin stock en una sala determinada pero con stock en el depósito central.
    query = """
        SELECT sd.codigo_vino, v.nombre, sd.cantidad AS stock_deposito
        FROM stock_deposito sd
        JOIN vino v ON sd.codigo_vino = v.codigo_vino
        WHERE sd.cantidad > 0
          AND sd.codigo_vino NOT IN (
              SELECT ss.codigo_vino
              FROM stock_sala ss
              WHERE ss.id_sala = $1
                AND ss.cantidad > 0
          );
    """

    async with pool.acquire() as conn:
        records = await conn.fetch(query, id_sala)
        return [dict(record) for record in records]

async def get_transportista_activo(pool: asyncpg.Pool) -> dict | None:
    # S7: Empresa de transporte con mayor actividad (cantidad de viajes) en el último mes.
    query = """
        SELECT t.codigo, t.razon_social, COUNT(i.codigo) AS total_viajes
        FROM transportista t
        JOIN ingreso i ON t.codigo = i.cod_transportista
        WHERE i.fecha >= CURRENT_DATE - INTERVAL '1 month'
        GROUP BY t.codigo, t.razon_social
        ORDER BY total_viajes DESC
        LIMIT 1;
    """

    async with pool.acquire() as conn:
        record = await conn.fetchrow(query)
        return dict(record) if record else None

async def get_trazabilidad_vino(pool: asyncpg.Pool, codigo_vino: str) -> dict | None:
    # S9: Ficha de un vino (cepas, bodega, maridajes y stock total) mediante la vista vw_ficha_vino
    # definida en db/migrations/006_vistas.sql. Devuelve una única fila por código de vino.
    query = """
        SELECT * FROM vw_ficha_vino WHERE codigo_vino = $1;
    """

    async with pool.acquire() as conn:
        record = await conn.fetchrow(query, codigo_vino)
        return dict(record) if record else None
