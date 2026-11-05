import asyncpg

async def get_clientes(pool: asyncpg.Pool, limit: int, offset: int, buscar: str | None = None) -> list[dict]:
    query = """
        SELECT 
            c.id_cliente, c.nombre_razon_social, c.tipo_doc, c.nro_doc, c.direccion, 
            c.id_localidad, c.fecha_alta, c.tipo_cliente::text AS tipo_cliente,
            d.zona_cobertura, d.nro_habilitacion, e.pais_destino
        FROM cliente c
        LEFT JOIN distribuidor d ON c.id_cliente = d.id_cliente
        LEFT JOIN exportador e ON c.id_cliente = e.id_cliente
    """
    args = []
    
    if buscar:
        args.append(f"%{buscar}%")
        query += f" WHERE c.nombre_razon_social ILIKE ${len(args)} OR c.nro_doc ILIKE ${len(args)}"

    args.extend([limit, offset])
    query += f" ORDER BY c.nombre_razon_social LIMIT ${len(args)-1} OFFSET ${len(args)};"

    async with pool.acquire() as conn:
        records = await conn.fetch(query, *args)
        return [dict(record) for record in records]

async def get_cliente_by_id(pool: asyncpg.Pool, id_cliente: int) -> dict | None:
    query = """
        SELECT 
            c.id_cliente, c.nombre_razon_social, c.tipo_doc, c.nro_doc, c.direccion, 
            c.id_localidad, c.fecha_alta, c.tipo_cliente::text AS tipo_cliente,
            d.zona_cobertura, d.nro_habilitacion, e.pais_destino
        FROM cliente c
        LEFT JOIN distribuidor d ON c.id_cliente = d.id_cliente
        LEFT JOIN exportador e ON c.id_cliente = e.id_cliente
        WHERE c.id_cliente = $1;
    """
    async with pool.acquire() as conn:
        record = await conn.fetchrow(query, id_cliente)
        return dict(record) if record else None

async def insert_cliente_completo(conn: asyncpg.Connection, datos: dict) -> dict:
    if datos.get("fecha_alta"):
        query_c = """
            INSERT INTO cliente (nombre_razon_social, tipo_doc, nro_doc, direccion, id_localidad, tipo_cliente, fecha_alta)
            VALUES ($1, $2, $3, $4, $5, $6::tipo_cliente_enum, $7)
            RETURNING id_cliente, fecha_alta;
        """
        args_c = (datos["nombre_razon_social"], datos["tipo_doc"], datos["nro_doc"], datos["direccion"], datos["id_localidad"], datos["tipo_cliente"], datos["fecha_alta"])
    else:
        query_c = """
            INSERT INTO cliente (nombre_razon_social, tipo_doc, nro_doc, direccion, id_localidad, tipo_cliente)
            VALUES ($1, $2, $3, $4, $5, $6::tipo_cliente_enum)
            RETURNING id_cliente, fecha_alta;
        """
        args_c = (datos["nombre_razon_social"], datos["tipo_doc"], datos["nro_doc"], datos["direccion"], datos["id_localidad"], datos["tipo_cliente"])

    record = await conn.fetchrow(query_c, *args_c)
    id_cliente = record["id_cliente"]

    # 2. Insertar en la tabla hija correspondiente
    tipo = str(datos["tipo_cliente"]).lower()
    
    if tipo == "distribuidor":
        query_d = "INSERT INTO distribuidor (id_cliente, zona_cobertura, nro_habilitacion) VALUES ($1, $2, $3);"
        await conn.execute(query_d, id_cliente, datos["zona_cobertura"], datos["nro_habilitacion"])
    elif tipo == "exportador":
        query_e = "INSERT INTO exportador (id_cliente, pais_destino) VALUES ($1, $2);"
        await conn.execute(query_e, id_cliente, datos["pais_destino"])
    elif tipo == "socio_club":
        query_s = "INSERT INTO socio_club (id_cliente) VALUES ($1);"
        await conn.execute(query_s, id_cliente)

    return {"id_cliente": id_cliente, "fecha_alta": record["fecha_alta"]}

async def update_cliente_completo(conn: asyncpg.Connection, id_cliente: int, datos: dict, tipo_actual: str) -> bool:
    fields_c = []
    args_c = []
    campos_padre = ["nombre_razon_social", "tipo_doc", "nro_doc", "direccion", "id_localidad"]
    
    for key in campos_padre:
        if key in datos and datos[key] is not None:
            args_c.append(datos[key])
            fields_c.append(f"{key} = ${len(args_c)}")

    if fields_c:
        args_c.append(id_cliente)
        query_c = f"UPDATE cliente SET {', '.join(fields_c)} WHERE id_cliente = ${len(args_c)};"
        status = await conn.execute(query_c, *args_c)
        if status == "UPDATE 0":
            return False

    tipo = tipo_actual.lower()
    if tipo == "distribuidor" and ("zona_cobertura" in datos or "nro_habilitacion" in datos):
        await conn.execute(
            "UPDATE distribuidor SET zona_cobertura = COALESCE($1, zona_cobertura), nro_habilitacion = COALESCE($2, nro_habilitacion) WHERE id_cliente = $3;",
            datos.get("zona_cobertura"), datos.get("nro_habilitacion"), id_cliente
        )
    elif tipo == "exportador" and "pais_destino" in datos:
        await conn.execute(
            "UPDATE exportador SET pais_destino = COALESCE($1, pais_destino) WHERE id_cliente = $2;",
            datos.get("pais_destino"), id_cliente
        )

    return True

async def delete_cliente(pool: asyncpg.Pool, id_cliente: int) -> bool:
    query = "DELETE FROM cliente WHERE id_cliente = $1;"
    async with pool.acquire() as conn:
        result = await conn.execute(query, id_cliente)
        return result.endswith("1")