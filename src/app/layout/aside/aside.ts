import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-aside',
  standalone: true,
  imports: [PanelMenuModule],
  templateUrl: './aside.html',
})
export class Aside {
  items: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      command: () => this.router.navigate(['/dashboard'])
    },
    {
      label: 'Inventario',
      icon: 'pi pi-box',
      items: [
        { label: 'Productos',      icon: 'pi pi-tag',      command: () => this.router.navigate(['/inventario']) },
        { label: 'Tipo Productos', icon: 'pi pi-list',     command: () => this.router.navigate(['/tipo-productos']) },
      ]
    },
    {
      label: 'Ventas',
      icon: 'pi pi-shopping-cart',
      items: [
        { label: 'Nueva Venta',  icon: 'pi pi-plus',    command: () => this.router.navigate(['/ventas']) },
        { label: 'Historial',    icon: 'pi pi-history', command: () => this.router.navigate(['/historial-ventas']) },
      ]
    },
    {
      label: 'Clientes',
      icon: 'pi pi-users',
      command: () => this.router.navigate(['/clientes'])
    },
    {
      label: 'Proveedores',
      icon: 'pi pi-truck',
      command: () => this.router.navigate(['/proveedores'])
    },
  ];

  constructor(private router: Router) {}
}