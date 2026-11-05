from fastapi import APIRouter, Request, Query, status
from api.models.schemas import VinoCreate, VinoUpdate
from api.services import vinos_service

router = APIRouter(prefix="/v1/api/vinos", tags=["Vinos"])

@router.get("")
async def catalogo_vinos(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tipo: str | None = None,
    cepa: str | None = None,
    bodega: str | None = None,
    anada: int | None = None
):
    pool = request.app.state.pool
    return await vinos_service.obtener_catalogo(pool, limit, offset, tipo, cepa, bodega, anada)

@router.get("/{cod}")
async def detalle_vino(request: Request, cod: str):
    pool = request.app.state.pool
    return await vinos_service.obtener_detalle_vino(pool, cod)

@router.post("", status_code=status.HTTP_201_CREATED)
async def alta_vino(request: Request, vino_in: VinoCreate):
    pool = request.app.state.pool
    return await vinos_service.crear_vino(pool, vino_in)

@router.put("/{cod}")
async def modificar_vino(request: Request, cod: str, vino_in: VinoUpdate):
    pool = request.app.state.pool
    return await vinos_service.modificar_vino(pool, cod, vino_in)

@router.delete("/{cod}")
async def borrar_vino(request: Request, cod: str):
    pool = request.app.state.pool
    return await vinos_service.eliminar_vino(pool, cod)