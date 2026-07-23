import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MantenimientoService, extraerErrorHttp } from '../../../core/services/mantenimiento.service';
import { Producto } from '../../../shared/models/producto';
import {
  Costo,
  MANT_ESTADOS,
  MantEstado,
  Mantenimiento,
  MantenimientoWrite,
  TipoMantenimiento,
} from '../../../shared/models/mantenimiento';

const PAGE_SIZE = 20; // debe coincidir con REST_FRAMEWORK.PAGE_SIZE del backend

@Component({
  selector: 'app-mantenimiento-registros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registros.html',
  styleUrl: './registros.css',
})
export class MantenimientoRegistros implements OnInit {
  private mantService = inject(MantenimientoService);
  private route = inject(ActivatedRoute);

  // ── Estado de datos ──────────────────────────────
  registros = signal<Mantenimiento[]>([]);
  productos = signal<Producto[]>([]);
  tipos = signal<TipoMantenimiento[]>([]);
  costos = signal<Costo[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  count = signal(0);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // ── Filtros (ligados con ngModel) ────────────────
  estadoFilter: MantEstado | '' = '';
  productoFilter: number | '' = '';
  searchTerm = '';

  readonly estados = MANT_ESTADOS;

  // KPIs (conteos reales por estado)
  kpiPendiente = signal(0);
  kpiEnProceso = signal(0);
  kpiFinalizado = signal(0);
  kpiCancelado = signal(0);

  // ── Modal crear / editar ─────────────────────────
  modalOpen = signal(false);
  editing = signal<Mantenimiento | null>(null);
  saving = signal(false);
  modalError = signal<string | null>(null);

  fProducto: number | '' = '';
  fTipo: number | '' = '';
  fCantidad: number | null = null;
  fDescripcion = '';
  fCosto = ''; // monto tecleado (dinero)

  // ── Modal finalizar (registrar salida) ───────────
  finalizarTarget = signal<Mantenimiento | null>(null);
  finalizando = signal(false);
  finalizarError = signal<string | null>(null);

  sRecuperada: number | null = null;
  sBaja: number | null = 0;
  sObservaciones = '';
  sCosto = ''; // monto tecleado (dinero)

  // ── Confirmación cancelar / eliminar ─────────────
  confirmTarget = signal<Mantenimiento | null>(null);
  confirmAction = signal<'cancelar' | 'eliminar'>('cancelar');
  confirming = signal(false);
  confirmError = signal<string | null>(null);

  // ── Modal completar (registros 'pendiente' de una devolución dañada) ──
  completarTarget = signal<Mantenimiento | null>(null);
  completando = signal(false);
  completarError = signal<string | null>(null);

  cTipo: number | '' = '';
  cDescripcion = '';
  cCosto = ''; // monto tecleado (dinero)

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
    const estadoParam = this.route.snapshot.queryParamMap.get('estado') as MantEstado | null;
    if (estadoParam && this.estados.some((e) => e.value === estadoParam)) {
      this.estadoFilter = estadoParam;
    }
    this.loadCatalogos();
    this.loadKpis();
    this.loadRegistros();
  }

  loadKpis(): void {
    this.mantService.getRegistros({ estado: 'pendiente', page: 1 }).subscribe({
      next: (r) => this.kpiPendiente.set(r.count),
      error: () => {},
    });
    this.mantService.getRegistros({ estado: 'en_proceso', page: 1 }).subscribe({
      next: (r) => this.kpiEnProceso.set(r.count),
      error: () => {},
    });
    this.mantService.getRegistros({ estado: 'finalizado', page: 1 }).subscribe({
      next: (r) => this.kpiFinalizado.set(r.count),
      error: () => {},
    });
    this.mantService.getRegistros({ estado: 'cancelado', page: 1 }).subscribe({
      next: (r) => this.kpiCancelado.set(r.count),
      error: () => {},
    });
  }

  // ── Cargas ───────────────────────────────────────
  private loadCatalogos(): void {
    this.mantService.getAllProductos().subscribe({
      next: (res) => this.productos.set(res),
      error: () => this.productos.set([]),
    });
    this.mantService.getAllTipos().subscribe({
      next: (res) => this.tipos.set(res),
      error: () => this.tipos.set([]),
    });
    this.mantService.getAllCostos().subscribe({
      next: (res) => this.costos.set(res),
      error: () => this.costos.set([]),
    });
  }

  loadRegistros(): void {
    this.loading.set(true);
    this.error.set(null);

    this.mantService
      .getRegistros({
        estado: this.estadoFilter,
        producto: this.productoFilter,
        search: this.searchTerm.trim() || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (res) => {
          this.registros.set(res.results);
          this.count.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.registros.set([]);
          this.count.set(0);
          this.error.set('No se pudieron cargar los registros. Verifica tu sesión o el servidor.');
          this.loading.set(false);
        },
      });
  }

  // ── Acciones de filtros / paginación ─────────────
  applyFilters(): void {
    this.page.set(1);
    this.loadRegistros();
  }

  clearFilters(): void {
    this.estadoFilter = '';
    this.productoFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadRegistros();
  }

  // ── Presentación de estado ───────────────────────
  estadoLabel(estado: MantEstado): string {
    return this.estados.find((e) => e.value === estado)?.label ?? estado;
  }

  estadoClass(estado: MantEstado): string {
    switch (estado) {
      case 'pendiente':
        return 'bg-orange-500/15 text-orange-300 border border-orange-500/30';
      case 'en_proceso':
        return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
      case 'finalizado':
        return 'bg-green-500/15 text-green-400 border border-green-500/30';
      case 'cancelado':
        return 'bg-red-500/15 text-red-300 border border-red-500/30';
    }
  }

  private flashSuccess(msg: string): void {
    this.successMsg.set(msg);
    this.loadKpis();
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  // ── Modal crear / editar ─────────────────────────
  openCreate(): void {
    this.editing.set(null);
    this.fProducto = '';
    this.fTipo = '';
    this.fCantidad = null;
    this.fDescripcion = '';
    this.fCosto = '';
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(m: Mantenimiento): void {
    this.editing.set(m);
    this.fProducto = m.producto;
    this.fTipo = m.tipo_mantenimiento ?? '';
    this.fCantidad = m.cantidad_ingresada;
    this.fDescripcion = m.mant_descripcion ?? '';
    this.fCosto = m.costo_info?.cost_total ?? '';
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  saveRegistro(): void {
    this.modalError.set(null);
    const editing = this.editing();

    if (editing) {
      // El backend solo permite modificar descripción y costo (en proceso)
      this.saving.set(true);
      this.mantService
        .updateRegistro(editing.mant_id, {
          mant_descripcion: this.fDescripcion.trim() || null,
          costo_total: this.fCosto.trim() || null,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.modalOpen.set(false);
            this.flashSuccess(`Registro #${editing.mant_id} actualizado.`);
            this.loadRegistros();
          },
          error: (err) => {
            this.saving.set(false);
            this.modalError.set(extraerErrorHttp(err, 'No se pudo actualizar el registro.'));
          },
        });
      return;
    }

    if (this.fProducto === '' || this.fTipo === '' || !this.fCantidad || this.fCantidad <= 0) {
      this.modalError.set('Producto, tipo de mantenimiento y una cantidad mayor que cero son obligatorios.');
      return;
    }

    const body: MantenimientoWrite = {
      producto: this.fProducto,
      tipo_mantenimiento: this.fTipo,
      cantidad_ingresada: this.fCantidad,
      mant_descripcion: this.fDescripcion.trim() || null,
      costo_total: this.fCosto.trim() || null,
    };

    this.saving.set(true);
    this.mantService.createRegistro(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.flashSuccess('Ingreso a mantenimiento registrado.');
        this.applyFilters();
      },
      error: (err) => {
        this.saving.set(false);
        this.modalError.set(extraerErrorHttp(err, 'No se pudo crear el registro.'));
      },
    });
  }

  // ── Finalizar (registrar salida) ─────────────────
  openFinalizar(m: Mantenimiento): void {
    this.finalizarTarget.set(m);
    this.sRecuperada = m.cantidad_pendiente;
    this.sBaja = 0;
    this.sObservaciones = '';
    this.sCosto = m.costo_info?.cost_total ?? '';
    this.finalizarError.set(null);
  }

  closeFinalizar(): void {
    if (this.finalizando()) return;
    this.finalizarTarget.set(null);
  }

  submitFinalizar(): void {
    const m = this.finalizarTarget();
    if (!m) return;

    const recuperada = this.sRecuperada ?? 0;
    const baja = this.sBaja ?? 0;
    if (recuperada + baja <= 0) {
      this.finalizarError.set('Debes indicar al menos una unidad recuperada o dada de baja.');
      return;
    }
    if (recuperada + baja > m.cantidad_ingresada) {
      this.finalizarError.set(
        `Recuperadas + bajas (${recuperada + baja}) no puede superar las ingresadas (${m.cantidad_ingresada}).`,
      );
      return;
    }

    this.finalizando.set(true);
    this.finalizarError.set(null);
    this.mantService
      .finalizarRegistro(m.mant_id, {
        cantidad_recuperada: recuperada,
        cantidad_baja: baja,
        observaciones: this.sObservaciones.trim() || null,
        costo_total: this.sCosto.trim() || null,
      })
      .subscribe({
        next: () => {
          this.finalizando.set(false);
          this.finalizarTarget.set(null);
          this.flashSuccess(`Mantenimiento #${m.mant_id} finalizado.`);
          this.loadRegistros();
        },
        error: (err) => {
          this.finalizando.set(false);
          this.finalizarError.set(extraerErrorHttp(err, 'No se pudo registrar la salida.'));
        },
      });
  }

  // ── Cancelar / eliminar ──────────────────────────
  openConfirm(m: Mantenimiento, action: 'cancelar' | 'eliminar'): void {
    this.confirmTarget.set(m);
    this.confirmAction.set(action);
    this.confirmError.set(null);
  }

  closeConfirm(): void {
    if (this.confirming()) return;
    this.confirmTarget.set(null);
  }

  submitConfirm(): void {
    const m = this.confirmTarget();
    if (!m) return;

    this.confirming.set(true);
    this.confirmError.set(null);

    const obs: Observable<unknown> =
      this.confirmAction() === 'cancelar'
        ? this.mantService.cancelarRegistro(m.mant_id)
        : this.mantService.deleteRegistro(m.mant_id);

    obs.subscribe({
      next: () => {
        this.confirming.set(false);
        this.confirmTarget.set(null);
        this.flashSuccess(
          this.confirmAction() === 'cancelar'
            ? `Mantenimiento #${m.mant_id} cancelado. El stock retenido fue devuelto.`
            : `Registro #${m.mant_id} eliminado.`,
        );
        this.loadRegistros();
      },
      error: (err) => {
        this.confirming.set(false);
        this.confirmError.set(
          extraerErrorHttp(
            err,
            this.confirmAction() === 'cancelar'
              ? 'No se pudo cancelar el mantenimiento.'
              : 'No se pudo eliminar el registro.',
          ),
        );
      },
    });
  }

  costoLabel(c: Costo): string {
    const partes = c.cost_partes_afectadas ? ` — ${c.cost_partes_afectadas}` : '';
    return `#${c.cost_id} · $${c.cost_total}${partes}`;
  }

  // ── Completar registro 'pendiente' (viene de una devolución dañada) ──
  openCompletar(m: Mantenimiento): void {
    this.completarTarget.set(m);
    this.cTipo = '';
    this.cDescripcion = m.mant_descripcion ?? '';
    this.cCosto = m.costo_info?.cost_total ?? '';
    this.completarError.set(null);
  }

  closeCompletar(): void {
    if (this.completando()) return;
    this.completarTarget.set(null);
  }

  submitCompletar(): void {
    const m = this.completarTarget();
    if (!m) return;

    if (this.cTipo === '') {
      this.completarError.set('Selecciona el tipo de mantenimiento.');
      return;
    }

    this.completando.set(true);
    this.completarError.set(null);
    this.mantService
      .completarRegistro(m.mant_id, {
        tipo_mantenimiento: this.cTipo,
        mant_descripcion: this.cDescripcion.trim() || null,
        costo_total: this.cCosto.trim() || null,
      })
      .subscribe({
        next: () => {
          this.completando.set(false);
          this.completarTarget.set(null);
          this.flashSuccess(`Registro #${m.mant_id} completado y pasado a "En proceso".`);
          this.loadRegistros();
        },
        error: (err) => {
          this.completando.set(false);
          this.completarError.set(extraerErrorHttp(err, 'No se pudo completar el registro.'));
        },
      });
  }
}
