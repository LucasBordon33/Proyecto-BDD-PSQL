import os

# pytest corre desde el host (fuera de Docker), donde el hostname "db" del .env
# no resuelve. Si DB_HOST no viene en el entorno, apuntamos a localhost:5432,
# que es donde el compose publica el contenedor.
# Dentro del contenedor DB_HOST=db ya está definido y setdefault lo respeta.
os.environ.setdefault("DB_HOST", "localhost")
