-- S1, Ranking de los 10 vinos con mayor cantidad de botellas vendidas en toda la red de salas.
-- La estrategia fue unir la tabla vino con su detalle de ventas (vino_comprobante), agrupar por cada vino y sumar las cantidades, ordenando de forma descendente para obtener el top 10.
SELECT v.codigo_vino, v.nombre, SUM(vc.cantidad) AS total_vendido
FROM vino v
JOIN vino_comprobante vc ON v.codigo_vino = vc.codigo_vino
GROUP BY v.codigo_vino, v.nombre
ORDER BY total_vendido DESC
LIMIT 10;

-- S2, Listar códigos y nombres de los vinos que se vendieron en todas las salas (división relacional).
-- La estrategia fue aplicar la división relacional mediante NOT EXISTS doble: buscamos aquellos vinos para los cuales NO exista NINGUNA sala de venta que NO tenga al menos un comprobante de venta de ese vino.
SELECT v.codigo_vino, v.nombre
FROM vino v
WHERE NOT EXISTS (
    SELECT s.id_sala
    FROM sala_venta s
    WHERE NOT EXISTS (
        SELECT 1
        FROM comprobante c
        JOIN vino_comprobante vc ON c.numero = vc.nro_comprobante
        WHERE c.id_sala = s.id_sala
          AND vc.codigo_vino = v.codigo_vino
    )
);


-- S3, Cantidad de clientes de cada tipo que compraron en una sala determinada en la última semana.
-- La estrategia fue unificar las tablas de comprobantes, clientes y sus subtipos (o verificar la categoría) filtrando por una sala específica y un rango temporal de 7 días, agrupando por el tipo de cliente.
SELECT 
    CASE 
        WHEN s_club.id_cliente IS NOT NULL THEN 'socio'
        WHEN dist.id_cliente IS NOT NULL THEN 'distribuidor'
        WHEN exp.id_cliente IS NOT NULL THEN 'exportador'
        ELSE 'comun'
    END AS tipo_cliente,
    COUNT(DISTINCT c.id_cliente) AS cantidad_clientes
FROM comprobante comp
JOIN cliente c ON comp.id_cliente = c.id_cliente
LEFT JOIN socio_club s_club ON c.id_cliente = s_club.id_cliente
LEFT JOIN distribuidor dist ON c.id_cliente = dist.id_cliente
LEFT JOIN exportador exp ON c.id_cliente = exp.id_cliente
WHERE comp.id_sala = 1
  AND comp.fecha >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN s_club.id_cliente IS NOT NULL THEN 'socio'
        WHEN dist.id_cliente IS NOT NULL THEN 'distribuidor'
        WHEN exp.id_cliente IS NOT NULL THEN 'exportador'
        ELSE 'comun'
    END;

-- S4, Top 5 de las salas que solicitaron mayor cantidad de un vino determinado mediante transferencias en los últimos 15 días.
-- La estrategia fue unir la tabla de cabecera (transferencia) con la de detalle (transferencia_vino), filtrar por el código de vino específico y por las transferencias de los últimos 15 días, agrupar por id_sala y sumar las cantidades, ordenando de forma descendente para obtener el top 5.
SELECT t.id_sala, SUM(tv.cantidad) AS total_solicitado
FROM transferencia t
JOIN transferencia_vino tv ON t.nro_transferencia = tv.nro_transferencia
WHERE tv.codigo_vino = 'VIN-0010' 
  AND t.fecha_confeccion >= CURRENT_DATE - INTERVAL '15 days'
GROUP BY t.id_sala
ORDER BY total_solicitado DESC
LIMIT 5;

-- S5, Listado de las salas con menor cantidad de transferencias pendientes (no procesadas).
-- La estrategia fue utilizar un LEFT JOIN entre las salas de venta y las transferencias con estado pendiente/no procesado, agrupando por sala y contando las ocurrencias en orden ascendente.
SELECT s.id_sala, s.calle, COUNT(t.nro_transferencia) AS pendientes 
FROM sala_venta s
LEFT JOIN transferencia t ON s.id_sala = t.id_sala AND t.estado IN ('en_confeccion','terminado')
GROUP BY s.id_sala, s.calle
ORDER BY pendientes ASC;


-- S6, Para una sala determinada, los vinos sin stock en la sala pero con stock en el depósito central.
-- La estrategia fue consultar los vinos presentes en el depósito central (stock > 0) y excluirlos mediante NOT IN o NOT EXISTS de aquellos que sí tienen stock registrado en la sala específica.
SELECT sd.codigo_vino, v.nombre, sd.cantidad AS stock_deposito
FROM stock_deposito sd
JOIN vino v ON sd.codigo_vino = v.codigo_vino
WHERE sd.cantidad > 0
  AND sd.codigo_vino NOT IN (
      SELECT ss.codigo_vino
      FROM stock_sala ss
      WHERE ss.id_sala = 3 
        AND ss.cantidad > 0
  );

-- S7, ¿Cuál es la empresa de transporte con mayor actividad en el último mes?
-- La estrategia fue agrupar los ingresos trasladados por código de transportista en el último mes, contando la cantidad de viajes u operaciones y ordenando de manera descendente limitando al primer resultado.
SELECT t.codigo, t.razon_social, COUNT(i.codigo) AS total_viajes
FROM transportista t
JOIN ingreso i ON t.codigo = i.cod_transportista
WHERE i.fecha >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY t.codigo, t.razon_social
ORDER BY total_viajes DESC
LIMIT 1;

-- S8, Monto total de ventas por sala en el último trimestre, en orden descendente.
-- La estrategia fue sumar los totales de los comprobantes asociados a cada sala filtrando por los últimos 3 meses, agrupando por sala y ordenando de mayor a menor.
SELECT s.id_sala, s.calle, SUM(c.total) AS monto_total_ventas
FROM comprobante c
JOIN sala_venta s ON c.id_sala = s.id_sala
WHERE c.fecha >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY s.id_sala, s.calle
ORDER BY monto_total_ventas DESC;