import asyncpg

async def get_vinos_catalogo(pool: asyncpg.Pool, limit: int, offset: int, tipo: str, cepa: str, bodega: str, anada: int) -> list[dict]:
    query = "SELECT DISTINCT v.codigo_vino, v.nombre, v.tipo, v.anada, v.cuit_bodega, v.precio FROM vino v "
    args = []
    where_clauses = []

    if cepa:
        query += "JOIN vino_cepa vc ON v.codigo_vino = vc.codigo_vino JOIN cepa c ON vc.id_cepa = c.id_cepa "
        args.append(f"%{cepa}%")
        where_clauses.append(f"c.nombre ILIKE ${len(args)}")

    if tipo:
        args.append(tipo)
        where_clauses.append(f"v.tipo = ${len(args)}")
    if anada:
        args.append(anada)
        where_clauses.append(f"v.anada = ${len(args)}")
    if bodega:
        args.append(bodega)
        where_clauses.append(f"v.cuit_bodega = ${len(args)}")

    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)

    args.extend([limit, offset])
    query += f" ORDER BY v.nombre LIMIT ${len(args)-1} OFFSET ${len(args)};"

    async with pool.acquire() as conn:
        records = await conn.fetch(query, *args)
        return [dict(record) for record in records]

async def get_vino_detalle(pool: asyncpg.Pool, codigo_vino: str) -> dict | None:
    query = """
        SELECT 
            v.codigo_vino, v.nombre, v.tipo, v.anada, v.volumen, v.graduacion, v.precio,
            COALESCE(
                (SELECT json_agg(json_build_object('cepa', c.nombre, 'porcentaje', vc.porcentaje))
                 FROM vino_cepa vc JOIN cepa c ON vc.id_cepa = c.id_cepa 
                 WHERE vc.codigo_vino = v.codigo_vino), '[]'::json
            ) as composicion,
            COALESCE(
                (SELECT json_agg(json_build_object('maridaje', m.nombre, 'temperatura', m.temperatura))
                 FROM vino_maridaje vm JOIN maridaje m ON vm.id_maridaje = m.id_maridaje 
                 WHERE vm.codigo_vino = v.codigo_vino), '[]'::json
            ) as maridajes
        FROM vino v
        WHERE v.codigo_vino = $1;
    """
    async with pool.acquire() as conn:
        record = await conn.fetchrow(query, codigo_vino)
        if record:
            return dict(record)
        return None

async def delete_vino(pool: asyncpg.Pool, codigo_vino: str) -> dict | None:
    pass