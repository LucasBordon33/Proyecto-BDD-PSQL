from fastapi import Request
from fastapi.responses import JSONResponse
import asyncpg

async def postgres_error_handler(request: Request, exc: asyncpg.PostgresError):
    sqlstate = exc.sqlstate
    
    if sqlstate == '23505': 
        return JSONResponse(status_code=409, content={"detail": "Conflicto: El registro ya existe."})
        
    elif sqlstate in ('23503', 'P0001'):
        return JSONResponse(status_code=409, content={"detail": exc.message})
        
    elif sqlstate in ('23514', '23502'):
        return JSONResponse(status_code=422, content={"detail": f"Error de validación de datos: {exc.message}"})
        
    elif sqlstate == '22P02':
        return JSONResponse(status_code=400, content={"detail": "Petición incorrecta."})
        
    elif sqlstate in ('40001', '40P01'):
        return JSONResponse(status_code=503, content={"detail": "Servicio temporalmente no disponible. Intente nuevamente más tarde."})
        
    return JSONResponse(status_code=500, content={"detail": "Error interno de base de datos."})