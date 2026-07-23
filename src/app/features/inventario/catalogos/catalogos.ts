import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductoService, extraerErrorApi } from '../../../core/services/producto.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { Marca, TipoCategoria } from '../../../shared/models/producto';

type TabKey = 'categorias' | 'marcas';

interface TabMeta {
  key: TabKey;
  label: string;
  icon: string;
  title: string;
}

interface Row {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-inventario-catalogos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
})
export class Catalogos implements OnInit {
  private srv = inject(ProductoService);
  private confirmSvc = inject(ConfirmService);
  private auth = inject(AuthService);

  // El backend usa IsAdminOrReadOnly: sin rol admin, escribir devuelve 403.
  // Ocultamos las acciones en vez de dejar que el usuario choque con el error.
  isAdmin = toSignal(this.auth.isAdmin$, { initialValue: false });

  readonly tabs: TabMeta[] = [
    { key: 'categorias', label: 'Categorías', icon: 'category', title: 'Categorías de Producto' },
    { key: 'marcas', label: 'Marcas', icon: 'branding_watermark', title: 'Marcas Registradas' },
  ];

  activeTab = signal<TabKey>('categorias');

  categorias = signal<TipoCategoria[]>([]);
  marcas = signal<Marca[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);

  // ── Modal crear / editar ─────────────────────────
  modalOpen = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal<string | null>(null);
  fNombre = '';

  // ── Derivados ────────────────────────────────────
  currentMeta = computed(() => this.tabs.find((t) => t.key === this.activeTab())!);

  rows = computed<Row[]>(() => {
    switch (this.activeTab()) {
      case 'categorias':
        return this.categorias().map((c) => ({ id: c.tipr_id, nombre: c.tipr_nombre }));
      case 'marcas':
        return this.marcas().map((m) => ({ id: m.marca_id, nombre: m.marca_nombre }));
    }
  });

  ngOnInit(): void {
    this.loadAll();
  }

  tabCount(key: TabKey): number {
    return key === 'categorias' ? this.categorias().length : this.marcas().length;
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      categorias: this.srv.getTodasCategorias(),
      marcas: this.srv.getTodasMarcas(),
    }).subscribe({
      next: (r) => {
        this.categorias.set(r.categorias);
        this.marcas.set(r.marcas);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorApi(e, 'No se pudieron cargar los catálogos.'));
        this.loading.set(false);
      },
    });
  }

  setTab(key: TabKey): void {
    this.activeTab.set(key);
  }

  // ── Modal ────────────────────────────────────────
  openCreate(): void {
    this.editingId.set(null);
    this.fNombre = '';
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(row: Row): void {
    this.editingId.set(row.id);
    this.fNombre = row.nombre;
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
      this.modalError.set('El nombre es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.modalError.set(null);
    const id = this.editingId();

    let req$: Observable<unknown>;
    if (this.activeTab() === 'categorias') {
      const body = { tipr_nombre: nombre };
      req$ = id ? this.srv.updateCategoria(id, body) : this.srv.createCategoria(body);
    } else {
      const body = { marca_nombre: nombre };
      req$ = id ? this.srv.updateMarca(id, body) : this.srv.createMarca(body);
    }

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.loadAll();
      },
      error: (e) => {
        this.saving.set(false);
        this.modalError.set(extraerErrorApi(e, 'No se pudo guardar el registro.'));
      },
    });
  }

  remove(row: Row): void {
    this.confirmSvc.ask({
      title: 'Eliminar registro',
      message: `¿Eliminar "${row.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      icon: 'delete_forever',
    }).then((ok) => {
      if (!ok) return;
      const req$ =
        this.activeTab() === 'categorias'
          ? this.srv.deleteCategoria(row.id)
          : this.srv.deleteMarca(row.id);

      req$.subscribe({
        next: () => this.loadAll(),
        error: (e) => this.error.set(extraerErrorApi(e, 'No se pudo eliminar el registro.')),
      });
    });
  }
}
