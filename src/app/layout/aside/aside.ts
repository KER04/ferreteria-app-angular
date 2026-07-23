import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  icon: string;
  route?: string; // ítem directo (sin submenú)
  children?: NavChild[]; // grupo colapsable
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
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    {
      label: 'Inventario',
      icon: 'inventory_2',
      children: [
        { label: 'Existencias', route: '/inventario' },
        { label: 'Catálogos', route: '/inventario/catalogos' },
      ],
    },
    {
      label: 'Operaciones',
      icon: 'sync_alt',
      children: [
        { label: 'Ventas y Préstamos', route: '/ventas' },
        { label: 'Vencidos', route: '/ventas/vencidos' },
        { label: 'Devoluciones', route: '/devoluciones' },
        { label: 'Pérdidas', route: '/perdidas' },
      ],
    },
    { label: 'Clientes', icon: 'groups', route: '/clientes' },
    {
      label: 'Mantenimiento',
      icon: 'build',
      children: [
        { label: 'Registros', route: '/mantenimiento' },
        { label: 'Tipos', route: '/mantenimiento/tipos' },
        { label: 'Salidas', route: '/mantenimiento/salidas' },
      ],
    },
    {
      label: 'Administración',
      icon: 'manage_accounts',
      adminOnly: true,
      children: [
        { label: 'Usuarios', route: '/admin/usuarios' },
        { label: 'Roles', route: '/admin/roles' },
        { label: 'Permisos', route: '/admin/recursos' },
        { label: 'Roles y Permisos', route: '/admin/recursos-rol' },
      ],
    },
  ];

  // Solo muestra los ítems que el usuario puede ver.
  visibleNav = computed(() => this.nav.filter((item) => !item.adminOnly || this.isAdmin()));

  // Grupos expandidos (acordeón multi-abierto).
  openGroups = signal<Set<string>>(new Set());

  constructor() {
    // Abre el grupo de la ruta activa al cargar y en cada navegación.
    this.abrirGrupoDe(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.abrirGrupoDe(e.urlAfterRedirects));
  }

  private rutaActiva(route: string, url: string): boolean {
    return url === route || url.startsWith(route + '/') || url.startsWith(route + '?');
  }

  private abrirGrupoDe(url: string): void {
    const grupo = this.nav.find((i) => i.children?.some((c) => this.rutaActiva(c.route, url)));
    if (grupo && !this.openGroups().has(grupo.label)) {
      const s = new Set(this.openGroups());
      s.add(grupo.label);
      this.openGroups.set(s);
    }
  }

  toggleGroup(label: string): void {
    const s = new Set(this.openGroups());
    if (s.has(label)) {
      s.delete(label);
    } else {
      s.add(label);
    }
    this.openGroups.set(s);
  }

  isOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
