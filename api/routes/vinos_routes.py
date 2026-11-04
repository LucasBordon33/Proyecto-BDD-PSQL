from fastapi import APIRouter, Request, Query
from typing import Optional
from api.services import vinos_service

router = APIRouter(prefix="/vinos", tags=["Vinos"])

@router.get("")
async def catalogo_vinos(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tipo: Optional[str] = None,
    cepa: Optional[str] = None,
    bodega: Optional[str] = None,
    anada: Optional[int] = None
):
    pool = request.app.state.pool
    return await vinos_service.obtener_catalogo(
        pool, limit, offset, tipo, cepa, bodega, anada
    )

@router.get("/{cod}")
async def detalle_vino(request: Request, cod: str):
    pool = request.app.state.pool
    return await vinos_service.obtener_detalle_vino(pool, cod)

@router.delete("/{cod}")
async def borrar_vino(request: Request, cod: str):
    pass

@router.post("")
async def cargar_vino(request: Request):
    pass

@router.put("/{cod}")
async def modificar_vino(request: Request):
    pass