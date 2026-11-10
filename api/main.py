from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from contextlib import asynccontextmanager
from starlette.middleware.base import BaseHTTPMiddleware
from api.core.exceptions import postgres_error_handler
from api.core.database import create_db_pool
import asyncpg
from api.routes.vinos_routes import router as vinos_router
from api.routes.clientes_routes import router as clientes_router
from api.routes.comprobantes_routes import router as comprobantes_router
from api.routes.transferencias_routes import router as transferencias_router
from api.routes.ingresos_routes import router as ingresos_router
from api.routes.reportes import router as reportes_router
from api.routes.salas_routes import router as salas_router
from api.routes.reportes import router as reportes
from fastapi.middleware.cors import CORSMiddleware
from api.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Aplica cabeceras de seguridad en cada respuesta."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # HSTS: forzar HTTPS en navegadores (solo en producción)
        if settings.is_production():
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Evitar MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Política de remitente
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy básica
        csp = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self' " + settings.api_base_url.replace("https://", "").replace("http://", "") + "; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp

        # Permisos de características (Permissions Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
        )

        return response


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Redirige HTTP → HTTPS cuando la app está detrás de un proxy en producción."""

    async def dispatch(self, request: Request, call_next):
        if settings.is_production():
            forwarded_proto = request.headers.get("x-forwarded-proto")
            if forwarded_proto == "http":
                url = request.url.replace(scheme="https")
                return RedirectResponse(url, status_code=308)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_db_pool()
    yield
    await app.state.pool.close()


app = FastAPI(
    lifespan=lifespan,
    title="Bodegas del Atuel API",
    docs_url="/docs" if not settings.is_production() else None,
    redoc_url=None if settings.is_production() else "/redoc",
)

# Middleware de seguridad (cabeceras) — se aplica a todas las respuestas
app.add_middleware(SecurityHeadersMiddleware)

# Redirección HTTP → HTTPS en producción (detectado por proxy)
app.add_middleware(HTTPSRedirectMiddleware)

# CORS configurado por variable de entorno
origenes_permitidos = settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
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
app.include_router(salas_router)
app.include_router(reportes)
