import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService, extraerErrorApi } from '../../../core/services/producto.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Prestamo } from '../../../shared/models/producto';

// Plantilla mínima (sin diseño). CRUD completo del catálogo de préstamos.
@Component({
  selector: 'app-inventario-prestamos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Tipos de Préstamo</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    <form class="flex flex-wrap gap-2 mb-4" (ngSubmit)="save()">
      <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="nombre"
             [(ngModel)]="nombre" placeholder="Nombre" />
      <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="tipo"
             [(ngModel)]="tipo" placeholder="Tipo de préstamo" />
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
        <thead class="bg-surface-container-low"><tr><th class="px-3 py-2">#</th><th class="px-3 py-2">Nombre</th><th class="px-3 py-2">Tipo</th><th class="px-3 py-2 text-right">Acciones</th></tr></thead>
        <tbody>
          @for (p of items(); track p.pres_id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2">{{ p.pres_id }}</td>
              <td class="px-3 py-2">{{ p.pres_nombre }}</td>
              <td class="px-3 py-2">{{ p.tipo_prestamo }}</td>
              <td class="px-3 py-2 text-right">
                <button (click)="edit(p)" class="text-primary mr-3">Editar</button>
                <button (click)="remove(p)" class="text-error">Eliminar</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="4" class="px-3 py-4 text-on-surface-variant">Sin registros.</td></tr> }
        </tbody>
      </table>
    }
  `,
})
export class Prestamos implements OnInit {
  private srv = inject(ProductoService);
  private confirmSvc = inject(ConfirmService);
  items = signal<Prestamo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  saving = signal(false);
  editingId: number | null = null;
  nombre = '';
  tipo = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getTodosPrestamos().subscribe({
      next: (r) => {
        this.items.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorApi(e, 'No se pudieron cargar los tipos de préstamo.'));
        this.loading.set(false);
      },
    });
  }

  edit(p: Prestamo): void {
    this.editingId = p.pres_id;
    this.nombre = p.pres_nombre;
    this.tipo = p.tipo_prestamo;
  }

  cancel(): void {
    this.editingId = null;
    this.nombre = '';
    this.tipo = '';
  }

  save(): void {
    const nombre = this.nombre.trim();
    const tipo = this.tipo.trim();
    if (!nombre || !tipo) return;
    this.saving.set(true);
    this.error.set(null);
    const body = { pres_nombre: nombre, tipo_prestamo: tipo };
    const req = this.editingId
      ? this.srv.updatePrestamo(this.editingId, body)
      : this.srv.createPrestamo(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(extraerErrorApi(e, 'No se pudo guardar el tipo de préstamo.'));
      },
    });
  }

  remove(p: Prestamo): void {
    this.confirmSvc.ask({
      title: 'Eliminar tipo de préstamo',
      message: `¿Eliminar "${p.pres_nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      icon: 'delete_forever',
    }).then((ok) => {
      if (!ok) return;
      this.srv.deletePrestamo(p.pres_id).subscribe({
        next: () => this.load(),
        error: (e) => this.error.set(extraerErrorApi(e, 'No se pudo eliminar el registro.')),
      });
    });
  }
}
