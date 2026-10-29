/*
TESTS DE REGLAS DE NEGOCIO RN-01 A RN-15
*/

/* RN-01 */
SELECT precio
FROM vino
WHERE precio > 0;

/* RN-02 */
SELECT id_sala, id_localidad
FROM sala_venta;

/* RN-03 */
SELECT cuit, id_sala
FROM empleado;

/* RN-04 */
SELECT id_finca, nro_parcela, campana
FROM lote_uva;

/* RN-05 */
SELECT codigo_vino,
       SUM(porcentaje) AS total_porcentaje
FROM vino_cepa
GROUP BY codigo_vino;

/* RN-06 */
SELECT id_cliente, tipo_cliente
FROM cliente;

/* RN-07 */
SELECT id_permiso,
       fecha_emision,
       fecha_vencimiento
FROM permiso_exportacion;

/* RN-08 */
SELECT numero,
       subtotal,
       descuento,
       total
FROM comprobante;

/* RN-09 */
SELECT *
FROM stock_sala
WHERE cantidad >= 0;

/* RN-10 */
SELECT codigo,
       estado
FROM ingreso;

/* RN-11 */
SELECT nro_transferencia,
       fecha_confeccion,
       estado
FROM transferencia;

/* RN-12 */
SELECT *
FROM transferencia_vino;

/* RN-13 */
UPDATE vino
SET precio = precio + 100
WHERE codigo_vino = (
    SELECT codigo_vino
    FROM vino
    LIMIT 1
);

SELECT *
FROM auditoria_precio;

/* RN-14 */
SELECT *
FROM ingreso;

SELECT *
FROM transferencia;

/* RN-15 */
SELECT *
FROM vino
WHERE graduacion BETWEEN 5 AND 20;