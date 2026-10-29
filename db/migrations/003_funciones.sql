/* 
FUNCIÓN: CALCULAR DESCUENTO SEGÚN TIPO DE CLIENTE
RN-06
 */

CREATE OR REPLACE FUNCTION fn_calcular_descuento(
    p_tipo_cliente tipo_cliente_enum,
    p_importe NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN

    RETURN CASE p_tipo_cliente
        WHEN 'socio' THEN p_importe * 0.10
        WHEN 'distribuidor' THEN p_importe * 0.20
        WHEN 'exportador' THEN p_importe * 0.30
        ELSE 0
    END;

END;
$$;


/* 
FUNCIÓN: OBTENER STOCK DE UNA SALA
 */

CREATE OR REPLACE FUNCTION fn_stock_sala(
    p_id_sala INT,
    p_codigo_vino VARCHAR(30)
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock INT;
BEGIN

    SELECT cantidad
    INTO v_stock
    FROM stock_sala
    WHERE id_sala = p_id_sala
      AND codigo_vino = p_codigo_vino;

    RETURN COALESCE(v_stock,0);

END;
$$;


/* 
FUNCIÓN: OBTENER STOCK DE DEPÓSITO
 */

CREATE OR REPLACE FUNCTION fn_stock_deposito(
    p_codigo_vino VARCHAR(30)
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock INT;
BEGIN

    SELECT cantidad
    INTO v_stock
    FROM stock_deposito
    WHERE codigo_vino = p_codigo_vino;

    RETURN COALESCE(v_stock,0);

END;
$$;


/* 
FUNCIÓN: CALCULAR SUBTOTAL DE UN COMPROBANTE
RN-08
 */

CREATE OR REPLACE FUNCTION fn_subtotal_comprobante(
    p_nro_comprobante INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal NUMERIC(10,2);
BEGIN

    SELECT COALESCE(SUM(subtotal),0)
    INTO v_subtotal
    FROM vino_comprobante
    WHERE nro_comprobante = p_nro_comprobante;

    RETURN v_subtotal;

END;
$$;


/* 
FUNCIÓN: CALCULAR TOTAL DEL COMPROBANTE
RN-08
 */

CREATE OR REPLACE FUNCTION fn_total_comprobante(
    p_nro_comprobante INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal NUMERIC(10,2);
    v_descuento NUMERIC(10,2);
BEGIN

    SELECT subtotal, descuento
    INTO v_subtotal, v_descuento
    FROM comprobante
    WHERE numero = p_nro_comprobante;

    RETURN COALESCE(v_subtotal,0) - COALESCE(v_descuento,0);

END;
$$;


/* 
FUNCIÓN: SUMA DE PORCENTAJES DE CORTE
RN-05
 */

CREATE OR REPLACE FUNCTION fn_porcentaje_corte(
    p_codigo_vino VARCHAR(30)
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC(5,2);
BEGIN

    SELECT COALESCE(SUM(porcentaje),0)
    INTO v_total
    FROM vino_cepa
    WHERE codigo_vino = p_codigo_vino;

    RETURN v_total;

END;
$$;


/* 
FUNCIÓN: VERIFICAR STOCK SUFICIENTE
RN-09
 */

CREATE OR REPLACE FUNCTION fn_stock_suficiente(
    p_id_sala INT,
    p_codigo_vino VARCHAR(30),
    p_cantidad INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock INT;
BEGIN

    SELECT cantidad
    INTO v_stock
    FROM stock_sala
    WHERE id_sala = p_id_sala
      AND codigo_vino = p_codigo_vino;

    RETURN COALESCE(v_stock,0) >= p_cantidad;

END;
$$;