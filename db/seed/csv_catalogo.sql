/* 
CARGA DE CATÁLOGOS
BODEGAS DEL ATUEL
 */


/* 
CEPAS
 */

COPY cepa(nombre, tipo)
FROM 'csv/cepas.csv'
DELIMITER ','
CSV HEADER;


/* 
MARIDAJES
 */

COPY maridaje(nombre, temperatura)
FROM 'csv/maridajes.csv'
DELIMITER ','
CSV HEADER;


/* 
DEPARTAMENTOS
 */

COPY departamento(
    id_provincia,
    nombre_departamento
)
FROM 'csv/departamentos.csv'
DELIMITER ','
CSV HEADER;


/* 
LOCALIDADES
 */

COPY localidad(
    nombre,
    id_provincia,
    codigo_postal,
    encargado_localidad
)
FROM 'csv/localidades.csv'
DELIMITER ','
CSV HEADER;


/* 
VINOS
 */

COPY vino(
    codigo_vino,
    nombre,
    tipo,
    anada,
    volumen,
    graduacion,
    precio,
    cuit_bodega
)
FROM 'csv/vinos.csv'
DELIMITER ','
CSV HEADER;


/* 
FIN DE CARGA
 */