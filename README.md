<div align="center">

# 🔧 Ferretex Pro — ERP de Ferretería

**Sistema de gestión de inventario, ventas, préstamos y mantenimiento de herramientas industriales.**

Frontend **Angular 20** (standalone + signals) conectado a una API REST **Django REST Framework** con autenticación **JWT**.

![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?logo=reactivex&logoColor=white)
![Django REST](https://img.shields.io/badge/Django_REST-JWT-092E20?logo=django&logoColor=white)

</div>

---

## 📋 Descripción

**Ferretex Pro** es un ERP pensado para el día a día de una ferretería: control de inventario con segmentación de stock, punto de venta con ventas y **préstamos de herramientas**, gestión de **devoluciones**, seguimiento de **mantenimientos** (con recuperación y bajas de equipo) y un panel de administración de usuarios y roles.

Construido con un enfoque **profesional y realista**: autenticación por token, control de acceso por roles, datos reales servidos por una API REST y una interfaz coherente basada en un **design system** propio.

> 💡 Este repositorio es el **frontend**. El backend (API REST en Django) vive en un repositorio aparte (`ferreteria-api-django`).

---

## ✨ Funcionalidades

| Módulo | Qué incluye |
|---|---|
| 🔐 **Autenticación** | Login con JWT, refresh automático de token, sesión persistente y guards de ruta. |
| 📊 **Dashboard** | KPIs reales (productos, stock bajo, valor de inventario), alertas de stock, préstamos vencidos y actividad reciente. |
| 📦 **Inventario** | CRUD de productos con foto, **búsqueda en vivo**, filtros server-side, paginación y **segmentación de stock** (disponible / prestado / mantenimiento / total). |
| 🗂️ **Catálogos** | Gestión unificada de Marcas, Categorías y Tipos de préstamo (con pestañas). |
| 🛒 **Ventas / Operaciones** | Ventas y préstamos con líneas de detalle, finalizar/cancelar, búsqueda en vivo y tarjetas de resumen. |
| ↩️ **Devoluciones** | Flujo por préstamo: eliges la operación y devuelves cada línea indicando cantidad y estado (bueno / dañado / perdido). |
| ⏰ **Préstamos vencidos** | Vista de atrasos críticos con días de retraso y monto en riesgo. |
| 🔩 **Mantenimiento** | Registros de mantenimiento, **finalización con salida** (unidades recuperadas / dadas de baja), tipos, costos e historial. |
| 👥 **Administración** | Alta/edición/activación/eliminación de usuarios (solo-admin), asignación de roles, y gestión de roles y recursos. |

---

## 🏗️ Aspectos técnicos destacados

Lo que este proyecto demuestra a nivel de ingeniería:

- **Angular 20 moderno:** componentes *standalone*, **Signals**, nueva sintaxis de control de flujo (`@if` / `@for` / `@empty`) y **lazy loading** por ruta (`loadComponent`).
- **Autenticación JWT robusta:** un **interceptor funcional** adjunta el `Bearer` y **renueva el token automáticamente** ante un `401`; la sesión se **restaura al recargar** y solo se cierra ante un fallo de autenticación real (no ante errores de red).
- **Control de acceso por roles:** guards funcionales (`authGuard` / `adminGuard`) + el menú lateral se **arma según el rol** del usuario (un empleado no ve la sección de Administración).
- **Programación reactiva (RxJS):** búsqueda en vivo con `debounceTime` + `distinctUntilChanged`, `switchMap` para cancelar peticiones, `forkJoin` para operaciones en lote y `expand`/`reduce` para recorrer paginación completa.
- **Tipado extremo a extremo:** interfaces TypeScript derivadas 1:1 de los serializers de DRF; sin `any` en los contratos de datos.
- **Design System propio:** *tokens* de color y tipografía centralizados con **Tailwind v4 `@theme`**, iconografía **Material Symbols** y fuente **Inter**.
- **UX cuidada:** modal de **confirmación reutilizable** (reemplaza al `confirm()` nativo), *skeletons* de carga, estados vacíos ilustrados y una página de **error de conexión** con reintento contra el `health check` del backend.

---

## 🧰 Stack tecnológico

**Frontend**
- Angular 20 · TypeScript 5.9 · RxJS 7.8
- Tailwind CSS 4 · Material Symbols · Inter
- PrimeNG (feedback puntual)

**Backend** (repo aparte)
- Django REST Framework · SimpleJWT (access/refresh)
- SQLite en desarrollo (listo para PostgreSQL vía `DATABASE_URL`)
- CORS habilitado para el frontend

---

## 📁 Estructura

```
src/app/
├── core/
│   ├── guards/          # authGuard, adminGuard
│   ├── interceptors/    # authInterceptor (JWT + refresh)
│   └── services/        # AuthService, ProductoService, OperacionService, ...
├── features/
│   ├── auth/            # login
│   ├── dashboard/
│   ├── inventario/      # productos + catálogos (marcas, categorías, préstamos)
│   ├── operaciones/     # ventas/préstamos, devoluciones, vencidos
│   ├── mantenimiento/   # registros, tipos, costos, salidas
│   ├── admin/           # usuarios, roles, recursos
│   └── error/           # página de sin conexión
├── layout/              # aside, header, footer, layout
└── shared/
    ├── models/          # interfaces tipadas (auth, producto, operacion, ...)
    └── ui/              # confirm-dialog (modal global reutilizable)
```

---

## 🚀 Puesta en marcha

### Requisitos
- Node.js 18+ y npm
- Python 3.11+ (para el backend)

### 1) Backend (Django) — repositorio `ferreteria-api-django`
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver        # http://localhost:8000
```

### 2) Frontend (Angular) — este repositorio
```bash
npm install
npm start                          # http://localhost:4200
```

Abre **http://localhost:4200** e inicia sesión con una cuenta de administrador creada en el backend.

> El frontend apunta al backend en `http://localhost:8000` y el backend permite CORS desde `http://localhost:4200`.

---

## 🔑 Roles y permisos

| Acción | Empleado (`Usuario`) | Administrador |
|---|:--:|:--:|
| Consultar inventario y catálogos | ✅ | ✅ |
| Registrar ventas, préstamos y devoluciones | ✅ | ✅ |
| Registrar y finalizar mantenimientos | ✅ | ✅ |
| Crear/editar productos y catálogos | — | ✅ |
| Gestionar usuarios, roles y recursos | — | ✅ |

El backend valida los permisos (`IsAdminOrReadOnly` / `IsAdminRole`) y el frontend refuerza la experiencia ocultando las secciones no permitidas.

---

## 🧭 Scripts

```bash
npm start        # servidor de desarrollo (ng serve)
npm run build    # build de producción
npm test         # tests unitarios (Karma/Jasmine)
```



## 👤 Autor

**Kevin Estrada** — Desarrollador Full-Stack

- 💼 LinkedIn: https://www.linkedin.com/in/kevin-estrada-65ab69408/
- 🐙 GitHub: https://github.com/KER04

---

<div align="center">

⭐ Si te resulta útil, ¡deja una estrella!

</div>
