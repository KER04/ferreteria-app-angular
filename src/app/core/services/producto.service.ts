import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import {
  CatalogoFiltros,
  DashboardResumen,
  Marca,
  MarcaWrite,
  Paginated,
  Prestamo,
  PrestamoWrite,
  Producto,
  ProductoFiltros,
  ProductoWrite,
  TipoCategoria,
  TipoCategoriaWrite,
} from '../../shared/models/producto';

/**
 * Convierte el error HTTP de DRF en un mensaje legible.
 * Uso compartido por los componentes CRUD de inventario.
 */
export function extraerErrorApi(err: any, fallback = 'Ocurrió un error. Intenta de nuevo.'): string {
  if (err?.status === 403) {
    return 'No tienes permisos para realizar esta acción (se requiere rol administrador).';
  }
  if (err?.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
  }
  const e = err?.error;
  if (e && typeof e === 'object') {
    const msgs: string[] = [];
    for (const [campo, valor] of Object.entries(e)) {
      const texto = Array.isArray(valor) ? valor.join(' ') : String(valor);
      msgs.push(campo === 'detail' || campo === 'non_field_errors' ? texto : `${campo}: ${texto}`);
    }
    if (msgs.length) return msgs.join(' — ');
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/inventario';

  // ── Helpers ──────────────────────────────────────────────
  private catalogoParams(filtros: CatalogoFiltros = {}): HttpParams {
    let params = new HttpParams();
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);
    return params;
  }

  /** Recorre todas las páginas de un endpoint paginado de DRF y acumula results. */
  private getTodos<T>(url: string): Observable<T[]> {
    return this.http.get<Paginated<T>>(url).pipe(
      expand((res) => (res.next ? this.http.get<Paginated<T>>(res.next) : EMPTY)),
      reduce((acc, res) => acc.concat(res.results), [] as T[]),
    );
  }

  /**
   * Cuerpo de escritura de Producto: FormData si hay foto (ImageField),
   * JSON plano si no la hay.
   */
  private productoBody(data: ProductoWrite, foto?: File | null): ProductoWrite | FormData {
    if (!foto) return data;
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      fd.append(k, v === null || v === undefined ? '' : String(v));
    });
    fd.append('prod_foto', foto, foto.name);
    return fd;
  }

  // ── PRODUCTOS ────────────────────────────────────────────
  getProductos(filtros: ProductoFiltros = {}): Observable<Paginated<Producto>> {
    let params = new HttpParams();

    if (filtros.marca) params = params.set('marca', String(filtros.marca));
    if (filtros.tipo_categoria) params = params.set('tipo_categoria', String(filtros.tipo_categoria));
    if (filtros.prod_estado) params = params.set('prod_estado', filtros.prod_estado);
    if (filtros.bajo_stock) params = params.set('bajo_stock', 'true');
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);

    return this.http.get<Paginated<Producto>>(`${this.baseUrl}/productos/`, { params });
  }

  createProducto(data: ProductoWrite, foto?: File | null): Observable<Producto> {
    return this.http.post<Producto>(`${this.baseUrl}/productos/`, this.productoBody(data, foto));
  }

  updateProducto(id: number, data: ProductoWrite, foto?: File | null): Observable<Producto> {
    return this.http.patch<Producto>(`${this.baseUrl}/productos/${id}/`, this.productoBody(data, foto));
  }

  deleteProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/productos/${id}/`);
  }

  // ── MARCAS ───────────────────────────────────────────────
  getMarcas(filtros: CatalogoFiltros = {}): Observable<Paginated<Marca>> {
    return this.http.get<Paginated<Marca>>(`${this.baseUrl}/marcas/`, {
      params: this.catalogoParams(filtros),
    });
  }

  getTodasMarcas(): Observable<Marca[]> {
    return this.getTodos<Marca>(`${this.baseUrl}/marcas/`);
  }

  createMarca(data: MarcaWrite): Observable<Marca> {
    return this.http.post<Marca>(`${this.baseUrl}/marcas/`, data);
  }

  updateMarca(id: number, data: MarcaWrite): Observable<Marca> {
    return this.http.put<Marca>(`${this.baseUrl}/marcas/${id}/`, data);
  }

  deleteMarca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/marcas/${id}/`);
  }

  // ── TIPO CATEGORÍA ───────────────────────────────────────
  getCategorias(filtros: CatalogoFiltros = {}): Observable<Paginated<TipoCategoria>> {
    return this.http.get<Paginated<TipoCategoria>>(`${this.baseUrl}/tipo-categoria/`, {
      params: this.catalogoParams(filtros),
    });
  }

  getTodasCategorias(): Observable<TipoCategoria[]> {
    return this.getTodos<TipoCategoria>(`${this.baseUrl}/tipo-categoria/`);
  }

  createCategoria(data: TipoCategoriaWrite): Observable<TipoCategoria> {
    return this.http.post<TipoCategoria>(`${this.baseUrl}/tipo-categoria/`, data);
  }

  updateCategoria(id: number, data: TipoCategoriaWrite): Observable<TipoCategoria> {
    return this.http.put<TipoCategoria>(`${this.baseUrl}/tipo-categoria/${id}/`, data);
  }

  deleteCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tipo-categoria/${id}/`);
  }

  // ── PRÉSTAMOS ────────────────────────────────────────────
  getPrestamos(filtros: CatalogoFiltros = {}): Observable<Paginated<Prestamo>> {
    return this.http.get<Paginated<Prestamo>>(`${this.baseUrl}/prestamos/`, {
      params: this.catalogoParams(filtros),
    });
  }

  getTodosPrestamos(): Observable<Prestamo[]> {
    return this.getTodos<Prestamo>(`${this.baseUrl}/prestamos/`);
  }

  createPrestamo(data: PrestamoWrite): Observable<Prestamo> {
    return this.http.post<Prestamo>(`${this.baseUrl}/prestamos/`, data);
  }

  updatePrestamo(id: number, data: PrestamoWrite): Observable<Prestamo> {
    return this.http.put<Prestamo>(`${this.baseUrl}/prestamos/${id}/`, data);
  }

  deletePrestamo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/prestamos/${id}/`);
  }

  // ── DASHBOARD ────────────────────────────────────────────
  getDashboard(): Observable<DashboardResumen> {
    return this.http.get<DashboardResumen>(`${this.baseUrl}/dashboard/`);
  }
}
