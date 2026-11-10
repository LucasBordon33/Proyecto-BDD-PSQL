const parametros = new URLSearchParams(window.location.search);
const codigoVino = parametros.get('codigo_vino');

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
                    
                    // BLOQUEO: Desactivamos esta cepa en el select porque ya vino de la BD
                    const opcion = document.querySelector(`#select-cepa option[value="${c.id_cepa}"]`);
                    if (opcion) opcion.disabled = true;
                });
            }
            
            const listaMaridajes = document.getElementById('lista-maridajes');
            const filaAgregarMaridaje = document.getElementById('fila-agregar-maridaje');
            // 3. Pre-llenamos los Maridajes (Checkboxes)
            if (vino.maridajes) {
                vino.maridajes.forEach(m => {
                    const checkbox = document.querySelector(`input[name="maridaje"][value="${m.id_maridaje}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    } catch (error) {
        console.error(error);
        mostrarError("Ocurrió un error al intentar cargar la información del vino.");
    }
}

function crearItemLista(texto, idElemento = null, porcentaje = null) {
    const li = document.createElement('li');
    li.className = 'item';
    
    if (idElemento) li.dataset.id = idElemento;
    if (porcentaje) li.dataset.porcentaje = porcentaje;

    li.innerHTML = `
        <span class="item__texto">${texto}</span>
        <button class="item__boton btn-eliminar-item" type="button" aria-label="Quitar">−</button>
    `;
    
    li.querySelector('.btn-eliminar-item').addEventListener('click', () => {
        li.remove();
        
        // DESBLOQUEO: Si el usuario elimina la fila, volvemos a habilitar la cepa en el select
        if (idElemento) {
            const opcion = document.querySelector(`#select-cepa option[value="${idElemento}"]`);
            if (opcion) opcion.disabled = false;
        }
    });
    
    return li;
}

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

    // Extraer Cepas y calcular el total del porcentaje
    let porcentajeTotal = 0;
    
    document.querySelectorAll('#lista-cepas .item:not(#fila-agregar-cepa)').forEach(li => {
        if (li.dataset.id && li.dataset.porcentaje) {
            const porcentajeActual = parseFloat(li.dataset.porcentaje);
            porcentajeTotal += porcentajeActual;
            
            datosActualizados.cepas.push({
                id_cepa: parseInt(li.dataset.id),
                porcentaje: porcentajeActual
            });
        }
    });

    // VALIDACIÓN ESPECÍFICA: Si se pasa del 100%, frenamos todo y mostramos el error
    if (porcentajeTotal > 100) {
        mostrarError(`La composición de cepas no puede superar el 100%. (Actual: ${porcentajeTotal}%)`);
        return; // Esto detiene la ejecución, no se envía nada al backend
    }

    // Extraer Maridajes de los checkboxes marcados
    document.querySelectorAll('input[name="maridaje"]:checked').forEach(checkbox => {
        datosActualizados.maridajes.push(parseInt(checkbox.value));
    });

    try {
        const respuesta = await fetchAPI(`/v1/api/vinos/${codigoVino}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });

        if (respuesta.ok) {
            window.location.href = `detalle.html?codigo_vino=${codigoVino}`;
        } else {
            const errorData = await respuesta.json();
            let mensaje = "Error al guardar.";
            
            // Si el backend es el que lanza el error de 100%, lo capturamos aquí
            if (errorData.detail && typeof errorData.detail === 'string') {
                mensaje = errorData.detail;
            } else if (errorData.detail && Array.isArray(errorData.detail)) {
                const campos = errorData.detail.map(e => e.loc[e.loc.length - 1]).join(', ');
                mensaje = `Revisa el formato de los siguientes campos: ${campos}`;
            }
            
            mostrarError(mensaje);
        }
    } catch (error) {
        mostrarError("Error de conexión con el servidor.");
    }
}

function mostrarError(mensaje) {
    const errorBox = document.getElementById('caja-error');
    if (errorBox) {
        errorBox.textContent = mensaje;
        errorBox.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar && codigoVino) {
        btnCancelar.href = `detalle.html?codigo_vino=${codigoVino}`;
    }

    cargarDatosVino();
    
    const btnGuardar = document.getElementById('btn-guardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCambios);
    }
    
    // LÓGICA DEL BOTÓN "+" DE CEPAS
    const btnAddCepa = document.getElementById('btn-add-cepa');
    if (btnAddCepa) {
        btnAddCepa.addEventListener('click', () => {
            const select = document.getElementById('select-cepa');
            const inputPorcentaje = document.getElementById('input-porcentaje');
            
            const idCepa = select.value;
            const opcionSeleccionada = select.options[select.selectedIndex];
            const nombreCepa = idCepa ? opcionSeleccionada.text : ''; 
            const porcentaje = parseFloat(inputPorcentaje.value);
            
            if (!idCepa) {
                mostrarError("Por favor, selecciona una cepa de la lista.");
                return;
            }
            if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
                mostrarError("Ingresa un porcentaje válido entre 1 y 100.");
                return;
            }
            
            const listaCepas = document.getElementById('lista-cepas');
            const filaAgregar = document.getElementById('fila-agregar-cepa');
            
            const li = crearItemLista(`${nombreCepa} (${porcentaje}%)`, idCepa, porcentaje);
            listaCepas.insertBefore(li, filaAgregar);
            
            // BLOQUEO: Desactivamos la opción recién agregada para que no se duplique
            opcionSeleccionada.disabled = true;
            
            select.value = "";
            inputPorcentaje.value = "";
            document.getElementById('caja-error').style.display = 'none';
        });
    }
});