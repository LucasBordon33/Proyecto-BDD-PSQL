const parametros = new URLSearchParams(window.location.search);
const codigoVino = parametros.get('codigo_vino');
let precioUnitario = 0;

// 1. Cargar los datos del vino seleccionado
async function cargarDatosVenta() {
    // Bloqueamos explícitamente si llega la palabra "undefined" o "null" en la URL
    if (!codigoVino || codigoVino === 'undefined' || codigoVino === 'null') {
        return; // No hacemos nada, permitimos cargar la venta vacía limpiamente
    }

    try {
        const vino = await fetchAPI(`/v1/api/vinos/${codigoVino}`);
        
        if (vino) {
            document.getElementById('venta-nombre').textContent = vino.nombre;
            precioUnitario = parseFloat(vino.precio) || 0;
            document.getElementById('venta-precio').textContent = `$${precioUnitario.toFixed(2)}`;
            calcularTotal();
        }
    } catch (error) {
        mostrarError("Error al cargar la información del vino.");
    }
}

// 2. Calcular el precio total dinámicamente
function calcularTotal() {
    const inputCantidad = document.getElementById('input-cantidad');
    const cantidad = parseInt(inputCantidad.value);
    
    if (isNaN(cantidad) || cantidad < 1) {
        document.querySelector('.total').textContent = "Total: $0.00";
        return;
    }
    
    const total = cantidad * precioUnitario;
    document.querySelector('.total').textContent = `Total: $${total.toFixed(2)}`;
}

// 3. Registrar la venta en FastAPI
async function registrarVenta(evento) {
    evento.preventDefault(); 

    const inputCliente = document.getElementById('cliente');
    const inputSala = document.getElementById('sala');
    const inputCantidad = document.getElementById('input-cantidad');
    const cantidad = parseInt(inputCantidad.value);
    
    const idClienteSeleccionado = inputCliente.dataset.id;
    const idSalaSeleccionada = inputSala.dataset.id;

    if (!idClienteSeleccionado || !idSalaSeleccionada) {
        mostrarError("Debes seleccionar un cliente y una sala de la lista.");
        return;
    }

    if (isNaN(cantidad) || cantidad < 1) {
        mostrarError("La cantidad debe ser mayor a 0.");
        return;
    }

    // Estructura de datos para los vinos
    const renglonesBase = [];
    
    // 1. Guardar el vino original (el de arriba)
    if (codigoVino && !isNaN(cantidad) && cantidad > 0) {
        renglonesBase.push({
            codigo_vino: codigoVino,
            cantidad: cantidad,
            precio_unitario: precioUnitario
        });
    }

    // 2. Guardar todos los vinos extra que el usuario agregó
    document.querySelectorAll('.vino-extra').forEach(renglon => {
        const cod = renglon.querySelector('.input-vino-search').dataset.codigo;
        const prec = parseFloat(renglon.querySelector('.input-vino-search').dataset.precio);
        const cant = parseInt(renglon.querySelector('.input-cant-extra').value);

        if (cod && !isNaN(cant) && cant > 0) {
            renglonesBase.push({ codigo_vino: cod, cantidad: cant, precio_unitario: prec });
        }
    });

    if (renglonesBase.length === 0) {
        mostrarError("Debes seleccionar al menos un vino válido.");
        return;
    }

    // Recalcular para asegurar total exacto en BD
    const subtotalFinal = renglonesBase.reduce((acc, r) => acc + (r.cantidad * r.precio_unitario), 0);
    const descuento = 0; 

    // Estructura de datos final adaptada a tu tabla comprobante
    const datosVenta = {
        id_cliente: parseInt(idClienteSeleccionado), 
        id_sala: parseInt(idSalaSeleccionada),       
        subtotal: subtotalFinal,
        descuento: descuento,
        total: subtotalFinal - descuento,
        renglones: renglonesBase
    };

    try {
        const respuesta = await fetchAPI('/v1/api/comprobantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVenta)
        });

        if (respuesta.ok) {
            window.location.href = 'index.html';
        } else {
            const errorData = await respuesta.json();
            mostrarError(errorData.detail || "Error al procesar el comprobante.");
        }
    } catch (error) {
        mostrarError("Error de conexión con el servidor.");
    }
}

// 4. Utilidades
function mostrarError(mensaje) {
    const errorBox = document.querySelector('.error');
    if (errorBox) {
        errorBox.textContent = mensaje;
        errorBox.style.display = 'block';
    }
}

// 5. INICIALIZACIÓN Y EVENTOS DE LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    
    // Escondemos la caja de error al inicio
    const errorBox = document.querySelector('.error');
    if (errorBox) errorBox.style.display = 'none';

    // Arreglamos el botón de cancelar
    const btnCancelar = document.querySelector('.botones a.boton');
    if (btnCancelar && codigoVino) {
        btnCancelar.href = `detalle.html?codigo_vino=${codigoVino}`;
    }

    // Iniciamos la carga del vino
    cargarDatosVenta();
    
    // Total dinámico
    const inputCantidad = document.getElementById('input-cantidad');
    if (inputCantidad) {
        inputCantidad.addEventListener('input', calcularTotal);
    }
    
    // Botón de registrar
    const btnRegistrar = document.querySelector('.botones button[type="submit"]');
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', registrarVenta);
    }

    // --- LÓGICA DE BÚSQUEDA DE CLIENTES ---
    const inputCliente = document.getElementById('cliente');
    const listaClientes = document.getElementById('lista-clientes');
    const labelClienteSeleccionado = document.getElementById('cliente-seleccionado');
    let timeoutBusqueda; 

    if (inputCliente && listaClientes) {
        inputCliente.addEventListener('input', () => {
            clearTimeout(timeoutBusqueda); 
            const texto = inputCliente.value.trim();
            
            inputCliente.dataset.id = "";
            if (labelClienteSeleccionado) labelClienteSeleccionado.style.display = 'none';
            
            if (texto.length < 2) {
                listaClientes.style.display = 'none';
                return;
            }

            timeoutBusqueda = setTimeout(async () => {
                try {
                    const resultados = await fetchAPI(`/v1/api/clientes?buscar=${encodeURIComponent(texto)}&limit=10&offset=0`);
                    listaClientes.innerHTML = ''; 
                    
                    if (resultados && resultados.length > 0) {
                        resultados.forEach(c => {
                            const li = document.createElement('li');
                            li.className = 'item';
                            li.innerHTML = `<button class="item__opcion" type="button">${c.nombre_razon_social} (Doc: ${c.nro_doc})</button>`;
                            
                            li.querySelector('button').addEventListener('click', () => {
                                inputCliente.value = c.nro_doc; 
                                inputCliente.dataset.id = c.id_cliente; 
                                
                                if (labelClienteSeleccionado) {
                                    labelClienteSeleccionado.textContent = `Seleccionado: ${c.nombre_razon_social}`;
                                    labelClienteSeleccionado.style.display = 'block';
                                }
                                listaClientes.style.display = 'none';
                            });
                            listaClientes.appendChild(li);
                        });
                        listaClientes.style.display = 'grid';
                    } else {
                        listaClientes.style.display = 'none';
                    }
                } catch (error) {
                    console.error("Error buscando clientes:", error);
                    listaClientes.style.display = 'none';
                }
            }, 300);
        });
    }

    // --- LÓGICA DE SELECCIÓN DE SALAS ---
    const inputSala = document.getElementById('sala');
    const listaSalas = document.getElementById('lista-salas');
    const labelSalaSeleccionada = document.getElementById('sala-seleccionada');
    let todasLasSalas = [];

    if (inputSala && listaSalas) {
        const renderizarSalas = (salasAMostrar) => {
            listaSalas.innerHTML = '';
            if (salasAMostrar && salasAMostrar.length > 0) {
                salasAMostrar.forEach(s => {
                    const li = document.createElement('li');
                    li.className = 'item';
                    li.innerHTML = `<button class="item__opcion" type="button">${s.nombre}</button>`;
                    
                    li.querySelector('button').addEventListener('click', () => {
                        inputSala.value = s.nombre; 
                        inputSala.dataset.id = s.id_sala; 
                        
                        if (labelSalaSeleccionada) {
                            labelSalaSeleccionada.textContent = `Seleccionada: ${s.nombre}`;
                            labelSalaSeleccionada.style.display = 'block';
                        }
                        listaSalas.style.display = 'none';
                    });
                    listaSalas.appendChild(li);
                });
                listaSalas.style.display = 'grid';
            } else {
                listaSalas.style.display = 'none';
            }
        };

        inputSala.addEventListener('click', async () => {
            if (todasLasSalas.length === 0) {
                try { todasLasSalas = await fetchAPI('/v1/api/salas'); } 
                catch (error) { console.error("Error cargando salas:", error); }
            }
            const texto = inputSala.value.trim().toLowerCase();
            const filtradas = todasLasSalas.filter(s => s.nombre.toLowerCase().includes(texto));
            renderizarSalas(filtradas);
        });

        inputSala.addEventListener('input', async () => {
            inputSala.dataset.id = "";
            if (labelSalaSeleccionada) labelSalaSeleccionada.style.display = 'none';

            if (todasLasSalas.length === 0) {
                try { todasLasSalas = await fetchAPI('/v1/api/salas'); } 
                catch (error) { console.error("Error cargando salas:", error); }
            }
            const texto = inputSala.value.trim().toLowerCase();
            const filtradas = todasLasSalas.filter(s => s.nombre.toLowerCase().includes(texto));
            renderizarSalas(filtradas);
        });
    }

    // Ocultar menús si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (inputCliente && !inputCliente.contains(e.target) && !listaClientes.contains(e.target)) {
            listaClientes.style.display = 'none';
        }
        if (inputSala && !inputSala.contains(e.target) && !listaSalas.contains(e.target)) {
            listaSalas.style.display = 'none';
        }
    });

    // --- LÓGICA PARA AGREGAR NUEVOS RENGLONES DE VINO ---
    const btnAgregarRenglon = document.getElementById('btn-agregar-renglon');
    const contenedorVinos = document.getElementById('contenedor-vinos');
    let contadorVinosExtra = 0;
    let todosLosVinos = []; // Guardamos el catálogo en memoria

    function recalcularGranTotal() {
        let granTotal = 0;
        const inputCantPrin = document.getElementById('input-cantidad');
        if (inputCantPrin && codigoVino) {
            granTotal += (parseInt(inputCantPrin.value) || 0) * precioUnitario;
        }
        document.querySelectorAll('.vino-extra').forEach(renglon => {
            const precio = parseFloat(renglon.querySelector('.input-vino-search').dataset.precio) || 0;
            const cant = parseInt(renglon.querySelector('.input-cant-extra').value) || 0;
            granTotal += precio * cant;
        });
        const totalEtiqueta = document.querySelector('.total');
        if (totalEtiqueta) totalEtiqueta.textContent = `Total: $${granTotal.toFixed(2)}`;
    }

    const inputCantPrincipal = document.getElementById('input-cantidad');
    if(inputCantPrincipal) inputCantPrincipal.addEventListener('input', recalcularGranTotal);

    if (btnAgregarRenglon && contenedorVinos) {
        btnAgregarRenglon.addEventListener('click', () => {
            contadorVinosExtra++;
            
            const nuevoDiv = document.createElement('div');
            nuevoDiv.className = 'grupo vino-extra';
            nuevoDiv.style.marginTop = '20px';
            nuevoDiv.style.paddingTop = '15px';
            nuevoDiv.style.borderTop = '1px dashed #ccc';
            nuevoDiv.style.position = 'relative';
            nuevoDiv.style.zIndex = 100 - contadorVinosExtra;

            nuevoDiv.innerHTML = `
                <div class="busqueda" style="margin-bottom: 10px; position: relative;">
                    <label class="solo-lectores" for="vino-extra-${contadorVinosExtra}">Buscar otro vino</label>
                    <input class="buscar input-vino-search" id="vino-extra-${contadorVinosExtra}" type="search" placeholder="Buscar vino por código o nombre..." autocomplete="off">
                    <ul class="items lista-vinos-extra" style="display: none; position: absolute; width: 100%; top: 100%; margin-top: 5px; background: #ffffff; border: 1px solid #ccc; border-radius: 4px; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></ul>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="precio-vino-extra" style="font-weight: 600; color: var(--vino);">$0.00</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label for="cant-extra-${contadorVinosExtra}">Cantidad: </label>
                        <input class="input-cant-extra" type="number" id="cant-extra-${contadorVinosExtra}" value="1" min="1" style="width: 60px; padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
                        <button type="button" class="btn-borrar-renglon" title="Eliminar" style="background: #ef4444; color: white; border: none; border-radius: 4px; width: 30px; height: 30px; cursor: pointer; font-weight: bold;">X</button>
                    </div>
                </div>
            `;
            contenedorVinos.appendChild(nuevoDiv);

            const inputBusqueda = nuevoDiv.querySelector('.input-vino-search');
            const listaResultados = nuevoDiv.querySelector('.lista-vinos-extra');
            const spanPrecio = nuevoDiv.querySelector('.precio-vino-extra');
            let timeoutBusquedaVino;

            nuevoDiv.querySelector('.btn-borrar-renglon').addEventListener('click', () => {
                nuevoDiv.remove();
                recalcularGranTotal();
            });

            nuevoDiv.querySelector('.input-cant-extra').addEventListener('input', recalcularGranTotal);

            inputBusqueda.addEventListener('input', async () => {
                clearTimeout(timeoutBusquedaVino);
                inputBusqueda.dataset.codigo = "";
                inputBusqueda.dataset.precio = "0";
                spanPrecio.textContent = "$0.00";
                recalcularGranTotal();

                const texto = inputBusqueda.value.trim().toLowerCase();
                if (texto.length < 2) {
                    listaResultados.style.display = 'none'; 
                    return;
                }

                timeoutBusquedaVino = setTimeout(async () => {
                    try {
                        // Llamamos directamente al backend pasándole lo que el usuario escribió
                        const resultados = await fetchAPI(`/v1/api/vinos?nombre=${encodeURIComponent(texto)}&limit=10&offset=0`);

                        listaResultados.innerHTML = '';
                        if (resultados && resultados.length > 0) {
                            resultados.forEach(v => {
                                const li = document.createElement('li');
                                li.className = 'item';
                                li.innerHTML = `<button class="item__opcion" type="button" style="text-align: left;">${v.nombre} - $${v.precio}</button>`;
                                
                                li.querySelector('button').addEventListener('click', () => {
                                    inputBusqueda.value = v.nombre;
                                    inputBusqueda.dataset.codigo = v.codigo_vino; 
                                    inputBusqueda.dataset.precio = v.precio;
                                    spanPrecio.textContent = `$${parseFloat(v.precio).toFixed(2)}`;
                                    listaResultados.style.display = 'none';
                                    recalcularGranTotal();
                                });
                                listaResultados.appendChild(li);
                            });
                            listaResultados.style.display = 'grid';
                        } else {
                            listaResultados.style.display = 'none';
                        }
                    } catch (error) { 
                        console.error("Error en la búsqueda:", error); 
                    }
                }, 200);
            });
        });
    }
});