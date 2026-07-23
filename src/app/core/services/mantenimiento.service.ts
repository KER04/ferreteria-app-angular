import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EMPTY, Observable } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import { Paginated, Producto } from '../../shared/models/producto';
import {
  Costo,
  FinalizarPayload,
  MantCatalogoFiltros,
  Mantenimiento,
  MantenimientoCompletarPayload,
  MantenimientoUpdate,
  MantenimientoWrite,
  RegistroFiltros,
  SalidaMantenimiento,
  TipoMantenimiento,
  TipoMantenimientoWrite,
} from '../../shared/models/mantenimiento';

/**
 * Convierte un HttpErrorResponse de DRF en un mensaje legible.
 * 403 → falta de rol admin (IsAdminOrReadOnly en tipos/costos).
 * 400 → concatena los errores de campo / detail del serializer.
 */
export function extraerErrorHttp(err: unknown, fallback: string): string {
  const e = err as HttpErrorResponse;
  if (e?.status === 403) {
    return 'No tienes permisos para esta acción (se requiere rol administrador).';
  }
  const body = e?.error;
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return body.detail;
    const msgs: string[] = [];
    for (const [campo, val] of Object.entries(body)) {
      const texto = Array.isArray(val) ? val.join(' ') : typeof val === 'string' ? val : '';
      if (!texto) continue;
      msgs.push(campo === 'non_field_errors' ? texto : `${campo}: ${texto}`);
    }
    if (msgs.length) return msgs.join(' — ');
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/mantenimiento`;
  private productosUrl = `${environment.apiUrl}/inventario/productos/`;

  // ── helper: recorre todas las páginas DRF de un endpoint ──
  private fetchAll<T>(url: string, params?: HttpParams): Observable<T[]> {
    return this.http.get<Paginated<T>>(url, { params }).pipe(
      expand((res) => (res.next ? this.http.get<Paginated<T>>(res.next) : EMPTY)),
      reduce((acc, res) => acc.concat(res.results), [] as T[]),
    );
  }

  // ─────────────────────────────────────────────
  // REGISTROS  (/registros/)
  // ─────────────────────────────────────────────
  getRegistros(filtros: RegistroFiltros = {}): Observable<Paginated<Mantenimiento>> {
    let params = new HttpParams();
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.producto) params = params.set('producto', String(filtros.producto));
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);
    return this.http.get<Paginated<Mantenimiento>>(`${this.baseUrl}/registros/`, { params });
  }

  getRegistrosEnProceso(): Observable<Mantenimiento[]> {
    const params = new HttpParams().set('estado', 'en_proceso');
    return this.fetchAll<Mantenimiento>(`${this.baseUrl}/registros/`, params);
  }

  getAllRegistros(): Observable<Mantenimiento[]> {
    return this.fetchAll<Mantenimiento>(`${this.baseUrl}/registros/`);
  }

  getAllSalidas(): Observable<SalidaMantenimiento[]> {
    return this.fetchAll<SalidaMantenimiento>(`${this.baseUrl}/salidas/`);
  }

  createRegistro(body: MantenimientoWrite): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.baseUrl}/registros/`, body);
  }

  updateRegistro(id: number, body: MantenimientoUpdate): Observable<Mantenimiento> {
    return this.http.patch<Mantenimiento>(`${this.baseUrl}/registros/${id}/`, body);
  }

  deleteRegistro(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/registros/${id}/`);
  }

  // POST /registros/{id}/finalizar/ — registra la salida y cierra el mantenimiento
  finalizarRegistro(id: number, body: FinalizarPayload): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.baseUrl}/registros/${id}/finalizar/`, body);
  }

  // POST /registros/{id}/cancelar/ — devuelve el stock retenido
  cancelarRegistro(id: number): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.baseUrl}/registros/${id}/cancelar/`, {});
  }

  // POST /registros/{id}/completar/ — completa un registro 'pendiente'
  // (creado por una devolución dañada) con el tipo real y lo pasa a 'en_proceso'
  completarRegistro(id: number, body: MantenimientoCompletarPayload): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.baseUrl}/registros/${id}/completar/`, body);
  }

  // ─────────────────────────────────────────────
  // TIPOS  (/tipos/)
  // ─────────────────────────────────────────────
  getTipos(filtros: MantCatalogoFiltros = {}): Observable<Paginated<TipoMantenimiento>> {
    let params = new HttpParams();
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    return this.http.get<Paginated<TipoMantenimiento>>(`${this.baseUrl}/tipos/`, { params });
  }

  getAllTipos(): Observable<TipoMantenimiento[]> {
    return this.fetchAll<TipoMantenimiento>(`${this.baseUrl}/tipos/`);
  }

  createTipo(body: TipoMantenimientoWrite): Observable<TipoMantenimiento> {
    return this.http.post<TipoMantenimiento>(`${this.baseUrl}/tipos/`, body);
  }

  updateTipo(id: number, body: TipoMantenimientoWrite): Observable<TipoMantenimiento> {
    return this.http.patch<TipoMantenimiento>(`${this.baseUrl}/tipos/${id}/`, body);
  }

  deleteTipo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tipos/${id}/`);
  }

  // ─────────────────────────────────────────────
  // COSTOS  (/costos/) — solo lectura; los costos se crean/editan
  // desde el propio registro de mantenimiento.
  // ─────────────────────────────────────────────
  getAllCostos(): Observable<Costo[]> {
    return this.fetchAll<Costo>(`${this.baseUrl}/costos/`);
  }

  // ─────────────────────────────────────────────
  // SALIDAS  (/salidas/ — solo lectura en el backend;
  // se crean vía POST /registros/{id}/finalizar/)
  // ─────────────────────────────────────────────
  getSalidas(filtros: MantCatalogoFiltros = {}): Observable<Paginated<SalidaMantenimiento>> {
    let params = new HttpParams();
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);
    return this.http.get<Paginated<SalidaMantenimiento>>(`${this.baseUrl}/salidas/`, { params });
  }

  // ── Productos para selects (endpoint de inventario) ──
  getAllProductos(): Observable<Producto[]> {
    return this.fetchAll<Producto>(this.productosUrl);
  }
}
