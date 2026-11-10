// 1. VARIABLES GLOBALES
const parametros = new URLSearchParams(window.location.search);
const codigoVino = parametros.get('codigo_vino');

// 2. FUNCIÓN PARA CARGAR LOS DATOS AL ENTRAR
async function cargarDatosVino() {
    if (!codigoVino) {
        mostrarError("No se especificó un vino para editar.");
        return;
    }

    try {
        const vino = await fetchAPI(`/v1/api/vinos/${codigoVino}`);
        
        if (vino) {
            document.getElementById('nombre').value = vino.nombre || '';
            document.getElementById('tipo').value = vino.tipo || '';
            document.getElementById('anada').value = vino.anada || '';
            document.getElementById('volumen').value = vino.volumen_ml || '';
            document.getElementById('graduacion').value = vino.graduacion || '';
            document.getElementById('precio').value = vino.precio || '';
            document.getElementById('cuit').value = vino.cuit_bodega || '';
            
            const listaCepas = document.getElementById('lista-cepas');
            const filaAgregarCepa = document.getElementById('fila-agregar-cepa');
            if (vino.composicion && listaCepas) {
                vino.composicion.forEach(c => {
                    const li = crearItemLista(`${c.cepa} (${c.porcentaje}%)`, c.id_cepa, c.porcentaje);
                    listaCepas.insertBefore(li, filaAgregarCepa);
                });
            }
            
            const listaMaridajes = document.getElementById('lista-maridajes');
            const filaAgregarMaridaje = document.getElementById('fila-agregar-maridaje');
            if (vino.maridajes && listaMaridajes) {
                vino.maridajes.forEach(m => {
                    const li = crearItemLista(m.maridaje, m.id_maridaje);
                    listaMaridajes.insertBefore(li, filaAgregarMaridaje);
                });
            }
        }
    } catch (error) {
        console.error(error);
        mostrarError("Ocurrió un error al intentar cargar la información del vino.");
    }
}

// 3. FUNCIÓN AUXILIAR PARA CREAR LAS FILAS DE LAS LISTAS
function crearItemLista(texto, idElemento = null, porcentaje = null) {
    const li = document.createElement('li');
    li.className = 'item';
    
    // Guardamos los datos técnicos ocultos en el HTML (dataset)
    if (idElemento) li.dataset.id = idElemento;
    if (porcentaje) li.dataset.porcentaje = porcentaje;

    li.innerHTML = `
        <span class="item__texto">${texto}</span>
        <button class="item__boton btn-eliminar-item" type="button" aria-label="Quitar">−</button>
    `;
    
    // Funcionalidad del botón "-"
    li.querySelector('.btn-eliminar-item').addEventListener('click', () => {
        li.remove();
    });
    
    return li;
}

// 4. FUNCIÓN PARA GUARDAR (LA QUE ME PREGUNTASTES)
async function guardarCambios() {
    const datosActualizados = {
        nombre: document.getElementById('nombre').value,
        tipo: document.getElementById('tipo').value,
        anada: parseInt(document.getElementById('anada').value) || 0,
        volumen_ml: parseInt(document.getElementById('volumen').value) || 0,
        graduacion: parseFloat(document.getElementById('graduacion').value) || 0,
        precio: parseFloat(document.getElementById('precio').value) || 0,
        cuit_bodega: document.getElementById('cuit').value,
        cepas: [],
        maridajes: []
    };

    // Extraer Cepas existentes
    document.querySelectorAll('#lista-cepas .item:not(#fila-agregar-cepa)').forEach(li => {
        if (li.dataset.id && li.dataset.porcentaje) {
            datosActualizados.cepas.push({
                id_cepa: parseInt(li.dataset.id),
                porcentaje: parseFloat(li.dataset.porcentaje)
            });
        }
    });

    // Extraer Maridajes existentes
    document.querySelectorAll('#lista-maridajes .item:not(#fila-agregar-maridaje)').forEach(li => {
        if (li.dataset.id) {
            datosActualizados.maridajes.push(parseInt(li.dataset.id));
        }
    });

    try {
        const respuesta = await fetch(`http://localhost:8000/v1/api/vinos/${codigoVino}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });

        if (respuesta.ok) {
            window.location.href = `detalle.html?codigo_vino=${codigoVino}`;
        } else {
            const errorData = await respuesta.json();
            let mensaje = "Error al guardar.";
            if (errorData.detail && Array.isArray(errorData.detail)) {
                const campos = errorData.detail.map(e => e.loc[e.loc.length - 1]).join(', ');
                mensaje = `Revisa el formato de los siguientes campos: ${campos}`;
            }
            mostrarError(mensaje);
        }
    } catch (error) {
        mostrarError("Error de conexión con el servidor.");
    }
}

// 5. FUNCIÓN PARA MOSTRAR LA CAJA DE ERROR
function mostrarError(mensaje) {
    const errorBox = document.getElementById('caja-error');
    if (errorBox) {
        errorBox.textContent = mensaje;
        errorBox.style.display = 'block';
    }
}

// 6. INICIALIZADOR (ARRANCA CUANDO CARGA LA PÁGINA)
document.addEventListener('DOMContentLoaded', () => {
    // Reparamos el botón cancelar inyectándole el código del vino
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar && codigoVino) {
        btnCancelar.href = `detalle.html?codigo_vino=${codigoVino}`;
    }

    // Iniciamos la carga de datos
    cargarDatosVino();
    
    // Le asignamos la función guardar al botón "Guardar cambios"
    const btnGuardar = document.getElementById('btn-guardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCambios);
    }
});