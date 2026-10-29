/* 
DEMOSTRACIÓN DE CONCURRENCIA
RN-09 - CONTROL DE STOCK CON FOR UPDATE

Abrir dos sesiones de PostgreSQL:

- Sesión A
- Sesión B

Objetivo:
Demostrar que FOR UPDATE bloquea la fila y evita
condiciones de carrera sobre el stock.

 */


/* 
ESTADO INICIAL
 */

SELECT *
FROM stock_deposito
WHERE codigo_vino = 'VINO001';

/*
Resultado esperado:

codigo_vino | cantidad
------------+---------
VINO001     | 1000
*/


/* 
SESIÓN A
 */

BEGIN;

SELECT cantidad
FROM stock_deposito
WHERE codigo_vino = 'VINO001'
FOR UPDATE;

/*
Resultado esperado:

 cantidad
----------
     1000

La fila queda bloqueada.
No hacer COMMIT todavía.
*/


/* 
SESIÓN B
(EJECUTAR MIENTRAS LA SESIÓN A SIGUE ABIERTA)
 */

BEGIN;

SELECT cantidad
FROM stock_deposito
WHERE codigo_vino = 'VINO001'
FOR UPDATE;

/*
Resultado esperado:

La consulta queda esperando.
No devuelve resultados porque la fila está
bloqueada por la sesión A.
*/


/* 
VOLVER A SESIÓN A
 */

UPDATE stock_deposito
SET cantidad = cantidad - 100
WHERE codigo_vino = 'VINO001';

COMMIT;

/*
La fila queda liberada.
Stock actualizado a 900.
*/


/* 
VOLVER A SESIÓN B
 */

/*
Al liberarse el bloqueo, PostgreSQL continúa
automáticamente la consulta.
*/

/*
Resultado esperado:

 cantidad
----------
      900
*/

COMMIT;


/* 
VERIFICACIÓN FINAL
 */

SELECT *
FROM stock_deposito
WHERE codigo_vino = 'VINO001';

/*
Resultado esperado:

codigo_vino | cantidad
------------+---------
VINO001     | 900
*/


/* 
CONCLUSIÓN

SIN FOR UPDATE

Sesión A lee 1000
Sesión B lee 1000

Sesión A descuenta 100
Sesión B descuenta 100

Ambas transacciones trabajan sobre el mismo
valor inicial.

Existe riesgo de condición de carrera.


CON FOR UPDATE

Sesión A bloquea la fila.
Sesión B queda esperando.

Sesión A actualiza el stock.
Sesión A confirma.

Sesión B recién puede acceder a la fila.
Sesión B obtiene el valor actualizado.

Se garantiza la consistencia de los datos.

 */