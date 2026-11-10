const parametros = new URLSearchParams(window.location.search);
const nroTransferencia = parametros.get('nro');
let todasLasSalas = []; 
let todosLosVinos = [];
let estadoActual = "";

document.addEventListener('DOMContentLoaded', () => {
    if (!nroTransferencia) {
        mostrarError("No se especificó ninguna transferencia.");
        return;
    }
    cargarTransferencia();
});

async function cargarTransferencia() {
    try {
        const transfer = await fetchAPI(`/v1/api/transferencias/${nroTransferencia}`);
        
        if (!transfer) throw new Error("No se encontró la transferencia.");

        estadoActual = (transfer.estado || 'en_confeccion').toLowerCase();

        // 1. Llenar cabecera
        document.getElementById('nro-transferencia').value = String(nroTransferencia).padStart(4, '0');
        document.getElementById('fecha-transferencia').value = transfer.fecha_confeccion || transfer.fecha || '00/00/00';
        
        const nombreSala = transfer.nombre_sala || transfer.sala_destino || `Sala N° ${transfer.id_sala}`;
        document.getElementById('sala-destino-readonly').value = nombreSala;
        
        // Actualizamos también el buscador para que muestre el nuevo nombre
        document.getElementById('sala-destino').value = nombreSala;
        
        const inputEstado = document.getElementById('estado-transferencia');
        inputEstado.value = estadoActual.replace('_', ' ').toUpperCase();
        
        // Estilos del estado
        if (estadoActual === 'en_confeccion') {
            inputEstado.style.cssText = "background: #fffbeb; color: #d97706; font-weight: bold; border-color: #d97706;";
        } else if (estadoActual === 'terminado') {
            inputEstado.style.cssText = "background: #eff6ff; color: #2563eb; font-weight: bold; border-color: #2563eb;";
        } else {
            inputEstado.style.cssText = "background: #f0fdf4; color: #16a34a; font-weight: bold; border-color: #16a34a;";
        }

        // 2. Llenar renglones
        dibujarRenglones(transfer.renglones || []);

        // 3. Configurar interfaz según el estado (Reglas RN-10, 11 y 12)
        configurarInterfazPorEstado();

    } catch (error) {
        mostrarError("Error al cargar los datos de la transferencia.");
        console.error(error);
    }
}

function dibujarRenglones(renglones) {
    const lista = document.getElementById('lista-renglones');
    lista.innerHTML = '';
    
    if (renglones.length === 0) {
        lista.innerHTML = '<p style="color: var(--placeholder);">No hay vinos cargados aún.</p>';
        return;
    }

    renglones.forEach(r => {
        const li = document.createElement('li');
        li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px dashed #ccc;';
        
        if (estadoActual === 'en_confeccion') {
            // Renglón Editable (RN-12)
            li.innerHTML = `
                <span>${r.nombre_vino || r.codigo_vino}</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="number" class="input-editar-cantidad" data-codigo="${r.codigo_vino}" value="${r.cantidad}" min="1" style="width: 4rem; text-align: center; border: 1px solid var(--tinta); border-radius: 4px; padding: 0.2rem; font-weight: bold;">
                    <button type="button" class="btn-borrar-renglon" data-codigo="${r.codigo_vino}" style="display: grid; place-items: center; background: #502033; color: white; border: none; border-radius: 50%; width: 2.2rem; height: 2.2rem; cursor: pointer; font-weight: bold; font-size: 1.2rem;">X</button>
                </div>
            `;
        } else {
            // Renglón Bloqueado (Terminado / Procesado)
            li.innerHTML = `
                <span>${r.nombre_vino || r.codigo_vino}</span>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <strong>${r.cantidad} u.</strong>
                </div>
            `;
        }
        lista.appendChild(li);
    });

    // Eventos para Borrar
    document.querySelectorAll('.btn-borrar-renglon').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const codigoVino = e.target.dataset.codigo;
            try {
                await fetchAPI(`/v1/api/transferencias/${nroTransferencia}/renglones/${codigoVino}`, { method: 'DELETE' });
                cargarTransferencia(); // Recargar
            } catch (error) { mostrarError("Error al eliminar el vino. ¿El backend agregó la ruta DELETE?"); }
        });
    });

    // Eventos para Modificar Cantidad
    let timeoutCantidad;
    document.querySelectorAll('.input-editar-cantidad').forEach(input => {
        input.addEventListener('input', (e) => {
            clearTimeout(timeoutCantidad);
            const codigoVino = e.target.dataset.codigo;
            const nuevaCantidad = parseInt(e.target.value);
            
            if (isNaN(nuevaCantidad) || nuevaCantidad < 1) return;

            // Enviamos el PUT después de que el usuario deje de escribir por 500ms
            timeoutCantidad = setTimeout(async () => {
                try {
                    await fetchAPI(`/v1/api/transferencias/${nroTransferencia}/renglones/${codigoVino}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cantidad: nuevaCantidad })
                    });
                    document.getElementById('caja-error').style.display = 'none';
                } catch (error) { mostrarError("Error al actualizar la cantidad."); }
            }, 500);
        });
    });
}

// Reemplaza configurarInterfazPorEstado por esta:
function configurarInterfazPorEstado() {
    const seccionAgregar = document.getElementById('seccion-agregar-vino');
    const contenedorBotones = document.getElementById('contenedor-botones');
    const readonlySala = document.getElementById('sala-destino-readonly');
    const editarSala = document.getElementById('contenedor-editar-sala');
    
    contenedorBotones.innerHTML = ''; 
    const btnVolver = `<a href="transferencias.html" class="boton" style="background: #6b6b6b; text-align: center; line-height: 3.75rem;">Volver al historial</a>`;

    if (estadoActual === 'en_confeccion') {
        seccionAgregar.style.display = 'flex';
        readonlySala.style.display = 'none';
        editarSala.style.display = 'block';
        
        configurarBuscadorVino();
        configurarEditorSala(); // Habilitamos la edición de sala
        
        contenedorBotones.innerHTML = `<button type="button" class="boton" id="btn-terminar" style="background: #2563eb;">Marcar como TERMINADO</button>${btnVolver}`;
        document.getElementById('btn-terminar').addEventListener('click', () => cambiarEstado('terminar'));
        
    } else if (estadoActual === 'terminado') {
        seccionAgregar.style.display = 'none';
        readonlySala.style.display = 'block';
        editarSala.style.display = 'none';
        
        contenedorBotones.innerHTML = `<button type="button" class="boton" id="btn-procesar" style="background: #16a34a;">PROCESAR Transferencia</button>${btnVolver}`;
        document.getElementById('btn-procesar').addEventListener('click', () => cambiarEstado('procesar'));
        
    } else { 
        seccionAgregar.style.display = 'none';
        readonlySala.style.display = 'block';
        editarSala.style.display = 'none';
        contenedorBotones.innerHTML = btnVolver;
    }
}

// Agrega esta nueva función para manejar el cambio de sala
function configurarEditorSala() {
    const inputSala = document.getElementById('sala-destino');
    const listaSalas = document.getElementById('lista-salas');

    inputSala.addEventListener('click', async () => {
        if (todasLasSalas.length === 0) {
            try { todasLasSalas = await fetchAPI('/v1/api/salas'); } 
            catch (error) { console.error(error); }
        }
        renderizarSalas(todasLasSalas);
    });

    inputSala.addEventListener('input', () => {
        const texto = inputSala.value.trim().toLowerCase();
        const filtradas = todasLasSalas.filter(s => s.nombre.toLowerCase().includes(texto));
        renderizarSalas(filtradas);
    });

    function renderizarSalas(salas) {
        listaSalas.innerHTML = '';
        if (salas.length > 0) {
            salas.forEach(s => {
                const li = document.createElement('li');
                li.className = 'item';
                li.innerHTML = `<button class="item__opcion" type="button">${s.nombre}</button>`;
                li.querySelector('button').addEventListener('click', async () => {
                    listaSalas.style.display = 'none';
                    try {
                        // Enviar el PUT al backend
                        await fetchAPI(`/v1/api/transferencias/${nroTransferencia}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id_sala: s.id_sala })
                        });
                        cargarTransferencia(); // Recargar para ver el cambio aplicado
                    } catch (error) { mostrarError("Error al cambiar la sala."); }
                });
                listaSalas.appendChild(li);
            });
            listaSalas.style.display = 'block';
        } else {
            listaSalas.style.display = 'none';
        }
    }
}

async function cambiarEstado(accion) { // 'terminar' o 'procesar'
    try {
        const res = await fetchAPI(`/v1/api/transferencias/${nroTransferencia}/${accion}`, { method: 'POST' });
        if (res) {
            window.location.reload(); // Recargar para ver el nuevo estado
        }
    } catch (error) {
        mostrarError(`Error al ${accion} la transferencia. Verifique el stock o el estado.`);
    }
}

// --- LÓGICA DEL BUSCADOR DE VINOS ---
function configurarBuscadorVino() {
    const inputBuscar = document.getElementById('buscar-vino');
    const listaVinos = document.getElementById('lista-vinos');
    const inputCantidad = document.getElementById('cantidad-vino');
    const btnAdd = document.getElementById('btn-add-renglon');
    let timeoutBusqueda;

    inputBuscar.addEventListener('input', () => {
        clearTimeout(timeoutBusqueda);
        inputBuscar.dataset.codigo = "";
        const texto = inputBuscar.value.trim().toLowerCase();
        if (texto.length < 2) { listaVinos.style.display = 'none'; return; }

        timeoutBusqueda = setTimeout(async () => {
            try {
                // Llamamos directamente al backend pasándole lo que el usuario escribió
                const resultados = await fetchAPI(`/v1/api/vinos?nombre=${encodeURIComponent(texto)}&limit=10&offset=0`);

                listaVinos.innerHTML = '';
                if (resultados && resultados.length > 0) {
                    resultados.forEach(v => {
                        const li = document.createElement('li');
                        li.className = 'item';
                        li.innerHTML = `<button class="item__opcion" type="button" style="text-align:left;">${v.nombre}</button>`;
                        
                        li.querySelector('button').addEventListener('click', () => {
                            inputBuscar.value = v.nombre;
                            inputBuscar.dataset.codigo = v.codigo_vino;
                            listaVinos.style.display = 'none';
                            inputCantidad.focus();
                        });
                        listaVinos.appendChild(li);
                    });
                    listaVinos.style.display = 'block';
                } else {
                    listaVinos.style.display = 'none';
                }
            } catch (error) {
                console.error("Error en la búsqueda:", error);
            }
        }, 200);
    });

    // Agregar renglón dispara el POST inmediatamente
    btnAdd.addEventListener('click', async () => {
        const codigo = inputBuscar.dataset.codigo;
        const cantidad = parseInt(inputCantidad.value);

        if (!codigo) { mostrarError("Selecciona un vino."); return; }
        if (isNaN(cantidad) || cantidad < 1) { mostrarError("Cantidad inválida."); return; }

        try {
            await fetchAPI(`/v1/api/transferencias/${nroTransferencia}/renglones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo_vino: codigo, cantidad: cantidad })
            });
            inputBuscar.value = ""; inputBuscar.dataset.codigo = ""; inputCantidad.value = "";
            document.getElementById('caja-error').style.display = 'none';
            cargarTransferencia(); // Recargar para actualizar la lista de abajo
        } catch (error) {
            mostrarError("Error al agregar el vino. Posible duplicado.");
        }
    });

    document.addEventListener('click', (e) => {
        if (!listaVinos.contains(e.target) && e.target !== inputBuscar) listaVinos.style.display = 'none';
    });
}

function mostrarError(mensaje) {
    const errorBox = document.getElementById('caja-error');
    errorBox.textContent = mensaje;
    errorBox.style.display = 'block';
}