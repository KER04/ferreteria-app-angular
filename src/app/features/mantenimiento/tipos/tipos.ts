import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MantenimientoService, extraerErrorHttp } from '../../../core/services/mantenimiento.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { TipoMantenimiento } from '../../../shared/models/mantenimiento';

@Component({
  selector: 'app-mantenimiento-tipos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipos.html',
})
export class MantenimientoTipos implements OnInit {
  private srv = inject(MantenimientoService);
  private confirmSvc = inject(ConfirmService);
  private auth = inject(AuthService);

  // El backend usa IsAdminOrReadOnly: sin rol admin, escribir devuelve 403.
  // Ocultamos las acciones en vez de dejar que el usuario choque con el error.
  isAdmin = toSignal(this.auth.isAdmin$, { initialValue: false });

  // ── Estado de datos ──────────────────────────────
  items = signal<TipoMantenimiento[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Filtro (el catálogo se carga completo, se filtra en cliente) ──
  private search = signal('');
  get searchTerm(): string {
    return this.search();
  }
  set searchTerm(v: string) {
    this.search.set(v);
  }

  filtrados = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((t) => t.tima_nombre.toLowerCase().includes(q));
  });

  // ── Modal crear / editar ─────────────────────────
  modalOpen = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal<string | null>(null);
  fNombre = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getAllTipos().subscribe({
      next: (r) => {
        this.items.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.items.set([]);
        this.error.set(extraerErrorHttp(e, 'No se pudieron cargar los tipos.'));
        this.loading.set(false);
      },
    });
  }

  private flashSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  // ── Modal ────────────────────────────────────────
  openCreate(): void {
    this.editingId.set(null);
    this.fNombre = '';
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(t: TipoMantenimiento): void {
    this.editingId.set(t.tima_id);
    this.fNombre = t.tima_nombre;
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  save(): void {
    const nombre = this.fNombre.trim();
    if (!nombre) {
      this.modalError.set('Indica el nombre del tipo.');
      return;
    }
    this.saving.set(true);
    this.modalError.set(null);

    const id = this.editingId();
    const req = id
      ? this.srv.updateTipo(id, { tima_nombre: nombre })
      : this.srv.createTipo({ tima_nombre: nombre });

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.flashSuccess(id ? `Tipo "${nombre}" actualizado.` : `Tipo "${nombre}" creado.`);
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(extraerErrorHttp(e, 'No se pudo guardar el tipo.'));
      },
    });
  }

  remove(t: TipoMantenimiento): void {
    this.confirmSvc
      .ask({
        title: 'Eliminar tipo',
        message: `¿Eliminar el tipo "${t.tima_nombre}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        tone: 'danger',
        icon: 'delete_forever',
      })
      .then((ok) => {
        if (!ok) return;
        this.srv.deleteTipo(t.tima_id).subscribe({
          next: () => {
            this.flashSuccess(`Tipo "${t.tima_nombre}" eliminado.`);
            this.load();
          },
          error: (e) => this.error.set(extraerErrorHttp(e, 'No se pudo eliminar el tipo.')),
        });
      });
  }
}
