// Modelos del módulo CLIENTES — derivados de apps/clientes/{models.py,serializers.py}.

export type TipoDocumento = 'CC' | 'CE' | 'PAS';

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PAS', label: 'Pasaporte' },
];

// ── CLIENTE (ClienteSerializer) ──────────────────────
export interface Cliente {
  cliente_id: number;
  tipo_documento: TipoDocumento;
  tipo_documento_display: string;
  numero_documento: string;
  nombre: string;
  telefono: string;
  direccion: string | null;
  correo: string | null;
  observaciones: string | null;
  activo: boolean;
  fecha_registro: string; // YYYY-MM-DD
  // True si tiene dirección → se le puede prestar.
  puede_prestar: boolean;
}

// Cuerpo de POST/PATCH /clientes/
export interface ClienteWrite {
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombre: string;
  telefono: string;
  direccion?: string | null;
  correo?: string | null;
  observaciones?: string | null;
  activo?: boolean;
}

export interface ClienteFiltros {
  search?: string;
  activo?: boolean | '';
  page?: number;
  ordering?: string;
}
