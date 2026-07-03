import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService, extraerErrorApi } from '../../../core/services/producto.service';
import { Marca } from '../../../shared/models/producto';

// Plantilla mínima (sin diseño). Lógica CRUD completa contra ProductoService.
@Component({
  selector: 'app-inventario-marcas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Marcas</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    <form class="flex gap-2 mb-4" (ngSubmit)="save()">
      <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="nombre"
             [(ngModel)]="nombre" placeholder="Nombre de la marca" />
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
          @for (m of items(); track m.marca_id) {
            <tr class="border-t border-outline-variant">
              <td class="px-3 py-2">{{ m.marca_id }}</td>
              <td class="px-3 py-2">{{ m.marca_nombre }}</td>
              <td class="px-3 py-2 text-right">
                <button (click)="edit(m)" class="text-primary mr-3">Editar</button>
                <button (click)="remove(m)" class="text-error">Eliminar</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="3" class="px-3 py-4 text-on-surface-variant">Sin marcas.</td></tr> }
        </tbody>
      </table>
    }
  `,
})
export class Marcas implements OnInit {
  private srv = inject(ProductoService);
  items = signal<Marca[]>([]);
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
    this.srv.getTodasMarcas().subscribe({
      next: (r) => {
        this.items.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorApi(e, 'No se pudieron cargar las marcas.'));
        this.loading.set(false);
      },
    });
  }

  edit(m: Marca): void {
    this.editingId = m.marca_id;
    this.nombre = m.marca_nombre;
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
      ? this.srv.updateMarca(this.editingId, { marca_nombre: nombre })
      : this.srv.createMarca({ marca_nombre: nombre });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(extraerErrorApi(e, 'No se pudo guardar la marca.'));
      },
    });
  }

  remove(m: Marca): void {
    if (!confirm(`¿Eliminar la marca "${m.marca_nombre}"?`)) return;
    this.srv.deleteMarca(m.marca_id).subscribe({
      next: () => this.load(),
      error: (e) => this.error.set(extraerErrorApi(e, 'No se pudo eliminar la marca.')),
    });
  }
}
