import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService, extraerErrorApi } from '../../../core/services/producto.service';
import { TipoCategoria } from '../../../shared/models/producto';

// Plantilla mínima (sin diseño). CRUD completo de categorías.
@Component({
  selector: 'app-inventario-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Categorías</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    <form class="flex gap-2 mb-4" (ngSubmit)="save()">
      <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="nombre"
             [(ngModel)]="nombre" placeholder="Nombre de la categoría" />
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
        <thead class="bg-surface-container-low"><tr><th class="px-3 py-2">#</th><th class="px-3 py-2">Nombre</th><th class="px-3 py-2 text-right">Acciones</th></tr></thead>
        <tbody>
          @for (c of items(); track c.tipr_id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2">{{ c.tipr_id }}</td>
              <td class="px-3 py-2">{{ c.tipr_nombre }}</td>
              <td class="px-3 py-2 text-right">
                <button (click)="edit(c)" class="text-primary mr-3">Editar</button>
                <button (click)="remove(c)" class="text-error">Eliminar</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="3" class="px-3 py-4 text-on-surface-variant">Sin categorías.</td></tr> }
        </tbody>
      </table>
    }
  `,
})
export class Categorias implements OnInit {
  private srv = inject(ProductoService);
  items = signal<TipoCategoria[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  saving = signal(false);
  editingId: number | null = null;
  nombre = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getTodasCategorias().subscribe({
      next: (r) => {
        this.items.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorApi(e, 'No se pudieron cargar las categorías.'));
        this.loading.set(false);
      },
    });
  }

  edit(c: TipoCategoria): void {
    this.editingId = c.tipr_id;
    this.nombre = c.tipr_nombre;
  }

  cancel(): void {
    this.editingId = null;
    this.nombre = '';
  }

  save(): void {
    const nombre = this.nombre.trim();
    if (!nombre) return;
    this.saving.set(true);
    this.error.set(null);
    const req = this.editingId
      ? this.srv.updateCategoria(this.editingId, { tipr_nombre: nombre })
      : this.srv.createCategoria({ tipr_nombre: nombre });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(extraerErrorApi(e, 'No se pudo guardar la categoría.'));
      },
    });
  }

  remove(c: TipoCategoria): void {
    if (!confirm(`¿Eliminar la categoría "${c.tipr_nombre}"?`)) return;
    this.srv.deleteCategoria(c.tipr_id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(extraerErrorApi(e, 'No se pudo eliminar la categoría.')),
    });
  }
}
