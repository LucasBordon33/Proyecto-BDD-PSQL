# Pruebas de Reglas de Negocio y Concurrencia
## Proyecto: Bodegas del Atuel

---

# Reglas de Negocio Verificadas

## RN-01
El precio de un vino es único para toda la red de salas y siempre mayor que cero.

Implementación:
- Atributo `precio` en la tabla `vino`.
- Restricción `CHECK (precio > 0)`.

Verificación:
- Inserción y actualización de vinos con precio positivo.

---

## RN-02
Una sala pertenece a una sola localidad. Cada localidad tiene un único encargado regional.

Implementación:
- Clave foránea `id_localidad` en `sala_venta`.
- Diseño normalizado de la base de datos.

Verificación:
- Cada sala queda asociada a una única localidad existente.

---

## RN-03
Cada empleado trabaja en una sola sala.

Implementación:
- Clave foránea `id_sala` en `empleado`.
- Restricción `NOT NULL`.

Verificación:
- Cada empleado posee una única referencia a una sala.

---

## RN-04
Una parcela tiene una sola cepa y se cosecha como máximo una vez por campaña.

Implementación:
- Clave foránea `id_cepa` en `parcela`.
- Restricción `UNIQUE (id_finca, nro_parcela, campana)` en `lote_uva`.

Verificación:
- No es posible registrar dos cosechas de la misma parcela para la misma campaña.

---

## RN-05
Los porcentajes de corte de un vino suman exactamente 100.

Implementación:
- Constraint Trigger diferido sobre `vino_cepa`.

Verificación:
- Se valida la suma total de porcentajes al finalizar la transacción.

---

## RN-06
El descuento depende del tipo de cliente:
- Socio: 10%
- Distribuidor: 20%
- Exportador: 30%

Implementación:
- Función de cálculo de descuentos.
- Aplicación automática al comprobante.

Verificación:
- El descuento aplicado coincide con el tipo de cliente registrado.

---

## RN-07
Un exportador puede tener varios permisos y el vencimiento debe ser posterior a la emisión.

Implementación:
- Tabla `permiso_exportacion`.
- Restricción `CHECK (fecha_vencimiento > fecha_emision)`.

Verificación:
- Todo permiso posee fechas cronológicamente válidas.

---

## RN-08
El total del comprobante es la suma de sus renglones considerando el descuento aplicado.

Implementación:
- Trigger de cálculo automático.
- Actualización de `subtotal` y `total`.

Verificación:
- Los importes se recalculan automáticamente al modificar los renglones.

---

## RN-09
No se puede vender más de lo que existe en stock de la sala. El stock nunca es negativo.

Implementación:
- Trigger de validación previo a la venta.
- Restricciones de stock no negativo.

Verificación:
- La venta es rechazada cuando la cantidad solicitada supera el stock disponible.

---

## RN-10
Sólo un ingreso terminado impacta en el depósito y pasa a procesado.

Implementación:
- Tipo ENUM para estados.
- Trigger de control de estados.
- Procedimiento `procesar_ingreso`.

Estados permitidos:
- en_confeccion
- terminado
- procesado

Verificación:
- Sólo los ingresos terminados pueden procesarse.
- No se permiten retrocesos de estado.

---

## RN-11
Las transferencias siguen las mismas reglas de estados que los ingresos. La fecha de confección es la fecha actual y no puede modificarse.

Implementación:
- Trigger de fecha automática.
- Trigger de control de estados.
- Procedimiento `procesar_transferencia`.

Estados permitidos:
- en_confeccion
- terminado
- procesado

Verificación:
- La fecha se asigna automáticamente.
- No se permiten transiciones inválidas.

---

## RN-12
Un ingreso o transferencia que ya no está en confección no admite agregar, modificar ni eliminar renglones.

Implementación:
- Trigger de bloqueo de renglones.

Verificación:
- Sólo los documentos en estado `en_confeccion` permiten modificaciones.

---

## RN-13
Todo cambio de precio de un vino queda auditado.

Implementación:
- Trigger `AFTER UPDATE`.
- Tabla `auditoria_precio`.

Datos registrados:
- Fecha y hora.
- Usuario.
- Precio anterior.
- Precio nuevo.

Verificación:
- Cada actualización de precio genera un registro de auditoría.

---

## RN-14
No se puede eliminar un transportista, una bodega o un vino que posea movimientos asociados.

Implementación:
- Claves foráneas con `ON DELETE RESTRICT`.

Verificación:
- La eliminación es rechazada cuando existen referencias activas.

---

## RN-15
Cantidades, superficies, kilos y precios deben ser positivos. La graduación alcohólica debe estar entre 5 y 20.

Implementación:
- Restricciones `CHECK`.

Verificación:
- Sólo se aceptan valores dentro de los rangos definidos.

---

# Demostración de Concurrencia

## Objetivo

Demostrar el uso de bloqueo pesimista mediante `FOR UPDATE` para evitar condiciones de carrera durante operaciones de stock.

---

## Situación Inicial

Existe un registro en la tabla `stock_deposito`:

```sql
SELECT *
FROM stock_deposito
WHERE codigo_vino = 'VINO001';