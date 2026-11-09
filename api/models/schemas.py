from pydantic import BaseModel, Field
from datetime import date
from typing import Any

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

class VinoDetalleResponse(VinoResponse):
    composicion: list[Any] = []
    maridajes: list[Any] = []
""" CLIENTES """ 


class ClienteBase(BaseModel):
    nombre_razon_social: str = Field(..., max_length=150)
    tipo_doc: str = Field(..., max_length=10, description="Ej: DNI, CUIT, CUIL")
    nro_doc: str = Field(..., max_length=15)
    direccion: str = Field(..., max_length=200)
    id_localidad: int
    tipo_cliente: str = Field(..., description="Valor exacto del enum: ej. 'distribuidor', 'socio', 'exportador'")

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


""" COMPROBANTES (VENTAS) """ 


class RenglonComprobanteCreate(BaseModel):
    codigo_vino: str = Field(..., max_length=30)
    cantidad: int = Field(..., gt=0)
    descuento: float = Field(0.00, ge=0)

class ComprobanteCreate(BaseModel):
    id_cliente: int
    id_sala: int
    renglones: list[RenglonComprobanteCreate] = Field(..., min_length=1)

class RenglonComprobanteResponse(BaseModel):
    codigo_vino: str
    cantidad: int
    precio_unitario: float
    descuento: float
    subtotal: float

class ComprobanteResponse(BaseModel):
    numero: int
    fecha: date
    id_cliente: int
    id_sala: int
    subtotal: float
    descuento: float
    total: float
    renglones: list[RenglonComprobanteResponse]


""" TRANSFERENCIAS """

class TransferenciaCreate(BaseModel):
    id_sala: int

class TransferenciaResponse(BaseModel):
    nro_transferencia: int
    id_sala: int
    fecha_confeccion: date
    estado: str

class TransferenciaRenglonCreate(BaseModel):
    codigo_vino: str = Field(..., max_length=30)
    cantidad: int = Field(..., gt=0)

""" INGRESOS """ 

class IngresoCreate(BaseModel):
    cod_transportista: str = Field(..., max_length=30)
    cuit_bodega: str = Field(..., min_length=11, max_length=11, description="CUIT de la bodega sin guiones (11 dígitos)")

class IngresoRenglonCreate(BaseModel):
    codigo_vino: str = Field(..., max_length=30)
    cantidad: int = Field(..., gt=0)

class IngresoResponse(BaseModel):
    codigo: int
    fecha: date
    estado: str
    cod_transportista: str
    cuit_bodega: str