// --- VARIABLES GLOBALES ---
let paginaActual = 1;
const LIMITE_POR_PAGINA = 9;
let busquedaActual = ""; 

let filtrosActuales = { tipo: "", cepa: "", bodega: "", anada: "" };

// --- LÓGICA DEL CATÁLOGO ---
async function cargarCatalogo() {
    const contenedor = document.getElementById('contenedor-vinos');
    contenedor.innerHTML = "<p>Cargando catálogo...</p>";

    const offset = (paginaActual - 1) * LIMITE_POR_PAGINA;
    
   
    let url = `/v1/api/vinos?limit=${LIMITE_POR_PAGINA}&offset=${offset}`;
    
    
    if (busquedaActual.trim() !== "") url += `&nombre=${encodeURIComponent(busquedaActual)}`;
    

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
    document.querySelectorAll('.texto-pagina').forEach(el => {
        el.innerText = `Página ${paginaActual}`;
    });
    
    document.querySelectorAll('.btn-anterior').forEach(btn => {
        btn.style.visibility = paginaActual === 1 ? 'hidden' : 'visible';
    });

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

const btnFiltroToggle = document.querySelector('.filtro');
const panelFiltros = document.getElementById('panel-filtros');

if (btnFiltroToggle) {
    btnFiltroToggle.addEventListener('click', () => {
        panelFiltros.style.display = panelFiltros.style.display === 'none' ? 'flex' : 'none';
    });
}

const btnAplicar = document.getElementById('btn-aplicar-filtros');
if (btnAplicar) {
    btnAplicar.addEventListener('click', () => {
        filtrosActuales.tipo = document.getElementById('filtro-tipo').value;
        filtrosActuales.cepa = document.getElementById('filtro-cepa').value;
        filtrosActuales.bodega = document.getElementById('filtro-bodega').value;
        filtrosActuales.anada = document.getElementById('filtro-anada').value;
        paginaActual = 1; 
        cargarCatalogo();
    });
}

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

document.addEventListener('DOMContentLoaded', () => {
    const btnMas = document.getElementById('btn-opciones-mas');
    const menuMas = document.getElementById('menu-mas');

    if (btnMas && menuMas) {
        btnMas.addEventListener('click', (evento) => {
            evento.stopPropagation(); 
            menuMas.classList.toggle('activo');
        });

        document.addEventListener('click', (evento) => {
            if (!menuMas.contains(evento.target)) {
                menuMas.classList.remove('activo');
            }
        });
    }
});

cargarCatalogo();