from fastapi import APIRouter, Request, status
from api.models.schemas import IngresoCreate, IngresoRenglonCreate
from api.services import ingresos_service

router = APIRouter(prefix="/v1/api/ingresos", tags=["Ingresos (Depósito)"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def iniciar_ingreso(request: Request, ingreso_in: IngresoCreate):
    """
    Da de alta la cabecera del ingreso. El estado inicial será 'en_confeccion'.
    """
    pool = request.app.state.pool
    return await ingresos_service.crear_ingreso(pool, ingreso_in)

@router.post("/{cod}/renglones", status_code=status.HTTP_201_CREATED)
async def cargar_renglon(request: Request, cod: int, renglon_in: IngresoRenglonCreate):
    """
    Agrega un renglón de vino a un ingreso mientras esté en estado 'en_confeccion'.
    """
    pool = request.app.state.pool
    return await ingresos_service.agregar_renglon_ingreso(pool, cod, renglon_in)

@router.post("/{cod}/terminar")
async def terminar_ingreso(request: Request, cod: int):
    """
    Cambia el estado del ingreso a 'terminado', cumpliendo el requisito para poder procesarlo.
    """
    pool = request.app.state.pool
    return await ingresos_service.terminar_ingreso(pool, cod)

@router.post("/{cod}/procesar")
async def procesar_ingreso(request: Request, cod: int):
    """
    Invoca el procedimiento almacenado 'procesar_ingreso' para impactar el stock en depósito.
    """
    pool = request.app.state.pool
    return await ingresos_service.procesar_ingreso(pool, cod)