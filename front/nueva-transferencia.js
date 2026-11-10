let todasLasSalas = [];
let todosLosVinos = [];
let renglonesBase = []; 

document.addEventListener('DOMContentLoaded', () => {
    configurarBuscadorSala();
    configurarBuscadorVino();
    
    document.getElementById('btn-borrador').addEventListener('click', () => registrarTransferencia('en_confeccion'));
    document.getElementById('btn-solicitar').addEventListener('click', () => registrarTransferencia('terminado'));
});

// --- BUSCADOR DE SALA ---
function configurarBuscadorSala() {
    const inputSala = document.getElementById('sala-destino');
    const listaSalas = document.getElementById('lista-salas');
    const labelSala = document.getElementById('sala-seleccionada');

    inputSala.addEventListener('click', async () => {
        if (todasLasSalas.length === 0) {
            try { todasLasSalas = await fetchAPI('/v1/api/salas'); } 
            catch (error) { console.error(error); }
        }
        renderizarSalas(todasLasSalas);
    });

    inputSala.addEventListener('input', () => {
        const texto = inputSala.value.trim().toLowerCase();
        inputSala.dataset.id = "";
        labelSala.style.display = 'none';
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
                li.querySelector('button').addEventListener('click', () => {
                    inputSala.value = "";
                    inputSala.dataset.id = s.id_sala;
                    labelSala.textContent = `Seleccionada: ${s.nombre}`;
                    labelSala.style.display = 'block';
                    listaSalas.style.display = 'none';
                });
                listaSalas.appendChild(li);
            });
            listaSalas.style.display = 'block';
        } else {
            listaSalas.style.display = 'none';
        }
    }
}

// --- BUSCADOR DE VINOS Y RENGLONES ---
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


    btnAdd.addEventListener('click', () => {
        const codigo = inputBuscar.dataset.codigo;
        const nombre = inputBuscar.value;
        const cantidad = parseInt(inputCantidad.value);

        if (!codigo || !nombre) { mostrarError("Selecciona un vino del buscador."); return; }
        if (isNaN(cantidad) || cantidad < 1) { mostrarError("La cantidad debe ser mayor a 0."); return; }

        // Evitar duplicados (se suma la cantidad si ya existe)
        const existente = renglonesBase.find(r => r.codigo_vino === codigo);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            renglonesBase.push({ codigo_vino: codigo, cantidad: cantidad, nombre: nombre });
        }

        inputBuscar.value = "";
        inputBuscar.dataset.codigo = "";
        inputCantidad.value = "";
        document.getElementById('caja-error').style.display = 'none';
        dibujarRenglones();
    });
}

function dibujarRenglones() {
    const lista = document.getElementById('lista-renglones');
    lista.innerHTML = '';
    renglonesBase.forEach((r, index) => {
        const li = document.createElement('li');
        li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px dashed #ccc;';
        li.innerHTML = `
            <span>${r.nombre}</span>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <strong>${r.cantidad} u.</strong>
                <button type="button" class="btn-borrar-renglon" style="background: #ef4444; color: white; border: none; border-radius: 4px; width: 25px; height: 25px; cursor: pointer; font-weight: bold;">X</button>
            </div>
        `;
        li.querySelector('button').addEventListener('click', () => {
            renglonesBase.splice(index, 1);
            dibujarRenglones();
        });
        lista.appendChild(li);
    });
}

// --- ENVÍO AL BACKEND ---
async function registrarTransferencia(estadoObjetivo) {
    const idSala = document.getElementById('sala-destino').dataset.id;
    
    if (!idSala) { mostrarError("Debes seleccionar una sala solicitante."); return; }
    if (renglonesBase.length === 0) { mostrarError("Agrega al menos un vino a la transferencia."); return; }

    try {
        // 1. Crear la cabecera
        const resCabecera = await fetchAPI('/v1/api/transferencias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_sala: parseInt(idSala) })
        });
        
        if (!resCabecera || !resCabecera.data) throw new Error("No se pudo crear la cabecera.");
        
        const nroTransferencia = resCabecera.data.nro_transferencia || resCabecera.data.numero_transferencia;

        // 2. Agregar los renglones uno por uno
        for (const renglon of renglonesBase) {
            await fetchAPI(`/v1/api/transferencias/${nroTransferencia}/renglones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo_vino: renglon.codigo_vino, cantidad: renglon.cantidad })
            });
        }

        // 3. Si el botón era "Solicitar", llamamos al endpoint de terminar
        if (estadoObjetivo === 'terminado') {
            await fetchAPI(`/v1/api/transferencias/${nroTransferencia}/terminar`, {
                method: 'POST'
            });
        }

        window.location.href = 'transferencias.html';

    } catch (error) {
        mostrarError("Error al procesar la transferencia. Revisa la consola para más detalles.");
        console.error(error);
    }
}

function mostrarError(mensaje) {
    const errorBox = document.getElementById('caja-error');
    errorBox.textContent = mensaje;
    errorBox.style.display = 'block';
}


document.addEventListener('click', (e) => {
    const listaSalas = document.getElementById('lista-salas');
    const inputSala = document.getElementById('sala-destino');
    if (listaSalas && !listaSalas.contains(e.target) && e.target !== inputSala) {
        listaSalas.style.display = 'none';
    }
    
    const listaVinos = document.getElementById('lista-vinos');
    const inputBuscar = document.getElementById('buscar-vino');
    if (listaVinos && !listaVinos.contains(e.target) && e.target !== inputBuscar) {
        listaVinos.style.display = 'none';
    }
});