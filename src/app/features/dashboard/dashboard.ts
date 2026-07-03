import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService } from '../../core/services/producto.service';
import { DashboardResumen } from '../../shared/models/producto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private productoService = inject(ProductoService);

  data = signal<DashboardResumen | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.productoService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el resumen. Verifica tu sesión o el servidor.');
        this.loading.set(false);
      },
    });
  }
}
