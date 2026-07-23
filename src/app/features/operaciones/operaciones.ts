import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OperacionService } from '../../core/services/operacion.service';
import { ProductoService } from '../../core/services/producto.service';
import { ClienteService } from '../../core/services/cliente.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

// Retardo estándar para búsqueda en vivo (debounce)
const SEARCH_DEBOUNCE = 300;
import { Producto } from '../../shared/models/producto';
import {
  EstadoOperacion,
  Operacion,
  OperacionWrite,
  TipoOperacion,
} from '../../shared/models/operacion';
import { Cliente, ClienteWrite, TipoDocumento, TIPOS_DOCUMENTO } from '../../shared/models/cliente';
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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './operaciones.html',
  styleUrl: './operaciones.css',
})
export class Operaciones implements OnInit {
  private operacionService = inject(OperacionService);
  private productoService = inject(ProductoService);
  private clienteService = inject(ClienteService);
  private confirmSvc = inject(ConfirmService);

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

  // Resumen (tarjetas)
  ventasHoy = signal(0); // valor $ de las ventas de hoy
  ventasHoyCount = signal(0); // nº de ventas de hoy
  prestamosActivos = signal(0);
  vencidosCount = signal(0);
  // Fecha LOCAL (no UTC) para que coincida con fecha_operacion del servidor.
  readonly hoyISO = (() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  })();

  // ── Detalle (modal de solo lectura) ──────────────
  detalleOp = signal<Operacion | null>(null);

  // ── Acción en curso (finalizar/cancelar/eliminar) ─
  accionEnCurso = signal<number | null>(null); // id de la operación afectada

  // ── Formulario de creación (modal) ───────────────
  showForm = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);

  formTipo: TipoOperacion = 'venta';
  formFechaDevolucion = '';
  formObservaciones = '';
  formDeposito = ''; // garantía del préstamo (dinero → texto)
  lineas = signal<LineaForm[]>([]);

  // ── Buscador de cliente (typeahead) ──────────────
  clienteSeleccionado = signal<Cliente | null>(null);
  clienteBusqueda = '';
  clienteResultados = signal<Cliente[]>([]);
  mostrarListaClientes = signal(false);
  private clienteSearch$ = new Subject<string>();

  // ── Modal "nuevo cliente" inline ─────────────────
  showNuevoCliente = signal(false);
  guardandoCliente = signal(false);
  nuevoClienteError = signal<string | null>(null);
  readonly tiposDoc = TIPOS_DOCUMENTO;
  ncTipo: TipoDocumento = 'CC';
  ncDocumento = '';
  ncNombre = '';
  ncTelefono = '';
  ncDireccion = '';

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

  // Total estimado del formulario (el backend calcula el real).
  // Es un método (no computed) para que se recalcule en cada cambio de las
  // cantidades/precios de las líneas — se editan mutando el objeto, lo que no
  // dispararía un computed sobre el signal `lineas`.
  formTotal(): number {
    return this.lineas().reduce(
      (acc, l) => acc + Number(l.cantidad || 0) * Number(l.precio_unitario || 0),
      0,
    );
  }

  // Búsqueda en vivo (debounce)
  private search$ = new Subject<string>();
  private productoSearch$ = new Subject<string>();

  ngOnInit(): void {
    this.loadOperaciones();
    this.loadResumen();

    this.search$.pipe(debounceTime(SEARCH_DEBOUNCE), distinctUntilChanged()).subscribe((term) => {
      this.searchTerm = term;
      this.applyFilters();
    });

    this.productoSearch$.pipe(debounceTime(SEARCH_DEBOUNCE), distinctUntilChanged()).subscribe((term) => {
      this.productoSearch = term;
      this.buscarProductos();
    });

    this.clienteSearch$.pipe(debounceTime(SEARCH_DEBOUNCE), distinctUntilChanged()).subscribe((term) => {
      this.buscarClientes(term);
    });
  }

  onSearch(term: string): void {
    this.search$.next(term);
  }

  onProductoSearch(term: string): void {
    this.productoSearch$.next(term);
  }

  // ── Buscador de cliente ──────────────────────────
  onClienteSearch(term: string): void {
    this.clienteBusqueda = term;
    this.mostrarListaClientes.set(true);
    this.clienteSearch$.next(term);
  }

  private buscarClientes(term: string): void {
    this.clienteService.getClientes({ search: term.trim() || undefined, activo: true }).subscribe({
      next: (r) => this.clienteResultados.set(r.results),
      error: () => this.clienteResultados.set([]),
    });
  }

  elegirCliente(c: Cliente): void {
    this.clienteSeleccionado.set(c);
    this.clienteBusqueda = '';
    this.clienteResultados.set([]);
    this.mostrarListaClientes.set(false);
  }

  quitarCliente(): void {
    this.clienteSeleccionado.set(null);
  }

  cerrarListaClientesLuego(): void {
    setTimeout(() => this.mostrarListaClientes.set(false), 150);
  }

  // ── Modal "nuevo cliente" inline ─────────────────
  abrirNuevoCliente(): void {
    this.ncTipo = 'CC';
    this.ncDocumento = this.clienteBusqueda.trim();
    this.ncNombre = '';
    this.ncTelefono = '';
    this.ncDireccion = '';
    this.nuevoClienteError.set(null);
    this.showNuevoCliente.set(true);
  }

  cerrarNuevoCliente(): void {
    if (this.guardandoCliente()) return;
    this.showNuevoCliente.set(false);
  }

  guardarNuevoCliente(): void {
    if (!this.ncDocumento.trim() || !this.ncNombre.trim() || !this.ncTelefono.trim()) {
      this.nuevoClienteError.set('Documento, nombre y teléfono son obligatorios.');
      return;
    }
    const body: ClienteWrite = {
      tipo_documento: this.ncTipo,
      numero_documento: this.ncDocumento.trim(),
      nombre: this.ncNombre.trim(),
      telefono: this.ncTelefono.trim(),
      direccion: this.ncDireccion.trim() || null,
    };
    this.guardandoCliente.set(true);
    this.nuevoClienteError.set(null);
    this.clienteService.createCliente(body).subscribe({
      next: (c) => {
        this.guardandoCliente.set(false);
        this.showNuevoCliente.set(false);
        this.elegirCliente(c); // queda seleccionado
      },
      error: (e) => {
        this.guardandoCliente.set(false);
        this.nuevoClienteError.set(extraerMensajeError(e, 'No se pudo crear el cliente.'));
      },
    });
  }

  loadResumen(): void {
    this.operacionService.getVentasResumen(this.hoyISO).subscribe({
      next: (r) => {
        this.ventasHoy.set(r.total);
        this.ventasHoyCount.set(r.count);
      },
      error: () => {},
    });
    this.operacionService.getOperaciones({ tipo_operacion: 'prestamo', estado: 'activa', page: 1 }).subscribe({
      next: (r) => this.prestamosActivos.set(r.count),
      error: () => {},
    });
    this.operacionService.getVencidos(1).subscribe({
      next: (r) => this.vencidosCount.set(r.count),
      error: () => {},
    });
  }

  setTipo(v: TipoOperacion | ''): void {
    this.tipoFilter = v;
    this.applyFilters();
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

  // ── Gating de acciones ───────────────────────────
  // Las ventas nacen finalizadas y los préstamos se finalizan solos al
  // devolverse la última unidad; ya no hay "finalizar" manual.
  //  - Cancelar: préstamo activo, o venta finalizada (anular / reembolsar).
  //  - Eliminar: operación cancelada o préstamo ya finalizado (registro histórico).
  puedeCancelar(op: Operacion): boolean {
    return op.estado === 'activa' || (op.estado === 'finalizada' && op.tipo_operacion === 'venta');
  }

  puedeEliminar(op: Operacion): boolean {
    return op.estado === 'cancelada' || (op.estado === 'finalizada' && op.tipo_operacion === 'prestamo');
  }

  // ── Acciones: cancelar / eliminar ────────────────
  cancelar(op: Operacion): void {
    this.confirmSvc.ask({
      title: 'Cancelar operación',
      message: `¿Cancelar la operación ${op.codigo_operacion}? Esta acción repone el stock.`,
      confirmText: 'Cancelar operación',
      cancelText: 'Volver',
      tone: 'danger',
      icon: 'cancel',
    }).then((ok) => {
      if (!ok) return;
      this.ejecutarAccion(op.id, this.operacionService.cancelarOperacion(op.id));
    });
  }

  eliminar(op: Operacion): void {
    if (op.estado === 'activa') return; // el backend lo rechaza: cancelar primero
    this.confirmSvc.ask({
      title: 'Eliminar operación',
      message: `¿Eliminar definitivamente la operación ${op.codigo_operacion}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
      icon: 'delete_forever',
    }).then((ok) => {
      if (!ok) return;
      this.procederEliminar(op);
    });
  }

  private procederEliminar(op: Operacion): void {
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

  private ejecutarAccion(id: number, accion$: ReturnType<OperacionService['cancelarOperacion']>): void {
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
    this.loadResumen();
    setTimeout(() => this.successMsg.set(null), 5000);
  }

  // ── Formulario de creación ───────────────────────
  abrirForm(): void {
    this.formTipo = 'venta';
    this.formFechaDevolucion = '';
    this.formObservaciones = '';
    this.formDeposito = '';
    this.lineas.set([]);
    this.productoSearch = '';
    this.productoResultados.set([]);
    this.busquedaRealizada.set(false);
    // Cliente
    this.clienteSeleccionado.set(null);
    this.clienteBusqueda = '';
    this.clienteResultados.set([]);
    this.mostrarListaClientes.set(false);
    this.formError.set(null);
    this.showForm.set(true);
  }

  cerrarForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
  }

  onTipoChange(): void {
    // Las ventas no llevan fecha de devolución ni depósito (el backend lo rechaza).
    if (this.formTipo === 'venta') {
      this.formFechaDevolucion = '';
      this.formDeposito = '';
    }
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
    const cliente = this.clienteSeleccionado();
    if (this.formTipo === 'prestamo') {
      if (!this.formFechaDevolucion) {
        this.formError.set('Indica la fecha de devolución del préstamo.');
        return;
      }
      if (!cliente) {
        this.formError.set('El préstamo requiere un cliente. Búscalo o crea uno nuevo.');
        return;
      }
      if (!cliente.puede_prestar) {
        this.formError.set('El cliente no tiene dirección registrada; edítalo para poder prestarle.');
        return;
      }
    }

    const payload: OperacionWrite = {
      tipo_operacion: this.formTipo,
      cliente_ref: cliente?.cliente_id ?? null,
      observaciones: this.formObservaciones.trim() || null,
      fecha_devolucion: this.formTipo === 'prestamo' && this.formFechaDevolucion
        ? this.formFechaDevolucion
        : null,
      deposito: this.formTipo === 'prestamo' ? this.formDeposito.trim() || '0' : '0',
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
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'finalizada':
        return 'bg-green-500/15 text-green-400 border-green-500/30';
      case 'cancelada':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      default:
        return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    }
  }

  tipoChipClass(tipo: TipoOperacion): string {
    return tipo === 'venta'
      ? 'bg-primary/10 text-primary border-primary/20'
      : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  }

  tipoLabel(tipo: TipoOperacion): string {
    return tipo === 'venta' ? 'Venta' : 'Préstamo';
  }
}
