// Configuración de entorno para DESARROLLO (`ng serve`).
// Reemplaza a environment.ts vía fileReplacements en angular.json.
const host = 'http://localhost:8000';

export const environment = {
  production: false,
  host, // host del backend, para rutas fuera de /api (p. ej. /health, /usuarios)
  apiUrl: `${host}/api`, // base de la API REST
};
