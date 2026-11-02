CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_comprobante_fecha_sala ON comprobante(fecha, id_sala);

CREATE INDEX idx_comprobante_cliente ON comprobante(id_cliente);

CREATE INDEX idx_cliente_nombre_trgm 
ON cliente USING GIN (nombre_razon_social gin_trgm_ops);

CREATE INDEX idx_analisis_covering 
ON analisis_calidad(g_brix DESC) INCLUDE (nro_lote, ph);

CREATE INDEX idx_stock_sala_sala ON stock_sala(id_sala);

CREATE INDEX idx_cliente_tipo ON cliente(tipo_cliente);

CREATE INDEX idx_lote_campana ON lote_uva(campana);

CREATE INDEX idx_lote_finca ON lote_uva(id_finca);

CREATE INDEX idx_analisis_lote ON analisis_calidad(nro_lote);

CREATE INDEX idx_stock_sala_vino ON stock_sala(codigo_vino);