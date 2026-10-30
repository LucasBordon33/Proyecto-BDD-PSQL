import os
import random
from dotenv import load_dotenv
import psycopg 
from faker import Faker

load_dotenv()

SEMILLA = 2026
fake = Faker('es_AR')
Faker.seed(SEMILLA)
random.seed(SEMILLA)

def cargar_csv(cursor, nombre_tabla, columnas, ruta_archivo):
    """
    Función auxiliar para ejecutar COPY leyendo el archivo localmente.
    Esto evita el error de PostgreSQL intentando buscar el archivo dentro del contenedor Docker.
    """
    query_copy = f"COPY {nombre_tabla}({columnas}) FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')"
    with open(ruta_archivo, 'r', encoding='utf-8') as f:
        with cursor.copy(query_copy) as copy:
            while data := f.read(8192):
                copy.write(data)
    print(f"Catálogo {nombre_tabla} cargado correctamente.")

def generar_datos_produccion(cursor):
    print("Generando datos masivos con Faker...")

    # 1. BODEGAS
    bodegas = []
    for _ in range(15):
        cuit = fake.numerify('###########')
        bodegas.append((cuit, fake.company(), fake.address()[:250]))
    
    cursor.executemany(
        "INSERT INTO bodega (cuit, razon_social, domicilio) VALUES (%s, %s, %s)",
        bodegas
    )
    cuit_bodegas = [b[0] for b in bodegas]

    # 2. VINOS
    vinos = []
    tipos_vino = ['tinto', 'blanco', 'rosado', 'espumante']
    volumenes = [187, 375, 750, 1500, 3000] 

    for i in range(1, 401):
        codigo_vino = f"VIN-{str(i).zfill(4)}"
        nombre = f"{fake.word().capitalize()} {fake.word().capitalize()}"
        tipo = random.choice(tipos_vino)
        anada = random.randint(2015, 2023)
        volumen = random.choice(volumenes)
        graduacion = round(random.uniform(5.0, 20.0), 2) 
        precio = round(random.uniform(2000.0, 45000.0), 2)
        cuit_bodega = random.choice(cuit_bodegas) 

        vinos.append((codigo_vino, nombre, tipo, anada, volumen, graduacion, precio, cuit_bodega))

    cursor.executemany(
        "INSERT INTO vino (codigo_vino, nombre, tipo, anada, volumen, graduacion, precio, cuit_bodega) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        vinos
    )
    codigos_vinos = [v[0] for v in vinos]    

    # 3. VINO_CEPA y VINO_MARIDAJE
    cursor.execute("SELECT id_maridaje FROM maridaje")
    ids_maridajes = [row[0] for row in cursor.fetchall()]

    cursor.execute("SELECT id_cepa FROM cepa")
    ids_cepas = [row[0] for row in cursor.fetchall()]

    vino_cepa_data = []
    vino_maridaje_data = []

    for cv in codigos_vinos:
        num_cepas = random.randint(1, 3)
        cepas_sel = random.sample(ids_cepas, num_cepas)
        
        if num_cepas == 1:
            vino_cepa_data.append((cv, cepas_sel[0], 100.00))
        elif num_cepas == 2:
            p1 = round(random.uniform(10.0, 90.0), 2)
            p2 = round(100.00 - p1, 2)
            vino_cepa_data.append((cv, cepas_sel[0], p1))
            vino_cepa_data.append((cv, cepas_sel[1], p2))
        else:
            p1 = round(random.uniform(10.0, 50.0), 2)
            p2 = round(random.uniform(10.0, 80.0 - p1), 2)
            p3 = round(100.00 - p1 - p2, 2)
            vino_cepa_data.append((cv, cepas_sel[0], p1))
            vino_cepa_data.append((cv, cepas_sel[1], p2))
            vino_cepa_data.append((cv, cepas_sel[2], p3))
            
        maridajes_sel = random.sample(ids_maridajes, random.randint(1, 3))
        for m in maridajes_sel:
            vino_maridaje_data.append((cv, m))

    cursor.executemany("INSERT INTO vino_cepa (codigo_vino, id_cepa, porcentaje) VALUES (%s, %s, %s)", vino_cepa_data)
    cursor.executemany("INSERT INTO vino_maridaje (codigo_vino, id_maridaje) VALUES (%s, %s)", vino_maridaje_data)

    # 4. SALAS, EMPLEADOS Y TRANSPORTISTAS
    cursor.execute("SELECT id_localidad FROM localidad")
    ids_localidades = [row[0] for row in cursor.fetchall()]
    dias_semana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    salas_data = []
    for _ in range(30):  
        salas_data.append((fake.street_name(), random.randint(100, 9999), random.choice(dias_semana), random.choice(ids_localidades)))
        
    cursor.executemany("INSERT INTO sala_venta (calle, numero, dia_cierre_semanal, id_localidad) VALUES (%s, %s, %s, %s) RETURNING id_sala", salas_data)
    ids_salas = [row[0] for row in cursor.fetchall()]

    empleados_data = []
    for _ in range(100):
        empleados_data.append((fake.numerify('###########'), fake.name(), fake.date_between(start_date='-10y', end_date='today'), round(random.uniform(500000, 1500000), 2), random.choice(ids_salas)))
    cursor.executemany("INSERT INTO empleado (cuit, nombre, fecha_ingreso, salario, id_sala) VALUES (%s, %s, %s, %s, %s)", empleados_data)

    transportistas_data = []
    transportista_loc_data = []
    for i in range(1, 21): 
        cod_transp = f"TR-{str(i).zfill(3)}"
        transportistas_data.append((cod_transp, fake.company(), fake.numerify('###########'), fake.company_email(), fake.numerify('##########'), fake.address()[:250]))
        
        loc_cubiertas = random.sample(ids_localidades, random.randint(1, 5))
        for loc in loc_cubiertas:
            transportista_loc_data.append((cod_transp, loc))

    cursor.executemany("INSERT INTO transportista (codigo, razon_social, cuit, email, telefono, domicilio) VALUES (%s, %s, %s, %s, %s, %s)", transportistas_data)
    cursor.executemany("INSERT INTO transportista_localidad (codigo, id_localidad) VALUES (%s, %s)", transportista_loc_data) 

    # 5. CLIENTES Y SUBTIPOS
    tipos_clientes = ['socio', 'distribuidor', 'exportador']
    clientes_data = []
    
    for _ in range(20000):
        clientes_data.append((fake.name(), 'DNI', fake.unique.numerify('########'), fake.street_address(), random.choice(ids_localidades), fake.date_between(start_date='-5y', end_date='today'), random.choices(tipos_clientes, weights=[80, 15, 5])[0]))

    socios, distribuidores, exportadores = [], [], []
    
    cursor.executemany("INSERT INTO cliente (nombre_razon_social, tipo_doc, nro_doc, direccion, id_localidad, fecha_alta, tipo_cliente) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_cliente, tipo_cliente", clientes_data)
    
    for row in cursor.fetchall():
        id_cli, tipo = row[0], row[1]
        if tipo == 'socio':
            socios.append((id_cli,))
        elif tipo == 'distribuidor':
            distribuidores.append((id_cli, fake.city(), fake.bothify('HAB-####-??')))
        elif tipo == 'exportador':
            exportadores.append((id_cli, fake.country()[:50]))

    cursor.executemany("INSERT INTO socio_club (id_cliente) VALUES (%s)", socios)
    cursor.executemany("INSERT INTO distribuidor (id_cliente, zona_cobertura, nro_habilitacion) VALUES (%s, %s, %s)", distribuidores)
    cursor.executemany("INSERT INTO exportador (id_cliente, pais_destino) VALUES (%s, %s)", exportadores)

    permisos_data = []
    for exp in exportadores:
        for _ in range(random.randint(1, 3)):
            f_emision = fake.date_between(start_date='-2y', end_date='today')
            f_vencimiento = fake.date_between_dates(date_start=f_emision, date_end='+3y')
            permisos_data.append((fake.unique.bothify('PERM-########'), exp[0], f_emision, f_vencimiento))
    cursor.executemany("INSERT INTO permiso_exportacion (id_permiso, id_cliente, fecha_emision, fecha_vencimiento) VALUES (%s, %s, %s, %s)", permisos_data)

    # 6. STOCKS
    stock_deposito_data = [(cv, random.randint(500, 5000)) for cv in codigos_vinos]
    cursor.executemany("INSERT INTO stock_deposito (codigo_vino, cantidad) VALUES (%s, %s)", stock_deposito_data)

    stock_sala_data = []
    for s in ids_salas:
        vinos_sala = random.sample(codigos_vinos, random.randint(50, len(codigos_vinos)))
        for v in vinos_sala:
            stock_sala_data.append((s, v, random.randint(10, 500)))
    cursor.executemany("INSERT INTO stock_sala (id_sala, codigo_vino, cantidad) VALUES (%s, %s, %s)", stock_sala_data)

    # 7. INGRESOS Y TRANSFERENCIAS
    estados = ['en_confeccion', 'terminado', 'procesado']
    
    ingresos_data = []
    ingresos_renglones_data = []
    
    cursor.execute("SELECT codigo FROM transportista")
    codigos_transportistas = [row[0] for row in cursor.fetchall()]

    for _ in range(2000): 
        fecha = fake.date_between(start_date='-2y', end_date='today')
        estado = random.choices(estados, weights=[5, 10, 85])[0] 
        transp = random.choice(codigos_transportistas)
        bodega = random.choice(cuit_bodegas)
        
        ingresos_data.append((fecha, estado, transp, bodega))
        
    cursor.executemany("INSERT INTO ingreso (fecha, estado, cod_transportista, cuit_bodega) VALUES (%s, %s, %s, %s) RETURNING codigo", ingresos_data)
    ids_ingresos = [row[0] for row in cursor.fetchall()]
    
    for cod_ingreso in ids_ingresos:
        cant_vinos = random.randint(2, 5) 
        vinos_ingreso = random.sample(codigos_vinos, cant_vinos)
        for cv in vinos_ingreso:
            cantidad = random.randint(50, 500)
            ingresos_renglones_data.append((cod_ingreso, cv, cantidad))
            
    cursor.executemany("INSERT INTO ingreso_vino (codigo_ingreso, codigo_vino, cantidad) VALUES (%s, %s, %s)", ingresos_renglones_data)

    transferencias_data = []
    transferencias_renglones_data = []
    
    for _ in range(2500): 
        sala = random.choice(ids_salas)
        fecha = fake.date_between(start_date='-2y', end_date='today')
        estado = random.choices(estados, weights=[5, 10, 85])[0]
        
        transferencias_data.append((sala, fecha, estado))
        
    cursor.executemany("INSERT INTO transferencia (id_sala, fecha_confeccion, estado) VALUES (%s, %s, %s) RETURNING nro_transferencia", transferencias_data)
    ids_transferencias = [row[0] for row in cursor.fetchall()]
    
    for nro_transf in ids_transferencias:
        cant_vinos = random.randint(2, 5) 
        vinos_transf = random.sample(codigos_vinos, cant_vinos)
        for cv in vinos_transf:
            cantidad = random.randint(12, 120)
            transferencias_renglones_data.append((nro_transf, cv, cantidad))
            
    cursor.executemany("INSERT INTO transferencia_vino (nro_transferencia, codigo_vino, cantidad) VALUES (%s, %s, %s)", transferencias_renglones_data)

    # 8. COMPROBANTES DE VENTA
    precios_vinos = {v[0]: v[6] for v in vinos} 
    ids_clientes_todos = [c[0] for c in socios] + [c[0] for c in distribuidores] + [c[0] for c in exportadores]
    
    mapa_descuentos = {'socio': 10.0, 'distribuidor': 20.0, 'exportador': 30.0}
    tipo_cli_dict = {c[0]: c[6] for c in zip([row[0] for row in cursor.execute("SELECT id_cliente, tipo_cliente FROM cliente").fetchall()], [row[1] for row in cursor.execute("SELECT id_cliente, tipo_cliente FROM cliente").fetchall()])}

    comprobantes_data = []
    renglones_totales_data = []
    nro_comprobante_secuencia = 1 

    for _ in range(150000):
        id_cli = random.choice(ids_clientes_todos)
        tipo_c = tipo_cli_dict.get(id_cli, 'socio')
        porcentaje_desc = mapa_descuentos[tipo_c]
        id_sala = random.choice(ids_salas)
        fecha_comp = fake.date_between(start_date='-2y', end_date='today')
        
        cant_renglones = random.randint(1, 5) 
        vinos_compra = random.sample(codigos_vinos, cant_renglones)
        
        subtotal_comprobante = 0.0
        for cv in vinos_compra:
            cantidad = random.randint(1, 12)
            precio_unitario = precios_vinos[cv]
            subtotal_renglon = round(cantidad * precio_unitario, 2)
            subtotal_comprobante += subtotal_renglon
            
            renglones_totales_data.append((
                nro_comprobante_secuencia, cv, cantidad, precio_unitario, porcentaje_desc, subtotal_renglon
            ))
            
        descuento_comprobante = round(subtotal_comprobante * (porcentaje_desc / 100.0), 2)
        total_comprobante = round(subtotal_comprobante - descuento_comprobante, 2)
        
        comprobantes_data.append((
            fecha_comp, id_cli, id_sala, subtotal_comprobante, descuento_comprobante, total_comprobante
        ))
        nro_comprobante_secuencia += 1

    cursor.executemany("INSERT INTO comprobante (fecha, id_cliente, id_sala, subtotal, descuento, total) VALUES (%s, %s, %s, %s, %s, %s)", comprobantes_data)
    
    chunk_size = 50000
    for i in range(0, len(renglones_totales_data), chunk_size):
        cursor.executemany(
            "INSERT INTO vino_comprobante (nro_comprobante, codigo_vino, cantidad, precio_unitario, descuento, subtotal) VALUES (%s, %s, %s, %s, %s, %s)", 
            renglones_totales_data[i:i+chunk_size]
        )

    # 9. FINCAS, PARCELAS, LOTES Y ANÁLISIS DE CALIDAD
    cursor.execute("SELECT id_departamento FROM departamento")
    ids_deptos = [row[0] for row in cursor.fetchall()]

    fincas = []
    for _ in range(50): 
        nombre = f"Finca {fake.last_name()}"
        superficie = round(random.uniform(10.0, 500.0), 2)
        depto = random.choice(ids_deptos)
        fincas.append((nombre, superficie, depto))

    cursor.executemany(
        "INSERT INTO finca (nombre, superficie_total, id_departamento) VALUES (%s, %s, %s) RETURNING id_finca",
        fincas
    )
    ids_fincas = [row[0] for row in cursor.fetchall()]

    parcelas = []
    for id_finca in ids_fincas:
        nro_parcelas_finca = random.randint(3, 10)
        for nro_parcela in range(1, nro_parcelas_finca + 1):
            superficie_parcela = round(random.uniform(2.0, 15.0), 2)
            ano_plantacion = random.randint(1990, 2022)
            cepa = random.choice(ids_cepas)
            parcelas.append((nro_parcela, id_finca, superficie_parcela, ano_plantacion, cepa))

    cursor.executemany(
        "INSERT INTO parcela (nro_parcela, id_finca, superficie, ano_plantacion, id_cepa) VALUES (%s, %s, %s, %s, %s)",
        parcelas
    )

    lotes = []
    analisis = []
    campanas = [2022, 2023, 2024, 2025, 2026]

    for p in parcelas:
        nro_parcela, id_finca = p[0], p[1]
        campanas_cosechadas = random.sample(campanas, random.randint(1, len(campanas)))
        
        for campana in campanas_cosechadas:
            fecha_cosecha = fake.date_between_dates(date_start=f"-{2026-campana}y", date_end=f"-{2026-campana}y")
            kilos = round(random.uniform(1500.0, 8000.0), 2)
            bodega_destino = random.choice(cuit_bodegas)
            lotes.append((nro_parcela, id_finca, campana, fecha_cosecha, kilos, bodega_destino))

    cursor.executemany(
        "INSERT INTO lote_uva (nro_parcela, id_finca, campana, fecha_cosecha, kilos_cosechados, cuit_bodega) VALUES (%s, %s, %s, %s, %s, %s) RETURNING nro_lote",
        lotes
    )
    ids_lotes = [row[0] for row in cursor.fetchall()]

    for nro_lote in ids_lotes:
        cantidad_analisis = random.randint(1, 3)
        for _ in range(cantidad_analisis):
            fecha = fake.date_this_year()
            ph = round(random.uniform(3.2, 3.8), 2)
            acidez = round(random.uniform(4.5, 7.5), 2)
            brix = round(random.uniform(22.0, 26.0), 2)
            analisis.append((fecha, ph, acidez, brix, nro_lote))

    cursor.executemany(
        "INSERT INTO analisis_calidad (fecha, ph, acidez_total, g_brix, nro_lote) VALUES (%s, %s, %s, %s, %s)",
        analisis
    )

    print("Datos transaccionales generados con éxito.")

if __name__ == "__main__":
    try:
        with psycopg.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        ) as conn:
            with conn.cursor() as cur:
                print("Iniciando carga de datos...")

                cargar_csv(cur, 'cepa', 'nombre, tipo', 'csv/cepas.csv')
                cargar_csv(cur, 'maridaje', 'nombre, temperatura', 'csv/maridajes.csv')
                cargar_csv(cur, 'provincia', 'nombre', 'csv/provincias.csv')
                cargar_csv(cur, 'departamento', 'id_provincia, nombre_departamento', 'csv/departamentos.csv')
                cargar_csv(cur, 'localidad', 'nombre, id_provincia, codigo_postal, encargado_localidad', 'csv/localidades.csv')

                generar_datos_produccion(cur)

            conn.commit()
            print("Proceso finalizado. Base de datos poblada exitosamente.")

    except Exception as e:
        print(f"Error durante la ejecución: {e}")