import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { OperacionService } from '../../core/services/operacion.service';
import { DashboardResumen, Producto } from '../../shared/models/producto';
import { Operacion } from '../../shared/models/operacion';

// Alerta unificada para el panel "Alertas Prioritarias"
interface Alerta {
  sev: 'critical' | 'warning';
  tag: string;
  icon: string;
  title: string;
  detail: string;
  ref: string;
  route: string;
}

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
      { label: 'Finalizadas', value: o.finalizadas, color: 'bg-tertiary' },
      { label: 'Canceladas', value: o.canceladas, color: 'bg-error' },
    ];
    const max = Math.max(1, ...items.map((i) => i.value));
    return items.map((i) => ({ ...i, pct: Math.max(4, Math.round((i.value / max) * 100)) }));
  });

  totalOps = computed(() => {
    const o = this.resumen()?.operaciones;
    return o ? o.activas + o.finalizadas + o.canceladas : 0;
  });

  // Proporción de stock bajo sobre el total (barra de acento del KPI)
  stockRatio = computed(() => {
    const inv = this.resumen()?.inventario;
    if (!inv || !inv.total_productos) return 0;
    return Math.min(100, Math.round((inv.bajo_stock / inv.total_productos) * 100));
  });

  // Panel "Alertas Prioritarias": une vencidos (crítico) + stock bajo (aviso)
  alertas = computed<Alerta[]>(() => {
    const out: Alerta[] = [];
    for (const op of this.vencidos()) {
      out.push({
        sev: 'critical',
        tag: 'Préstamo vencido',
        icon: 'assignment_late',
        title: `Préstamo ${op.codigo_operacion} sin devolver`,
        detail: `Cliente: ${op.cliente || '—'}. ${this.diasVencido(op.fecha_devolucion)} día(s) de retraso.`,
        ref: op.codigo_operacion,
        route: '/ventas/vencidos',
      });
    }
    for (const p of this.lowStock()) {
      const agotado = p.prod_cantidad_disponible === 0;
      out.push({
        sev: agotado ? 'critical' : 'warning',
        tag: agotado ? 'Agotado' : 'Stock bajo',
        icon: agotado ? 'production_quantity_limits' : 'inventory',
        title: p.prod_nombre,
        detail: `Quedan ${p.prod_cantidad_disponible} unidad(es). Reabastecer.`,
        ref: p.codigo_producto,
        route: '/inventario',
      });
    }
    return out
      .sort((a, b) => (a.sev === 'critical' ? 0 : 1) - (b.sev === 'critical' ? 0 : 1))
      .slice(0, 6);
  });

  criticalCount = computed(() => this.alertas().filter((a) => a.sev === 'critical').length);

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
