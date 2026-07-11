import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Rol, Usuario, UsuarioUpdate } from '../../../shared/models/admin';
import { adminErrorMessage, isAdminForbidden } from '../admin-errors';

const ADMIN_NAMES = ['administrador', 'admin'];
const PAGE_SIZE = 8;

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class AdminUsuarios implements OnInit {
  private adminService = inject(AdminService);

  // Cargamos todos los usuarios (dataset pequeño) → filtros y paginación client-side.
  allUsuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);
  forbidden = signal(false);

  // Filtros
  query = signal('');
  roleFilter = signal('');
  estadoFilter = signal(''); // '', 'activo', 'inactivo'
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // Modal crear
  createOpen = signal(false);
  createForm = { username: '', email: '', password: '', first_name: '', last_name: '' };
  creating = signal(false);
  createError = signal<string | null>(null);

  // Modal editar
  editOpen = signal(false);
  editTarget = signal<Usuario | null>(null);
  editForm: UsuarioUpdate = {};
  saving = signal(false);
  modalError = signal<string | null>(null);

  // Modal eliminar
  deleteTarget = signal<Usuario | null>(null);
  deleting = signal(false);

  // Modal asignar rol
  rolTarget = signal<Usuario | null>(null);
  selectedRol: number | '' = '';
  assigning = signal(false);
  rolModalError = signal<string | null>(null);

  // Acción rápida (toggle disponibilidad)
  toggling = signal<number | null>(null);

  // ── Derivados ────────────────────────────────────
  filtered = computed<Usuario[]>(() => {
    const q = this.query().trim().toLowerCase();
    const rf = this.roleFilter();
    const ef = this.estadoFilter();
    return this.allUsuarios().filter((u) => {
      const matchQ =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q);
      const matchR = !rf || u.roles.some((r) => r.nombre === rf);
      const matchE = !ef || (ef === 'activo' ? u.disponibilidad : !u.disponibilidad);
      return matchQ && matchR && matchE;
    });
  });

  count = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize)));
  paginated = computed(() => {
    const p = this.page();
    return this.filtered().slice((p - 1) * this.pageSize, p * this.pageSize);
  });
  rangeStart = computed(() => (this.count() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.count()));
  pages = computed<number[]>(() => {
    const total = this.totalPages();
    const cur = this.page();
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  // KPIs
  kpiTotal = computed(() => this.allUsuarios().length);
  kpiAdmins = computed(() => this.allUsuarios().filter((u) => this.esAdmin(u)).length);
  kpiActivos = computed(() => this.allUsuarios().filter((u) => u.disponibilidad).length);
  kpiInactivos = computed(() => this.allUsuarios().filter((u) => !u.disponibilidad).length);

  ngOnInit(): void {
    this.load();
    this.loadRoles();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getAllUsuarios().subscribe({
      next: (r) => {
        this.allUsuarios.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.allUsuarios.set([]);
        this.forbidden.set(isAdminForbidden(e));
        this.error.set(adminErrorMessage(e, 'No se pudieron cargar los usuarios.'));
        this.loading.set(false);
      },
    });
  }

  private loadRoles(page = 1, acc: Rol[] = []): void {
    this.adminService.getRoles(page).subscribe({
      next: (res) => {
        const all = [...acc, ...res.results];
        if (res.next && page < 20) this.loadRoles(page + 1, all);
        else this.roles.set(all);
      },
      error: () => this.roles.set(acc),
    });
  }

  // ── Filtros / paginación ─────────────────────────
  setQuery(v: string): void {
    this.query.set(v);
    this.page.set(1);
  }
  setRole(v: string): void {
    this.roleFilter.set(v);
    this.page.set(1);
  }
  setEstado(v: string): void {
    this.estadoFilter.set(v);
    this.page.set(1);
  }
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
  }

  // ── Helpers de presentación ──────────────────────
  esAdmin(u: Usuario): boolean {
    return u.roles.some((r) => ADMIN_NAMES.includes(r.nombre.toLowerCase()));
  }
  iniciales(u: Usuario): string {
    const a = (u.first_name || u.username || '?').charAt(0);
    const b = (u.last_name || '').charAt(0);
    return (a + b).toUpperCase();
  }
  nombre(u: Usuario): string {
    const n = `${u.first_name} ${u.last_name}`.trim();
    return n || u.username;
  }

  // ── Acción rápida: activar / desactivar ──────────
  toggleDisponibilidad(u: Usuario): void {
    this.toggling.set(u.id);
    this.adminService.updateUsuario(u.id, { disponibilidad: !u.disponibilidad }).subscribe({
      next: () => {
        this.toggling.set(null);
        this.load();
      },
      error: (e) => {
        this.toggling.set(null);
        this.error.set(adminErrorMessage(e, 'No se pudo cambiar el estado del usuario.'));
      },
    });
  }

  // ── Crear ────────────────────────────────────────
  openCreate(): void {
    this.createForm = { username: '', email: '', password: '', first_name: '', last_name: '' };
    this.createError.set(null);
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (this.creating()) return;
    this.createOpen.set(false);
  }

  saveCreate(): void {
    const f = this.createForm;
    if (!f.username.trim() || !f.email.trim() || !f.password) {
      this.createError.set('Usuario, email y contraseña son obligatorios.');
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.adminService
      .crearUsuario({
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        first_name: f.first_name.trim() || undefined,
        last_name: f.last_name.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.load();
        },
        error: (e) => {
          this.creating.set(false);
          this.createError.set(adminErrorMessage(e, 'No se pudo crear el usuario.'));
        },
      });
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
    if (this.saving()) return;
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
      disponibilidad: !!this.editForm.disponibilidad,
    };
    this.adminService.updateUsuario(target.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEdit();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(adminErrorMessage(e, 'No se pudo actualizar el usuario.'));
      },
    });
  }

  // ── Eliminar ─────────────────────────────────────
  askDelete(u: Usuario): void {
    this.modalError.set(null);
    this.deleteTarget.set(u);
  }
  cancelDelete(): void {
    if (this.deleting()) return;
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
        this.deleteTarget.set(null);
        this.load();
      },
      error: (e) => {
        this.deleting.set(false);
        this.modalError.set(adminErrorMessage(e, 'No se pudo eliminar el usuario.'));
      },
    });
  }

  // ── Asignar rol ──────────────────────────────────
  openAsignarRol(u: Usuario): void {
    this.rolTarget.set(u);
    this.selectedRol = '';
    this.rolModalError.set(null);
  }
  closeAsignarRol(): void {
    if (this.assigning()) return;
    this.rolTarget.set(null);
  }
  rolesDisponibles(): Rol[] {
    const t = this.rolTarget();
    if (!t) return this.roles();
    const asignados = new Set(t.roles.map((r) => r.id));
    return this.roles().filter((r) => !asignados.has(r.id));
  }
  confirmAsignarRol(): void {
    const target = this.rolTarget();
    if (!target || this.selectedRol === '') return;
    this.assigning.set(true);
    this.rolModalError.set(null);
    this.adminService.asignarRolAUsuario({ usuario: target.id, rol: Number(this.selectedRol) }).subscribe({
      next: () => {
        this.assigning.set(false);
        this.rolTarget.set(null);
        this.load();
      },
      error: (e) => {
        this.assigning.set(false);
        this.rolModalError.set(adminErrorMessage(e, 'No se pudo asignar el rol.'));
      },
    });
  }
}
