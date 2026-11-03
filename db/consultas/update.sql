-- U1 , Recalcular el total de todos los comprobantes aplicando el descuento que corresponde al tipo de cliente.

-- Usamos un left Join 


BEGIN;

-- Actualizamos simultáneamente el porcentaje de descuento y el total final
UPDATE comprobante
SET 
    descuento = CASE 
        WHEN s.id_cliente IS NOT NULL THEN 10 -- 10% si existe en tabla Socio
        WHEN d.id_cliente IS NOT NULL THEN 20 -- 20% si existe en tabla Distribuidores
        ELSE 0 
    END,
    total = subtotal - (subtotal * CASE 
        WHEN s.id_cliente IS NOT NULL THEN 10
        WHEN d.id_cliente IS NOT NULL THEN 20
        ELSE 0
    END / 100)
FROM cliente c
LEFT JOIN "Socio del club" s ON c.id_cliente = s.id_cliente
LEFT JOIN "Distribuidores" d ON c.id_cliente = d.id_cliente
WHERE comprobante.id_cliente = c.id_cliente;

COMMIT;


-- U2, Aumentar un 20 % el salario de los empleados con más de 5 años de antigüedad. 

-- La estrategia fue sencilla; hacer un update en donde las condiciones se cumplen

BEGIN;

-- Vemos el estado actual antes del cambio
SELECT cuit, fecha_ingreso, salario
FROM empleado
LIMIT 5;

-- Ejecución de la consigna U2 (Aumento del 20% para 5 años o más)
UPDATE empleado 
SET salario = salario * 1.20 
WHERE fecha_ingreso <= CURRENT_DATE - INTERVAL '5 years';

-- Verificamos cómo impactó el aumento
SELECT cuit, fecha_ingreso, salario
FROM empleado
WHERE fecha_ingreso <= CURRENT_DATE - INTERVAL '5 years'
LIMIT 5;

ROLLBACK;

-- U3, Incrementar un 13 % el precio de los vinos elaborados por una bodega determinada.

-- La estrategia es un update con un join implícito
BEGIN;

-- 1. Verificamos los precios actuales de 'Moreno Group' antes de actualizar
SELECT v.codigo_vino, v.cuit_bodega, v.precio, b.razon_social
FROM vino v
JOIN bodega b ON v.cuit_bodega = b.cuit
WHERE b.razon_social = 'Moreno Group'
ORDER BY v.codigo_vino ASC
LIMIT 5;

-- 2. Ejecutamos el incremento del 13%
UPDATE vino
SET precio = precio * 1.13
FROM bodega b
WHERE vino.cuit_bodega = b.cuit
  AND b.razon_social = 'Moreno Group';

-- 3. Verificamos que los precios de 'Moreno Group' efectivamente hayan aumentado
SELECT v.codigo_vino, v.cuit_bodega, v.precio, b.razon_social
FROM vino v
JOIN bodega b ON v.cuit_bodega = b.cuit
WHERE b.razon_social = 'Moreno Group'
ORDER BY v.codigo_vino ASC
LIMIT 5;
-- Deshacemos los cambios al finalizar la prueba
ROLLBACK;

-- U4, En las salas cuyo día de cierre es lunes cambiarlo a miércoles y viceversa, en una sola sentencia. 

-- Usamos un case when sencillo para verificar el dia de la semana y cambiarlo si es necesario


BEGIN;

-- 1. Verificamos el estado antes del cambio
SELECT id_sala, dia_cierre_semanal
FROM sala_venta
WHERE dia_cierre_semanal IN ('Lunes', 'Miércoles')
LIMIT 5;

-- 2. Intercambiamos Lunes por Miércoles y viceversa
UPDATE sala_venta
SET dia_cierre_semanal = CASE
    WHEN dia_cierre_semanal = 'Lunes' THEN 'Miércoles'
    WHEN dia_cierre_semanal = 'Miércoles' THEN 'Lunes'
    ELSE dia_cierre_semanal
END
WHERE dia_cierre_semanal IN ('Lunes', 'Miércoles');

-- 3. Verificamos que se hayan invertido correctamente
SELECT id_sala, dia_cierre_semanal
FROM sala_venta
WHERE dia_cierre_semanal IN ('Lunes', 'Miércoles')
LIMIT 5;

ROLLBACK;

-- U5, Aplicar un 15 % de descuento de precio a los 10 vinos menos vendidos de toda la red.
-- Combinamos la actualizacion con una subconsulta

BEGIN;

SELECT v.codigo_vino, v.nombre, v.precio, COALESCE(SUM(vc.cantidad), 0) AS total_vendido
FROM vino v
LEFT JOIN vino_comprobante vc ON v.codigo_vino = vc.codigo_vino
GROUP BY v.codigo_vino, v.nombre, v.precio
ORDER BY total_vendido ASC
LIMIT 10;

-- 2. Ejecución de la consigna U5
UPDATE vino
SET precio = precio * 0.85
WHERE codigo_vino IN (
    SELECT v.codigo_vino
    FROM vino v
    LEFT JOIN vino_comprobante vc ON v.codigo_vino = vc.codigo_vino
    GROUP BY v.codigo_vino
    ORDER BY COALESCE(SUM(vc.cantidad), 0) ASC
    LIMIT 10
);

SELECT v.codigo_vino, v.nombre, v.precio, COALESCE(SUM(vc.cantidad), 0) AS total_vendido
FROM vino v
LEFT JOIN vino_comprobante vc ON v.codigo_vino = vc.codigo_vino
GROUP BY v.codigo_vino, v.nombre, v.precio
ORDER BY total_vendido ASC
LIMIT 10;


ROLLBACK;

-- U6, A los exportadores con más de 3 permisos de exportación, subirles el descuento al 35 %. 
-- Estrategia a utilizar, un count de apariciones en donde se coincide el exportador con el permiso y actualizar segun el criterio

BEGIN;

SELECT p.id_cliente, COUNT(p.id_permiso) AS cantidad_permisos
FROM permiso_exportacion p
JOIN exportador e ON p.id_cliente = e.id_cliente
GROUP BY p.id_cliente
HAVING COUNT(p.id_permiso) > 3;

-- 2. Ejecución de la consigna U6
UPDATE comprobante
SET 
    descuento = 35,
    -- Recalculamos el total para que sea consistente con el nuevo descuento (100% - 35% = 65%)
    total = subtotal * 0.65 
WHERE id_cliente IN (
    SELECT p.id_cliente 
    FROM permiso_exportacion p
    JOIN exportador e ON p.id_cliente = e.id_cliente
    GROUP BY p.id_cliente 
    HAVING COUNT(p.id_permiso) > 3
);

SELECT p.id_cliente, COUNT(p.id_permiso) AS cantidad_permisos
FROM permiso_exportacion p
JOIN exportador e ON p.id_cliente = e.id_cliente
GROUP BY p.id_cliente
HAVING COUNT(p.id_permiso) > 3;

ROLLBACK;
