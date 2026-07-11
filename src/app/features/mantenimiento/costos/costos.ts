import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MantenimientoService, extraerErrorHttp } from '../../../core/services/mantenimiento.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Costo } from '../../../shared/models/mantenimiento';

// Plantilla mínima (sin diseño). CRUD de costos de mantenimiento.
@Component({
  selector: 'app-mantenimiento-costos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Costos de Mantenimiento</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    <form class="flex flex-wrap gap-2 mb-4" (ngSubmit)="save()">
      <input type="number" step="0.01" min="0" class="border border-outline-variant rounded px-3 h-10 text-sm w-32" name="total"
             [(ngModel)]="total" placeholder="Total" />
      <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="partes"
             [(ngModel)]="partes" placeholder="Partes afectadas" />
      <input type="date" class="border border-outline-variant rounded px-3 h-10 text-sm" name="fecha" [(ngModel)]="fecha" />
      <button type="submit" [disabled]="saving()" class="bg-primary text-on-primary px-4 h-10 rounded text-sm font-bold">
        {{ editingId ? 'Guardar' : 'Añadir' }}
      </button>
      @if (editingId) {
        <button type="button" (click)="cancel()" class="px-4 h-10 rounded text-sm border border-outline-variant">Cancelar</button>
      }
    </form>

    @if (loading()) {
      <p class="text-on-surface-variant text-sm">Cargando...</p>
    } @else {
      <table class="w-full text-left text-sm border border-outline-variant">
        <thead class="bg-surface-container-low"><tr><th class="px-3 py-2">#</th><th class="px-3 py-2">Total</th><th class="px-3 py-2">Partes</th><th class="px-3 py-2">Fecha pago</th><th class="px-3 py-2 text-right">Acciones</th></tr></thead>
        <tbody>
          @for (c of items(); track c.cost_id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2">{{ c.cost_id }}</td>
              <td class="px-3 py-2">{{ c.cost_total | currency: 'USD' : 'symbol' : '1.2-2' }}</td>
              <td class="px-3 py-2">{{ c.cost_partes_afectadas || '—' }}</td>
              <td class="px-3 py-2">{{ c.cost_fecha_pago || '—' }}</td>
              <td class="px-3 py-2 text-right">
                <button (click)="edit(c)" class="text-primary mr-3">Editar</button>
                <button (click)="remove(c)" class="text-error">Eliminar</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="5" class="px-3 py-4 text-on-surface-variant">Sin costos.</td></tr> }
        </tbody>
      </table>
    }
  `,
})
export class MantenimientoCostos implements OnInit {
  private srv = inject(MantenimientoService);
  private confirmSvc = inject(ConfirmService);
  items = signal<Costo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  saving = signal(false);
  editingId: number | null = null;
  total: number | null = null;
  partes = '';
  fecha = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getAllCostos().subscribe({
      next: (r) => {
        this.items.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorHttp(e, 'No se pudieron cargar los costos.'));
        this.loading.set(false);
      },
    });
  }

  edit(c: Costo): void {
    this.editingId = c.cost_id;
    this.total = Number(c.cost_total);
    this.partes = c.cost_partes_afectadas ?? '';
    this.fecha = c.cost_fecha_pago ?? '';
  }

  cancel(): void {
    this.editingId = null;
    this.total = null;
    this.partes = '';
    this.fecha = '';
  }

  save(): void {
    if (this.total === null || this.total < 0) {
      this.error.set('Ingresa un total válido.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body = {
      cost_total: this.total,
      cost_partes_afectadas: this.partes.trim() || null,
      cost_fecha_pago: this.fecha || null,
    };
    const req = this.editingId
      ? this.srv.updateCosto(this.editingId, body)
      : this.srv.createCosto(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(extraerErrorHttp(e, 'No se pudo guardar el costo.'));
      },
    });
  }

  remove(c: Costo): void {
    this.confirmSvc.ask({
      title: 'Eliminar costo',
      message: `¿Eliminar el costo #${c.cost_id}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      icon: 'delete_forever',
    }).then((ok) => {
      if (!ok) return;
      this.srv.deleteCosto(c.cost_id).subscribe({
        next: () => this.load(),
        error: (e) => this.error.set(extraerErrorHttp(e, 'No se pudo eliminar el costo.')),
      });
    });
  }
}
