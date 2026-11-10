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
    evento.preventDefault(); // Evita que el formulario recargue la página

    // Capturamos los campos de búsqueda
    const nombreCliente = document.getElementById('cliente').value.trim();
    const nombreSala = document.getElementById('sala').value.trim();
    const cantidad = parseInt(document.getElementById('input-cantidad').value);
    
    if (!nombreCliente || !nombreSala) {
        mostrarError("Debes especificar el cliente y la sala de venta.");
        return;
    }

    // Estructura de datos para tu backend
    const datosVenta = {
        codigo_vino: codigoVino,
        cliente: nombreCliente, 
        sala: nombreSala,       
        cantidad: cantidad
    };

    try {
        const respuesta = await fetch(`http://localhost:8000/v1/api/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVenta)
        });

        if (respuesta.ok) {
            // Si la venta es un éxito, redirigimos al catálogo
            window.location.href = 'index.html';
        } else {
            const errorData = await respuesta.json();
            mostrarError(errorData.detail || "Error al procesar la venta.");
        }
    } catch (error) {
        mostrarError("Error de conexión con el servidor.");
    }
}

// 4. Utilidades y eventos de inicio
function mostrarError(mensaje) {
    const errorBox = document.querySelector('.error');
    if (errorBox) {
        errorBox.textContent = mensaje;
        errorBox.style.display = 'block';
    }
}

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
    
    // Hacemos que el total se actualice al teclear la cantidad
    const inputCantidad = document.getElementById('input-cantidad');
    if (inputCantidad) {
        inputCantidad.addEventListener('input', calcularTotal);
    }
    
    // Conectamos el botón de registrar
    const btnRegistrar = document.querySelector('.botones button[type="submit"]');
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', registrarVenta);
    }
});