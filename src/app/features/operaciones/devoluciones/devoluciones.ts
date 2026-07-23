import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  imports: [CommonModule, FormsModule, RouterLink],
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
        <div class="bg-green-500/15 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <span class="material-symbols-outlined">check_circle</span>{{ successMsg() }}
        </div>
      }

      <!-- Selección de préstamo + resumen del cliente -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-end">
          <div>
            <label class="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant block mb-1.5">Buscar Préstamo Activo</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">search</span>
              <input type="text" [ngModel]="filtroPrestamo()" (ngModelChange)="onFiltroPrestamo($event)"
                (focus)="mostrarLista.set(true)" (blur)="cerrarListaLuego()" name="filtroPrestamo" autocomplete="off"
                placeholder="Buscar por código o cliente..."
                class="w-full bg-surface-container-low border border-outline-variant rounded-lg h-11 pl-10 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:ring-2 focus:ring-primary" />

              @if (mostrarLista()) {
                <ul class="absolute z-30 mt-1 w-full bg-surface-container-low border border-outline-variant rounded-lg shadow-2xl max-h-64 overflow-y-auto py-1">
                  @for (p of prestamosFiltrados(); track p.id) {
                    <li>
                      <button type="button" (mousedown)="elegirPrestamo(p)"
                        class="w-full text-left px-3 py-2 hover:bg-surface-container-high transition-colors flex items-center justify-between gap-2">
                        <span class="font-mono font-bold text-primary text-sm">{{ p.codigo_operacion }}</span>
                        <span class="text-on-surface-variant text-xs truncate">{{ p.cliente || 'Sin cliente' }}</span>
                      </button>
                    </li>
                  } @empty {
                    <li class="px-3 py-2 text-sm text-on-surface-variant">
                      {{ prestamos().length === 0 ? 'No hay préstamos activos pendientes.' : 'Sin coincidencias.' }}
                    </li>
                  }
                </ul>
              }
            </div>
            @if (selectedOp()) {
              <button type="button" (click)="selectPrestamo('')" class="text-xs text-on-surface-variant hover:text-primary mt-2 inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">close</span>Cambiar préstamo
              </button>
            }
          </div>

          @if (selectedOp(); as op) {
            <div class="lg:col-span-2 flex flex-wrap items-center gap-x-8 gap-y-4 lg:pl-6 lg:border-l border-outline-variant">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0"><span class="material-symbols-outlined">person</span></div>
                <div>
                  <span class="text-[10px] uppercase tracking-wide text-outline font-bold block">Cliente</span>
                  <p class="font-bold text-on-surface">{{ op.cliente || 'Sin cliente' }}</p>
                </div>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wide text-outline font-bold block">Fecha Préstamo</span>
                <p class="font-mono text-on-surface">{{ op.fecha_operacion }}</p>
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wide text-outline font-bold block">Items Pendientes</span>
                <p class="font-mono font-bold text-primary">{{ pendientesTotal() }} unidades</p>
              </div>
              <span class="lg:ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-[11px] font-bold uppercase tracking-wide">
                <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>En proceso
              </span>
            </div>
          } @else {
            <div class="lg:col-span-2 text-sm text-on-surface-variant flex items-center gap-2">
              <span class="material-symbols-outlined text-outline">touch_app</span>Selecciona un préstamo para ver sus items.
            </div>
          }
        </div>
      </section>

      @if (selectedOp()) {
        <!-- Detalle de items (tarjetas) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span class="w-1 h-5 bg-primary rounded-full"></span>Préstamo Seleccionado: Detalle de Items
            </h3>
            <span class="text-xs text-on-surface-variant">{{ lineas().length }} producto(s) con unidades pendientes</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            @for (l of lineas(); track l.detalle) {
              <div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
                <!-- Cabecera con placeholder + pendiente -->
                <div class="relative h-24 bg-surface-container flex items-center justify-center border-b border-outline-variant">
                  <span class="material-symbols-outlined text-5xl text-outline">handyman</span>
                  <span class="absolute top-2 right-2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-0.5 rounded font-mono">PEND: {{ l.pendiente }}</span>
                </div>

                <div class="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <p class="font-bold text-on-surface leading-tight">{{ l.producto_nombre }}</p>
                    <p class="text-[11px] font-mono text-on-surface-variant">{{ l.producto_codigo }}</p>
                  </div>

                  <div>
                    <p class="text-[10px] uppercase tracking-wide text-outline font-bold mb-1.5">Estado del Item</p>
                    <div class="grid grid-cols-3 gap-2">
                      <button type="button" (click)="l.estado = 'bueno'"
                        [ngClass]="l.estado === 'bueno' ? 'border-green-500 bg-green-500/15 text-green-400' : 'border-outline-variant text-on-surface-variant hover:border-outline'"
                        class="flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors text-[10px] font-bold uppercase tracking-wide">
                        <span class="material-symbols-outlined text-[18px]">check_circle</span>Bueno
                      </button>
                      <button type="button" (click)="l.estado = 'dañado'"
                        [ngClass]="l.estado === 'dañado' ? 'border-yellow-500 bg-yellow-500/15 text-yellow-300' : 'border-outline-variant text-on-surface-variant hover:border-outline'"
                        class="flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors text-[10px] font-bold uppercase tracking-wide">
                        <span class="material-symbols-outlined text-[18px]">build</span>Dañado
                      </button>
                      <button type="button" (click)="l.estado = 'perdido'"
                        [ngClass]="l.estado === 'perdido' ? 'border-red-500 bg-red-500/15 text-red-300' : 'border-outline-variant text-on-surface-variant hover:border-outline'"
                        class="flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors text-[10px] font-bold uppercase tracking-wide">
                        <span class="material-symbols-outlined text-[18px]">error</span>Perdido
                      </button>
                    </div>
                  </div>

                  <div class="flex items-center justify-between mt-auto pt-1">
                    <span class="text-[10px] uppercase tracking-wide text-on-surface-variant font-bold">Cant. a Devolver</span>
                    <div class="flex items-center gap-2">
                      <button type="button" (click)="dec(l)" class="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container-high text-on-surface">-</button>
                      <input type="number" min="0" [max]="l.pendiente" [(ngModel)]="l.cantidad" [name]="'c' + l.detalle"
                        class="w-12 text-center bg-surface-container-low border border-outline-variant rounded-lg py-1 text-on-surface outline-none focus:ring-2 focus:ring-primary" />
                      <button type="button" (click)="inc(l)" class="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container-high text-on-surface">+</button>
                    </div>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="md:col-span-2 xl:col-span-3 p-10 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl">
                Este préstamo no tiene unidades pendientes.
              </div>
            }
          </div>

          <!-- Notas -->
          <textarea [(ngModel)]="observaciones" name="obs" rows="2" placeholder="Notas de la devolución (opcional)..."
            class="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface"></textarea>
        </section>
      }

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
                  <td class="px-5 py-3">
                    <span class="font-mono text-xs px-2 py-1 border border-outline-variant rounded text-on-surface-variant">{{ d.operacion_codigo }}</span>
                  </td>
                  <td class="px-5 py-3">{{ d.producto_nombre }}</td>
                  <td class="px-5 py-3 font-mono font-bold text-primary">{{ d.cantidad_devuelta }}</td>
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide border"
                        [ngClass]="{
                          'bg-green-500/15 text-green-400 border-green-500/30': d.estado_devolucion === 'bueno',
                          'bg-yellow-500/15 text-yellow-300 border-yellow-500/30': d.estado_devolucion === 'dañado',
                          'bg-red-500/15 text-red-300 border-red-500/30': d.estado_devolucion === 'perdido'
                        }">
                        <span class="w-1.5 h-1.5 rounded-full"
                          [ngClass]="{
                            'bg-green-400': d.estado_devolucion === 'bueno',
                            'bg-yellow-400': d.estado_devolucion === 'dañado',
                            'bg-red-400': d.estado_devolucion === 'perdido'
                          }"></span>{{ d.estado_devolucion }}
                      </span>
                      @if (d.estado_devolucion === 'dañado' && d.mantenimiento_id) {
                        <a routerLink="/mantenimiento" [queryParams]="{ estado: 'pendiente' }"
                          class="inline-flex items-center gap-1 text-[11px] font-bold text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded hover:bg-orange-500/25 transition-colors"
                          title="Ver en Mantenimiento">
                          <span class="material-symbols-outlined text-[13px]">build</span>MN-{{ d.mantenimiento_id }}
                        </a>
                      }
                      @if (d.estado_devolucion === 'perdido' && d.perdida_id) {
                        <a routerLink="/perdidas" [queryParams]="{ estado: 'pendiente' }"
                          class="inline-flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-500/15 px-2 py-0.5 rounded hover:bg-red-500/25 transition-colors"
                          title="Ver cargo por pérdida">
                          <span class="material-symbols-outlined text-[13px]">money_off</span>PD-{{ d.perdida_id }}
                        </a>
                      }
                    </div>
                  </td>
                  <td class="px-5 py-3 text-on-surface-variant font-mono">{{ d.fecha_devolucion }}</td>
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

  // ── Buscador de préstamo (typeahead por código o cliente) ──
  filtroPrestamo = signal('');
  mostrarLista = signal(false);

  prestamosFiltrados = computed(() => {
    const t = this.filtroPrestamo().trim().toLowerCase();
    const todos = this.prestamos();
    if (!t) return todos;
    return todos.filter(
      (p) =>
        p.codigo_operacion.toLowerCase().includes(t) ||
        (p.cliente ?? '').toLowerCase().includes(t),
    );
  });

  onFiltroPrestamo(term: string): void {
    this.filtroPrestamo.set(term);
    this.mostrarLista.set(true);
  }

  elegirPrestamo(p: Operacion): void {
    this.filtroPrestamo.set('');
    this.mostrarLista.set(false);
    this.selectPrestamo(p.id);
  }

  // Cierra la lista tras un breve retardo para que el click en un ítem alcance a dispararse.
  cerrarListaLuego(): void {
    setTimeout(() => this.mostrarLista.set(false), 150);
  }

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

    const danadas = aEnviar.filter((l) => l.estado === 'dañado').reduce((a, l) => a + Number(l.cantidad), 0);

    forkJoin(calls).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set(
          danadas > 0
            ? `Devolución registrada para ${op.codigo_operacion}. ${danadas} unidad(es) dañada(s) quedaron pendientes en Mantenimiento.`
            : `Devolución registrada para ${op.codigo_operacion}.`,
        );
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
