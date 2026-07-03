import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperacionService } from '../../../core/services/operacion.service';
import { extraerMensajeError } from '../error-utils';
import { Devolucion, EstadoDevolucion } from '../../../shared/models/operacion';

const PAGE_SIZE = 20;

// Plantilla mínima (sin diseño). Lista de devoluciones + registro de una nueva.
@Component({
  selector: 'app-operaciones-devoluciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Devoluciones</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }
    @if (successMsg()) { <p class="text-green-700 text-sm mb-3">{{ successMsg() }}</p> }

    <form class="flex flex-wrap items-end gap-2 mb-4 border border-outline-variant rounded-lg p-3" (ngSubmit)="save()">
      <div>
        <label class="block text-xs text-on-surface-variant">ID Detalle *</label>
        <input type="number" min="1" class="border border-outline-variant rounded px-3 h-10 text-sm w-28" name="detalle" [(ngModel)]="detalle" />
      </div>
      <div>
        <label class="block text-xs text-on-surface-variant">Cantidad *</label>
        <input type="number" min="1" class="border border-outline-variant rounded px-3 h-10 text-sm w-28" name="cantidad" [(ngModel)]="cantidad" />
      </div>
      <div>
        <label class="block text-xs text-on-surface-variant">Estado *</label>
        <select class="border border-outline-variant rounded px-3 h-10 text-sm" name="estado" [(ngModel)]="estado">
          @for (e of estados; track e) { <option [ngValue]="e">{{ e }}</option> }
        </select>
      </div>
      <div class="flex-1 min-w-40">
        <label class="block text-xs text-on-surface-variant">Observaciones</label>
        <input class="border border-outline-variant rounded px-3 h-10 text-sm w-full" name="obs" [(ngModel)]="observaciones" />
      </div>
      <button type="submit" [disabled]="saving()" class="bg-primary text-on-primary px-4 h-10 rounded text-sm font-bold">Registrar</button>
    </form>

    @if (loading()) {
      <p class="text-on-surface-variant text-sm">Cargando...</p>
    } @else {
      <table class="w-full text-left text-sm border border-outline-variant">
        <thead class="bg-surface-container-low">
          <tr>
            <th class="px-3 py-2">#</th><th class="px-3 py-2">Operación</th><th class="px-3 py-2">Producto</th>
            <th class="px-3 py-2">Devuelto</th><th class="px-3 py-2">Estado</th><th class="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          @for (d of items(); track d.id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2">{{ d.id }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ d.operacion_codigo }}</td>
              <td class="px-3 py-2">{{ d.producto_nombre }}</td>
              <td class="px-3 py-2">{{ d.cantidad_devuelta }}</td>
              <td class="px-3 py-2">{{ d.estado_devolucion }}</td>
              <td class="px-3 py-2">{{ d.fecha_devolucion }}</td>
            </tr>
          } @empty { <tr><td colspan="6" class="px-3 py-4 text-on-surface-variant">Sin devoluciones.</td></tr> }
        </tbody>
      </table>

      <div class="flex items-center gap-3 mt-3 text-sm">
        <button (click)="prev()" [disabled]="page() === 1" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Anterior</button>
        <span class="text-on-surface-variant">Página {{ page() }} de {{ totalPages() }} · {{ count() }} devoluciones</span>
        <button (click)="next()" [disabled]="page() === totalPages()" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Siguiente</button>
      </div>
    }
  `,
})
export class OperacionesDevoluciones implements OnInit {
  private srv = inject(OperacionService);
  items = signal<Devolucion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  saving = signal(false);
  count = signal(0);
  page = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / PAGE_SIZE)));

  readonly estados: EstadoDevolucion[] = ['bueno', 'dañado', 'perdido'];
  detalle: number | null = null;
  cantidad: number | null = null;
  estado: EstadoDevolucion = 'bueno';
  observaciones = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getDevoluciones({ page: this.page() }).subscribe({
      next: (r) => {
        this.items.set(r.results);
        this.count.set(r.count);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerMensajeError(e, 'No se pudieron cargar las devoluciones.'));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (!this.detalle || !this.cantidad || this.cantidad <= 0) {
      this.error.set('Indica el ID del detalle y una cantidad mayor que cero.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.successMsg.set(null);
    this.srv
      .createDevolucion({
        detalle: this.detalle,
        cantidad_devuelta: this.cantidad,
        estado_devolucion: this.estado,
        observaciones: this.observaciones.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMsg.set('Devolución registrada.');
          this.detalle = null;
          this.cantidad = null;
          this.estado = 'bueno';
          this.observaciones = '';
          this.page.set(1);
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(extraerMensajeError(e, 'No se pudo registrar la devolución.'));
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
