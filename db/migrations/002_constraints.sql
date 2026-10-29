ALTER TABLE vino
ADD CONSTRAINT uk_vino_nombre_anada_volumen
UNIQUE (nombre, anada, volumen);

ALTER TABLE provincia
ADD CONSTRAINT uk_provincia_nombre
UNIQUE (nombre);

ALTER TABLE departamento
ADD CONSTRAINT uk_departamento_provincia
UNIQUE (id_provincia, nombre_departamento);

ALTER TABLE localidad
ADD CONSTRAINT uk_localidad_provincia
UNIQUE (nombre, id_provincia);

ALTER TABLE cepa
ADD CONSTRAINT uk_cepa_nombre
UNIQUE (nombre);

ALTER TABLE vino
ADD CONSTRAINT chk_vino_anada
CHECK (anada BETWEEN 1900 AND 2100);

ALTER TABLE vino
ADD CONSTRAINT chk_vino_volumen
CHECK (volumen IN (187,375,750,1500,3000));