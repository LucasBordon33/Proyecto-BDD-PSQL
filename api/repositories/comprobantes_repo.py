import asyncpg
from fastapi import HTTPException 

async def insert_venta_completa(conn: asyncpg.Connection, datos: dict) -> int:
    tipo_cliente = await conn.fetchval(
        "SELECT tipo_cliente FROM cliente WHERE id_cliente = $1", 
        datos["id_cliente"]
    )
    if not tipo_cliente:
        raise HTTPException(status_code=404, detail=f"El cliente con ID {datos['id_cliente']} no existe.")

    query_cabecera = """
        INSERT INTO comprobante (id_cliente, id_sala, fecha, subtotal, descuento, total)
        VALUES ($1, $2, CURRENT_DATE, 0.00, 0.00, 0.00)
        RETURNING numero;
    """
    nro_comprobante = await conn.fetchval(query_cabecera, datos["id_cliente"], datos["id_sala"])

    for renglon in datos["renglones"]:
        precio_bd = await conn.fetchval("SELECT precio FROM vino WHERE codigo_vino = $1", renglon["codigo_vino"])
        
        if precio_bd is None:
            raise HTTPException(status_code=404, detail=f"El vino '{renglon['codigo_vino']}' no fue encontrado en el catálogo.")
            
        precio_unitario = float(precio_bd)
        
        subtotal_linea = (precio_unitario * renglon["cantidad"]) - renglon["descuento"]

        await conn.execute("""
            INSERT INTO vino_comprobante (nro_comprobante, codigo_vino, cantidad, precio_unitario, descuento, subtotal)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, nro_comprobante, renglon["codigo_vino"], renglon["cantidad"], precio_unitario, renglon["descuento"], subtotal_linea)

    subtotal_comprobante = await conn.fetchval("SELECT fn_subtotal_comprobante($1)", nro_comprobante)
    
    descuento_bd = await conn.fetchval("SELECT fn_calcular_descuento($1::tipo_cliente_enum, $2)", tipo_cliente, subtotal_comprobante)
    descuento = float(descuento_bd) if descuento_bd else 0.0

    await conn.execute("""
        UPDATE comprobante 
        SET descuento = $1, total = subtotal - $1 
        WHERE numero = $2
    """, descuento, nro_comprobante)

    return nro_comprobante

async def get_comprobante_detalle(pool: asyncpg.Pool, numero: int) -> dict | None:
    query_cabecera = """
        SELECT numero, fecha, id_cliente, id_sala, subtotal, descuento, total
        FROM comprobante WHERE numero = $1;
    """
    query_renglones = """
        SELECT codigo_vino, cantidad, precio_unitario, descuento, subtotal
        FROM vino_comprobante WHERE nro_comprobante = $1;
    """
    
    async with pool.acquire() as conn:
        cabecera = await conn.fetchrow(query_cabecera, numero)
        if not cabecera:
            return None
            
        renglones = await conn.fetch(query_renglones, numero)
        
        resultado = dict(cabecera)
        resultado["subtotal"] = float(resultado["subtotal"])
        resultado["descuento"] = float(resultado["descuento"])
        resultado["total"] = float(resultado["total"])
        
        resultado_renglones = []
        for r in renglones:
            renglon_dict = dict(r)
            renglon_dict["precio_unitario"] = float(renglon_dict["precio_unitario"])
            renglon_dict["descuento"] = float(renglon_dict["descuento"])
            renglon_dict["subtotal"] = float(renglon_dict["subtotal"])
            resultado_renglones.append(renglon_dict)
            
        resultado["renglones"] = resultado_renglones
        return resultado