from fastapi import APIRouter, Request, Query
from api.services import reportes_service

router = APIRouter(prefix="/reportes", tags=["Reportes"])

@router.get("/top-vinos", summary="Top 10 vinos más vendidos (S1)")
async def endpoint_top_vinos(request: Request):
    """
    Obtiene un ranking de los 10 vinos con mayor cantidad de botellas vendidas
    en toda la red de salas de la bodega (consulta S1 de la sección 8).
    """
    # Extraemos el pool de conexiones del estado de la aplicación
    pool = request.app.state.pool
    return await reportes_service.obtener_top_vinos(pool)

@router.get("/ventas-por-sala", summary="Monto total de ventas por sala en el último trimestre (S8)")
async def endpoint_ventas_por_sala(request: Request):
    """
    Lista cada sala de venta con el monto total facturado en los últimos 3 meses,
    ordenado de mayor a menor (consulta S8 de la sección 8).
    """
    pool = request.app.state.pool
    return await reportes_service.obtener_ventas_por_sala(pool)

@router.get("/vinos-sin-stock", summary="Vinos sin stock en una sala con stock en depósito central (S6)")
async def endpoint_vinos_sin_stock(
    request: Request,
    id_sala: int = Query(3, ge=1, description="Sala de venta a evaluar (por defecto 3, como en la consulta S6)")
):
    """
    Lista los vinos que no tienen stock disponible en la sala indicada pero que
    sí cuentan con stock en el depósito central (consulta S6 de la sección 8).
    """
    pool = request.app.state.pool
    return await reportes_service.obtener_vinos_sin_stock(pool, id_sala)

@router.get("/transportista-activo", summary="Empresa de transporte con mayor actividad en el último mes (S7)")
async def endpoint_transportista_activo(request: Request):
    """
    Devuelve la empresa de transporte con mayor cantidad de viajes (ingresos trasladados)
    registrados en el último mes (consulta S7 de la sección 8).
    """
    pool = request.app.state.pool
    return await reportes_service.obtener_transportista_activo(pool)

@router.get("/trazabilidad/{cod}", summary="Ficha de trazabilidad de un vino (S9)")
async def endpoint_trazabilidad_vino(request: Request, cod: str):
    """
    Devuelve la ficha completa de trazabilidad de un vino: cepas con sus porcentajes,
    bodega elaboradora, maridajes y stock total (depósito central más salas),
    mediante la vista vw_ficha_vino (consulta S9 de la sección 8).
    """
    pool = request.app.state.pool
    return await reportes_service.obtener_trazabilidad_vino(pool, cod)

# Alias de compatibilidad: misma consulta S1 que /top-vinos
@router.get("/ranking-vinos", summary="Top 10 vinos más vendidos (alias de /top-vinos)")
async def endpoint_ranking_vinos(request: Request):
    """
    Obtiene un ranking de los 10 vinos con mayor cantidad de botellas vendidas
    en toda la red de salas de la bodega.
    """
    pool = request.app.state.pool
    return await reportes_service.obtener_ranking_vinos(pool)
