let todasLasTransferencias = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarTransferencias();

    const inputBuscar = document.getElementById('buscar-transferencia');
    const selectEstado = document.getElementById('filtro-estado');

    if (inputBuscar) inputBuscar.addEventListener('input', renderizarTransferencias);
    if (selectEstado) selectEstado.addEventListener('change', renderizarTransferencias);
});

async function cargarTransferencias() {
    const contenedor = document.getElementById('lista-transferencias');
    contenedor.innerHTML = '<p style="text-align:center; font-size: 1.2rem;">Cargando transferencias...</p>';

    try {
        
        const respuesta = await fetchAPI('/v1/api/transferencias?limit=500&offset=0');
        if (respuesta) {
            todasLasTransferencias = respuesta;
        }
        
        todasLasTransferencias.sort((a, b) => {
            const numA = a.numero_transferencia || a.nro_transferencia || a.id || 0;
            const numB = b.numero_transferencia || b.nro_transferencia || b.id || 0;
            return numB - numA;
        });
        
        renderizarTransferencias();
    } catch (error) {
        console.error("Error al cargar transferencias:", error);
        contenedor.innerHTML = '<p style="text-align:center; color: var(--error); font-size: 1.2rem;">Error al cargar las transferencias.</p>';
    }
}

function renderizarTransferencias() {
    const contenedor = document.getElementById('lista-transferencias');
    const inputBuscar = document.getElementById('buscar-transferencia');
    const selectEstado = document.getElementById('filtro-estado');

    let buscarTexto = inputBuscar ? inputBuscar.value.trim().toLowerCase() : "";
    let estadoFiltro = selectEstado ? selectEstado.value : "";

    // Filtrar la lista en memoria
    const filtradas = todasLasTransferencias.filter(t => {
        const num = String(t.numero_transferencia || t.nro_transferencia || t.id || "");
        const sala = String(t.sala_destino || t.nombre_sala || "").toLowerCase();
        const matchBusqueda = num.includes(buscarTexto) || sala.includes(buscarTexto);
        
        const estadoActual = t.estado ? t.estado.toLowerCase() : "";
        const matchEstado = estadoFiltro === "" || estadoActual === estadoFiltro;

        return matchBusqueda && matchEstado;
    });

    contenedor.innerHTML = '';

    if (filtradas.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; font-size: 1.2rem; margin-top: 2rem;">No se encontraron transferencias con esos filtros.</p>';
        return;
    }

    // Dibujar cada transferencia como una tarjeta
    filtradas.forEach(t => {
        const numeroOriginal = t.numero_transferencia || t.nro_transferencia || t.id;
        const numeroPad = String(numeroOriginal).padStart(4, '0');
        const fecha = t.fecha_confeccion || t.fecha || '00/00/00';
        const sala = t.nombre_sala || t.sala_destino || (t.id_sala ? `Sala N° ${t.id_sala}` : 'Sin sala asignada');
        
        const estadoCod = t.estado ? t.estado.toLowerCase() : 'desconocido';
        const estadoTexto = estadoCod.replace('_', ' ').toUpperCase();
        
        // Asignar colores según el estado (Amarillo, Azul, Verde)
        let colorEstado = '#6b6b6b';
        if (estadoCod === 'en_confeccion') colorEstado = '#d97706'; // Naranja/Amarillo oscuro
        if (estadoCod === 'terminado') colorEstado = '#2563eb';     // Azul
        if (estadoCod === 'procesado') colorEstado = '#16a34a';     // Verde

        const li = document.createElement('li');
        li.style.cssText = 'border: 3px solid var(--tinta); border-radius: 12px; padding: 1.5rem; background: var(--papel); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;';
        
        li.innerHTML = `
            <div>
                <h3 style="margin: 0 0 0.5rem; font-size: 1.5rem;">Solicitud #${numeroPad}</h3>
                <p style="margin: 0; color: var(--placeholder); font-size: 1.15rem;">Sala destino: <strong style="color: var(--tinta);">${sala}</strong> | Fecha: ${fecha}</p>
                <p style="margin: 0.5rem 0 0; font-weight: bold; color: ${colorEstado}; font-size: 1.2rem;">Estado: ${estadoTexto}</p>
            </div>
            <a href="gestion-transferencia.html?nro=${numeroOriginal}" class="boton" style="height: 3.5rem; padding: 0 1.5rem; font-size: 1.3rem; border-radius: 8px; line-height: 3.5rem; flex: none;">
                Gestionar
            </a>
        `;
        
        contenedor.appendChild(li);
    });
}