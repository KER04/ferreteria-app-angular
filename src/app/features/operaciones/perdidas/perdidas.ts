import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { OperacionService } from '../../../core/services/operacion.service';
import { extraerMensajeError } from '../error-utils';
import { EstadoPerdida, PERDIDA_ESTADOS, Perdida } from '../../../shared/models/operacion';

const PAGE_SIZE = 20; // debe coincidir con REST_FRAMEWORK.PAGE_SIZE del backend

@Component({
  selector: 'app-operaciones-perdidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perdidas.html',
})
export class OperacionesPerdidas implements OnInit {
  private srv = inject(OperacionService);
  private route = inject(ActivatedRoute);

  // ── Estado de datos ──────────────────────────────
  perdidas = signal<Perdida[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  count = signal(0);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // ── Filtros ──────────────────────────────────────
  estadoFilter: EstadoPerdida | '' = '';
  searchTerm = '';
  readonly estados = PERDIDA_ESTADOS;

  // ── KPIs ─────────────────────────────────────────
  kpiPendiente = signal(0);
  kpiMontoPendiente = signal(0);
  kpiCobrado = signal(0);
  kpiMontoCobrado = signal(0);
  kpiCondonado = signal(0);

  // ── Modal editar valor ───────────────────────────
  editTarget = signal<Perdida | null>(null);
  saving = signal(false);
  editError = signal<string | null>(null);
  eValor = ''; // se escribe como texto (dinero)
  eObservaciones = '';

  // ── Confirmación cobrar / condonar ───────────────
  confirmTarget = signal<Perdida | null>(null);
  confirmAction = signal<'cobrar' | 'condonar'>('cobrar');
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
    const estadoParam = this.route.snapshot.queryParamMap.get('estado') as EstadoPerdida | null;
    if (estadoParam && this.estados.some((e) => e.value === estadoParam)) {
      this.estadoFilter = estadoParam;
    }
    this.loadKpis();
    this.loadPerdidas();
  }

  loadKpis(): void {
    this.srv.getTotalPorEstado('pendiente').subscribe({
      next: (r) => {
        this.kpiPendiente.set(r.count);
        this.kpiMontoPendiente.set(r.monto);
      },
      error: () => {},
    });
    this.srv.getTotalPorEstado('cobrado').subscribe({
      next: (r) => {
        this.kpiCobrado.set(r.count);
        this.kpiMontoCobrado.set(r.monto);
      },
      error: () => {},
    });
    this.srv.getPerdidas({ estado: 'condonado', page: 1 }).subscribe({
      next: (r) => this.kpiCondonado.set(r.count),
      error: () => {},
    });
  }

  loadPerdidas(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv
      .getPerdidas({
        estado: this.estadoFilter,
        search: this.searchTerm.trim() || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (res) => {
          this.perdidas.set(res.results);
          this.count.set(res.count);
          this.loading.set(false);
        },
        error: (e) => {
          this.perdidas.set([]);
          this.count.set(0);
          this.error.set(extraerMensajeError(e, 'No se pudieron cargar los cargos por pérdida.'));
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadPerdidas();
  }

  clearFilters(): void {
    this.estadoFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadPerdidas();
  }

  private flashSuccess(msg: string): void {
    this.successMsg.set(msg);
    this.loadKpis();
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  // ── Presentación de estado ───────────────────────
  estadoLabel(estado: EstadoPerdida): string {
    return this.estados.find((e) => e.value === estado)?.label ?? estado;
  }

  // ── Modal editar valor ───────────────────────────
  openEdit(p: Perdida): void {
    this.editTarget.set(p);
    this.eValor = p.valor_unitario;
    this.eObservaciones = p.observaciones ?? '';
    this.editError.set(null);
  }

  closeEdit(): void {
    if (this.saving()) return;
    this.editTarget.set(null);
  }

  submitEdit(): void {
    const p = this.editTarget();
    if (!p) return;
    const val = Number(this.eValor);
    if (this.eValor.trim() === '' || isNaN(val) || val < 0) {
      this.editError.set('Indica un valor válido mayor o igual que cero.');
      return;
    }
    this.saving.set(true);
    this.editError.set(null);
    this.srv
      .updatePerdida(p.perd_id, {
        valor_unitario: val,
        observaciones: this.eObservaciones.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editTarget.set(null);
          this.flashSuccess(`Cargo PD-${p.perd_id} actualizado.`);
          this.loadPerdidas();
        },
        error: (e) => {
          this.saving.set(false);
          this.editError.set(extraerMensajeError(e, 'No se pudo actualizar el cargo.'));
        },
      });
  }

  // ── Cobrar / condonar ────────────────────────────
  openConfirm(p: Perdida, action: 'cobrar' | 'condonar'): void {
    this.confirmTarget.set(p);
    this.confirmAction.set(action);
    this.confirmError.set(null);
  }

  closeConfirm(): void {
    if (this.confirming()) return;
    this.confirmTarget.set(null);
  }

  submitConfirm(): void {
    const p = this.confirmTarget();
    if (!p) return;
    this.confirming.set(true);
    this.confirmError.set(null);

    const obs: Observable<Perdida> =
      this.confirmAction() === 'cobrar'
        ? this.srv.cobrarPerdida(p.perd_id)
        : this.srv.condonarPerdida(p.perd_id);

    obs.subscribe({
      next: () => {
        this.confirming.set(false);
        this.confirmTarget.set(null);
        this.flashSuccess(
          this.confirmAction() === 'cobrar'
            ? `Cargo PD-${p.perd_id} marcado como cobrado.`
            : `Cargo PD-${p.perd_id} condonado.`,
        );
        this.loadPerdidas();
      },
      error: (e) => {
        this.confirming.set(false);
        this.confirmError.set(
          extraerMensajeError(
            e,
            this.confirmAction() === 'cobrar'
              ? 'No se pudo cobrar el cargo.'
              : 'No se pudo condonar el cargo.',
          ),
        );
      },
    });
  }
}
