// Respuesta paginada estándar de DRF (PageNumberPagination)
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Estados reales del backend (Producto.Estado)
export type ProdEstado = 'Disponible' | 'Prestado' | 'Mantenimiento' | 'Dañado' | 'Agotado';

// Producto.TipoOperacionPermitida (values del backend)
export type TipoOperacion = 'venta' | 'prestamo' | 'mixto';

// Producto tal como lo devuelve ProductoReadSerializer (GET list/retrieve)
export interface Producto {
  prod_id: number;
  prod_nombre: string;
  prod_modelo: string | null;
  descripcion: string | null;
  proveedor: string | null;
  prod_foto: string | null;
  prod_foto_url: string | null;
  codigo_producto: string;
  tipo_operacion_permitida: string;
  prod_valor_unitario: string; // DecimalField → string en JSON
  prod_estado: ProdEstado;
  prod_cantidad_disponible: number;
  prod_cantidad_prestada: number;
  prod_cantidad_en_mantenimiento: number;
  prod_cantidad_total: number;
  prod_stock_minimo: number;
  bajo_stock: boolean;
  tipo_categoria: number;
  tipo_categoria_nombre: string;
  marca: number;
  marca_nombre: string;
  prestamo: number | null;
  prestamo_nombre: string | null;
}

export interface Marca {
  marca_id: number;
  marca_nombre: string;
}

export interface TipoCategoria {
  tipr_id: number;
  tipr_nombre: string;
}

// Cuerpos de escritura (POST/PUT/PATCH) — sin campos read_only
export interface ProductoWrite {
  prod_nombre: string;
  prod_modelo?: string | null;
  descripcion?: string | null;
  proveedor?: string | null;
  tipo_operacion_permitida: TipoOperacion;
  prod_valor_unitario: string | number;
  // prod_estado no se envía: lo deriva/gestiona el backend automáticamente.
  prod_cantidad_disponible: number;
  prod_stock_minimo: number;
  tipo_categoria: number;
  marca: number;
  prestamo?: number | null;
}

export interface MarcaWrite {
  marca_nombre: string;
}

export interface TipoCategoriaWrite {
  tipr_nombre: string;
}

// Filtros comunes de los catálogos (SearchFilter + OrderingFilter + paginación)
export interface CatalogoFiltros {
  search?: string;
  page?: number;
  ordering?: string;
}

// Filtros que acepta GET /api/inventario/productos/
export interface ProductoFiltros {
  marca?: number | '';
  tipo_categoria?: number | '';
  prod_estado?: ProdEstado | '';
  // Disponibilidad real según stock (para la tabla de inventario).
  disponibilidad?: 'disponible' | 'agotado' | '';
  bajo_stock?: boolean;
  search?: string;
  page?: number;
  ordering?: string;
}

// GET /api/inventario/dashboard/
export interface DashboardResumen {
  inventario: {
    total_productos: number;
    agotados: number;
    bajo_stock: number;
    en_mantenimiento: number;
    valor_total_disponible: string;
  };
  operaciones: {
    activas: number;
    finalizadas: number;
    canceladas: number;
  };
}
