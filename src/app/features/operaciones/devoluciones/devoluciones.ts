import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { OperacionService } from '../../../core/services/operacion.service';
import { extraerMensajeError } from '../error-utils';
import { Devolucion, EstadoDevolucion, Operacion } from '../../../shared/models/operacion';

interface LineaDev {
  detalle: number;
  producto_nombre: string;
  producto_codigo: string;
  pendiente: number;
  cantidad: number;
  estado: EstadoDevolucion;
}

@Component({
  selector: 'app-operaciones-devoluciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-[1200px] mx-auto space-y-8">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 class="text-headline-md font-bold text-primary mb-1">Registro de Devolución</h2>
          <p class="text-on-surface-variant">Procesa el retorno de herramientas de un préstamo activo.</p>
        </div>
        <button type="button" (click)="guardar()"
          [disabled]="saving() || totalARetornar() === 0"
          class="px-8 h-12 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100">
          @if (saving()) { <span class="material-symbols-outlined animate-spin">progress_activity</span>Procesando... }
          @else { <span class="material-symbols-outlined">check</span>Finalizar Devolución }
        </button>
      </div>

      @if (error()) {
        <div class="bg-error-container/60 border border-error text-on-error-container px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <span class="material-symbols-outlined">error</span>{{ error() }}
        </div>
      }
      @if (successMsg()) {
        <div class="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <span class="material-symbols-outlined">check_circle</span>{{ successMsg() }}
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Columna izquierda: selección + resumen -->
        <div class="lg:col-span-1 space-y-6">
          <section class="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center"><span class="material-symbols-outlined">assignment</span></div>
              <h3 class="text-headline-sm font-bold text-primary">Préstamo</h3>
            </div>
            <label class="text-label-md text-outline block mb-1">Selecciona un préstamo activo</label>
            <select [ngModel]="selectedOp()?.id ?? ''" (ngModelChange)="selectPrestamo($event)"
              class="w-full bg-surface-container-low border border-outline-variant rounded-lg h-10 px-3 text-sm outline-none focus:ring-2 focus:ring-primary">
              <option [ngValue]="''">— Elegir —</option>
              @for (p of prestamos(); track p.id) { <option [ngValue]="p.id">{{ p.codigo_operacion }} · {{ p.cliente || 'Sin cliente' }}</option> }
            </select>
            @if (prestamos().length === 0 && !loading()) {
              <p class="text-xs text-on-surface-variant mt-2">No hay préstamos activos con unidades pendientes.</p>
            }

            @if (selectedOp(); as op) {
              <div class="mt-5 space-y-3">
                <div class="p-3 bg-surface-container-low rounded-lg">
                  <span class="text-label-md text-outline block mb-1">Cliente</span>
                  <p class="font-bold text-on-surface">{{ op.cliente || 'Sin cliente' }}</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 border border-outline-variant rounded-lg">
                    <span class="text-label-md text-outline block mb-1">Salida</span>
                    <p class="font-medium text-sm">{{ op.fecha_operacion }}</p>
                  </div>
                  <div class="p-3 border border-outline-variant rounded-lg">
                    <span class="text-label-md text-outline block mb-1">Vencimiento</span>
                    <p class="font-medium text-sm text-error">{{ op.fecha_devolucion || '—' }}</p>
                  </div>
                </div>
              </div>
            }
          </section>

          @if (selectedOp()) {
            <section class="bg-primary-container text-on-primary-container p-5 rounded-xl shadow-sm relative overflow-hidden">
              <div class="relative z-10">
                <h3 class="text-label-md uppercase tracking-wider mb-2 opacity-80">Unidades Pendientes</h3>
                <div class="text-4xl font-extrabold mb-1">{{ pendientesTotal() }}</div>
                <p class="text-label-md">Artículos aún en posesión del cliente</p>
              </div>
              <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl opacity-10">inventory</span>
            </section>
          }
        </div>

        <!-- Columna derecha: formulario de retorno -->
        <div class="lg:col-span-2 space-y-6">
          <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-outline-variant bg-surface-bright">
              <h3 class="text-headline-sm font-bold text-primary">Formulario de Retorno</h3>
            </div>

            @if (!selectedOp()) {
              <div class="p-12 text-center text-on-surface-variant">
                <span class="material-symbols-outlined text-4xl text-outline block mb-2">touch_app</span>
                Selecciona un préstamo para registrar su devolución.
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[560px]">
                  <thead>
                    <tr class="bg-surface-container text-on-surface-variant border-b border-outline-variant">
                      <th class="px-5 py-3 text-label-md font-bold">Producto</th>
                      <th class="px-5 py-3 text-label-md font-bold w-24">Pendiente</th>
                      <th class="px-5 py-3 text-label-md font-bold w-40">Cant. devolver</th>
                      <th class="px-5 py-3 text-label-md font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant">
                    @for (l of lineas(); track l.detalle) {
                      <tr>
                        <td class="px-5 py-3">
                          <p class="font-bold text-on-surface">{{ l.producto_nombre }}</p>
                          <p class="text-[12px] text-outline font-mono">{{ l.producto_codigo }}</p>
                        </td>
                        <td class="px-5 py-3 font-bold text-headline-sm">{{ l.pendiente }}</td>
                        <td class="px-5 py-3">
                          <div class="flex items-center gap-2">
                            <button type="button" (click)="dec(l)" class="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-high">-</button>
                            <input type="number" min="0" [max]="l.pendiente" [(ngModel)]="l.cantidad" [name]="'c' + l.detalle"
                              class="w-14 text-center border border-outline-variant rounded py-1 outline-none focus:ring-2 focus:ring-primary" />
                            <button type="button" (click)="inc(l)" class="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-high">+</button>
                          </div>
                        </td>
                        <td class="px-5 py-3">
                          <select [(ngModel)]="l.estado" [name]="'e' + l.detalle"
                            class="w-full bg-surface-container-low border-none rounded-lg text-label-md py-2 px-2 outline-none focus:ring-2 focus:ring-primary">
                            <option [ngValue]="'bueno'">Buen estado</option>
                            <option [ngValue]="'dañado'">Dañado</option>
                            <option [ngValue]="'perdido'">Perdido</option>
                          </select>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="px-5 py-8 text-center text-on-surface-variant">Este préstamo no tiene unidades pendientes.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="p-4 bg-surface-container-low/50">
                <textarea [(ngModel)]="observaciones" name="obs" rows="2" placeholder="Notas de la devolución (opcional)..."
                  class="w-full border border-outline-variant rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary text-body-md"></textarea>
              </div>
            }
          </section>
        </div>
      </div>

      <!-- Historial -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div class="p-5 border-b border-outline-variant flex items-center gap-3">
          <span class="material-symbols-outlined text-primary">history</span>
          <h3 class="text-headline-sm font-bold text-primary">Devoluciones recientes</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse min-w-[600px]">
            <thead class="bg-surface-container-low text-on-surface-variant uppercase text-xs">
              <tr>
                <th class="px-5 py-3">Operación</th><th class="px-5 py-3">Producto</th>
                <th class="px-5 py-3">Devuelto</th><th class="px-5 py-3">Estado</th><th class="px-5 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              @for (d of historial(); track d.id) {
                <tr>
                  <td class="px-5 py-3 font-mono text-xs">{{ d.operacion_codigo }}</td>
                  <td class="px-5 py-3">{{ d.producto_nombre }}</td>
                  <td class="px-5 py-3 font-bold">{{ d.cantidad_devuelta }}</td>
                  <td class="px-5 py-3 capitalize">{{ d.estado_devolucion }}</td>
                  <td class="px-5 py-3 text-on-surface-variant">{{ d.fecha_devolucion }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-5 py-6 text-center text-on-surface-variant">Sin devoluciones registradas.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class OperacionesDevoluciones implements OnInit {
  private srv = inject(OperacionService);

  prestamos = signal<Operacion[]>([]);
  selectedOp = signal<Operacion | null>(null);
  lineas = signal<LineaDev[]>([]);
  historial = signal<Devolucion[]>([]);
  observaciones = '';

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  pendientesTotal = computed(() => this.lineas().reduce((a, l) => a + l.pendiente, 0));
  totalARetornar = computed(() => this.lineas().reduce((a, l) => a + (Number(l.cantidad) || 0), 0));

  ngOnInit(): void {
    this.loadPrestamos();
    this.loadHistorial();
  }

  private loadPrestamos(): void {
    this.loading.set(true);
    this.srv.getOperaciones({ tipo_operacion: 'prestamo', estado: 'activa', page: 1 }).subscribe({
      next: (r) => {
        // Solo préstamos con algo pendiente de devolver
        this.prestamos.set(r.results.filter((o) => (o.detalles ?? []).some((d) => d.cantidad_pendiente > 0)));
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(extraerMensajeError(e, 'No se pudieron cargar los préstamos activos.'));
        this.loading.set(false);
      },
    });
  }

  private loadHistorial(): void {
    this.srv.getDevoluciones({ page: 1 }).subscribe({
      next: (r) => this.historial.set(r.results),
      error: () => this.historial.set([]),
    });
  }

  selectPrestamo(id: number | ''): void {
    this.successMsg.set(null);
    this.error.set(null);
    if (id === '') {
      this.selectedOp.set(null);
      this.lineas.set([]);
      return;
    }
    const op = this.prestamos().find((p) => p.id === Number(id)) ?? null;
    this.selectedOp.set(op);
    this.observaciones = '';
    this.lineas.set(
      (op?.detalles ?? [])
        .filter((d) => d.cantidad_pendiente > 0)
        .map((d) => ({
          detalle: d.id,
          producto_nombre: d.producto_nombre,
          producto_codigo: d.producto_codigo,
          pendiente: d.cantidad_pendiente,
          cantidad: d.cantidad_pendiente,
          estado: 'bueno' as EstadoDevolucion,
        })),
    );
  }

  inc(l: LineaDev): void {
    if (l.cantidad < l.pendiente) l.cantidad++;
  }
  dec(l: LineaDev): void {
    if (l.cantidad > 0) l.cantidad--;
  }

  guardar(): void {
    const op = this.selectedOp();
    if (!op) return;
    const aEnviar = this.lineas().filter((l) => Number(l.cantidad) > 0);
    if (aEnviar.length === 0) {
      this.error.set('Indica al menos una unidad a devolver.');
      return;
    }
    for (const l of aEnviar) {
      if (l.cantidad > l.pendiente) {
        this.error.set(`No puedes devolver más de ${l.pendiente} de "${l.producto_nombre}".`);
        return;
      }
    }

    this.saving.set(true);
    this.error.set(null);
    this.successMsg.set(null);

    const calls = aEnviar.map((l) =>
      this.srv.createDevolucion({
        detalle: l.detalle,
        cantidad_devuelta: Number(l.cantidad),
        estado_devolucion: l.estado,
        observaciones: this.observaciones.trim() || null,
      }),
    );

    forkJoin(calls).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set(`Devolución registrada para ${op.codigo_operacion}.`);
        this.selectedOp.set(null);
        this.lineas.set([]);
        this.observaciones = '';
        this.loadPrestamos();
        this.loadHistorial();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(extraerMensajeError(e, 'No se pudo registrar la devolución.'));
      },
    });
  }
}
