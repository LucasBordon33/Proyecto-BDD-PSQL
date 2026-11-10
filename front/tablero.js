document.addEventListener('DOMContentLoaded', () => {
    cargarRanking();
    cargarGraficos();
    cargarSelectorSalas();
});

// --- 1. RANKING TOP 10 ---
async function cargarRanking() {
    const contenedor = document.getElementById('contenedor-ranking');
    try {
        const topVinos = await fetchAPI('/v1/api/reportes/top-vinos'); 
        
        if (!topVinos || topVinos.length === 0) {
            contenedor.innerHTML = '<p>No hay ventas registradas aún.</p>';
            return;
        }

        contenedor.innerHTML = '';
        topVinos.forEach((vino, index) => {
            const div = document.createElement('div');
            div.style.cssText = 'min-width: 200px; display: flex; flex-direction: column; align-items: center; text-align: center; flex: 0 0 auto;';
            div.innerHTML = `
                <img src="botella.png" alt="Botella" style="height: 200px; width: auto; object-fit: contain; margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1.2rem;">${vino.nombre}</h3>
                
                <!-- CORRECCIÓN: Leemos "total_vendido" como indica el SQL del repo -->
                <p style="margin: 0.5rem 0; font-weight: bold; color: var(--vino);">${vino.total_vendido || 0} unidades vendidas</p>
                
                <a href="detalle.html?codigo_vino=${vino.codigo_vino}" style="color: #2563eb; text-decoration: none;">Ver más información</a>
                <span style="font-size: 2rem; font-weight: bold; color: var(--placeholder); margin-top: 0.5rem;">${index + 1}</span>
            `;
            contenedor.appendChild(div);
        });
    } catch (error) {
        contenedor.innerHTML = '<p>Error al cargar el ranking.</p>';
    }
}

// --- 2. GRÁFICOS DE VENTAS ---
async function cargarGraficos() {
    try {
        const ventasData = await fetchAPI('/v1/api/reportes/ventas-por-sala');
        if (!ventasData || ventasData.length === 0) return;
        
        // CORRECCIÓN: Leemos "calle" (como nombre) y "monto_total_ventas" basándonos en tu reportes_repo.py
        const nombresSalas = ventasData.map(v => v.calle || `Sala ${v.id_sala}`);
        const montosTotales = ventasData.map(v => parseFloat(v.monto_total_ventas || 0));

        // Gráfico de Barras
        new Chart(document.getElementById('graficoBarras'), {
            type: 'bar',
            data: {
                labels: nombresSalas,
                datasets: [{
                    label: 'Ventas ($)',
                    data: montosTotales,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            }
        });

        // Gráfico de Torta
        new Chart(document.getElementById('graficoTorta'), {
            type: 'pie',
            data: {
                labels: nombresSalas,
                datasets: [{
                    data: montosTotales,
                    // Generar colores distintos para cada porción
                    backgroundColor: nombresSalas.map((_, i) => `hsl(${(i * 360) / nombresSalas.length}, 70%, 60%)`)
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false // Ocultamos la leyenda para que se vea bien la torta
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error al cargar gráficos:", error);
    }
}

// --- 3. STOCK CRÍTICO ---
async function cargarSelectorSalas() {
    const select = document.getElementById('select-sala-stock');
    try {
        const salas = await fetchAPI('/v1/api/salas');
        salas.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id_sala;
            // Algunas salas traen nombre, otras calle, dependiendo de cómo lo armaron
            option.textContent = s.nombre || s.calle || `Sala N° ${s.id_sala}`;
            select.appendChild(option);
        });

        select.addEventListener('change', async (e) => {
            const idSala = e.target.value;
            cargarStockCritico(idSala);
        });
    } catch (error) {
        console.error("Error al cargar salas");
    }
}

async function cargarStockCritico(idSala) {
    const tbody = document.getElementById('tabla-stock-critico');
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Buscando stock...</td></tr>';
    
    try {
        const stockData = await fetchAPI(`/v1/api/reportes/vinos-sin-stock?id_sala=${idSala}`);
        
        tbody.innerHTML = '';
        if (!stockData || stockData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #16a34a; font-weight: bold;">El stock está en niveles óptimos.</td></tr>';
            return;
        }

        stockData.forEach(item => {
            // CORRECCIÓN: Leemos "stock_deposito" como dice la consulta S6
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${item.nombre || item.codigo_vino}</td>
                <td style="padding: 0.5rem; border-bottom: 1px solid #eee; font-weight: bold; color: #dc2626;">Falta (Hay ${item.stock_deposito} en central)</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: red;">Error al consultar el stock.</td></tr>';
    }
}