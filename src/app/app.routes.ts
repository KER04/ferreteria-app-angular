import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'sin-conexion',
    loadComponent: () => import('./features/error/sin-conexion/sin-conexion').then(m => m.SinConexion)
  },

  // Rutas protegidas dentro del layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout/layout').then(m => m.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },
      // ── Inventario ──────────────────────────────
      {
        path: 'inventario',
        loadComponent: () => import('./features/inventario/inventario').then(m => m.Inventario)
      },
      {
        path: 'inventario/catalogos',
        loadComponent: () => import('./features/inventario/catalogos/catalogos').then(m => m.Catalogos)
      },
      {
        path: 'inventario/marcas',
        loadComponent: () => import('./features/inventario/marcas/marcas').then(m => m.Marcas)
      },
      {
        path: 'inventario/categorias',
        loadComponent: () => import('./features/inventario/categorias/categorias').then(m => m.Categorias)
      },

      // ── Operaciones (Ventas / Préstamos) ─────────
      {
        path: 'ventas',
        loadComponent: () => import('./features/operaciones/operaciones').then(m => m.Operaciones)
      },
      {
        path: 'devoluciones',
        loadComponent: () => import('./features/operaciones/devoluciones/devoluciones').then(m => m.OperacionesDevoluciones)
      },
      {
        path: 'perdidas',
        loadComponent: () => import('./features/operaciones/perdidas/perdidas').then(m => m.OperacionesPerdidas)
      },
      {
        path: 'ventas/vencidos',
        loadComponent: () => import('./features/operaciones/vencidos/vencidos').then(m => m.OperacionesVencidos)
      },

      // ── Clientes ────────────────────────────────
      {
        path: 'clientes',
        loadComponent: () => import('./features/clientes/clientes').then(m => m.Clientes)
      },

      // ── Mantenimiento ───────────────────────────
      {
        path: 'mantenimiento',
        loadComponent: () => import('./features/mantenimiento/registros/registros').then(m => m.MantenimientoRegistros)
      },
      {
        path: 'mantenimiento/tipos',
        loadComponent: () => import('./features/mantenimiento/tipos/tipos').then(m => m.MantenimientoTipos)
      },
      {
        path: 'mantenimiento/salidas',
        loadComponent: () => import('./features/mantenimiento/salidas/salidas').then(m => m.MantenimientoSalidas)
      },

      // ── Administración ──────────────────────────
      {
        path: 'admin/usuarios',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/usuarios/usuarios').then(m => m.AdminUsuarios)
      },
      {
        path: 'admin/roles',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/roles/roles').then(m => m.AdminRoles)
      },
      {
        path: 'admin/recursos',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/recursos/recursos').then(m => m.AdminRecursos)
      },
      {
        path: 'admin/recursos-rol',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/recursos-rol/recursos-rol').then(m => m.AdminRecursosRol)
      },
    ]
  },

  { path: '**', redirectTo: 'login' }
];