const parametros = new URLSearchParams(window.location.search);
const nroTransferencia = parametros.get('nro');
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
        // ASUNCIÓN: Tus compañeros deben haber creado el endpoint GET /v1/api/transferencias/{nro}
        // Si no lo hicieron, diles que hagan uno que devuelva cabecera y un array de renglones.
        const transfer = await fetchAPI(`/v1/api/transferencias/${nroTransferencia}`);
        
        if (!transfer) throw new Error("No se encontró la transferencia.");

        estadoActual = (transfer.estado || 'en_confeccion').toLowerCase();

        // 1. Llenar cabecera
        document.getElementById('nro-transferencia').value = String(nroTransferencia).padStart(4, '0');
        document.getElementById('fecha-transferencia').value = transfer.fecha_confeccion || transfer.fecha || '00/00/00';
        document.getElementById('sala-destino').value = transfer.nombre_sala || transfer.sala_destino || `Sala N° ${transfer.id_sala}`;
        
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
        li.innerHTML = `
            <span>${r.nombre_vino || r.codigo_vino}</span>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <strong>${r.cantidad} u.</strong>
            </div>
        `;
        lista.appendChild(li);
    });
}

function configurarInterfazPorEstado() {
    const seccionAgregar = document.getElementById('seccion-agregar-vino');
    const contenedorBotones = document.getElementById('contenedor-botones');
    contenedorBotones.innerHTML = ''; // Limpiar botones

    const btnVolver = `<a href="transferencias.html" class="boton" style="background: #6b6b6b; text-align: center; line-height: 3.75rem;">Volver al historial</a>`;

    if (estadoActual === 'en_confeccion') {
        // Habilitar carga de renglones
        seccionAgregar.style.display = 'flex';
        configurarBuscadorVino();
        
        contenedorBotones.innerHTML = `
            <button type="button" class="boton" id="btn-terminar" style="background: #2563eb;">Marcar como TERMINADO</button>
            ${btnVolver}
        `;
        document.getElementById('btn-terminar').addEventListener('click', () => cambiarEstado('terminar'));
        
    } else if (estadoActual === 'terminado') {
        // Bloqueado (RN-12). Solo se puede procesar (RN-11)
        seccionAgregar.style.display = 'none';
        contenedorBotones.innerHTML = `
            <button type="button" class="boton" id="btn-procesar" style="background: #16a34a;">PROCESAR Transferencia</button>
            ${btnVolver}
        `;
        document.getElementById('btn-procesar').addEventListener('click', () => cambiarEstado('procesar'));
        
    } else { // procesado
        // Todo bloqueado, sin acciones
        seccionAgregar.style.display = 'none';
        contenedorBotones.innerHTML = btnVolver;
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
            if (todosLosVinos.length === 0) {
                try { todosLosVinos = await fetchAPI('/v1/api/vinos?limit=100&offset=0'); } 
                catch (error) { return; }
            }
            const resultados = todosLosVinos.filter(v => 
                v.nombre.toLowerCase().includes(texto) || (v.codigo_vino && v.codigo_vino.toLowerCase().includes(texto))
            ).slice(0, 10);

            listaVinos.innerHTML = '';
            if (resultados.length > 0) {
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