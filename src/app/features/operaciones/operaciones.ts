import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperacionService } from '../../core/services/operacion.service';
import { ProductoService } from '../../core/services/producto.service';
import { Producto } from '../../shared/models/producto';
import {
  EstadoOperacion,
  Operacion,
  OperacionWrite,
  TipoOperacion,
} from '../../shared/models/operacion';
import { extraerMensajeError } from './error-utils';

const PAGE_SIZE = 20; // debe coincidir con REST_FRAMEWORK.PAGE_SIZE del backend

// Fila del formulario de creación (una línea de DetalleOperacion)
interface LineaForm {
  producto: number;
  producto_nombre: string;
  codigo_producto: string;
  disponible: number;
  cantidad: number;
  precio_unitario: string;
}

@Component({
  selector: 'app-operaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './operaciones.html',
  styleUrl: './operaciones.css',
})
export class Operaciones implements OnInit {
  private operacionService = inject(OperacionService);
  private productoService = inject(ProductoService);

  // ── Estado de datos ──────────────────────────────
  operaciones = signal<Operacion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  count = signal(0);
  page = signal(1);
  readonly pageSize = PAGE_SIZE;

  // ── Filtros (server-side) ────────────────────────
  tipoFilter: TipoOperacion | '' = '';
  estadoFilter: EstadoOperacion | '' = '';
  searchTerm = '';

  readonly tipos: TipoOperacion[] = ['venta', 'prestamo'];
  readonly estados: EstadoOperacion[] = ['activa', 'finalizada', 'cancelada'];

  // ── Detalle (modal de solo lectura) ──────────────
  detalleOp = signal<Operacion | null>(null);

  // ── Acción en curso (finalizar/cancelar/eliminar) ─
  accionEnCurso = signal<number | null>(null); // id de la operación afectada

  // ── Formulario de creación (modal) ───────────────
  showForm = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);

  formTipo: TipoOperacion = 'venta';
  formCliente = '';
  formFechaDevolucion = '';
  formObservaciones = '';
  lineas = signal<LineaForm[]>([]);

  // Buscador de productos para añadir líneas
  productoSearch = '';
  productoResultados = signal<Producto[]>([]);
  buscandoProductos = signal(false);
  busquedaRealizada = signal(false);

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

  // Total estimado del formulario (el backend calcula el real)
  formTotal = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.cantidad * Number(l.precio_unitario || 0), 0),
  );

  ngOnInit(): void {
    this.loadOperaciones();
  }

  // ── Cargas ───────────────────────────────────────
  loadOperaciones(): void {
    this.loading.set(true);
    this.error.set(null);

    this.operacionService
      .getOperaciones({
        tipo_operacion: this.tipoFilter,
        estado: this.estadoFilter,
        search: this.searchTerm.trim() || undefined,
        page: this.page(),
      })
      .subscribe({
        next: (res) => {
          this.operaciones.set(res.results);
          this.count.set(res.count);
          this.loading.set(false);
        },
        error: (err) => {
          this.operaciones.set([]);
          this.count.set(0);
          this.error.set(
            extraerMensajeError(err, 'No se pudieron cargar las operaciones. Verifica tu sesión o el servidor.'),
          );
          this.loading.set(false);
        },
      });
  }

  // ── Filtros / paginación ─────────────────────────
  applyFilters(): void {
    this.page.set(1);
    this.loadOperaciones();
  }

  clearFilters(): void {
    this.tipoFilter = '';
    this.estadoFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadOperaciones();
  }

  // ── Detalle ──────────────────────────────────────
  verDetalle(op: Operacion): void {
    // El list serializer ya anida los detalles; abrimos con esos datos
    // y refrescamos desde el servidor por si cambió algo.
    this.detalleOp.set(op);
    this.operacionService.getOperacion(op.id).subscribe({
      next: (res) => this.detalleOp.set(res),
      error: () => {}, // mantenemos los datos de la fila
    });
  }

  cerrarDetalle(): void {
    this.detalleOp.set(null);
  }

  // ── Acciones: finalizar / cancelar / eliminar ────
  finalizar(op: Operacion): void {
    if (!confirm(`¿Finalizar la operación ${op.codigo_operacion}?`)) return;
    this.ejecutarAccion(op.id, this.operacionService.finalizarOperacion(op.id));
  }

  cancelar(op: Operacion): void {
    if (!confirm(`¿Cancelar la operación ${op.codigo_operacion}? Esta acción repone el stock.`)) return;
    this.ejecutarAccion(op.id, this.operacionService.cancelarOperacion(op.id));
  }

  eliminar(op: Operacion): void {
    if (op.estado === 'activa') return; // el backend lo rechaza: cancelar primero
    if (!confirm(`¿Eliminar definitivamente la operación ${op.codigo_operacion}?`)) return;

    this.accionEnCurso.set(op.id);
    this.operacionService.deleteOperacion(op.id).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.notificar(`Operación ${op.codigo_operacion} eliminada.`);
        this.loadOperaciones();
      },
      error: (err) => {
        this.accionEnCurso.set(null);
        this.error.set(extraerMensajeError(err, 'No se pudo eliminar la operación.'));
      },
    });
  }

  private ejecutarAccion(id: number, accion$: ReturnType<OperacionService['finalizarOperacion']>): void {
    this.accionEnCurso.set(id);
    this.error.set(null);

    accion$.subscribe({
      next: (res) => {
        this.accionEnCurso.set(null);
        this.notificar(res.detail);
        this.cerrarDetalle();
        this.loadOperaciones();
      },
      error: (err) => {
        this.accionEnCurso.set(null);
        this.error.set(extraerMensajeError(err, 'No se pudo completar la acción.'));
      },
    });
  }

  private notificar(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 5000);
  }

  // ── Formulario de creación ───────────────────────
  abrirForm(): void {
    this.formTipo = 'venta';
    this.formCliente = '';
    this.formFechaDevolucion = '';
    this.formObservaciones = '';
    this.lineas.set([]);
    this.productoSearch = '';
    this.productoResultados.set([]);
    this.busquedaRealizada.set(false);
    this.formError.set(null);
    this.showForm.set(true);
  }

  cerrarForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
  }

  onTipoChange(): void {
    // Las ventas no llevan fecha de devolución (el backend lo rechaza)
    if (this.formTipo === 'venta') this.formFechaDevolucion = '';
  }

  buscarProductos(): void {
    const term = this.productoSearch.trim();
    if (!term) {
      this.productoResultados.set([]);
      this.busquedaRealizada.set(false);
      return;
    }
    this.buscandoProductos.set(true);
    this.productoService.getProductos({ search: term }).subscribe({
      next: (res) => {
        this.productoResultados.set(res.results);
        this.buscandoProductos.set(false);
        this.busquedaRealizada.set(true);
      },
      error: () => {
        this.productoResultados.set([]);
        this.buscandoProductos.set(false);
        this.busquedaRealizada.set(true);
      },
    });
  }

  yaAgregado(prodId: number): boolean {
    return this.lineas().some((l) => l.producto === prodId);
  }

  agregarLinea(p: Producto): void {
    // El backend rechaza productos repetidos en la misma operación
    if (this.yaAgregado(p.prod_id)) return;
    this.lineas.update((ls) => [
      ...ls,
      {
        producto: p.prod_id,
        producto_nombre: p.prod_nombre,
        codigo_producto: p.codigo_producto,
        disponible: p.prod_cantidad_disponible,
        cantidad: 1,
        precio_unitario: p.prod_valor_unitario,
      },
    ]);
  }

  quitarLinea(index: number): void {
    this.lineas.update((ls) => ls.filter((_, i) => i !== index));
  }

  guardar(): void {
    this.formError.set(null);

    const lineas = this.lineas();
    if (lineas.length === 0) {
      this.formError.set('La operación debe incluir al menos un producto.');
      return;
    }
    for (const l of lineas) {
      if (!l.cantidad || l.cantidad <= 0) {
        this.formError.set(`La cantidad de '${l.producto_nombre}' debe ser mayor que cero.`);
        return;
      }
      if (l.cantidad > l.disponible) {
        this.formError.set(
          `Stock insuficiente para '${l.producto_nombre}'. Disponible: ${l.disponible}, solicitado: ${l.cantidad}.`,
        );
        return;
      }
      if (l.precio_unitario === '' || Number(l.precio_unitario) < 0) {
        this.formError.set(`El precio unitario de '${l.producto_nombre}' no puede ser negativo.`);
        return;
      }
    }
    if (this.formTipo === 'prestamo' && !this.formFechaDevolucion) {
      this.formError.set('Indica la fecha de devolución del préstamo.');
      return;
    }

    const payload: OperacionWrite = {
      tipo_operacion: this.formTipo,
      cliente: this.formCliente.trim() || null,
      observaciones: this.formObservaciones.trim() || null,
      fecha_devolucion: this.formTipo === 'prestamo' && this.formFechaDevolucion
        ? this.formFechaDevolucion
        : null,
      detalles: lineas.map((l) => ({
        producto: l.producto,
        cantidad: Number(l.cantidad),
        precio_unitario: String(l.precio_unitario),
      })),
    };

    this.saving.set(true);
    this.operacionService.createOperacion(payload).subscribe({
      next: (op) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notificar(`Operación ${op.codigo_operacion} registrada correctamente.`);
        this.page.set(1);
        this.loadOperaciones();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(extraerMensajeError(err, 'No se pudo registrar la operación.'));
      },
    });
  }

  // ── Helpers de presentación ──────────────────────
  estadoChipClass(estado: EstadoOperacion): string {
    switch (estado) {
      case 'activa':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'finalizada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    }
  }

  tipoChipClass(tipo: TipoOperacion): string {
    return tipo === 'venta'
      ? 'bg-primary/10 text-primary border-primary/20'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  tipoLabel(tipo: TipoOperacion): string {
    return tipo === 'venta' ? 'Venta' : 'Préstamo';
  }
}
