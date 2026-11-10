from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from api.services import salas_service

router = APIRouter(prefix="/v1/api/salas", tags=["Salas"])

@router.get("") 
async def obtener_salas(request: Request):
    try:
        pool = request.app.state.pool
        salas = await salas_service.get_salas(pool)
        return salas
    except Exception as e:
        print(f"ERROR EN SALAS: {e}")
        return JSONResponse(status_code=500, content={"detail": f"Fallo interno: {str(e)}"})