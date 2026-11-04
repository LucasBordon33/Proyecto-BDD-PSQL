from pydantic import BaseModel

class VinoBase(BaseModel):
    nombre: str
    tipo: str
    anada: int
    volumen_ml: int
    graduacion: float
    precio: float
    cuit_bodega: str

class VinoResponse(VinoBase):
    codigo_vino: str