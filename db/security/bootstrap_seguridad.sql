/*
BOOTSTRAP DE SEGURIDAD
EJECUTAR UNA VEZ POR ENTORNO, COMO ROL ADMINISTRADOR DE LA PLATAFORMA
(POSTGRES EN LOCAL / DOCKER, neondb_owner EN NEON)
DEBE EJECUTARSE ANTES DE LA PRIMERA MIGRACION:
LOS GRANTS DE 010_roles.sql Y 011_seguridad.sql REQUIEREN ESTOS ROLES

LAS CONTRASEÑAS NO SE VERSIONAN: SE PASAN POR VARIABLES DE PSQL
USO (PowerShell):
  psql "postgresql://<ADMIN>:<PASS_ADMIN>@<HOST>:5432/<DB>?sslmode=verify-full" `
    -v dbname=<DB> `
    -v app_admin_password="<PASS>" `
    -v app_migrator_password="<PASS>" `
    -v app_rw_password="<PASS>" `
    -v app_ro_password="<PASS>" `
    -f db/security/bootstrap_seguridad.sql

USO (bash):
  psql "postgresql://<ADMIN>:<PASS_ADMIN>@<HOST>:5432/<DB>?sslmode=verify-full" \
    -v dbname=<DB> \
    -v app_admin_password="<PASS>" \
    -v app_migrator_password="<PASS>" \
    -v app_rw_password="<PASS>" \
    -v app_ro_password="<PASS>" \
    -f db/security/bootstrap_seguridad.sql
*/

CREATE ROLE app_admin
LOGIN
CREATEROLE
CONNECTION LIMIT 20
PASSWORD :'app_admin_password';

CREATE ROLE app_migrator
LOGIN
CONNECTION LIMIT 10
PASSWORD :'app_migrator_password';

CREATE ROLE app_rw
LOGIN
CONNECTION LIMIT 50
PASSWORD :'app_rw_password';

CREATE ROLE app_ro
LOGIN
CONNECTION LIMIT 50
PASSWORD :'app_ro_password';

GRANT CONNECT, CREATE
ON DATABASE :"dbname"
TO app_admin
WITH GRANT OPTION;

GRANT CONNECT, CREATE
ON DATABASE :"dbname"
TO app_migrator;

GRANT CONNECT
ON DATABASE :"dbname"
TO app_rw, app_ro;

GRANT USAGE
ON SCHEMA public
TO app_admin
WITH GRANT OPTION;

GRANT USAGE
ON SCHEMA public
TO app_rw, app_ro;

/*
MEMBRESÍAS
app_admin ADMINISTRA LOS DEMÁS ROLES SIN SER SUPERUSUARIO
*/

GRANT app_migrator, app_rw, app_ro
TO app_admin
WITH ADMIN OPTION;
