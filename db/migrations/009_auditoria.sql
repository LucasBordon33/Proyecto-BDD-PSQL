/*
CAMPOS DE AUDITORIA
CREATED_AT / UPDATED_AT
*/

ALTER TABLE bodega
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE cliente
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE vino
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE comprobante
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION fn_actualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    NEW.updated_at := now();

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_updated_at_bodega
BEFORE UPDATE
ON bodega
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_updated_at_cliente
BEFORE UPDATE
ON cliente
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_updated_at_vino
BEFORE UPDATE
ON vino
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_updated_at_comprobante
BEFORE UPDATE
ON comprobante
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_updated_at();

/*
INDICES COMPLEMENTARIOS
FK SIN INDICE Y CONSULTAS FRECUENTES
*/

CREATE INDEX idx_vino_bodega ON vino(cuit_bodega);

CREATE INDEX idx_cliente_localidad ON cliente(id_localidad);

CREATE INDEX idx_vino_comprobante_vino ON vino_comprobante(codigo_vino);
