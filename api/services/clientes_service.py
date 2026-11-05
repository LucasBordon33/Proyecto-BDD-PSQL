import asyncpg
from fastapi import HTTPException
from api.models.schemas import ClienteCreate, ClienteUpdate
from api.repositories import clientes_repo

def _validar_subtipo(datos: dict, tipo: str):
    tipo = str(tipo).lower()
    if tipo == "distribuidor":
        if not datos.get("zona_cobertura") or not datos.get("nro_habilitacion"):
            raise HTTPException(status_code=400, detail="Un Distribuidor requiere 'zona_cobertura' y 'nro_habilitacion'.")
    elif tipo == "exportador":
        if not datos.get("pais_destino"):
            raise HTTPException(status_code=400, detail="Un Exportador requiere 'pais_destino'.")

async def listar_clientes(pool: asyncpg.Pool, limit: int, offset: int, buscar: str | None = None) -> list[dict]:
    return await clientes_repo.get_clientes(pool, limit, offset, buscar)

async def obtener_cliente(pool: asyncpg.Pool, id_cliente: int) -> dict:
    cliente = await clientes_repo.get_cliente_by_id(pool, id_cliente)
    if not cliente:
        raise HTTPException(status_code=404, detail=f"No se encontró el cliente con ID {id_cliente}.")
    return cliente

async def crear_cliente(pool: asyncpg.Pool, cliente_in: ClienteCreate) -> dict:
    datos = cliente_in.model_dump()
    _validar_subtipo(datos, datos["tipo_cliente"])
    
    async with pool.acquire() as conn:
        async with conn.transaction():
            resultado = await clientes_repo.insert_cliente_completo(conn, datos)
            
    return {
        "mensaje": "Cliente creado exitosamente.", 
        "id_cliente": resultado["id_cliente"],
        "fecha_alta": resultado["fecha_alta"]
    }

async def actualizar_cliente(pool: asyncpg.Pool, id_cliente: int, cliente_in: ClienteUpdate) -> dict:
    datos = cliente_in.model_dump(exclude_unset=True)
    if not datos:
        raise HTTPException(status_code=400, detail="No se enviaron campos para actualizar.")
        
    cliente_actual = await clientes_repo.get_cliente_by_id(pool, id_cliente)
    if not cliente_actual:
        raise HTTPException(status_code=404, detail=f"No se encontró el cliente con ID {id_cliente}.")

    async with pool.acquire() as conn:
        async with conn.transaction():
            await clientes_repo.update_cliente_completo(conn, id_cliente, datos, cliente_actual["tipo_cliente"])
        
    return {"mensaje": f"Cliente con ID {id_cliente} actualizado exitosamente."}

async def eliminar_cliente(pool: asyncpg.Pool, id_cliente: int) -> dict:
    fue_borrado = await clientes_repo.delete_cliente(pool, id_cliente)
    if not fue_borrado:
        raise HTTPException(status_code=404, detail=f"No se encontró el cliente con ID {id_cliente} para eliminar.")
        
    return {"mensaje": f"Cliente con ID {id_cliente} eliminado exitosamente y sus registros asociados fueron purgados."}