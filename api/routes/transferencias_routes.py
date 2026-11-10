from fastapi import APIRouter, Request, status
from api.models.schemas import TransferenciaCreate, TransferenciaRenglonCreate
from api.services import transferencias_service

router = APIRouter(prefix="/v1/api/transferencias", tags=["Transferencias"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def iniciar_transferencia(request: Request, transferencia_in: TransferenciaCreate):
    """
    Da de alta la cabecera de la transferencia. El estado inicial será 'en_confeccion'.
    """
    pool = request.app.state.pool
    return await transferencias_service.crear_transferencia(pool, transferencia_in)

@router.post("/{nro}/renglones", status_code=status.HTTP_201_CREATED)
async def cargar_renglon(request: Request, nro: int, renglon_in: TransferenciaRenglonCreate):
    """
    Agrega un renglón de vino a una transferencia, validando previamente que 
    la cabecera siga en estado 'en_confeccion'.
    """
    pool = request.app.state.pool
    return await transferencias_service.agregar_renglon(pool, nro, renglon_in)

@router.post("/{nro}/terminar")
async def terminar_transferencia(request: Request, nro: int):
    """
    Cambia el estado de una transferencia a 'terminado', preparándola para ser procesada.
    """
    pool = request.app.state.pool
    return await transferencias_service.terminar_transferencia(pool, nro)

@router.post("/{nro}/procesar")
async def procesar_transferencia(request: Request, nro: int):
    """
    Invoca el procedimiento almacenado que descuenta stock del depósito e incrementa 
    el stock de la sala, cambiando el estado final a 'procesado'.
    """
    pool = request.app.state.pool
    return await transferencias_service.procesar_transferencia(pool, nro)

@router.get("")
async def obtener_transferencias(request: Request, limit: int = 100, offset: int = 0):
    pool = request.app.state.pool
    return await transferencias_service.listar_transferencias(pool, limit, offset)


@router.get("/{nro}")
async def obtener_transferencia_detalle(request: Request, nro: int):
    """
    Devuelve los detalles de una transferencia específica, incluyendo sus renglones.
    """
    pool = request.app.state.pool
    return await transferencias_service.obtener_transferencia(pool, nro)