// Centralizamos la URL del backend (FastAPI por defecto usa el 8000)
const API_URL = "http://localhost:8000";

// Función base para hacer peticiones fácilmente
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`Error de la API: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Falló la petición:", error);
        return null;
    }
}

// Ejemplo de prueba: probar que el front se conecta
console.log("Módulo API cargado. URL base:", API_URL);