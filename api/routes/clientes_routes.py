from fastapi import APIRouter, Request, Query, status
from api.models.schemas import ClienteCreate, ClienteUpdate, ClienteResponse
from api.services import clientes_service

router = APIRouter(prefix="/v1/api/clientes", tags=["Clientes"])

@router.get("", response_model=list[ClienteResponse])
async def listar_clientes(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    buscar: str | None = None
):
    pool = request.app.state.pool
    return await clientes_service.listar_clientes(pool, limit, offset, buscar)

@router.get("/{id_cliente}", response_model=ClienteResponse)
async def obtener_cliente(request: Request, id_cliente: int):
    pool = request.app.state.pool
    return await clientes_service.obtener_cliente(pool, id_cliente)

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_cliente(request: Request, cliente_in: ClienteCreate):
    pool = request.app.state.pool
    return await clientes_service.crear_cliente(pool, cliente_in)

@router.put("/{id_cliente}")
async def actualizar_cliente(request: Request, id_cliente: int, cliente_in: ClienteUpdate):
    pool = request.app.state.pool
    return await clientes_service.actualizar_cliente(pool, id_cliente, cliente_in)

@router.delete("/{id_cliente}")
async def eliminar_cliente(request: Request, id_cliente: int):
    pool = request.app.state.pool
    return await clientes_service.eliminar_cliente(pool, id_cliente)