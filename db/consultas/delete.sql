-- D1, Borrar los comprobantes con más de 5 años de antigüedad asociados a clientes socios del club.
-- Estrategia: Borrado directo de la cabecera aprovechando ON DELETE CASCADE para los renglones.
BEGIN;

DELETE FROM comprobante
WHERE id_cliente IN (SELECT id_cliente FROM socio_club)
  AND fecha_alta <= CURRENT_DATE - INTERVAL '5 years';

ROLLBACK;


-- D2, Eliminar las cepas que no componen ningún vino ni están plantadas en ninguna parcela.
-- La estrategia fue utilizar la cláusula NOT IN combinada con subconsultas apuntando a las tablas vino_cepa y parcela. Esto asegura que se borren únicamente aquellas cepas que hayan quedado completamente huérfanas en el sistema.
BEGIN;

DELETE FROM cepa
WHERE id_cepa NOT IN (SELECT id_cepa FROM vino_cepa)
  AND id_cepa NOT IN (SELECT id_cepa FROM parcela);

ROLLBACK;

-- D3, La sala de una localidad determinada fue dada de baja: eliminar los empleados de esa sala que trabajaron menos de dos años.
-- La estrategia fue usar una subconsulta con JOIN en la cláusula WHERE para filtrar a los empleados por la localidad de la sala (por ejemplo, 'General Alvear'), y calcular la antigüedad comprobando que su fecha de ingreso sea posterior o igual a la fecha de hace 2 años.
BEGIN;

DELETE FROM empleado
WHERE fecha_ingreso >= CURRENT_DATE - INTERVAL '2 years'
  AND id_sala IN (
      SELECT s.id_sala
      FROM sala_venta s
      JOIN localidad l ON s.id_localidad = l.id_localidad
      WHERE l.nombre = 'General Alvear' 
  );

ROLLBACK;

-- D4, Borrar los clientes socios que nunca compraron y se dieron de alta hace más de 5 años.
-- La estrategia fue realizar un DELETE directo sobre la tabla padre (cliente), confiando en el ON DELETE CASCADE para que elimine automáticamente su registro en el subtipo "Socio del club". Filtramos con una subconsulta para verificar que sea socio y con NOT EXISTS para asegurar que no tenga comprobantes.
BEGIN;

DELETE FROM cliente 
WHERE id_cliente IN (SELECT id_cliente FROM socio_club)
  AND fecha_alta <= CURRENT_DATE - INTERVAL '5 years'
  AND NOT EXISTS (SELECT 1 FROM comprobante WHERE comprobante.id_cliente = cliente.id_cliente);

ROLLBACK;

-- D5, Eliminar los ingresos en estado procesado de hace más de 365 días.
-- La estrategia fue realizar un único DELETE en la tabla de cabecera (ingreso). Gracias al ON DELETE CASCADE, PostgreSQL se encargará automáticamente de borrar todos los renglones asociados en la tabla ingreso_vino sin generar errores de integridad.
BEGIN;

DELETE FROM ingreso
WHERE estado = 'procesado'
  AND fecha <= CURRENT_DATE - INTERVAL '365 days';

ROLLBACK;

-- D6, Borrar los clientes socios sin compras que viven en una localidad específica.
-- La estrategia es idéntica a la de D4, aprovechando el borrado en cascada desde la tabla padre (cliente), pero cambiando el filtro de antigüedad por una subconsulta a la tabla localidad (ej. 'San Rafael').
BEGIN;

DELETE FROM cliente 
WHERE id_cliente IN (SELECT id_cliente FROM socio_club)
  AND id_localidad IN (SELECT id_localidad FROM localidad WHERE nombre = 'San Rafael') 
  AND NOT EXISTS (SELECT 1 FROM comprobante WHERE comprobante.id_cliente = cliente.id_cliente);

ROLLBACK;