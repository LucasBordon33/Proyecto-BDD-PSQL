/*
VISTA 1
STOCK POR SALA DE VENTA
*/

CREATE OR REPLACE VIEW vw_stock_sala AS
SELECT
    ss.id_sala,
    v.codigo_vino,
    v.nombre AS vino,
    v.tipo,
    ss.cantidad
FROM stock_sala ss
INNER JOIN vino v
    ON v.codigo_vino = ss.codigo_vino;


/*
VISTA 2
RESUMEN DE COMPROBANTES
*/

CREATE OR REPLACE VIEW vw_comprobantes AS
SELECT
    c.numero,
    c.fecha,
    cl.nombre_razon_social AS cliente,
    c.id_sala,
    c.subtotal,
    c.descuento,
    c.total
FROM comprobante c
INNER JOIN cliente cl
    ON cl.id_cliente = c.id_cliente;


/*
VISTA 3
CATÁLOGO DE VINOS
*/

CREATE OR REPLACE VIEW vw_catalogo_vinos AS
SELECT
    v.codigo_vino,
    v.nombre,
    v.tipo,
    v.anada,
    v.volumen,
    v.graduacion,
    v.precio,
    b.razon_social AS bodega
FROM vino v
INNER JOIN bodega b
    ON b.cuit = v.cuit_bodega;


/*
VISTA 4
COMPOSICIÓN DE VINOS
*/

CREATE OR REPLACE VIEW vw_composicion_vinos AS
SELECT
    v.codigo_vino,
    v.nombre AS vino,
    c.nombre AS cepa,
    vc.porcentaje
FROM vino v
INNER JOIN vino_cepa vc
    ON vc.codigo_vino = v.codigo_vino
INNER JOIN cepa c
    ON c.id_cepa = vc.id_cepa;


/*
VISTA 5
ANÁLISIS DE LOTES
*/

CREATE OR REPLACE VIEW vw_analisis_lotes AS
SELECT
    l.nro_lote,
    l.campana,
    l.fecha_cosecha,
    a.fecha AS fecha_analisis,
    a.ph,
    a.acidez_total,
    a.g_brix
FROM lote_uva l
LEFT JOIN analisis_calidad a
    ON a.nro_lote = l.nro_lote;


-- Vista correspondiente a actividad S9 

CREATE OR REPLACE VIEW vw_ficha_vino AS
SELECT 
    v.codigo_vino,
    v.nombre AS vino_nombre,
    v.volumen,
    v.graduacion,
    b.razon_social AS bodega,
    STRING_AGG(DISTINCT c.nombre || ' (' || vc.porcentaje || '%)', ', ') AS cepas_y_porcentajes,
    STRING_AGG(DISTINCT m.nombre, ', ') AS maridajes,
    COALESCE(sd.cantidad, 0) + COALESCE(ss_total.suma_salas, 0) AS stock_total
FROM vino v
JOIN bodega b ON v.cuit_bodega = b.cuit
LEFT JOIN vino_cepa vc ON v.codigo_vino = vc.codigo_vino
LEFT JOIN cepa c ON vc.id_cepa = c.id_cepa
LEFT JOIN vino_maridaje vm ON v.codigo_vino = vm.codigo_vino
LEFT JOIN maridaje m ON vm.id_maridaje = m.id_maridaje
LEFT JOIN stock_deposito sd ON v.codigo_vino = sd.codigo_vino
LEFT JOIN (
    SELECT codigo_vino, SUM(cantidad) AS suma_salas
    FROM stock_sala
    GROUP BY codigo_vino
) ss_total ON v.codigo_vino = ss_total.codigo_vino
GROUP BY v.codigo_vino, v.nombre, v.volumen, v.graduacion, b.razon_social, sd.cantidad, ss_total.suma_salas;