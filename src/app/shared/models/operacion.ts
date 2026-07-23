import { Paginated } from './producto';

// Re-export para que los componentes del módulo operaciones
// no dependan directamente del modelo de producto.
export type { Paginated };

// ── Choices reales del backend (apps/operaciones/models.py) ──
export type TipoOperacion = 'venta' | 'prestamo';
export type EstadoOperacion = 'activa' | 'finalizada' | 'cancelada';
export type EstadoDevolucion = 'bueno' | 'dañado' | 'perdido';
export type EstadoPerdida = 'pendiente' | 'cobrado' | 'condonado';

// ─────────────────────────────────────────────
// DETALLE — tal como lo devuelve DetalleReadSerializer
// ─────────────────────────────────────────────
export interface DetalleOperacion {
  id: number;
  producto: number;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  cantidad_devuelta: number;
  cantidad_pendiente: number;
  devolucion_completa: boolean;
  precio_unitario: string; // DecimalField → string en JSON
  subtotal: string;
}

// ─────────────────────────────────────────────
// OPERACIÓN — tal como la devuelve OperacionReadSerializer
// ─────────────────────────────────────────────
// Datos de contacto del cliente real (OperacionReadSerializer.cliente_info)
export interface ClienteInfo {
  cliente_id: number;
  nombre: string;
  telefono: string;
  numero_documento: string;
  direccion: string | null;
}

export interface Operacion {
  id: number;
  codigo_operacion: string;
  tipo_operacion: TipoOperacion;
  estado: EstadoOperacion;
  usuario: number;
  usuario_nombre: string;
  cliente: string | null; // snapshot del nombre (o "Consumidor final")
  cliente_ref: number | null; // id del Cliente real
  cliente_documento: string | null; // snapshot del documento
  cliente_info: ClienteInfo | null; // contacto (para vencidos/detalle)
  deposito: string; // Decimal → string (garantía del préstamo)
  deposito_devuelto: boolean;
  fecha_operacion: string; // 'YYYY-MM-DD'
  fecha_devolucion: string | null; // 'YYYY-MM-DD'
  observaciones: string | null;
  total: string; // DecimalField → string
  detalles: DetalleOperacion[];
}

// ── Payloads de escritura (OperacionWriteSerializer / DetalleWriteSerializer) ──
export interface DetalleOperacionWrite {
  producto: number;
  cantidad: number;
  precio_unitario: string;
}

export interface OperacionWrite {
  tipo_operacion: TipoOperacion;
  cliente_ref?: number | null; // id del Cliente (obligatorio en préstamos)
  deposito?: string | number; // garantía del préstamo
  fecha_devolucion?: string | null;
  observaciones?: string | null;
  detalles: DetalleOperacionWrite[];
}

// Solo cabecera: campos permitidos por OperacionViewSet.update()
export interface OperacionCabeceraPatch {
  estado?: EstadoOperacion;
  observaciones?: string | null;
  cliente?: string | null;
  fecha_devolucion?: string | null;
}

// Filtros server-side de OperacionViewSet.get_queryset()
export interface OperacionFiltros {
  tipo_operacion?: TipoOperacion | '';
  estado?: EstadoOperacion | '';
  fecha_operacion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
  page?: number;
  ordering?: string;
}

// ─────────────────────────────────────────────
// DEVOLUCIÓN — tal como la devuelve DevolucionReadSerializer
// ─────────────────────────────────────────────
export interface Devolucion {
  id: number;
  detalle: number;
  operacion_codigo: string;
  producto_nombre: string;
  cantidad_devuelta: number;
  pendiente_restante: number;
  estado_devolucion: EstadoDevolucion;
  fecha_devolucion: string; // 'YYYY-MM-DD'
  observaciones: string | null;
  // Si estado_devolucion === 'dañado', id del registro de Mantenimiento
  // 'pendiente' creado automáticamente para esta devolución.
  mantenimiento_id: number | null;
  // Si estado_devolucion === 'perdido', id de la Perdida (cargo al cliente).
  perdida_id: number | null;
}

// ─────────────────────────────────────────────
// PÉRDIDA — cargo al cliente por producto perdido
// (PerdidaReadSerializer)
// ─────────────────────────────────────────────
export const PERDIDA_ESTADOS: { value: EstadoPerdida; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente de cobro' },
  { value: 'cobrado', label: 'Cobrado' },
  { value: 'condonado', label: 'Condonado' },
];

export interface Perdida {
  perd_id: number;
  estado: EstadoPerdida;
  devolucion: number | null;
  operacion_codigo: string | null;
  producto: number;
  producto_nombre: string;
  producto_codigo: string;
  cliente: string | null;
  cantidad: number;
  valor_unitario: string; // DecimalField → string en JSON
  monto_total: string;
  fecha_registro: string; // 'YYYY-MM-DD'
  fecha_cobro: string | null;
  observaciones: string | null;
  usuario: number;
  usuario_nombre: string;
}

// PATCH /perdidas/{id}/ — solo mientras esté pendiente
export interface PerdidaUpdate {
  valor_unitario?: string | number;
  observaciones?: string | null;
}

export interface PerdidaFiltros {
  estado?: EstadoPerdida | '';
  search?: string;
  page?: number;
  ordering?: string;
}

// Payload de DevolucionWriteSerializer
export interface DevolucionWrite {
  detalle: number;
  cantidad_devuelta: number;
  estado_devolucion: EstadoDevolucion;
  observaciones?: string | null;
}

export interface DevolucionFiltros {
  search?: string;
  page?: number;
  ordering?: string;
}

// Respuesta de las @action finalizar/cancelar: {"detail": "..."}
export interface AccionDetalleResponse {
  detail: string;
}
