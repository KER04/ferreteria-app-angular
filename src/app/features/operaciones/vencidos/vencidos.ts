import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperacionService } from '../../../core/services/operacion.service';
import { extraerMensajeError } from '../error-utils';
import { Operacion } from '../../../shared/models/operacion';

const PAGE_SIZE = 20;

// Plantilla mínima (sin diseño). Préstamos activos con fecha de devolución vencida
// (GET /api/operaciones/operaciones/vencidos/).
@Component({
  selector: 'app-operaciones-vencidos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Préstamos Vencidos</h2>
      <p class="text-on-surface-variant text-sm">Préstamos activos cuya fecha de devolución ya pasó.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    @if (loading()) {
      <p class="text-on-surface-variant text-sm">Cargando...</p>
    } @else {
      <table class="w-full text-left text-sm border border-outline-variant">
        <thead class="bg-surface-container-low">
          <tr>
            <th class="px-3 py-2">Código</th><th class="px-3 py-2">Cliente</th><th class="px-3 py-2">Responsable</th>
            <th class="px-3 py-2">Fecha operación</th><th class="px-3 py-2">Devolución</th><th class="px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (op of items(); track op.id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2 font-mono text-xs">{{ op.codigo_operacion }}</td>
              <td class="px-3 py-2">{{ op.cliente || '—' }}</td>
              <td class="px-3 py-2">{{ op.usuario_nombre }}</td>
              <td class="px-3 py-2">{{ op.fecha_operacion }}</td>
              <td class="px-3 py-2 text-error font-medium">{{ op.fecha_devolucion || '—' }}</td>
              <td class="px-3 py-2">{{ op.total | currency: 'USD' : 'symbol' : '1.2-2' }}</td>
            </tr>
          } @empty { <tr><td colspan="6" class="px-3 py-4 text-on-surface-variant">No hay préstamos vencidos.</td></tr> }
        </tbody>
      </table>

      <div class="flex items-center gap-3 mt-3 text-sm">
        <button (click)="prev()" [disabled]="page() === 1" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Anterior</button>
        <span class="text-on-surface-variant">Página {{ page() }} de {{ totalPages() }} · {{ count() }} vencidos</span>
        <button (click)="next()" [disabled]="page() === totalPages()" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Siguiente</button>
      </div>
    }
  `,
})
export class OperacionesVencidos implements OnInit {
  private srv = inject(OperacionService);
  items = signal<Operacion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  count = signal(0);
  page = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / PAGE_SIZE)));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getVencidos(this.page()).subscribe({
      next: (r) => {
        this.items.set(r.results);
        this.count.set(r.count);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerMensajeError(e, 'No se pudieron cargar los préstamos vencidos.'));
        this.loading.set(false);
      },
    });
  }

  prev(): void {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.load();
    }
  }

  next(): void {
    if (this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.load();
    }
  }
}
