// --- VARIABLES GLOBALES ---
let paginaActual = 1;
const LIMITE_POR_PAGINA = 9;
let busquedaActual = ""; 

// --- LÓGICA DEL CATÁLOGO ---
async function cargarCatalogo() {
    const contenedor = document.getElementById('contenedor-vinos');
    contenedor.innerHTML = "<p>Cargando catálogo...</p>";

    const offset = (paginaActual - 1) * LIMITE_POR_PAGINA;
    
    // Armamos la URL base con la paginación
    let url = `/v1/api/vinos?limit=${LIMITE_POR_PAGINA}&offset=${offset}`;
    
    // Si hay texto en el buscador, lo sumamos a la petición
    if (busquedaActual.trim() !== "") {
        url += `&nombre=${encodeURIComponent(busquedaActual)}`;
    }

    const vinos = await fetchAPI(url); 
    
    if (!vinos) {
        contenedor.innerHTML = "<p>Error al cargar los vinos.</p>";
        return;
    }

    contenedor.innerHTML = ''; 
    vinos.forEach(vino => {
        contenedor.innerHTML += `
          <li class="vino">
            <img class="vino__botella" src="botella.png" width="101" height="400" alt="Botella de ${vino.nombre}">
            <div class="vino__datos">
              <h2 class="vino__nombre">${vino.nombre}</h2>
              <p class="vino__precio">$${vino.precio}</p>
              <a class="vino__enlace" href="#">Ver más información</a>
            </div>
          </li>
        `;
    });

    actualizarControlesPaginacion(vinos.length);
}

// --- CONTROLADORES DE PAGINACIÓN ---
function cambiarPagina(direccion) {
    paginaActual += direccion;
    if (paginaActual < 1) paginaActual = 1; 
    cargarCatalogo();
}

function actualizarControlesPaginacion(cantidadVinosObtenidos) {
    // Actualiza el texto en ambos selectores (el de arriba y el de abajo)
    document.querySelectorAll('.texto-pagina').forEach(el => {
        el.innerText = `Página ${paginaActual}`;
    });
    
    // Oculta o muestra ambos botones "Anterior"
    document.querySelectorAll('.btn-anterior').forEach(btn => {
        btn.style.visibility = paginaActual === 1 ? 'hidden' : 'visible';
    });

    // Oculta o muestra ambos botones "Siguiente"
    document.querySelectorAll('.btn-siguiente').forEach(btn => {
        btn.style.visibility = cantidadVinosObtenidos < LIMITE_POR_PAGINA ? 'hidden' : 'visible';
    });
}

// --- ESCUCHADOR DEL BUSCADOR ---
const inputBuscador = document.querySelector('.buscador input');
if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        busquedaActual = e.target.value;
        paginaActual = 1; // Al buscar, siempre volvemos a la página 1
        cargarCatalogo();
    });
}

// Ejecución inicial
cargarCatalogo();