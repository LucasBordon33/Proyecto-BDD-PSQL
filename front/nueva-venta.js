const parametros = new URLSearchParams(window.location.search);
const codigoVino = parametros.get('codigo_vino');
let precioUnitario = 0;

// 1. Cargar los datos del vino seleccionado
async function cargarDatosVenta() {
    if (!codigoVino) {
        mostrarError("No se especificó un vino para la venta.");
        return;
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

    // Capturamos los IDs ocultos que guardamos al hacer clic en las listas
    const inputCliente = document.getElementById('cliente');
    const inputSala = document.getElementById('sala');
    const cantidad = parseInt(document.getElementById('input-cantidad').value);
    
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

    // Estructura de datos para tu backend (usando IDs numéricos)
    const datosVenta = {
        codigo_vino: codigoVino,
        id_cliente: parseInt(idClienteSeleccionado), 
        id_sala: parseInt(idSalaSeleccionada),       
        cantidad: cantidad
    };

    try {
        const respuesta = await fetch(`http://localhost:8000/v1/api/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVenta)
        });

        if (respuesta.ok) {
            window.location.href = 'index.html';
        } else {
            const errorData = await respuesta.json();
            mostrarError(errorData.detail || "Error al procesar la venta.");
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

// ==========================================
// 5. INICIALIZACIÓN Y EVENTOS DE LA PÁGINA
// ==========================================
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
    let todasLasSalas = []; // Guardamos las salas en memoria para buscar ultra rápido

    if (inputSala && listaSalas) {
        // Función auxiliar para dibujar la lista en pantalla
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
                listaSalas.style.display = 'none'; // Si no hay coincidencias, ocultamos
            }
        };

        // Al hacer clic en la casilla: bajamos las salas (si no lo hicimos ya) y las mostramos
        inputSala.addEventListener('click', async () => {
            if (todasLasSalas.length === 0) {
                try {
                    todasLasSalas = await fetchAPI('/v1/api/salas');
                } catch (error) {
                    console.error("Error cargando salas:", error);
                }
            }
            
            const texto = inputSala.value.trim().toLowerCase();
            const filtradas = todasLasSalas.filter(s => s.nombre.toLowerCase().includes(texto));
            renderizarSalas(filtradas);
        });

        // Al teclear: limpiamos la selección y filtramos la lista en vivo
        inputSala.addEventListener('input', async () => {
            inputSala.dataset.id = "";
            if (labelSalaSeleccionada) labelSalaSeleccionada.style.display = 'none';

            // Por si el usuario empezó a teclear muy rápido sin haber hecho clic
            if (todasLasSalas.length === 0) {
                try {
                    todasLasSalas = await fetchAPI('/v1/api/salas');
                } catch (error) {
                    console.error("Error cargando salas:", error);
                }
            }

            const texto = inputSala.value.trim().toLowerCase();
            const filtradas = todasLasSalas.filter(s => s.nombre.toLowerCase().includes(texto));
            renderizarSalas(filtradas);
        });
    }

    // Ocultar menús si se hace clic fuera de ellos
    document.addEventListener('click', (e) => {
        if (inputCliente && !inputCliente.contains(e.target) && !listaClientes.contains(e.target)) {
            listaClientes.style.display = 'none';
        }
        if (inputSala && !inputSala.contains(e.target) && !listaSalas.contains(e.target)) {
            listaSalas.style.display = 'none';
        }
    });

});