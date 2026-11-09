// --- VARIABLES GLOBALES ---
let paginaActual = 1;
const LIMITE_POR_PAGINA = 9;
let busquedaActual = ""; 

// Agregamos objeto para los filtros
let filtrosActuales = { tipo: "", cepa: "", bodega: "", anada: "" };

// --- LÓGICA DEL CATÁLOGO ---
async function cargarCatalogo() {
    const contenedor = document.getElementById('contenedor-vinos');
    contenedor.innerHTML = "<p>Cargando catálogo...</p>";

    const offset = (paginaActual - 1) * LIMITE_POR_PAGINA;
    
    // Armamos la URL base
    let url = `/v1/api/vinos?limit=${LIMITE_POR_PAGINA}&offset=${offset}`;
    
    // Sumamos la búsqueda
    if (busquedaActual.trim() !== "") url += `&nombre=${encodeURIComponent(busquedaActual)}`;
    
    // Sumamos los filtros dinámicamente si tienen valor
    if (filtrosActuales.tipo) url += `&tipo=${encodeURIComponent(filtrosActuales.tipo)}`;
    if (filtrosActuales.cepa) url += `&cepa=${encodeURIComponent(filtrosActuales.cepa)}`;
    if (filtrosActuales.bodega) url += `&bodega=${encodeURIComponent(filtrosActuales.bodega)}`;
    if (filtrosActuales.anada) url += `&anada=${encodeURIComponent(filtrosActuales.anada)}`;

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
              <a class="vino__enlace" href="detalle.html?codigo_vino=${vino.codigo_vino}">Ver más información</a>
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

const inputBuscador = document.querySelector('.buscador input');
if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        busquedaActual = e.target.value;
        paginaActual = 1; 
        cargarCatalogo();
    });
}

// Lógica de visualización del panel de filtros
const btnFiltroToggle = document.querySelector('.filtro');
const panelFiltros = document.getElementById('panel-filtros');

if (btnFiltroToggle) {
    btnFiltroToggle.addEventListener('click', () => {
        // Alterna entre mostrar u ocultar el panel
        panelFiltros.style.display = panelFiltros.style.display === 'none' ? 'flex' : 'none';
    });
}

// Botón Aplicar Filtros
const btnAplicar = document.getElementById('btn-aplicar-filtros');
if (btnAplicar) {
    btnAplicar.addEventListener('click', () => {
        filtrosActuales.tipo = document.getElementById('filtro-tipo').value;
        filtrosActuales.cepa = document.getElementById('filtro-cepa').value;
        filtrosActuales.bodega = document.getElementById('filtro-bodega').value;
        filtrosActuales.anada = document.getElementById('filtro-anada').value;
        paginaActual = 1; // Volver a la pag 1 al filtrar
        cargarCatalogo();
    });
}

// Botón Limpiar Filtros
const btnLimpiar = document.getElementById('btn-limpiar-filtros');
if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
        document.getElementById('filtro-tipo').value = "";
        document.getElementById('filtro-cepa').value = "";
        document.getElementById('filtro-bodega').value = "";
        document.getElementById('filtro-anada').value = "";
        
        filtrosActuales = { tipo: "", cepa: "", bodega: "", anada: "" };
        paginaActual = 1;
        cargarCatalogo();
    });
}

// Ejecución inicial
cargarCatalogo();