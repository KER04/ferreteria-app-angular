import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OperacionService } from '../../../core/services/operacion.service';
import { extraerMensajeError } from '../error-utils';
import { Operacion } from '../../../shared/models/operacion';

// Préstamos activos con fecha de devolución vencida (@action vencidos).
@Component({
  selector: 'app-operaciones-vencidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <!-- Encabezado urgente -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <nav class="flex items-center gap-2 text-outline text-label-md mb-2">
            <span>Préstamos</span><span class="material-symbols-outlined text-[16px]">chevron_right</span>
            <span class="text-primary font-bold">Vencidos</span>
          </nav>
          <h2 class="text-headline-md font-extrabold text-on-background flex items-center gap-3">
            <span class="material-symbols-outlined text-error text-[32px]" style="font-variation-settings: 'FILL' 1;">warning</span>
            Préstamos con Atraso Crítico
          </h2>
          <p class="text-on-surface-variant mt-1">Acción requerida sobre {{ count() }} préstamos que superaron la fecha límite.</p>
        </div>
        <a routerLink="/ventas" class="bg-surface-container-high text-on-surface py-2 px-6 rounded-lg font-medium flex items-center gap-2 hover:bg-surface-variant transition-all">
          <span class="material-symbols-outlined">arrow_back</span>Ver operaciones
        </a>
      </div>

      @if (error()) {
        <div class="bg-error-container/60 border border-error text-on-error-container px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <span class="material-symbols-outlined">error</span>{{ error() }}
        </div>
      }

      <!-- KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm border-l-4 border-l-error">
          <p class="text-label-md text-outline">Total Vencidos</p>
          <h3 class="text-[32px] font-bold text-error mt-1">{{ count() }}</h3>
          <p class="text-[12px] text-on-surface-variant mt-1">Préstamos fuera de plazo</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
          <p class="text-label-md text-outline">Monto en Riesgo</p>
          <h3 class="text-[32px] font-bold text-on-background mt-1">{{ montoRiesgo() | currency: 'USD' : 'symbol' : '1.0-0' }}</h3>
          <p class="text-[12px] text-on-surface-variant mt-1">Valor de las operaciones</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
          <p class="text-label-md text-outline">Atraso Promedio</p>
          <h3 class="text-[32px] font-bold text-secondary mt-1">{{ atrasoProm() | number: '1.0-1' }} días</h3>
          <p class="text-[12px] text-on-surface-variant mt-1">Sobre los vencidos actuales</p>
        </div>
      </div>

      <!-- Tabla -->
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr class="bg-surface-container-low border-b border-outline-variant">
                <th class="py-4 px-6 text-label-md text-outline uppercase">Código</th>
                <th class="py-4 px-6 text-label-md text-outline uppercase">Cliente</th>
                <th class="py-4 px-6 text-label-md text-outline uppercase">Producto</th>
                <th class="py-4 px-6 text-label-md text-outline uppercase">Fecha devolución</th>
                <th class="py-4 px-6 text-label-md text-outline uppercase">Días de atraso</th>
                <th class="py-4 px-6 text-label-md text-outline uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              @if (loading()) {
                <tr><td colspan="6" class="px-6 py-16 text-center text-on-surface-variant">
                  <span class="material-symbols-outlined text-4xl animate-spin block mb-2">progress_activity</span>Cargando...
                </td></tr>
              } @else {
                @for (op of items(); track op.id) {
                  <tr class="hover:bg-on-surface-variant/5 transition-colors">
                    <td class="py-4 px-6 font-mono text-table-data font-bold text-primary">{{ op.codigo_operacion }}</td>
                    <td class="py-4 px-6">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">{{ inicialesCliente(op) }}</div>
                        <div>
                          <p class="font-bold text-on-background leading-none">{{ op.cliente || 'Sin cliente' }}</p>
                          @if (op.cliente_info?.telefono; as tel) {
                            <a [href]="'tel:' + tel" class="text-label-md text-primary mt-1 inline-flex items-center gap-1 hover:underline">
                              <span class="material-symbols-outlined text-[14px]">call</span>{{ tel }}
                            </a>
                          } @else {
                            <p class="text-label-md text-outline mt-1">{{ op.usuario_nombre }}</p>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="py-4 px-6">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-outline">handyman</span>
                        <span class="text-on-background">{{ producto(op) }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-6"><p class="text-error font-bold">{{ op.fecha_devolucion }}</p></td>
                    <td class="py-4 px-6">
                      <span class="inline-flex items-center px-3 py-1 rounded-full font-bold text-label-md"
                        [ngClass]="diasVencido(op.fecha_devolucion) >= 7 ? 'bg-red-600 text-white animate-pulse' : 'bg-error-container text-on-error-container'">
                        +{{ diasVencido(op.fecha_devolucion) }} días
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                      <a routerLink="/devoluciones" class="bg-primary text-on-primary py-1.5 px-4 rounded-lg font-medium text-sm hover:opacity-90 transition-all inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[18px]">assignment_return</span>Devolución
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="px-6 py-12 text-center text-on-surface-variant">
                    <span class="material-symbols-outlined text-4xl text-green-500 block mb-2"></span>No hay préstamos vencidos. 
                  </td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div class="bg-surface-container-low p-4 flex justify-between items-center">
          <p class="text-label-md text-outline">{{ count() }} préstamos vencidos</p>
        </div>
      </div>

      <!-- Panel de protocolo -->
      <div class="bg-error-container text-on-error-container p-6 rounded-xl flex items-start gap-4">
        <span class="material-symbols-outlined text-[40px]" style="font-variation-settings: 'FILL' 1;">error</span>
        <div>
          <h4 class="text-headline-sm font-bold mb-2">Protocolo de recuperación de herramientas</h4>
          <p class="opacity-90">Los préstamos con más de 7 días de atraso requieren contacto directo con el cliente. Registra la devolución en cuanto el equipo regrese para liberar el stock.</p>
        </div>
      </div>
    </div>
  `,
})
export class OperacionesVencidos implements OnInit {
  private srv = inject(OperacionService);
  items = signal<Operacion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  count = computed(() => this.items().length);
  montoRiesgo = computed(() => this.items().reduce((a, o) => a + Number(o.total || 0), 0));
  atrasoProm = computed(() => {
    const arr = this.items();
    if (arr.length === 0) return 0;
    const total = arr.reduce((a, o) => a + this.diasVencido(o.fecha_devolucion), 0);
    return total / arr.length;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getVencidos(1).subscribe({
      next: (r) => {
        this.items.set(r.results);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerMensajeError(e, 'No se pudieron cargar los préstamos vencidos.'));
        this.loading.set(false);
      },
    });
  }

  diasVencido(fecha: string | null): number {
    if (!fecha) return 0;
    const venc = new Date(fecha + 'T00:00:00').getTime();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((hoy.getTime() - venc) / 86_400_000));
  }
  inicialesCliente(op: Operacion): string {
    const base = (op.cliente || op.usuario_nombre || '?').trim();
    const parts = base.split(/\s+/);
    return ((parts[0]?.charAt(0) ?? '') + (parts[1]?.charAt(0) ?? '')).toUpperCase() || '?';
  }
  producto(op: Operacion): string {
    const d = op.detalles ?? [];
    if (d.length === 0) return '—';
    return d.length === 1 ? d[0].producto_nombre : `${d[0].producto_nombre} +${d.length - 1}`;
  }
}
