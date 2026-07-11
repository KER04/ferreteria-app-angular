import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-aside',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './aside.html',
})
export class Aside {
  private authService = inject(AuthService);
  private router = inject(Router);

  private user = toSignal(this.authService.user$);
  isAdmin = computed(() => {
    const roles = this.user()?.roles ?? [];
    return roles.some((r) => ['administrador', 'admin'].includes(r.toLowerCase()));
  });

  private nav: NavItem[] = [
    { label: 'Dashboard',      icon: 'dashboard',       route: '/dashboard' },
    { label: 'Inventario',     icon: 'inventory_2',     route: '/inventario' },
    { label: 'Catálogos',      icon: 'category',        route: '/inventario/catalogos' },
    { label: 'Ventas',         icon: 'point_of_sale',   route: '/ventas' },
    { label: 'Devoluciones',   icon: 'assignment_return', route: '/devoluciones' },
    { label: 'Mantenimiento',  icon: 'build',           route: '/mantenimiento' },
    { label: 'Administración', icon: 'manage_accounts', route: '/admin/usuarios', adminOnly: true },
  ];

  // Solo muestra los ítems que el usuario puede ver.
  visibleNav = computed(() => this.nav.filter((item) => !item.adminOnly || this.isAdmin()));

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
