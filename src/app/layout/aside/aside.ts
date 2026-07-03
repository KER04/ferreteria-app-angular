import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-aside',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './aside.html',
})
export class Aside {
  nav: NavItem[] = [
    { label: 'Dashboard',      icon: 'dashboard',       route: '/dashboard' },
    { label: 'Inventario',     icon: 'inventory_2',     route: '/inventario' },
    { label: 'Ventas',         icon: 'point_of_sale',   route: '/ventas' },
    { label: 'Devoluciones',   icon: 'assignment_return', route: '/devoluciones' },
    { label: 'Mantenimiento',  icon: 'build',           route: '/mantenimiento' },
    { label: 'Administración', icon: 'manage_accounts', route: '/admin/usuarios' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
