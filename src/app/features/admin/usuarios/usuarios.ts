import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { Rol, Usuario, UsuarioUpdate } from '../../../shared/models/admin';
import { adminErrorMessage, isAdminForbidden } from '../admin-errors';

const PAGE_SIZE = 20; // debe coincidir con REST_FRAMEWORK.PAGE_SIZE del backend

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class AdminUsuarios implements OnInit {
  private adminService = inject(AdminService);

  // ── Estado de datos ──────────────────────────────
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);
  forbidden = signal(false); // 401/403 → requiere rol administrador

  count = signal(0);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // Filtro local (el endpoint /usuarios/ no expone SearchFilter)
  query = signal('');

  filtrados = computed<Usuario[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.usuarios();
    return this.usuarios().filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q),
    );
  });

  // ── Derivados de paginación ──────────────────────
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize)));

  pages = computed<number[]>(() => {
    const total = this.totalPages();
    const cur = this.page();
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  rangeStart = computed(() => (this.count() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.count()));

  // ── Modal editar ─────────────────────────────────
  editOpen = signal(false);
  editTarget = signal<Usuario | null>(null);
  editForm: UsuarioUpdate = {};
  saving = signal(false);
  modalError = signal<string | null>(null);

  // ── Modal eliminar ───────────────────────────────
  deleteOpen = signal(false);
  deleteTarget = signal<Usuario | null>(null);
  deleting = signal(false);

  // ── Modal asignar rol ────────────────────────────
  rolOpen = signal(false);
  rolTarget = signal<Usuario | null>(null);
  selectedRol: number | '' = '';
  assigning = signal(false);
  rolModalError = signal<string | null>(null);

  // Roles que el usuario del modal aún NO tiene
  rolesDisponibles = computed<Rol[]>(() => {
    const target = this.rolTarget();
    if (!target) return this.roles();
    const asignados = new Set(target.roles.map((r) => r.id));
    return this.roles().filter((r) => !asignados.has(r.id));
  });

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadRoles();
  }

  // ── Cargas ───────────────────────────────────────
  loadUsuarios(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getUsuarios(this.page()).subscribe({
      next: (res) => {
        this.usuarios.set(res.results);
        this.count.set(res.count);
        this.loading.set(false);
      },
      error: (err) => {
        this.usuarios.set([]);
        this.count.set(0);
        this.forbidden.set(isAdminForbidden(err));
        this.error.set(adminErrorMessage(err, 'No se pudieron cargar los usuarios.'));
        this.loading.set(false);
      },
    });
  }

  // Acumula todas las páginas de roles para el selector de asignación
  private loadRoles(page = 1, acc: Rol[] = []): void {
    this.adminService.getRoles(page).subscribe({
      next: (res) => {
        const all = [...acc, ...res.results];
        if (res.next && page < 20) {
          this.loadRoles(page + 1, all);
        } else {
          this.roles.set(all);
        }
      },
      error: () => this.roles.set(acc),
    });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadUsuarios();
  }

  // ── Editar ───────────────────────────────────────
  openEdit(u: Usuario): void {
    this.editTarget.set(u);
    this.editForm = {
      username: u.username,
      first_name: u.first_name,
      last_name: u.last_name,
      promedio: u.promedio,
      disponibilidad: u.disponibilidad,
    };
    this.modalError.set(null);
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
    this.editTarget.set(null);
  }

  saveEdit(): void {
    const target = this.editTarget();
    if (!target || !this.editForm.username?.trim()) return;

    this.saving.set(true);
    this.modalError.set(null);

    const payload: UsuarioUpdate = {
      username: this.editForm.username.trim(),
      first_name: this.editForm.first_name ?? '',
      last_name: this.editForm.last_name ?? '',
      promedio: this.editForm.promedio === undefined || (this.editForm.promedio as unknown) === ''
        ? null
        : Number(this.editForm.promedio),
      disponibilidad: !!this.editForm.disponibilidad,
    };

    this.adminService.updateUsuario(target.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEdit();
        this.loadUsuarios();
      },
      error: (err) => {
        this.saving.set(false);
        this.modalError.set(adminErrorMessage(err, 'No se pudo actualizar el usuario.'));
      },
    });
  }

  // ── Eliminar ─────────────────────────────────────
  openDelete(u: Usuario): void {
    this.deleteTarget.set(u);
    this.modalError.set(null);
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.modalError.set(null);

    this.adminService.deleteUsuario(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDelete();
        // Si borramos el último elemento de la página, retrocede una página
        if (this.usuarios().length === 1 && this.page() > 1) this.page.set(this.page() - 1);
        this.loadUsuarios();
      },
      error: (err) => {
        this.deleting.set(false);
        this.modalError.set(adminErrorMessage(err, 'No se pudo eliminar el usuario.'));
      },
    });
  }

  // ── Asignar rol ──────────────────────────────────
  openAsignarRol(u: Usuario): void {
    this.rolTarget.set(u);
    this.selectedRol = '';
    this.rolModalError.set(null);
    this.rolOpen.set(true);
  }

  closeAsignarRol(): void {
    this.rolOpen.set(false);
    this.rolTarget.set(null);
  }

  confirmAsignarRol(): void {
    const target = this.rolTarget();
    if (!target || this.selectedRol === '') return;

    this.assigning.set(true);
    this.rolModalError.set(null);

    this.adminService.asignarRolAUsuario({ usuario: target.id, rol: Number(this.selectedRol) }).subscribe({
      next: () => {
        this.assigning.set(false);
        this.closeAsignarRol();
        this.loadUsuarios();
      },
      error: (err) => {
        this.assigning.set(false);
        this.rolModalError.set(adminErrorMessage(err, 'No se pudo asignar el rol.'));
      },
    });
  }
}
