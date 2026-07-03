// Modelos del módulo MANTENIMIENTO — derivados 1:1 de
// apps/mantenimiento/{models.py,serializers.py} del backend Django.

// Choices reales de Mantenimiento.Estado (values del backend)
export type MantEstado = 'en_proceso' | 'finalizado' | 'cancelado';

export const MANT_ESTADOS: { value: MantEstado; label: string }[] = [
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
];

// ── COSTO (CostoSerializer) ──────────────────────────
export interface Costo {
  cost_id: number;
  cost_total: string; // DecimalField → string en JSON
  cost_partes_afectadas: string | null;
  cost_fecha_pago: string | null; // YYYY-MM-DD
}

export interface CostoWrite {
  cost_total: string | number;
  cost_partes_afectadas?: string | null;
  cost_fecha_pago?: string | null;
}

// ── TIPO MANTENIMIENTO (TipoMantenimientoSerializer) ──
export interface TipoMantenimiento {
  tima_id: number;
  tima_nombre: string;
}

export interface TipoMantenimientoWrite {
  tima_nombre: string;
}

// ── SALIDA (SalidaReadSerializer) ─────────────────────
export interface SalidaMantenimiento {
  id: number;
  mantenimiento: number;
  fecha_salida: string;
  cantidad_recuperada: number;
  cantidad_baja: number;
  observaciones: string | null;
  costo: number | null;
  costo_info: Costo | null;
}

// Cuerpo de POST /registros/{id}/finalizar/ (SalidaWriteSerializer,
// el campo `mantenimiento` lo inyecta el backend desde la URL)
export interface FinalizarPayload {
  cantidad_recuperada: number;
  cantidad_baja?: number;
  observaciones?: string | null;
  costo?: number | null;
}

// ── MANTENIMIENTO / REGISTRO (MantenimientoReadSerializer) ──
export interface Mantenimiento {
  mant_id: number;
  estado: MantEstado;
  producto: number;
  producto_nombre: string;
  producto_codigo: string;
  tipo_mantenimiento: number;
  tipo_mantenimiento_nombre: string;
  cantidad_ingresada: number;
  cantidad_recuperada: number;
  cantidad_baja: number;
  cantidad_pendiente: number;
  mant_descripcion: string | null;
  fecha_ingreso: string;
  fecha_salida: string | null;
  usuario: number;
  usuario_nombre: string;
  costo: number | null;
  costo_info: Costo | null;
  salida: SalidaMantenimiento | null;
}

// Cuerpo de POST /registros/ (MantenimientoWriteSerializer;
// `usuario` lo pone el backend desde el token — no se envía)
export interface MantenimientoWrite {
  producto: number;
  tipo_mantenimiento: number;
  cantidad_ingresada: number;
  mant_descripcion?: string | null;
  costo?: number | null;
}

// PATCH /registros/{id}/ — el backend solo acepta estos campos
// mientras el registro está en proceso.
export interface MantenimientoUpdate {
  mant_descripcion?: string | null;
  costo?: number | null;
}

// ── Filtros ───────────────────────────────────────────
export interface RegistroFiltros {
  estado?: MantEstado | '';
  producto?: number | '';
  search?: string;
  page?: number;
  ordering?: string;
}

export interface MantCatalogoFiltros {
  search?: string;
  page?: number;
  ordering?: string;
}
