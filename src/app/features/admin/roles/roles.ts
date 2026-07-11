import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { adminErrorMessage, isAdminForbidden } from '../admin-errors';
import { Rol } from '../../../shared/models/admin';

const PAGE_SIZE = 20;

// Plantilla mínima (sin diseño). CRUD de roles (requiere rol admin en el backend).
@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Roles</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }

    @if (!forbidden()) {
      <form class="flex flex-wrap gap-2 mb-4" (ngSubmit)="save()">
        <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="nombre" [(ngModel)]="nombre" placeholder="Nombre del rol" />
        <input class="border border-outline-variant rounded px-3 h-10 text-sm" name="descripcion" [(ngModel)]="descripcion" placeholder="Descripción" />
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
          <thead class="bg-surface-container-low"><tr><th class="px-3 py-2">#</th><th class="px-3 py-2">Nombre</th><th class="px-3 py-2">Descripción</th><th class="px-3 py-2 text-right">Acciones</th></tr></thead>
          <tbody>
            @for (r of items(); track r.id) {
              <tr class="border-t border-outline-variant">
                <td class="px-3 py-2">{{ r.id }}</td>
                <td class="px-3 py-2">{{ r.nombre }}</td>
                <td class="px-3 py-2">{{ r.descripcion || '—' }}</td>
                <td class="px-3 py-2 text-right">
                  <button (click)="edit(r)" class="text-primary mr-3">Editar</button>
                  <button (click)="remove(r)" class="text-error">Eliminar</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="4" class="px-3 py-4 text-on-surface-variant">Sin roles.</td></tr> }
          </tbody>
        </table>

        <div class="flex items-center gap-3 mt-3 text-sm">
          <button (click)="prev()" [disabled]="page() === 1" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Anterior</button>
          <span class="text-on-surface-variant">Página {{ page() }} de {{ totalPages() }} · {{ count() }} roles</span>
          <button (click)="next()" [disabled]="page() === totalPages()" class="px-3 py-1 border border-outline-variant rounded disabled:opacity-40">Siguiente</button>
        </div>
      }
    }
  `,
})
export class AdminRoles implements OnInit {
  private srv = inject(AdminService);
  private confirmSvc = inject(ConfirmService);
  items = signal<Rol[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  forbidden = signal(false);
  saving = signal(false);
  count = signal(0);
  page = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / PAGE_SIZE)));

  editingId: number | null = null;
  nombre = '';
  descripcion = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getRoles(this.page()).subscribe({
      next: (r) => {
        this.items.set(r.results);
        this.count.set(r.count);
        this.loading.set(false);
      },
      error: (e) => {
        this.forbidden.set(isAdminForbidden(e));
        this.error.set(adminErrorMessage(e, 'No se pudieron cargar los roles.'));
        this.loading.set(false);
      },
    });
  }

  edit(r: Rol): void {
    this.editingId = r.id;
    this.nombre = r.nombre;
    this.descripcion = r.descripcion ?? '';
  }

  cancel(): void {
    this.editingId = null;
    this.nombre = '';
    this.descripcion = '';
  }

  save(): void {
    const nombre = this.nombre.trim();
    if (!nombre) return;
    this.saving.set(true);
    this.error.set(null);
    const body = { nombre, descripcion: this.descripcion.trim() || null };
    const req = this.editingId ? this.srv.updateRol(this.editingId, body) : this.srv.createRol(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(adminErrorMessage(e, 'No se pudo guardar el rol.'));
      },
    });
  }

  remove(r: Rol): void {
    this.confirmSvc.ask({
      title: 'Eliminar rol',
      message: `¿Eliminar el rol "${r.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      icon: 'delete_forever',
    }).then((ok) => {
      if (!ok) return;
      this.srv.deleteRol(r.id).subscribe({
        next: () => this.load(),
        error: (e) => this.error.set(adminErrorMessage(e, 'No se pudo eliminar el rol.')),
      });
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
