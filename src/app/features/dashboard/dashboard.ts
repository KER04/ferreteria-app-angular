import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { OperacionService } from '../../core/services/operacion.service';
import { DashboardResumen, Producto } from '../../shared/models/producto';
import { Operacion } from '../../shared/models/operacion';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private productoSrv = inject(ProductoService);
  private operacionSrv = inject(OperacionService);

  readonly hoy = new Date();

  resumen = signal<DashboardResumen | null>(null);
  lowStock = signal<Producto[]>([]);
  vencidos = signal<Operacion[]>([]);
  actividad = signal<Operacion[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);

  // Barras del gráfico "Operaciones" (adaptado al resumen disponible)
  opsChart = computed(() => {
    const o = this.resumen()?.operaciones;
    if (!o) return [];
    const items = [
      { label: 'Activas', value: o.activas, color: 'bg-primary' },
      { label: 'Finalizadas', value: o.finalizadas, color: 'bg-emerald-500' },
      { label: 'Canceladas', value: o.canceladas, color: 'bg-error' },
    ];
    const max = Math.max(1, ...items.map((i) => i.value));
    return items.map((i) => ({ ...i, pct: Math.max(4, Math.round((i.value / max) * 100)) }));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.productoSrv.getDashboard().subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el resumen. Verifica tu sesión o el servidor.');
        this.loading.set(false);
      },
    });

    this.productoSrv.getProductos({ bajo_stock: true }).subscribe({
      next: (r) => this.lowStock.set(r.results),
      error: () => this.lowStock.set([]),
    });

    this.operacionSrv.getVencidos().subscribe({
      next: (r) => this.vencidos.set(r.results),
      error: () => this.vencidos.set([]),
    });

    this.operacionSrv.getOperaciones({ page: 1 }).subscribe({
      next: (r) => this.actividad.set(r.results.slice(0, 5)),
      error: () => this.actividad.set([]),
    });
  }

  diasVencido(fecha: string | null): number {
    if (!fecha) return 0;
    const venc = new Date(fecha + 'T00:00:00').getTime();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((hoy.getTime() - venc) / 86_400_000));
  }

  tipoLabel(op: Operacion): string {
    return op.tipo_operacion === 'venta' ? 'Venta' : 'Préstamo';
  }
}
