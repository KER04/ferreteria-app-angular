import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MantenimientoService, extraerErrorHttp } from '../../../core/services/mantenimiento.service';
import { Mantenimiento, SalidaMantenimiento } from '../../../shared/models/mantenimiento';

const PAGE_SIZE = 8;

// Historial de salidas de mantenimiento (solo lectura en el backend).
// Se cruza cada salida con su registro para mostrar el producto.
@Component({
  selector: 'app-mantenimiento-salidas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 class="text-3xl font-bold text-primary">Historial de Salidas y Costos</h2>
          <p class="text-on-surface-variant mt-1">Análisis de mantenimientos finalizados y gestión de mermas.</p>
        </div>
      </div>

      @if (error()) {
        <div class="bg-error-container/60 border border-error text-on-error-container px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <span class="material-symbols-outlined">error</span>{{ error() }}
        </div>
      }

      <!-- KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div class="flex justify-between items-start">
            <span class="text-on-surface-variant text-label-md uppercase tracking-wider">Costo Total</span>
            <span class="material-symbols-outlined text-secondary">payments</span>
          </div>
          <div class="mt-4"><span class="text-3xl font-bold text-on-surface">{{ costoTotal() | currency: 'USD' : 'symbol' : '1.2-2' }}</span></div>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div class="flex justify-between items-start">
            <span class="text-on-surface-variant text-label-md uppercase tracking-wider">Recuperación Promedio</span>
            <span class="material-symbols-outlined text-primary">build_circle</span>
          </div>
          <div class="mt-4"><span class="text-3xl font-bold text-on-surface">{{ recuperacionProm() | number: '1.0-1' }}%</span></div>
        </div>
        <!-- Mini gráfico Recuperadas vs Bajas -->
        <div class="md:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <span class="text-on-surface-variant text-label-md uppercase tracking-wider">Recuperadas vs Bajas</span>
            <div class="flex gap-3 text-[11px]">
              <span class="flex items-center gap-1"><span class="w-3 h-3 bg-primary rounded-full"></span>Recuperadas ({{ totalRecuperadas() }})</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 bg-error rounded-full"></span>Bajas ({{ totalBajas() }})</span>
            </div>
          </div>
          <div class="flex-grow flex items-end gap-6 px-4 min-h-[100px]">
            <div class="flex-1 flex flex-col items-center gap-1">
              <span class="text-sm font-bold text-on-surface">{{ totalRecuperadas() }}</span>
              <div class="w-full max-w-[80px] bg-primary rounded-t-lg" [style.height.px]="barH(totalRecuperadas())"></div>
            </div>
            <div class="flex-1 flex flex-col items-center gap-1">
              <span class="text-sm font-bold text-on-surface">{{ totalBajas() }}</span>
              <div class="w-full max-w-[80px] bg-error rounded-t-lg" [style.height.px]="barH(totalBajas())"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div class="p-6 border-b border-outline-variant bg-surface-container-low">
          <h3 class="text-headline-sm font-bold text-on-surface">Detalle de Salidas Finalizadas</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[760px]">
            <thead class="bg-surface-container-low text-on-surface-variant uppercase text-[12px] font-bold tracking-widest">
              <tr>
                <th class="px-6 py-4">Fecha Salida</th>
                <th class="px-6 py-4">Producto / Herramienta</th>
                <th class="px-6 py-4 text-center">Recup. / Bajas</th>
                <th class="px-6 py-4 text-right">Costo</th>
                <th class="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              @if (loading()) {
                <tr><td colspan="5" class="px-6 py-16 text-center text-on-surface-variant">
                  <span class="material-symbols-outlined text-4xl animate-spin block mb-2">progress_activity</span>Cargando...
                </td></tr>
              } @else {
                @for (s of paginated(); track s.id) {
                  <tr class="hover:bg-surface-container-low transition-colors">
                    <td class="px-6 py-4 text-label-md">{{ s.fecha_salida }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded bg-primary-container/10 flex items-center justify-center text-primary shrink-0"><span class="material-symbols-outlined">build</span></div>
                        <div>
                          <p class="font-bold">{{ producto(s) }}</p>
                          <p class="text-xs text-on-surface-variant font-mono">{{ codigo(s) }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="flex flex-col items-center">
                        <span class="text-primary font-bold">{{ s.cantidad_recuperada }}</span>
                        <span class="text-[10px] font-bold" [ngClass]="s.cantidad_baja > 0 ? 'text-error' : 'text-on-surface-variant'">{{ s.cantidad_baja }} bajas</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right font-bold">{{ (s.costo_info?.cost_total ?? 0) | currency: 'USD' : 'symbol' : '1.2-2' }}</td>
                    <td class="px-6 py-4 text-center"><span class="px-3 py-1 bg-green-500/15 text-green-400 rounded-full text-[12px] font-bold">Finalizado</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="px-6 py-12 text-center text-on-surface-variant">
                    <span class="material-symbols-outlined text-4xl text-outline block mb-2">history</span>No hay salidas registradas.
                  </td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div class="p-4 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
          <span class="text-label-md text-on-surface-variant">Mostrando {{ rangeStart() }}-{{ rangeEnd() }} de {{ count() }} salidas</span>
          <div class="flex gap-2">
            <button (click)="goToPage(page() - 1)" [disabled]="page() === 1" class="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-variant transition-colors disabled:opacity-40"><span class="material-symbols-outlined text-sm">chevron_left</span></button>
            @for (n of pages(); track n) {
              <button (click)="goToPage(n)" [ngClass]="n === page() ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant hover:bg-surface-variant'" class="w-8 h-8 flex items-center justify-center rounded border text-sm transition-colors">{{ n }}</button>
            }
            <button (click)="goToPage(page() + 1)" [disabled]="page() === totalPages()" class="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-variant transition-colors disabled:opacity-40"><span class="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MantenimientoSalidas implements OnInit {
  private srv = inject(MantenimientoService);

  salidas = signal<SalidaMantenimiento[]>([]);
  private registros = signal<Map<number, Mantenimiento>>(new Map());
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // KPIs
  costoTotal = computed(() =>
    this.salidas().reduce((acc, s) => acc + Number(s.costo_info?.cost_total ?? 0), 0),
  );
  totalRecuperadas = computed(() => this.salidas().reduce((a, s) => a + s.cantidad_recuperada, 0));
  totalBajas = computed(() => this.salidas().reduce((a, s) => a + s.cantidad_baja, 0));
  recuperacionProm = computed(() => {
    const total = this.totalRecuperadas() + this.totalBajas();
    return total === 0 ? 0 : (this.totalRecuperadas() / total) * 100;
  });

  // Paginación client-side
  count = computed(() => this.salidas().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.count() / this.pageSize)));
  paginated = computed(() => {
    const p = this.page();
    return this.salidas().slice((p - 1) * this.pageSize, p * this.pageSize);
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

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ salidas: this.srv.getAllSalidas(), registros: this.srv.getAllRegistros() }).subscribe({
      next: (r) => {
        this.salidas.set(r.salidas);
        const map = new Map<number, Mantenimiento>();
        for (const reg of r.registros) map.set(reg.mant_id, reg);
        this.registros.set(map);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerErrorHttp(e, 'No se pudieron cargar las salidas.'));
        this.loading.set(false);
      },
    });
  }

  producto(s: SalidaMantenimiento): string {
    return this.registros().get(s.mantenimiento)?.producto_nombre ?? `Mantenimiento #${s.mantenimiento}`;
  }
  codigo(s: SalidaMantenimiento): string {
    return this.registros().get(s.mantenimiento)?.producto_codigo ?? `MN-${s.mantenimiento}`;
  }

  barH(value: number): number {
    const max = Math.max(1, this.totalRecuperadas(), this.totalBajas());
    return Math.max(6, Math.round((value / max) * 90));
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
  }
}
