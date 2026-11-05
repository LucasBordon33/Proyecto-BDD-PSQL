from fastapi import APIRouter, Request, status
from api.models.schemas import ComprobanteCreate, ComprobanteResponse
from api.services import comprobantes_service

router = APIRouter(prefix="/v1/api/comprobantes", tags=["Comprobantes (Ventas)"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def registrar_venta(request: Request, comprobante_in: ComprobanteCreate):
    pool = request.app.state.pool
    return await comprobantes_service.crear_comprobante(pool, comprobante_in)

@router.get("/{nro}", response_model=ComprobanteResponse)
async def detalle_venta(request: Request, nro: int):
    pool = request.app.state.pool
    return await comprobantes_service.obtener_comprobante(pool, nro)