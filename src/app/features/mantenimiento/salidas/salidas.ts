import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MantenimientoService, extraerErrorHttp } from '../../../core/services/mantenimiento.service';
import { SalidaMantenimiento } from '../../../shared/models/mantenimiento';

const PAGE_SIZE = 20;

// Plantilla mínima (sin diseño). Salidas de mantenimiento son de solo lectura
// en el backend (se crean al finalizar un registro).
@Component({
  selector: 'app-mantenimiento-salidas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Salidas de Mantenimiento</h2>
      <p class="text-on-surface-variant text-sm">Solo lectura. Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    @if (loading()) {
      <p class="text-on-surface-variant text-sm">Cargando...</p>
    } @else {
      <table class="w-full text-left text-sm border border-outline-variant">
        <thead class="bg-surface-container-low">
          <tr>
            <th class="px-3 py-2">#</th><th class="px-3 py-2">Mant.</th><th class="px-3 py-2">Fecha</th>
            <th class="px-3 py-2">Recuperada</th><th class="px-3 py-2">Baja</th><th class="px-3 py-2">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          @for (s of items(); track s.id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2">{{ s.id }}</td>
              <td class="px-3 py-2">{{ s.mantenimiento }}</td>
              <td class="px-3 py-2">{{ s.fecha_salida }}</td>
              <td class="px-3 py-2">{{ s.cantidad_recuperada }}</td>
              <td class="px-3 py-2">{{ s.cantidad_baja }}</td>
              <td class="px-3 py-2">{{ s.observaciones || '—' }}</td>
            </tr>
          } @empty { <tr><td colspan="6" class="px-3 py-4 text-on-surface-variant">Sin salidas.</td></tr> }
        </tbody>
      </table>

      <div class="flex items-center gap-3 mt-3 text-sm">
        <button (click)="prev()" [disabled]="page() === 1" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Anterior</button>
        <span class="text-on-surface-variant">Página {{ page() }} de {{ totalPages() }} · {{ count() }} salidas</span>
        <button (click)="next()" [disabled]="page() === totalPages()" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Siguiente</button>
      </div>
    }
  `,
})
export class MantenimientoSalidas implements OnInit {
  private srv = inject(MantenimientoService);
  items = signal<SalidaMantenimiento[]>([]);
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
    this.srv.getSalidas({ page: this.page() }).subscribe({
      next: (r) => {
        this.items.set(r.results);
        this.count.set(r.count);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorHttp(e, 'No se pudieron cargar las salidas.'));
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
