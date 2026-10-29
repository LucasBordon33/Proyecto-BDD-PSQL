/*
TRIGGER 1
VALIDACIÓN DE STOCK PARA VENTAS (RN09)
*/

CREATE OR REPLACE FUNCTION fn_validar_stock_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_sala INT;
    v_stock_actual INT;
BEGIN

    SELECT c.id_sala
    INTO v_id_sala
    FROM comprobante c
    WHERE c.numero = NEW.nro_comprobante;

    SELECT cantidad
    INTO v_stock_actual
    FROM stock_sala
    WHERE id_sala = v_id_sala
      AND codigo_vino = NEW.codigo_vino
    FOR UPDATE;

    v_stock_actual := COALESCE(v_stock_actual, 0);

    IF v_stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION
        'Stock insuficiente para el vino %. Disponible %, solicitado %',
        NEW.codigo_vino,
        v_stock_actual,
        NEW.cantidad;
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_validar_stock_venta
BEFORE INSERT OR UPDATE
ON vino_comprobante
FOR EACH ROW
EXECUTE FUNCTION fn_validar_stock_venta();


/*
TRIGGER 2
DESCUENTO DE STOCK Y CÁLCULO DE TOTALES
*/

CREATE OR REPLACE FUNCTION fn_descuento_stock_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_sala INT;
BEGIN

    SELECT id_sala
    INTO v_id_sala
    FROM comprobante
    WHERE numero = NEW.nro_comprobante;

    UPDATE stock_sala
    SET cantidad = cantidad - NEW.cantidad
    WHERE id_sala = v_id_sala
      AND codigo_vino = NEW.codigo_vino;

    UPDATE comprobante
    SET subtotal =
        (
            SELECT COALESCE(SUM(subtotal),0)
            FROM vino_comprobante
            WHERE nro_comprobante = NEW.nro_comprobante
        )
    WHERE numero = NEW.nro_comprobante;

    UPDATE comprobante
    SET total = subtotal - descuento
    WHERE numero = NEW.nro_comprobante;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_descuento_stock_total
AFTER INSERT
ON vino_comprobante
FOR EACH ROW
EXECUTE FUNCTION fn_descuento_stock_total();



/*
TRIGGER 3
CONTROL DE ESTADOS
*/

CREATE OR REPLACE FUNCTION fn_control_estado_documento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF OLD.estado = 'procesado' THEN
        RAISE EXCEPTION
        'No puede modificarse un documento procesado';
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_control_estado_ingreso
BEFORE UPDATE
ON ingreso
FOR EACH ROW
EXECUTE FUNCTION fn_control_estado_documento();


CREATE TRIGGER trg_control_estado_transferencia
BEFORE UPDATE
ON transferencia
FOR EACH ROW
EXECUTE FUNCTION fn_control_estado_documento();


/*
TRIGGER 4
BLOQUEO DE RENGLONES
*/

CREATE OR REPLACE FUNCTION fn_bloqueo_renglones()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado estado_documento;
BEGIN

    SELECT estado
    INTO v_estado
    FROM transferencia
    WHERE nro_transferencia =
          COALESCE(NEW.nro_transferencia, OLD.nro_transferencia);

    IF FOUND AND v_estado <> 'en_confeccion' THEN
        RAISE EXCEPTION
        'No pueden modificarse renglones de una transferencia %',
        v_estado;
    END IF;

    RETURN COALESCE(NEW,OLD);
END;
$$;


CREATE TRIGGER trg_bloqueo_renglones_transferencia
BEFORE UPDATE OR DELETE
ON transferencia_vino
FOR EACH ROW
EXECUTE FUNCTION fn_bloqueo_renglones();



/*
TRIGGER 5
*/

CREATE OR REPLACE FUNCTION fn_fecha_transferencia()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.fecha_confeccion IS NULL THEN
        NEW.fecha_confeccion := CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_fecha_transferencia
BEFORE INSERT
ON transferencia
FOR EACH ROW
EXECUTE FUNCTION fn_fecha_transferencia();



/*
TRIGGER 6
AUDITORÍA DE PRECIOS
*/

CREATE OR REPLACE FUNCTION fn_auditoria_precio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.precio <> OLD.precio THEN

        INSERT INTO auditoria_precio(
            codigo_vino,
            precio_anterior,
            precio_nuevo,
            usuario
        )
        VALUES(
            OLD.codigo_vino,
            OLD.precio,
            NEW.precio,
            '00000000000'
        );

    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_auditoria_precio
AFTER UPDATE OF precio
ON vino
FOR EACH ROW
EXECUTE FUNCTION fn_auditoria_precio();



/*
TRIGGER 7
SUMA DE PORCENTAJES DE CORTE (RN05)
*/

CREATE OR REPLACE FUNCTION fn_suma_porcentajes_corte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_codigo_vino VARCHAR(30);
    v_total NUMERIC(5,2);
BEGIN

    v_codigo_vino :=
        COALESCE(NEW.codigo_vino, OLD.codigo_vino);

    SELECT COALESCE(SUM(porcentaje),0)
    INTO v_total
    FROM vino_cepa
    WHERE codigo_vino = v_codigo_vino;

    IF v_total <> 100 THEN
        RAISE EXCEPTION
        'El vino % posee un corte de %, debe sumar 100',
        v_codigo_vino,
        v_total;
    END IF;

    RETURN NULL;
END;
$$;


CREATE CONSTRAINT TRIGGER trg_suma_porcentajes_corte
AFTER INSERT OR UPDATE OR DELETE
ON vino_cepa
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_suma_porcentajes_corte();
