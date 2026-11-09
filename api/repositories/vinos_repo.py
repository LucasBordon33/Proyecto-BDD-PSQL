import asyncpg

async def get_vinos_catalogo(pool: asyncpg.Pool, limit: int, offset: int, tipo: str | None, cepa: str | None, bodega: str | None, anada: int | None, nombre: str | None = None) -> list[dict]:
    query = "SELECT DISTINCT v.codigo_vino, v.nombre, v.tipo, v.anada, v.cuit_bodega, v.precio FROM vino v "
    args = []
    where_clauses = []

    if nombre:
        args.append(f"%{nombre}%")
        where_clauses.append(f"v.nombre ILIKE ${len(args)}")

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
            v.codigo_vino, v.nombre, v.tipo, v.anada, v.volumen AS volumen_ml, v.graduacion, v.precio, v.cuit_bodega,
            COALESCE(
                (SELECT json_agg(json_build_object('id_cepa', c.id_cepa, 'cepa', c.nombre, 'porcentaje', vc.porcentaje))
                 FROM vino_cepa vc JOIN cepa c ON vc.id_cepa = c.id_cepa 
                 WHERE vc.codigo_vino = v.codigo_vino), '[]'::json
            ) as composicion,
            COALESCE(
                (SELECT json_agg(json_build_object('id_maridaje', m.id_maridaje, 'maridaje', m.nombre, 'temperatura', m.temperatura))
                 FROM vino_maridaje vm JOIN maridaje m ON vm.id_maridaje = m.id_maridaje 
                 WHERE vm.codigo_vino = v.codigo_vino), '[]'::json
            ) as maridajes
        FROM vino v
        WHERE v.codigo_vino = $1;
    """
    async with pool.acquire() as conn:
        record = await conn.fetchrow(query, codigo_vino)
        return dict(record) if record else None

async def insert_vino_completo(conn: asyncpg.Connection, datos: dict) -> str:
    query_vino = """
        INSERT INTO vino (codigo_vino, nombre, tipo, anada, volumen, graduacion, precio, cuit_bodega)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING codigo_vino;
    """
    codigo = await conn.fetchval(
        query_vino, 
        datos["codigo_vino"], datos["nombre"], datos["tipo"], 
        datos["anada"], datos["volumen_ml"], datos["graduacion"], 
        datos["precio"], datos["cuit_bodega"]
    )

    if datos.get("cepas"):
        query_cepas = "INSERT INTO vino_cepa (codigo_vino, id_cepa, porcentaje) VALUES ($1, $2, $3);"
        cepas_params = [(codigo, c["id_cepa"], c["porcentaje"]) for c in datos["cepas"]]
        await conn.executemany(query_cepas, cepas_params)

    if datos.get("maridajes"):
        query_maridajes = "INSERT INTO vino_maridaje (codigo_vino, id_maridaje) VALUES ($1, $2);"
        maridajes_params = [(codigo, m_id) for m_id in datos["maridajes"]]
        await conn.executemany(query_maridajes, maridajes_params)

    return codigo

async def update_vino_completo(conn: asyncpg.Connection, codigo_vino: str, datos: dict) -> bool:
    query_update_vino = """
        UPDATE vino 
        SET nombre = $1, tipo = $2, anada = $3, volumen = $4, graduacion = $5, precio = $6, cuit_bodega = $7
        WHERE codigo_vino = $8;
    """
    status = await conn.execute(
        query_update_vino,
        datos["nombre"], datos["tipo"], datos["anada"],
        datos["volumen_ml"], datos["graduacion"], datos["precio"],
        datos["cuit_bodega"], codigo_vino
    )
    
    if status == "UPDATE 0":
        return False

    await conn.execute("DELETE FROM vino_cepa WHERE codigo_vino = $1;", codigo_vino)
    if datos.get("cepas"):
        query_cepas = "INSERT INTO vino_cepa (codigo_vino, id_cepa, porcentaje) VALUES ($1, $2, $3);"
        cepas_params = [(codigo_vino, c["id_cepa"], c["porcentaje"]) for c in datos["cepas"]]
        await conn.executemany(query_cepas, cepas_params)

    await conn.execute("DELETE FROM vino_maridaje WHERE codigo_vino = $1;", codigo_vino)
    if datos.get("maridajes"):
        query_maridajes = "INSERT INTO vino_maridaje (codigo_vino, id_maridaje) VALUES ($1, $2);"
        maridajes_params = [(codigo_vino, m_id) for m_id in datos["maridajes"]]
        await conn.executemany(query_maridajes, maridajes_params)

    return True

async def delete_vino(pool: asyncpg.Pool, codigo_vino: str) -> bool:
    query = "DELETE FROM vino WHERE codigo_vino = $1;"
    async with pool.acquire() as conn:
        result = await conn.execute(query, codigo_vino)
        return result.endswith("1")