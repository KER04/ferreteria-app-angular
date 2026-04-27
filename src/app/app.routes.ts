import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
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
      // Aquí irán las demás rutas: inventario, ventas, clientes...
    ]
  },

  { path: '**', redirectTo: 'login' }
];