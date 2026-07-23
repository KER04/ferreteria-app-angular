import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ClienteService, extraerErrorCliente } from '../../core/services/cliente.service';
import { Cliente, ClienteWrite, TIPOS_DOCUMENTO, TipoDocumento } from '../../shared/models/cliente';

const PAGE_SIZE = 20; // debe coincidir con REST_FRAMEWORK.PAGE_SIZE del backend

interface ClienteForm {
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombre: string;
  telefono: string;
  direccion: string;
  correo: string;
  observaciones: string;
}

function formVacio(): ClienteForm {
  return {
    tipo_documento: 'CC',
    numero_documento: '',
    nombre: '',
    telefono: '',
    direccion: '',
    correo: '',
    observaciones: '',
  };
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
})
export class Clientes implements OnInit {
  private srv = inject(ClienteService);

  // ── Datos ────────────────────────────────────────
  clientes = signal<Cliente[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  count = signal(0);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // ── Filtros ──────────────────────────────────────
  searchTerm = '';
  activoFilter: '' | 'true' | 'false' = 'true'; // por defecto: activos
  private search$ = new Subject<string>();

  readonly tipos = TIPOS_DOCUMENTO;

  // ── Modal crear / editar ─────────────────────────
  modalOpen = signal(false);
  editing = signal<Cliente | null>(null);
  saving = signal(false);
  modalError = signal<string | null>(null);
  form: ClienteForm = formVacio();

  // ── Confirmación desactivar / reactivar ──────────
  confirmTarget = signal<Cliente | null>(null);
  confirming = signal(false);
  confirmError = signal<string | null>(null);

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

  ngOnInit(): void {
    this.load();
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((t) => {
      this.searchTerm = t;
      this.page.set(1);
      this.load();
    });
  }

  onSearch(term: string): void {
    this.search$.next(term);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv
      .getClientes({
        search: this.searchTerm.trim() || undefined,
        activo: this.activoFilter === '' ? '' : this.activoFilter === 'true',
        page: this.page(),
      })
      .subscribe({
        next: (r) => {
          this.clientes.set(r.results);
          this.count.set(r.count);
          this.loading.set(false);
        },
        error: (e) => {
          this.clientes.set([]);
          this.count.set(0);
          this.error.set(extraerErrorCliente(e, 'No se pudieron cargar los clientes.'));
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.load();
  }

  private flashSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  // ── Modal crear / editar ─────────────────────────
  openCreate(): void {
    this.editing.set(null);
    this.form = formVacio();
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(c: Cliente): void {
    this.editing.set(c);
    this.form = {
      tipo_documento: c.tipo_documento,
      numero_documento: c.numero_documento,
      nombre: c.nombre,
      telefono: c.telefono,
      direccion: c.direccion ?? '',
      correo: c.correo ?? '',
      observaciones: c.observaciones ?? '',
    };
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  save(): void {
    const f = this.form;
    if (!f.numero_documento.trim() || !f.nombre.trim() || !f.telefono.trim()) {
      this.modalError.set('Documento, nombre y teléfono son obligatorios.');
      return;
    }

    const body: ClienteWrite = {
      tipo_documento: f.tipo_documento,
      numero_documento: f.numero_documento.trim(),
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim(),
      direccion: f.direccion.trim() || null,
      correo: f.correo.trim() || null,
      observaciones: f.observaciones.trim() || null,
    };

    this.saving.set(true);
    this.modalError.set(null);
    const editing = this.editing();
    const req = editing
      ? this.srv.updateCliente(editing.cliente_id, body)
      : this.srv.createCliente(body);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.flashSuccess(editing ? 'Cliente actualizado.' : 'Cliente registrado.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(extraerErrorCliente(e, 'No se pudo guardar el cliente.'));
      },
    });
  }

  // ── Desactivar / reactivar ───────────────────────
  openConfirm(c: Cliente): void {
    this.confirmTarget.set(c);
    this.confirmError.set(null);
  }

  closeConfirm(): void {
    if (this.confirming()) return;
    this.confirmTarget.set(null);
  }

  submitConfirm(): void {
    const c = this.confirmTarget();
    if (!c) return;
    this.confirming.set(true);
    this.confirmError.set(null);
    const req: Observable<unknown> = c.activo
      ? this.srv.desactivarCliente(c.cliente_id)
      : this.srv.reactivarCliente(c.cliente_id);

    req.subscribe({
      next: () => {
        this.confirming.set(false);
        this.confirmTarget.set(null);
        this.flashSuccess(c.activo ? `Cliente ${c.nombre} desactivado.` : `Cliente ${c.nombre} reactivado.`);
        this.load();
      },
      error: (e) => {
        this.confirming.set(false);
        this.confirmError.set(extraerErrorCliente(e, 'No se pudo completar la acción.'));
      },
    });
  }
}
