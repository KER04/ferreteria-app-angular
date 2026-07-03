import { Paginated } from './producto';

// Re-export para que los componentes del módulo operaciones
// no dependan directamente del modelo de producto.
export type { Paginated };

// ── Choices reales del backend (apps/operaciones/models.py) ──
export type TipoOperacion = 'venta' | 'prestamo';
export type EstadoOperacion = 'activa' | 'finalizada' | 'cancelada';
export type EstadoDevolucion = 'bueno' | 'dañado' | 'perdido';

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
export interface Operacion {
  id: number;
  codigo_operacion: string;
  tipo_operacion: TipoOperacion;
  estado: EstadoOperacion;
  usuario: number;
  usuario_nombre: string;
  cliente: string | null;
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
  cliente?: string | null;
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
