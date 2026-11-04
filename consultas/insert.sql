
-- I1, Insertar en la relación transportista-localidad una nueva cobertura que vincule la localidad de General Alvear con el transportista que menos envíos (ingresos trasladados) haya realizado en el último trimestre. 
-- La estrategia fue hacer una resta con el current_date y el interval, excluyendo transportistas que ya sean de General Alvear para evitar errores. 
BEGIN;

INSERT INTO transportista_localidad (codigo, id_localidad)
SELECT 
    (SELECT cod_transportista 
     FROM ingreso 
     WHERE fecha >= CURRENT_DATE - INTERVAL '3 months'
       -- Filtro clave: Excluir a los transportistas que YA tienen a General Alvear
       AND cod_transportista NOT IN (
           SELECT codigo 
           FROM transportista_localidad 
           WHERE id_localidad = (SELECT id_localidad FROM localidad WHERE nombre = 'General Alvear' LIMIT 1)
       )
     GROUP BY cod_transportista 
     ORDER BY COUNT(codigo) ASC 
     LIMIT 1),
    (SELECT id_localidad 
     FROM localidad 
     WHERE nombre = 'General Alvear' 
     LIMIT 1);


ROLLBACK; 



-- I2, Si existe algún vino tinto con graduación de 14° o más, crear el maridaje «cordero al disco» y asociarlo a todos los vinos que cumplan esa condición. 
-- La estrategia fue utilizar un INSERT ... SELECT con una cláusula WHERE EXISTS para crear el maridaje condicionalmente, y luego otro INSERT ... SELECT para poblar la tabla intermedia asociándolo solo a los vinos que cumplen los requisitos.
BEGIN;

INSERT INTO maridaje (id_maridaje, nombre)
SELECT 100, 'cordero al disco'
WHERE EXISTS (SELECT 1 FROM vino WHERE tipo = 'tinto' AND graduacion >= 14.0);

INSERT INTO vino_maridaje (codigo_vino, id_maridaje, temperatura)
SELECT codigo_vino, 100, 18.0
FROM vino
WHERE tipo = 'tinto' AND graduacion >= 14.0;

ROLLBACK;

-- I3, Crear un nuevo comprobante con tres renglones para un cliente dado, en la sala con ID 1, dentro de una transacción y usando las funciones de cálculo.
-- La estrategia fue insertar primero la cabecera forzando el ID con OVERRIDING SYSTEM VALUE (dado que es un campo identity) y con valores monetarios en cero. Luego se insertan los tres renglones en vino_comprobante. Finalmente, se realizan los UPDATEs llamando a las funciones para calcular subtotal, descuento y total.
BEGIN;

-- 1. Insertar el comprobante inicial forzando un número alto (99999) para evitar duplicados
INSERT INTO comprobante (numero, fecha, id_cliente, id_sala, subtotal, descuento, total)
OVERRIDING SYSTEM VALUE
VALUES (
    999999, 
    CURRENT_DATE, 
    1, 
    1, 
    0, 
    0, 
    0
);

-- 2. Insertar los 3 renglones asociados usando el nuevo número
INSERT INTO vino_comprobante (nro_comprobante, codigo_vino, cantidad, precio_unitario, subtotal, descuento)
VALUES 
    (99999, 'VIN-0001', 2, 15000.00, 2 * 15000.00, 0),
    (99999, 'VIN-0002', 1, 20000.00, 1 * 20000.00, 0),
    (99999, 'VIN-0003', 3,  5000.00, 3 *  5000.00, 0);

-- 3. Actualizar subtotal y descuento en la cabecera usando las funciones
UPDATE comprobante
SET 
    subtotal = fn_subtotal_comprobante(99999),
    descuento = fn_calcular_descuento('socio'::tipo_cliente_enum, fn_subtotal_comprobante(99999))
WHERE numero = 99999;

-- 4. Actualizar el total final usando la función de cálculo
UPDATE comprobante
SET total = fn_total_comprobante(99999)
WHERE numero = 99999;

ROLLBACK;

-- I4, Insertar una nueva bodega.
-- La estrategia fue realizar un INSERT básico proporcionando el CUIT (que actúa como Primary Key según el diccionario de datos), la razón social y el domicilio.
BEGIN;

INSERT INTO bodega (cuit, razon_social, domicilio)
VALUES ('30112233445', 'Bodegas del Sur S.A.', 'Ruta 143 s/n, Mendoza');

ROLLBACK;

-- I5, Insertar una nueva sala de venta.
-- La estrategia fue realizar un INSERT en la tabla sala_venta, asegurando incluir el id_localidad como clave foránea requerida junto con el día de cierre semanal.
BEGIN;

INSERT INTO sala_venta (calle, numero, dia_cierre_semanal, id_localidad)
VALUES ('Av. Hipólito Yrigoyen', 1234, 'Domingo', 1);

ROLLBACK;


-- I6, Crear un ingreso en confección de 120 botellas de un vino determinado (por ejemplo «Malbec Reserva» de 750 ml), elaborado por una bodega dada y trasladado por un transportista dado.
-- La estrategia fue insertar primero la cabecera en la tabla ingreso estableciendo el estado fijo 'en confección' y vinculando al transportista y bodega por sus claves. Luego, se insertó el detalle en ingreso_vino usando una subconsulta SELECT para ubicar dinámicamente el código del vino por su nombre y volumen.
BEGIN;

INSERT INTO ingreso (fecha, estado, cod_transportista, cuit_bodega)
VALUES (
    CURRENT_DATE, 
    'en_confeccion', 
    'TR-001',      
    '22948662836'  
);

INSERT INTO ingreso_vino (codigo_ingreso, codigo_vino, cantidad)
SELECT 1000, codigo_vino, 120
FROM vino 
WHERE nombre = 'Doctor Propuesta' AND volumen = 750
LIMIT 1;

ROLLBACK;