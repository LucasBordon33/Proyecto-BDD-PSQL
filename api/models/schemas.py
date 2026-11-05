from pydantic import BaseModel, Field
from datetime import date

""" VINOS """ 

class CepaPorcentaje(BaseModel):
    id_cepa: int
    porcentaje: float = Field(gt=0, le=100)

class VinoBase(BaseModel):
    nombre: str
    tipo: str
    anada: int
    volumen_ml: int
    graduacion: float
    precio: float = Field(gt=0)
    cuit_bodega: str

class VinoCreate(VinoBase):
    codigo_vino: str
    cepas: list[CepaPorcentaje]
    maridajes: list[int] = []

class VinoUpdate(BaseModel):
    nombre: str
    tipo: str
    anada: int
    volumen_ml: int
    graduacion: float
    precio: float = Field(gt=0)
    cuit_bodega: str
    cepas: list[CepaPorcentaje]
    maridajes: list[int] = []

class VinoResponse(VinoBase):
    codigo_vino: str



""" CLIENTES """ 


class ClienteBase(BaseModel):
    nombre_razon_social: str = Field(..., max_length=150)
    tipo_doc: str = Field(..., max_length=10, description="Ej: DNI, CUIT, CUIL")
    nro_doc: str = Field(..., max_length=15)
    direccion: str = Field(..., max_length=200)
    id_localidad: int
    tipo_cliente: str = Field(..., description="Valor exacto del enum: ej. 'distribuidor', 'socio_club', 'exportador'")

class ClienteCreate(ClienteBase):
    fecha_alta: date | None = None
    # Campos polimórficos (opcionales según el tipo_cliente)
    zona_cobertura: str | None = Field(None, max_length=100)
    nro_habilitacion: str | None = Field(None, max_length=50)
    pais_destino: str | None = Field(None, max_length=50)

class ClienteUpdate(BaseModel):
    nombre_razon_social: str | None = Field(None, max_length=150)
    tipo_doc: str | None = Field(None, max_length=10)
    nro_doc: str | None = Field(None, max_length=15)
    direccion: str | None = Field(None, max_length=200)
    id_localidad: int | None = None
    # No permitiremos actualizar el tipo_cliente para evitar inconsistencias estructurales en las tablas
    zona_cobertura: str | None = Field(None, max_length=100)
    nro_habilitacion: str | None = Field(None, max_length=50)
    pais_destino: str | None = Field(None, max_length=50)

class ClienteResponse(ClienteBase):
    id_cliente: int
    fecha_alta: date
    zona_cobertura: str | None = None
    nro_habilitacion: str | None = None
    pais_destino: str | None = None
