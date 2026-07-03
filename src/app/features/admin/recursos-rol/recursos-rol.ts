import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { adminErrorMessage, isAdminForbidden } from '../admin-errors';
import { Recurso, RecursoRol, Rol } from '../../../shared/models/admin';

// Plantilla mínima (sin diseño). Asignación de recursos a un rol
// (POST /api/auth/recursos-rol/ y GET /api/auth/recursos-rol/{rol_id}/).
@Component({
  selector: 'app-admin-recursos-rol',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="text-headline-md font-bold text-on-surface">Asignación Recurso–Rol</h2>
      <p class="text-on-surface-variant text-sm">Componente y servicio listos — diseño pendiente.</p>
    </div>

    @if (error()) { <p class="text-error text-sm mb-3">{{ error() }}</p> }
    @if (successMsg()) { <p class="text-green-700 text-sm mb-3">{{ successMsg() }}</p> }

    @if (!forbidden()) {
      <div class="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <label class="block text-xs text-on-surface-variant">Rol</label>
          <select class="border border-outline-variant rounded px-3 h-10 text-sm" [(ngModel)]="rolId" (ngModelChange)="onRolChange()">
            <option [ngValue]="''">Selecciona un rol</option>
            @for (r of roles(); track r.id) { <option [ngValue]="r.id">{{ r.nombre }}</option> }
          </select>
        </div>
        <div>
          <label class="block text-xs text-on-surface-variant">Recurso a asignar</label>
          <select class="border border-outline-variant rounded px-3 h-10 text-sm" [(ngModel)]="recursoId">
            <option [ngValue]="''">Selecciona un recurso</option>
            @for (rc of recursos(); track rc.id) { <option [ngValue]="rc.id">{{ rc.nombre }} ({{ rc.url }})</option> }
          </select>
        </div>
        <button (click)="asignar()" [disabled]="rolId === '' || recursoId === '' || asignando()"
                class="bg-primary text-on-primary px-4 h-10 rounded text-sm font-bold disabled:opacity-40">Asignar</button>
      </div>

      @if (rolId !== '') {
        <h3 class="text-sm font-bold text-on-surface mb-2">Recursos asignados a este rol</h3>
        @if (loading()) {
          <p class="text-on-surface-variant text-sm">Cargando...</p>
        } @else {
          <table class="w-full text-left text-sm border border-outline-variant">
            <thead class="bg-surface-container-low"><tr><th class="px-3 py-2">#</th><th class="px-3 py-2">Recurso</th><th class="px-3 py-2">URL</th><th class="px-3 py-2">Asignado</th></tr></thead>
            <tbody>
              @for (a of asignaciones(); track a.id) {
                <tr class="border-t border-outline-variant">
                  <td class="px-3 py-2">{{ a.id }}</td>
                  <td class="px-3 py-2">{{ recursoNombre(a.recurso) }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ recursoUrl(a.recurso) }}</td>
                  <td class="px-3 py-2">{{ a.asignado_en | date: 'short' }}</td>
                </tr>
              } @empty { <tr><td colspan="4" class="px-3 py-4 text-on-surface-variant">Este rol no tiene recursos asignados.</td></tr> }
            </tbody>
          </table>
        }
      }
    }
  `,
})
export class AdminRecursosRol implements OnInit {
  private srv = inject(AdminService);

  roles = signal<Rol[]>([]);
  recursos = signal<Recurso[]>([]);
  asignaciones = signal<RecursoRol[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  forbidden = signal(false);
  asignando = signal(false);

  rolId: number | '' = '';
  recursoId: number | '' = '';

  // Mapa recurso_id → Recurso para mostrar nombre/URL (el serializer solo trae PKs)
  private recursoMap = computed(() => {
    const map = new Map<number, Recurso>();
    for (const r of this.recursos()) map.set(r.id, r);
    return map;
  });

  ngOnInit(): void {
    this.srv.getAllRoles().subscribe({
      next: (r) => this.roles.set(r),
      error: (e) => {
        this.forbidden.set(isAdminForbidden(e));
        this.error.set(adminErrorMessage(e, 'No se pudieron cargar los roles.'));
      },
    });
    this.srv.getAllRecursos().subscribe({
      next: (r) => this.recursos.set(r),
      error: (e) => {
        this.forbidden.set(isAdminForbidden(e));
        this.error.set(adminErrorMessage(e, 'No se pudieron cargar los recursos.'));
      },
    });
  }

  recursoNombre(id: number): string {
    return this.recursoMap().get(id)?.nombre ?? `#${id}`;
  }

  recursoUrl(id: number): string {
    return this.recursoMap().get(id)?.url ?? '—';
  }

  onRolChange(): void {
    this.recursoId = '';
    this.successMsg.set(null);
    if (this.rolId === '') {
      this.asignaciones.set([]);
      return;
    }
    this.loadAsignaciones();
  }

  private loadAsignaciones(): void {
    if (this.rolId === '') return;
    this.loading.set(true);
    this.error.set(null);
    this.srv.getRecursosDeRol(this.rolId).subscribe({
      next: (res) => {
        this.asignaciones.set(res.results);
        this.loading.set(false);
      },
      error: (e) => {
        this.asignaciones.set([]);
        this.error.set(adminErrorMessage(e, 'No se pudieron cargar las asignaciones.'));
        this.loading.set(false);
      },
    });
  }

  asignar(): void {
    if (this.rolId === '' || this.recursoId === '') return;
    this.asignando.set(true);
    this.error.set(null);
    this.successMsg.set(null);
    this.srv.asignarRecursoARol({ rol: this.rolId, recurso: this.recursoId }).subscribe({
      next: () => {
        this.asignando.set(false);
        this.successMsg.set('Recurso asignado al rol.');
        this.recursoId = '';
        this.loadAsignaciones();
      },
      error: (e) => {
        this.asignando.set(false);
        this.error.set(adminErrorMessage(e, 'No se pudo asignar el recurso.'));
      },
    });
  }
}
