// --- VARIABLES DE PAGINACIÓN ---
let paginaActual = 1;
const LIMITE_POR_PAGINA = 9;

// --- LÓGICA DEL CATÁLOGO ---
async function cargarCatalogo() {
    const contenedor = document.getElementById('contenedor-vinos');
    contenedor.innerHTML = "<p>Cargando catálogo...</p>";

    // Matemáticas de paginación: Si estamos en la pag 2, saltamos los primeros 10
    const offset = (paginaActual - 1) * LIMITE_POR_PAGINA;
    
    // Le pasamos los parámetros exactos a tu FastAPI
    const vinos = await fetchAPI(`/v1/api/vinos?limit=${LIMITE_POR_PAGINA}&offset=${offset}`); 
    
    if (!vinos) {
        contenedor.innerHTML = "<p>Error al cargar los vinos desde el servidor.</p>";
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
    
    // Evita retroceder más allá de la página 1
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

// Ejecutar automáticamente al cargar la página (esto ya lo tenías al final del archivo)
cargarCatalogo();