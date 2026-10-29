DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;

CREATE TYPE tipo_cepa AS ENUM ('tinta', 'blanca');
CREATE TYPE tipo_vino AS ENUM ('tinto', 'blanco', 'rosado', 'espumante');
CREATE TYPE estado_documento AS ENUM ('en_confeccion', 'terminado', 'procesado');
CREATE TYPE tipo_cliente_enum AS ENUM ('socio', 'distribuidor', 'exportador');

CREATE DOMAIN cuit_dom AS CHAR(11) CHECK (VALUE ~ '^[0-9]{11}$');

CREATE TABLE provincia (
    id_provincia INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL
);

CREATE TABLE cepa (
    id_cepa INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo tipo_cepa NOT NULL
);

CREATE TABLE bodega (
    cuit cuit_dom PRIMARY KEY,
    razon_social VARCHAR(100) NOT NULL,
    domicilio VARCHAR(250) NOT NULL
);

CREATE TABLE maridaje (
    id_maridaje INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    temperatura NUMERIC(4,1) NOT NULL
);

CREATE TABLE departamento (
    id_departamento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_provincia INT NOT NULL REFERENCES provincia(id_provincia) ON DELETE RESTRICT,
    nombre_departamento VARCHAR(30) NOT NULL
);

CREATE TABLE transportista (
    codigo VARCHAR(30) PRIMARY KEY,
    razon_social VARCHAR(100) NOT NULL,
    cuit cuit_dom NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    domicilio VARCHAR(250) NOT NULL
);

CREATE TABLE localidad (
    id_localidad INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    id_provincia INT NOT NULL REFERENCES provincia(id_provincia) ON DELETE RESTRICT,
    codigo_postal VARCHAR(10) NOT NULL,
    encargado_localidad cuit_dom NOT NULL
);

CREATE TABLE sala_venta (
    id_sala INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    calle VARCHAR(100) NOT NULL,
    numero INT NOT NULL,
    dia_cierre_semanal VARCHAR(15) NOT NULL,
    id_localidad INT NOT NULL REFERENCES localidad(id_localidad) ON DELETE RESTRICT
);

CREATE TABLE empleado (
    cuit cuit_dom PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    salario NUMERIC(10,2) NOT NULL CHECK (salario > 0),
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT
);

CREATE TABLE finca (
    id_finca INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    superficie_total NUMERIC(10,2) NOT NULL CHECK (superficie_total > 0),
    id_departamento INT NOT NULL REFERENCES departamento(id_departamento) ON DELETE RESTRICT
);

CREATE TABLE parcela (
    nro_parcela INT NOT NULL,
    id_finca INT NOT NULL REFERENCES finca(id_finca) ON DELETE RESTRICT,
    superficie NUMERIC(10,2) NOT NULL CHECK (superficie > 0),
    ano_plantacion INT NOT NULL CHECK (ano_plantacion > 0),
    id_cepa INT NOT NULL REFERENCES cepa(id_cepa) ON DELETE RESTRICT,
    PRIMARY KEY (nro_parcela, id_finca)
);

CREATE TABLE lote_uva (
    nro_lote INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nro_parcela INT NOT NULL,
    id_finca INT NOT NULL,
    campana INT NOT NULL,
    fecha_cosecha DATE NOT NULL DEFAULT CURRENT_DATE,
    kilos_cosechados NUMERIC(10,2) NOT NULL CHECK (kilos_cosechados > 0),
    cuit_bodega cuit_dom NOT NULL REFERENCES bodega(cuit) ON DELETE RESTRICT,
    FOREIGN KEY (nro_parcela, id_finca) REFERENCES parcela(nro_parcela, id_finca) ON DELETE RESTRICT,
    CONSTRAINT uk_parcela_campana UNIQUE (id_finca, nro_parcela, campana)
);

CREATE TABLE analisis_calidad (
    id_analisis INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    ph NUMERIC(4,2) NOT NULL CHECK (ph > 0),
    acidez_total NUMERIC(10,2) NOT NULL CHECK (acidez_total > 0),
    g_brix NUMERIC(10,2) NOT NULL CHECK (g_brix > 0),
    nro_lote INT NOT NULL REFERENCES lote_uva(nro_lote) ON DELETE RESTRICT
);

CREATE TABLE vino (
    codigo_vino VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo tipo_vino NOT NULL,
    anada INT NOT NULL,
    volumen INT NOT NULL,
    graduacion NUMERIC(4,2) NOT NULL CHECK (graduacion BETWEEN 5 AND 20),
    precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    cuit_bodega cuit_dom NOT NULL REFERENCES bodega(cuit) ON DELETE RESTRICT
);

CREATE TABLE vino_cepa (
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE CASCADE,
    id_cepa INT NOT NULL REFERENCES cepa(id_cepa) ON DELETE RESTRICT,
    porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
    PRIMARY KEY (codigo_vino, id_cepa)
);

CREATE TABLE vino_maridaje (
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE CASCADE,
    id_maridaje INT NOT NULL REFERENCES maridaje(id_maridaje) ON DELETE CASCADE,
    PRIMARY KEY (codigo_vino, id_maridaje)
);

CREATE TABLE cliente (
    id_cliente INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_razon_social VARCHAR(150) NOT NULL,
    tipo_doc VARCHAR(10) NOT NULL,
    nro_doc VARCHAR(15) NOT NULL UNIQUE,
    direccion VARCHAR(200) NOT NULL,
    id_localidad INT NOT NULL REFERENCES localidad(id_localidad) ON DELETE RESTRICT,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_cliente tipo_cliente_enum NOT NULL
);

CREATE TABLE distribuidor (
    id_cliente INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    zona_cobertura VARCHAR(100) NOT NULL,
    nro_habilitacion VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE socio_club (
    id_cliente INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE
);

CREATE TABLE exportador (
    id_cliente INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    pais_destino VARCHAR(50) NOT NULL
);

CREATE TABLE permiso_exportacion (
    id_permiso VARCHAR(50) PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES exportador(id_cliente) ON DELETE CASCADE,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    CONSTRAINT chk_fechas_permiso CHECK (fecha_vencimiento > fecha_emision)
);

CREATE TABLE comprobante (
    numero INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    id_cliente INT NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    descuento NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (descuento >= 0),
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0)
);

CREATE TABLE vino_comprobante (
    nro_comprobante INT NOT NULL REFERENCES comprobante(numero) ON DELETE CASCADE,
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (descuento >= 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    PRIMARY KEY (nro_comprobante, codigo_vino)
);


CREATE TABLE ingreso (
    codigo INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado estado_documento NOT NULL DEFAULT 'en_confeccion',
    cod_transportista VARCHAR(30) NOT NULL REFERENCES transportista(codigo) ON DELETE RESTRICT,
    cuit_bodega cuit_dom NOT NULL REFERENCES bodega(cuit) ON DELETE RESTRICT
);

CREATE TABLE ingreso_vino (
    codigo_ingreso INT NOT NULL REFERENCES ingreso(codigo) ON DELETE CASCADE,
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    PRIMARY KEY (codigo_ingreso, codigo_vino)
);

CREATE TABLE transferencia (
    nro_transferencia INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT,
    fecha_confeccion DATE NOT NULL DEFAULT CURRENT_DATE,
    estado estado_documento NOT NULL DEFAULT 'en_confeccion'
);

CREATE TABLE transferencia_vino (
    nro_transferencia INT NOT NULL REFERENCES transferencia(nro_transferencia) ON DELETE CASCADE,
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    PRIMARY KEY (nro_transferencia, codigo_vino)
);

CREATE TABLE stock_deposito (
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad >= 0),
    PRIMARY KEY (codigo_vino)
);

CREATE TABLE stock_sala (
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT,
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad >= 0),
    PRIMARY KEY (id_sala, codigo_vino)
);

CREATE TABLE transportista_localidad (
    codigo VARCHAR(30) NOT NULL REFERENCES transportista(codigo) ON DELETE CASCADE,
    id_localidad INT NOT NULL REFERENCES localidad(id_localidad) ON DELETE CASCADE,
    PRIMARY KEY (codigo, id_localidad)
);

CREATE TABLE auditoria_precio (
    id_auditoria INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_vino VARCHAR(30) NOT NULL REFERENCES vino(codigo_vino) ON DELETE RESTRICT,
    precio_anterior NUMERIC(10,2) NOT NULL CHECK (precio_anterior >= 0),
    precio_nuevo NUMERIC(10,2) NOT NULL CHECK (precio_nuevo >= 0),
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario cuit_dom NOT NULL
);






