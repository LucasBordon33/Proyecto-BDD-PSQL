async function cargarDetalleVino() {
    // 1. Extraemos el código exacto de la URL (ej: detalle.html?codigo_vino=TIN-2022-001)
    const parametros = new URLSearchParams(window.location.search);
    const codigoVino = parametros.get('codigo_vino');

    if (!codigoVino) {
        document.querySelector('.detalle__nombre').innerText = "Vino no especificado";
        return;
    }

    // 2. Hacemos la petición a FastAPI usando la variable correcta
    const vino = await fetchAPI(`/v1/api/vinos/${codigoVino}`);

    if (!vino) {
        document.querySelector('.detalle__nombre').innerText = "Error al cargar la información";
        return;
    }

    // ... (El resto del código de inyección en el HTML queda intacto)
    // 3. Inyectamos los datos principales en el HTML
    document.querySelector('.detalle__nombre').innerText = vino.nombre; 
    document.querySelector('.detalle__precio').innerText = `$${vino.precio}`; 
    
    // Inyectamos la Ficha Técnica
    document.getElementById('vino-tipo').innerText = vino.tipo; 
    document.getElementById('vino-anada').innerText = vino.anada; 
    document.getElementById('vino-volumen').innerText = vino.volumen_ml; 
    document.getElementById('vino-graduacion').innerText = vino.graduacion; 
    document.getElementById('vino-cuit').innerText = vino.cuit_bodega;
    
    // Inyectamos la Composición (Cepas)
    const contenedorComposicion = document.getElementById('vino-composicion'); 
    if (vino.composicion && vino.composicion.length > 0) { 
        contenedorComposicion.innerText = vino.composicion.map(c =>  
            `${c.cepa} (${c.porcentaje}%)` 
        ).join(', '); 
    } else {
        contenedorComposicion.innerText = "Datos de corte no especificados."; 
    }
    
    // Inyectamos el Maridaje
    const contenedorMaridaje = document.getElementById('vino-maridaje'); 
    if (vino.maridajes && vino.maridajes.length > 0) { 
        contenedorMaridaje.innerText = vino.maridajes.map(m =>  
            `${m.maridaje} (Temp: ${m.temperatura} ºC)` 
        ).join(', '); 
    } else {
        contenedorMaridaje.innerText = "Sin sugerencias de maridaje."; 
    }
    
    document.getElementById('btn-editar').href = `editar.html?codigo_vino=${codigoVino}`;

    document.getElementById('btn-nueva-venta').href = `nueva-venta.html?codigo_vino=${codigoVino}`;
}

cargarDetalleVino(); 
