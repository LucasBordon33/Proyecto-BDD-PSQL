import uuid
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


# Genera un nro_doc único por corrida (12 caracteres, dentro del límite
# de VARCHAR(15)) para que los tests no choquen con datos sembrados ni
# entre corridas sucesivas de pytest.
def _nro_doc_unico() -> str:
    return uuid.uuid4().hex[:12]


# Payload válido de un cliente 'socio' (id_localidad=1 existe en los
# catálogos sembrados). Devuelve un dict NUEVO en cada llamada con un
# nro_doc único; cada test modifica únicamente el campo que necesita
# forzar el error, tal como pide la consigna.
def payload_base() -> dict:
    return {
        "nombre_razon_social": "Distribuidora San Rafael",
        "tipo_doc": "CUIT",
        "nro_doc": _nro_doc_unico(),
        "direccion": "Avenida San Martin 123",
        "id_localidad": 1,
        "tipo_cliente": "socio",
    }


def test_error_documento_duplicado_devuelve_409():
    # crea el pool de BD
    with TestClient(app) as client:

    # Preparamos un payload con un transportista o entidad que ya existe la BD
        payload = {
            "nombre_razon_social": "Distribuidora San Rafael",
            "tipo_doc": "CUIT",
            "nro_doc": "30-12345678-9",
            "direccion": "Avenida San Martin 123",
            "id_localidad": 1,
            "tipo_cliente": 'socio'
        } 

        # Insertamos el registro por primera vez 
        client.post("/v1/api/clientes", json=payload)
        
        # Intentamos insertar exactamente el mismo registro de nuevo
        response = client.post("/v1/api/clientes", json=payload)

        # Imprimimos el mensaje de error real que envía la API
        print("\nMOTIVO DEL RECHAZO:", response.json())
        
        # Validamos que exceptions.py hizo su trabajoz  
        assert response.status_code == 409
        assert response.json()["detail"] == "Conflicto: El registro ya existe."



# Violación de Clave Foránea -> 400
# id_localidad=9999 no existe en la tabla localidad: PostgreSQL rechaza
# el INSERT con SQLSTATE 23503 y el handler global lo traduce a 400,
# porque remitir una referencia inexistente es un error del solicitante.
def test_error_clave_foranea_localidad_inexistente_devuelve_400():
    # El 'with' ejecuta el lifespan de la app: crea y cierra el pool de BD
    with TestClient(app) as client:
        # Payload base válido, modificando SOLO la clave foránea
        payload = payload_base()
        payload["id_localidad"] = 9999  # no existe (sembradas: 1..10)

        # El INSERT llega a la BD y revienta en la restricción FK
        response = client.post("/v1/api/clientes", json=payload)

        print("\nMOTIVO DEL RECHAZO:", response.json())

        # La BD rechazó el insert y exceptions.py devolvió 400
        assert response.status_code == 400
        assert response.json()["detail"] == "Petición incorrecta: la referencia indicada no existe."


# Violación de ENUM -> 400
# 'cliente_falso' no pertenece a tipo_cliente_enum. Pydantic declara
# tipo_cliente como str libre, así que el INSERT llega a la BD y el cast
# $6::tipo_cliente_enum del repositorio falla con SQLSTATE 22P02,
# que el handler traduce a 400.
def test_error_enum_invalido_devuelve_400():
    with TestClient(app) as client:
        payload = payload_base()
        payload["tipo_cliente"] = "cliente_falso"  # valor fuera del enum

        response = client.post("/v1/api/clientes", json=payload)

        print("\nMOTIVO DEL RECHAZO:", response.json())

        # El cast al enum falló en la BD -> 400 "Petición incorrecta."
        assert response.status_code == 400
        assert response.json()["detail"] == "Petición incorrecta."


# Falta de campo obligatorio -> 422
# 'nro_doc' es requerido en ClienteCreate. FastAPI/Pydantic detecta el
# faltante al validar el body y responde 422 ANTES de tocar la BD (el
# INSERT ni siquiera se intenta). El detalle debe señalar el campo.
def test_error_campo_obligatorio_ausente_devuelve_422():
    with TestClient(app) as client:
        payload = payload_base()
        del payload["nro_doc"]  # omitimos el campo requerido

        response = client.post("/v1/api/clientes", json=payload)

        print("\nMOTIVO DEL RECHAZO:", response.json())

        # FastAPI responde 422 con la lista de errores de Pydantic
        assert response.status_code == 422
        errores = response.json()["detail"]
        # Cada error trae 'loc' con la ruta del campo, ej: ["body", "nro_doc"]
        assert any(err["loc"][-1] == "nro_doc" for err in errores)


# Violación de UNIQUE distinta al documento -> 409
# La tabla 'cliente' no tiene campos email/codigo; las otras restricciones
# UNIQUE alcanzables por esta API son transportista.cuit y
# distribuidor.nro_habilitacion. Aquí duplicamos nro_habilitacion:
# el primer POST crea el distribuidor (201) y el segundo — con OTRO
# nro_doc para no caer en el UNIQUE del documento — revienta en
# distribuidor.nro_habilitacion (SQLSTATE 23505 -> 409).
def test_error_unico_nro_habilitacion_duplicado_devuelve_409():
    with TestClient(app) as client:
        habilitacion_unica = f"HAB-{uuid.uuid4().hex[:10]}"

        # 1er insert válido: distribuidor con habilitación nueva
        payload = payload_base()
        payload["tipo_cliente"] = "distribuidor"  # requiere zona + habilitación
        payload["zona_cobertura"] = "Zona Sur"
        payload["nro_habilitacion"] = habilitacion_unica
        primera = client.post("/v1/api/clientes", json=payload)
        # El alta inicial DEBE ser 201; si no lo es, fallamos acá para ver el
        # problema real en vez de enmascararlo en el segundo POST
        assert primera.status_code == 201, primera.text

        # 2do insert: mismo nro_habilitacion, pero distinto nro_doc
        duplicado = {**payload, "nro_doc": _nro_doc_unico()}
        response = client.post("/v1/api/clientes", json=duplicado)

        print("\nMOTIVO DEL RECHAZO:", response.json())

        # La BD rechazó por el UNIQUE de la habilitación -> 409
        assert response.status_code == 409
        assert response.json()["detail"] == "Conflicto: El registro ya existe."


# Violación de longitud de campo -> 422
# nombre_razon_social tiene max_length=150 en Pydantic (y VARCHAR(150)
# en la BD). Con 200 caracteres, Pydantic rechaza con 422 antes de
# llegar a la BD; si ese límite se quitara, la BD también lo rechazaría,
# pero el contrato HTTP de validación de entrada es 422.
def test_error_longitud_excedida_devuelve_422():
    with TestClient(app) as client:
        payload = payload_base()
        payload["nombre_razon_social"] = "X" * 200  # 200 > 150 permitidos

        response = client.post("/v1/api/clientes", json=payload)

        print("\nMOTIVO DEL RECHAZO:", response.json())

        assert response.status_code == 422
        errores = response.json()["detail"]
        assert any(err["loc"][-1] == "nombre_razon_social" for err in errores)


# Violación de tipo de dato -> 422
# id_localidad se declara como int. Enviamos el string "texto": Pydantic
# no puede coercionarlo (ojo: "123" SÍ se coercionaría a 123) y responde
# 422 sin tocar la BD. Aunque llegara, asyncpg también lo rechazaría.
def test_error_tipo_dato_invalido_devuelve_422():
    with TestClient(app) as client:
        payload = payload_base()
        payload["id_localidad"] = "texto"  # int esperado

        response = client.post("/v1/api/clientes", json=payload)

        print("\nMOTIVO DEL RECHAZO:", response.json())

        assert response.status_code == 422
        errores = response.json()["detail"]
        assert any(err["loc"][-1] == "id_localidad" for err in errores)


# Inyección SQL neutralizada (documentación de la defensa)
# Los repositorios SIEMPRE usan consultas parametrizadas ($1, $2, ...)
# de asyncpg: el texto del payload viaja como DATO y jamás se concatena
# al SQL, por lo que el motor no puede interpretarlo como un comando.
# Evidencia que este test valida:
# a) El INSERT con la cadena maliciosa responde 201 (se aceptó como
# un nombre más, sin ejecutar nada).
# b) Un GET posterior sobre 'cliente' responde 200: la tabla SIGUE
# existiendo (un DROP TABLE ejecutado habría dejado la relación
# inexistente y este GET devolvería 500).
# c) El nombre guardado es EXACTAMENTE el texto enviado, sin alterar.
def test_inyeccion_sql_neutralizada_por_parametrizacion():
    with TestClient(app) as client:
        # Clásico "Bobby Tables": intento de cerrar el INSERT y colgar un DROP
        inyeccion = "Robert'); DROP TABLE cliente; --"

        payload = payload_base()
        payload["nombre_razon_social"] = inyeccion

        # (a) El INSERT parametrizado guarda la cadena como texto literal
        alta = client.post("/v1/api/clientes", json=payload)
        print("\nRESPUESTA DEL INSERT:", alta.json())
        assert alta.status_code == 201

        # (b) La tabla 'cliente' sigue viva: consultamos con el propio texto
        #     malicioso como filtro de búsqueda
        lectura = client.get("/v1/api/clientes", params={"buscar": "DROP TABLE"})
        assert lectura.status_code == 200

        # (c) El registro existe con el nombre EXACTO que enviamos
        nombres = [c["nombre_razon_social"] for c in lectura.json()]
        assert inyeccion in nombres
