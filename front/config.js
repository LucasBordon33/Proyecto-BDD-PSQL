// Configuración de entorno del frontend.
// Se carga ANTES de api.js. Los valores pueden sobreescribirse en tiempo de
// despliegue (por ejemplo, mediante envsubst en el contenedor de Nginx o
// inyectando un <script> con window.API_BASE_URL antes de este archivo).
window.API_CONFIG = window.API_CONFIG || {};
window.API_CONFIG.API_BASE_URL =
    window.API_CONFIG.API_BASE_URL || "http://localhost:8000";
