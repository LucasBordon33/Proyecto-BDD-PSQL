/*
  PROCEDIMIENTO: PROCESAR INGRESO
*/

CREATE OR REPLACE PROCEDURE procesar_ingreso(
    p_codigo_ingreso INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado estado_documento;
    r RECORD;
BEGIN

    SELECT estado
    INTO v_estado
    FROM ingreso
    WHERE codigo = p_codigo_ingreso;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe el ingreso %',
            p_codigo_ingreso;
    END IF;

    IF v_estado <> 'terminado' THEN
        RAISE EXCEPTION
            'El ingreso debe estar terminado para poder procesarse';
    END IF;

    FOR r IN
        SELECT codigo_vino, cantidad
        FROM ingreso_vino
        WHERE codigo_ingreso = p_codigo_ingreso
    LOOP

        -- Bloquea la fila si existe
        PERFORM 1
        FROM stock_deposito
        WHERE codigo_vino = r.codigo_vino
        FOR UPDATE;

        INSERT INTO stock_deposito (
            codigo_vino,
            cantidad
        )
        VALUES (
            r.codigo_vino,
            r.cantidad
        )
        ON CONFLICT (codigo_vino)
        DO UPDATE
        SET cantidad = stock_deposito.cantidad + EXCLUDED.cantidad;

    END LOOP;

    UPDATE ingreso
    SET estado = 'procesado'
    WHERE codigo = p_codigo_ingreso;

END;
$$;


/*
  PROCEDIMIENTO: PROCESAR TRANSFERENCIA
*/

CREATE OR REPLACE PROCEDURE procesar_transferencia(
    p_nro_transferencia INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado estado_documento;
    v_id_sala INT;
    v_stock_actual INT;
    r RECORD;
BEGIN

    SELECT id_sala, estado
    INTO v_id_sala, v_estado
    FROM transferencia
    WHERE nro_transferencia = p_nro_transferencia;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe la transferencia %',
            p_nro_transferencia;
    END IF;

    IF v_estado <> 'terminado' THEN
        RAISE EXCEPTION
            'La transferencia debe estar terminada para procesarse';
    END IF;

    FOR r IN
        SELECT codigo_vino, cantidad
        FROM transferencia_vino
        WHERE nro_transferencia = p_nro_transferencia
    LOOP

        /* Bloqueo pesimista */

        SELECT cantidad
        INTO v_stock_actual
        FROM stock_deposito
        WHERE codigo_vino = r.codigo_vino
        FOR UPDATE;

        v_stock_actual := COALESCE(v_stock_actual, 0);

        IF v_stock_actual < r.cantidad THEN
            RAISE EXCEPTION
                'Stock insuficiente en depósito para el vino %. Disponible: %, solicitado: %',
                r.codigo_vino,
                v_stock_actual,
                r.cantidad;
        END IF;

        UPDATE stock_deposito
        SET cantidad = cantidad - r.cantidad
        WHERE codigo_vino = r.codigo_vino;

        INSERT INTO stock_sala (
            id_sala,
            codigo_vino,
            cantidad
        )
        VALUES (
            v_id_sala,
            r.codigo_vino,
            r.cantidad
        )
        ON CONFLICT (id_sala, codigo_vino)
        DO UPDATE
        SET cantidad = stock_sala.cantidad + EXCLUDED.cantidad;

    END LOOP;

    UPDATE transferencia
    SET estado = 'procesado'
    WHERE nro_transferencia = p_nro_transferencia;

END;
$$;