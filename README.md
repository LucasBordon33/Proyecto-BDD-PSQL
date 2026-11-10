# Proyecto BDD - Gestión de Bodega de Vinos

Sistema de gestión para una bodega de vinos con PostgreSQL, FastAPI (backend) y un frontend estático.

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/)
- [Python 3.12+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) (gestor de dependencias)

## 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa los valores reales (`DB_PASSWORD`, `SECRET_KEY`, etc.). Nunca subas este archivo.

## 2. Levantar PostgreSQL

```bash
docker rm -f bdd_db 2>/dev/null || true
docker run -d --name bdd_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bodega \
  -p 5432:5432 \
  postgres:16-alpine

# Esperar a que esté listo
for i in {1..30}; do
  docker exec bdd_db pg_isready -U postgres -d bodega && break
  sleep 2
done
docker exec bdd_db pg_isready -U postgres -d bodega
```

## 3. Crear roles de aplicación (una sola vez)

```bash
set +H
docker run --rm --network host \
  -v "${PWD}/db/security:/flyway/bootstrap:ro" \
  postgres:16-alpine psql "postgresql://postgres:postgres@localhost:5432/bodega?sslmode=disable" \
  -v dbname=bodega \
  -v app_admin_password='Admin!Segura2026' \
  -v app_migrator_password='Migr!Segura2026x' \
  -v app_rw_password='Rw!Segura2026y' \
  -v app_ro_password='Ro!Segura2026z' \
  -f /flyway/bootstrap/bootstrap_seguridad.sql
```

## 4. Aplicar las migraciones

Se aplican directamente con `psql` (11 archivos, en orden):

```bash
for f in \
  001_esquema \
  002_constraints \
  003_funciones \
  004_procedimientos \
  005_triggers \
  006_vistas \
  007_roles \
  008_indices \
  009_auditoria \
  010_roles \
  011_seguridad
do
  echo "=== Aplicando $f ==="
  docker run --rm --network host \
    -v "${PWD}/db/migrations:/flyway/sql:ro" \
    postgres:16-alpine psql "postgresql://postgres:postgres@localhost:5432/bodega?sslmode=disable" \
    -v ON_ERROR_STOP=1 \
    -f "/flyway/sql/${f}.sql"
done
```

## 5. Instalar dependencias y levantar el backend

```bash
source $HOME/.cargo/env 2>/dev/null || true
uv sync --frozen
uv run uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## 6. Levantar el frontend (en otra terminal)

```bash
cd front
python -m http.server 8080
```

## Verificar que funciona

- **Backend:** `http://localhost:8000/salud` → `{"estado":"ok","base_de_datos":"conectada"}`
- **API docs:** `http://localhost:8000/docs`
- **Frontend:** `http://localhost:8080/` → catálogo de vinos

> El catálogo empieza vacío: las migraciones solo crean la estructura. Usa la API o el frontend para insertar vinos, clientes, bodegas, etc.

## Detener y limpiar

```bash
docker stop bdd_db && docker rm bdd_db
docker stop bodega-front 2>/dev/null || true
docker rm bodega-front 2>/dev/null || true
```
