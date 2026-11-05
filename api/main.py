from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncpg
from api.core.database import create_db_pool
from api.routes.vinos_routes import router as vinos_router
from api.routes.clientes_routes import router as clientes_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_db_pool()
    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan, title="Bodegas del Atuel API")

# Manejador global para traducir errores SQLSTATE a HTTP
@app.exception_handler(asyncpg.PostgresError)
async def postgres_error_handler(request: Request, exc: asyncpg.PostgresError):
    sqlstate = exc.sqlstate
    if sqlstate == '23505': 
        return JSONResponse(status_code=409, content={"detail": "Conflicto: El registro ya existe."})
    elif sqlstate in ('23503', '23514', '23502'): 
        return JSONResponse(status_code=422, content={"detail": f"Error de validación de datos: {exc.message}"})
    elif sqlstate == 'P0001': # 
        return JSONResponse(status_code=409, content={"detail": exc.message})
    
    return JSONResponse(status_code=500, content={"detail": "Error interno de base de datos."})

# Endpoint de salud requerido
@app.get("/salud")
async def salud(request: Request):
    try:
        async with request.app.state.pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"estado": "ok", "base_de_datos": "conectada"}
    except Exception:
        return JSONResponse(status_code=503, content={"estado": "error", "base_de_datos": "desconectada"})

app.include_router(vinos_router)
app.include_router(clientes_router)
