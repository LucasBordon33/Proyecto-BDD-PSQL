/* 
TESTS DE REGLAS DE NEGOCIO
BODEGAS DEL ATUEL
 */


/* 
RN-01
Precio de vino mayor que cero
 */

-- CASO OK

INSERT INTO vino(
    codigo_vino,
    nombre,
    tipo,
    anada,
    volumen,
    graduacion,
    precio,
    cuit_bodega
)
VALUES(
    'RN01_OK',
    'Vino RN01',
    'tinto',
    2024,
    750,
    13.5,
    5000,
    '20333333333'
);

-- CASO ERROR
-- Se espera error por CHECK(precio > 0)

/*
INSERT INTO vino(
    codigo_vino,
    nombre,
    tipo,
    anada,
    volumen,
    graduacion,
    precio,
    cuit_bodega
)
VALUES(
    'RN01_ERR',
    'Error RN01',
    'tinto',
    2024,
    750,
    13.5,
    -100,
    '20333333333'
);
*/


/* 
RN-02
Sala asociada a una localidad existente
 */

-- CASO OK

INSERT INTO sala_venta(
    calle,
    numero,
    dia_cierre_semanal,
    id_localidad
)
VALUES(
    'Test',
    100,
    'Domingo',
    1
);

-- CASO ERROR
-- Se espera error FK localidad inexistente

/*
INSERT INTO sala_venta(
    calle,
    numero,
    dia_cierre_semanal,
    id_localidad
)
VALUES(
    'Error',
    200,
    'Domingo',
    9999
);
*/


/* 
RN-03
Empleado asociado a una sola sala
 */

-- CASO OK

INSERT INTO empleado(
    cuit,
    nombre,
    salario,
    id_sala
)
VALUES(
    '20444444444',
    'Empleado Test',
    100000,
    1
);

-- CASO ERROR
-- Se espera error FK sala inexistente

/*
INSERT INTO empleado(
    cuit,
    nombre,
    salario,
    id_sala
)
VALUES(
    '20555555555',
    'Empleado Error',
    100000,
    9999
);
*/


/* 
RN-04
Una única cosecha por parcela y campaña
 */

-- CASO OK

INSERT INTO lote_uva(
    nro_parcela,
    id_finca,
    campana,
    kilos_cosechados,
    cuit_bodega
)
VALUES(
    1,
    1,
    2030,
    1000,
    '20333333333'
);

-- CASO ERROR
-- Se espera error UNIQUE uk_parcela_campana

/*
INSERT INTO lote_uva(
    nro_parcela,
    id_finca,
    campana,
    kilos_cosechados,
    cuit_bodega
)
VALUES(
    1,
    1,
    2030,
    1500,
    '20333333333'
);
*/


/* 
RN-05
Porcentajes de corte suman 100
 */

-- CASO OK

INSERT INTO vino_cepa
VALUES ('RN01_OK',1,60);

INSERT INTO vino_cepa
VALUES ('RN01_OK',2,40);

-- CASO ERROR
-- Se espera excepción del trigger:
-- "La composición del vino debe sumar 100"

/*
INSERT INTO vino_cepa
VALUES ('RN01_OK',1,70);

INSERT INTO vino_cepa
VALUES ('RN01_OK',2,20);

COMMIT;
*/


/* 
RN-06
Descuento según tipo de cliente
 */

-- CASO OK

INSERT INTO cliente(
    nombre_razon_social,
    tipo_doc,
    nro_doc,
    direccion,
    id_localidad,
    tipo_cliente
)
VALUES(
    'Cliente Socio',
    'DNI',
    '11111111',
    'San Rafael',
    1,
    'socio'
);

-- CASO ERROR
-- Se espera error ENUM inválido

/*
INSERT INTO cliente(
    nombre_razon_social,
    tipo_doc,
    nro_doc,
    direccion,
    id_localidad,
    tipo_cliente
)
VALUES(
    'Cliente Error',
    'DNI',
    '22222222',
    'San Rafael',
    1,
    'premium'
);
*/


/* 
RN-07
Fechas válidas en permisos de exportación
 */

-- CASO OK

INSERT INTO permiso_exportacion(
    id_permiso,
    id_cliente,
    fecha_emision,
    fecha_vencimiento
)
VALUES(
    'P001',
    1,
    CURRENT_DATE,
    CURRENT_DATE + 365
);

-- CASO ERROR
-- Se espera error chk_fechas_permiso

/*
INSERT INTO permiso_exportacion(
    id_permiso,
    id_cliente,
    fecha_emision,
    fecha_vencimiento
)
VALUES(
    'P002',
    1,
    CURRENT_DATE,
    CURRENT_DATE - 1
);
*/


/* 
RN-08
Cálculo automático de total
 */

-- CASO OK

INSERT INTO vino_comprobante(
    nro_comprobante,
    codigo_vino,
    cantidad,
    precio_unitario,
    subtotal
)
VALUES(
    1,
    'RN01_OK',
    2,
    5000,
    10000
);

-- El trigger debe actualizar subtotal y total.


/* 
RN-09
No vender sin stock suficiente
 */

-- CASO OK

INSERT INTO vino_comprobante(
    nro_comprobante,
    codigo_vino,
    cantidad,
    precio_unitario,
    subtotal
)
VALUES(
    1,
    'RN01_OK',
    1,
    5000,
    5000
);

-- CASO ERROR
-- Se espera excepción:
-- "Stock insuficiente"

/*
INSERT INTO vino_comprobante(
    nro_comprobante,
    codigo_vino,
    cantidad,
    precio_unitario,
    subtotal
)
VALUES(
    1,
    'RN01_OK',
    999999,
    5000,
    999999999
);
*/


/* 
RN-10
Estados válidos para ingreso
 */

-- CASO OK

CALL procesar_ingreso(1);

-- CASO ERROR
-- Se espera excepción:
-- "El ingreso debe estar terminado"

/*
CALL procesar_ingreso(999);
*/


/* 
RN-11
Estados válidos para transferencia
 */

-- CASO OK

CALL procesar_transferencia(1);

-- CASO ERROR
-- Se espera excepción:
-- "La transferencia debe estar terminada"

/*
CALL procesar_transferencia(999);
*/


/* 
RN-12
Bloqueo de renglones
 */

-- CASO ERROR
-- Se espera excepción:
-- "No pueden modificarse renglones"

/*
UPDATE transferencia_vino
SET cantidad = 50
WHERE nro_transferencia = 1;
*/


/* 
RN-13
Auditoría de precios
 */

-- CASO OK

UPDATE vino
SET precio = precio + 100
WHERE codigo_vino = 'RN01_OK';

-- Verificar auditoría

SELECT *
FROM auditoria_precio
WHERE codigo_vino = 'RN01_OK';


/* 
RN-14
No eliminar registros con referencias
 */

-- CASO ERROR
-- Se espera error FK ON DELETE RESTRICT

/*
DELETE FROM vino
WHERE codigo_vino = 'RN01_OK';
*/


/* 
RN-15
Cantidades positivas
 */

-- CASO OK

INSERT INTO stock_sala(
    id_sala,
    codigo_vino,
    cantidad
)
VALUES(
    1,
    'RN01_OK',
    10
);

-- CASO ERROR
-- Se espera error CHECK(cantidad >= 0)

/*
INSERT INTO stock_sala(
    id_sala,
    codigo_vino,
    cantidad
)
VALUES(
    1,
    'RN01_OK',
    -10
);
*/


/* 
FIN DE PRUEBAS
 */