from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from api.core.exceptions import postgres_error_handler 
from api.core.database import create_db_pool
import asyncpg
from api.routes.vinos_routes import router as vinos_router
from api.routes.clientes_routes import router as clientes_router
from api.routes.comprobantes_routes import router as comprobantes_router
from api.routes.transferencias_routes import router as transferencias_router
from api.routes.ingresos_routes import router as ingresos_router
from api.routes.reportes import router as reportes_router
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_db_pool()
    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan, title="Bodegas del Atuel API")

# Permitir que el frontend (puerto 8080) se comunique con la API
origenes_permitidos = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["*"], # Permite GET, POST, PUT, DELETE, etc.
    allow_headers=["*"], # Permite cualquier encabezado
)

@app.get("/", include_in_schema=False)
async def raiz():
    return RedirectResponse(url="/docs")

# Vincular el manejador global de errores de PostgreSQL
app.add_exception_handler(asyncpg.PostgresError, postgres_error_handler)

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
app.include_router(comprobantes_router)
app.include_router(transferencias_router)
app.include_router(ingresos_router)
app.include_router(reportes_router)