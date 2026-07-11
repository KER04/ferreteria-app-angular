import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { ProductoService, extraerErrorApi } from '../../../core/services/producto.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Marca, Prestamo, TipoCategoria } from '../../../shared/models/producto';

type TabKey = 'categorias' | 'marcas' | 'prestamos';

interface TabMeta {
  key: TabKey;
  label: string;
  icon: string;
  title: string;
}

interface Row {
  id: number;
  nombre: string;
  tipo?: string;
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

  readonly tabs: TabMeta[] = [
    { key: 'categorias', label: 'Categorías', icon: 'category', title: 'Categorías de Producto' },
    { key: 'marcas', label: 'Marcas', icon: 'branding_watermark', title: 'Marcas Registradas' },
    { key: 'prestamos', label: 'Tipos de Préstamo', icon: 'handshake', title: 'Tipos de Préstamo' },
  ];

  activeTab = signal<TabKey>('categorias');

  categorias = signal<TipoCategoria[]>([]);
  marcas = signal<Marca[]>([]);
  prestamos = signal<Prestamo[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);

  // ── Modal crear / editar ─────────────────────────
  modalOpen = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal<string | null>(null);
  fNombre = '';
  fTipo = '';

  // ── Derivados ────────────────────────────────────
  currentMeta = computed(() => this.tabs.find((t) => t.key === this.activeTab())!);

  rows = computed<Row[]>(() => {
    switch (this.activeTab()) {
      case 'categorias':
        return this.categorias().map((c) => ({ id: c.tipr_id, nombre: c.tipr_nombre }));
      case 'marcas':
        return this.marcas().map((m) => ({ id: m.marca_id, nombre: m.marca_nombre }));
      case 'prestamos':
        return this.prestamos().map((p) => ({ id: p.pres_id, nombre: p.pres_nombre, tipo: p.tipo_prestamo }));
    }
  });

  ngOnInit(): void {
    this.loadAll();
  }

  tabCount(key: TabKey): number {
    if (key === 'categorias') return this.categorias().length;
    if (key === 'marcas') return this.marcas().length;
    return this.prestamos().length;
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      categorias: this.srv.getTodasCategorias(),
      marcas: this.srv.getTodasMarcas(),
      prestamos: this.srv.getTodosPrestamos(),
    }).subscribe({
      next: (r) => {
        this.categorias.set(r.categorias);
        this.marcas.set(r.marcas);
        this.prestamos.set(r.prestamos);
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
    this.fTipo = '';
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(row: Row): void {
    this.editingId.set(row.id);
    this.fNombre = row.nombre;
    this.fTipo = row.tipo ?? '';
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
    const tab = this.activeTab();
    if (tab === 'prestamos' && !this.fTipo.trim()) {
      this.modalError.set('El tipo de préstamo es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.modalError.set(null);
    const id = this.editingId();

    let req$: Observable<unknown>;
    if (tab === 'categorias') {
      const body = { tipr_nombre: nombre };
      req$ = id ? this.srv.updateCategoria(id, body) : this.srv.createCategoria(body);
    } else if (tab === 'marcas') {
      const body = { marca_nombre: nombre };
      req$ = id ? this.srv.updateMarca(id, body) : this.srv.createMarca(body);
    } else {
      const body = { pres_nombre: nombre, tipo_prestamo: this.fTipo.trim() };
      req$ = id ? this.srv.updatePrestamo(id, body) : this.srv.createPrestamo(body);
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
      const tab = this.activeTab();
      const req$ =
        tab === 'categorias'
          ? this.srv.deleteCategoria(row.id)
          : tab === 'marcas'
            ? this.srv.deleteMarca(row.id)
            : this.srv.deletePrestamo(row.id);

      req$.subscribe({
        next: () => this.loadAll(),
        error: (e) => this.error.set(extraerErrorApi(e, 'No se pudo eliminar el registro.')),
      });
    });
  }
}
