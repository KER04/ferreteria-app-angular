// Configuración de entorno POR DEFECTO (build de producción).
// En `ng serve` / build de desarrollo se reemplaza por environment.development.ts
// (ver fileReplacements en angular.json).
//
// Cambia SOLO aquí (y en environment.development.ts) la URL del backend;
// todos los servicios la leen desde `environment`.
const host = 'http://localhost:8000';

export const environment = {
  production: true,
  host, // host del backend, para rutas fuera de /api (p. ej. /health, /usuarios)
  apiUrl: `${host}/api`, // base de la API REST
};
