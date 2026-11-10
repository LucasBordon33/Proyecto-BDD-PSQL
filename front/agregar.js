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
        if (idElemento) {
            const opcion = document.querySelector(`#select-cepa option[value="${idElemento}"]`);
            if (opcion) opcion.disabled = false;
        }
    });
    
    return li;
}

async function crearVino() {
    const codigoVino = document.getElementById('codigo_vino').value.trim();
    
    if (!codigoVino) {
        mostrarError("El código de vino es obligatorio.");
        return;
    }

    const datosNuevos = {
        codigo_vino: codigoVino,
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

    let porcentajeTotal = 0;
    document.querySelectorAll('#lista-cepas .item:not(#fila-agregar-cepa)').forEach(li => {
        if (li.dataset.id && li.dataset.porcentaje) {
            const porcentajeActual = parseFloat(li.dataset.porcentaje);
            porcentajeTotal += porcentajeActual;
            
            datosNuevos.cepas.push({
                id_cepa: parseInt(li.dataset.id),
                porcentaje: porcentajeActual
            });
        }
    });

    if (datosNuevos.cepas.length > 0 && porcentajeTotal !== 100) {
        mostrarError(`La composición de cepas debe sumar exactamente 100%. (Actual: ${porcentajeTotal}%)`);
        return; 
    }

    // Extraer maridajes
    document.querySelectorAll('input[name="maridaje"]:checked').forEach(checkbox => {
        datosNuevos.maridajes.push(parseInt(checkbox.value));
    });

    // Petición POST
    try {
        const respuesta = await fetchAPI('/v1/api/vinos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosNuevos)
        });

        if (respuesta.ok) {
            window.location.href = `index.html`;
        } else {
            const errorData = await respuesta.json();
            let mensaje = "Error al crear el vino.";
            
            if (errorData.detail && typeof errorData.detail === 'string') {
                mensaje = errorData.detail; // Ej: "Ya existe un vino con ese código"
            } else if (errorData.detail && Array.isArray(errorData.detail)) {
                const campos = errorData.detail.map(e => e.loc[e.loc.length - 1]).join(', ');
                mensaje = `Revisa el formato de: ${campos}`;
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

// Inicialización de eventos
document.addEventListener('DOMContentLoaded', () => {
    // Evento del botón "Crear Vino"
    const btnCrear = document.getElementById('btn-crear');
    if (btnCrear) {
        btnCrear.addEventListener('click', crearVino);
    }
    
    // Evento del botón "+" de cepas
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
            
            // Bloqueamos la opción para que no la repita
            opcionSeleccionada.disabled = true;
            
            select.value = "";
            inputPorcentaje.value = "";
            document.getElementById('caja-error').style.display = 'none';
        });
    }
});