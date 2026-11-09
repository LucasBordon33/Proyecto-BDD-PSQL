// --- NAVEGACIÓN ---
function mostrarVista(vista) {
    document.getElementById('vista-catalogo').classList.add('oculto');
    document.getElementById('vista-formulario').classList.add('oculto');
    
    document.getElementById(`vista-${vista}`).classList.remove('oculto');
    document.getElementById('error-box').style.display = 'none'; // Limpiar errores al cambiar
}

async function cargarCatalogo() {
    const contenedor = document.getElementById('contenedor-vinos');
    contenedor.innerHTML = "<p>Cargando catálogo...</p>";

    // Llamada a tu endpoint en FastAPI
    const vinos = await fetchAPI('/vinos'); 
    
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
              <a class="vino__enlace" href="#" onclick="abrirEdicion(${vino.id})">Ver más información</a>
            </div>
          </li>
        `;
    });
}

// Ejecutar automáticamente al cargar la página
cargarCatalogo();