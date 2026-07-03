import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AccionDetalleResponse,
  DetalleOperacion,
  Devolucion,
  DevolucionFiltros,
  DevolucionWrite,
  Operacion,
  OperacionCabeceraPatch,
  OperacionFiltros,
  OperacionWrite,
  Paginated,
} from '../../shared/models/operacion';

@Injectable({ providedIn: 'root' })
export class OperacionService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/operaciones';

  // ── OPERACIONES ──────────────────────────────────

  getOperaciones(filtros: OperacionFiltros = {}): Observable<Paginated<Operacion>> {
    let params = new HttpParams();

    if (filtros.tipo_operacion) params = params.set('tipo_operacion', filtros.tipo_operacion);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.fecha_operacion) params = params.set('fecha_operacion', filtros.fecha_operacion);
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);

    return this.http.get<Paginated<Operacion>>(`${this.baseUrl}/operaciones/`, { params });
  }

  getOperacion(id: number): Observable<Operacion> {
    return this.http.get<Operacion>(`${this.baseUrl}/operaciones/${id}/`);
  }

  // GET /operaciones/{id}/detalles/ (@action detalles)
  getDetalles(operacionId: number): Observable<DetalleOperacion[]> {
    return this.http.get<DetalleOperacion[]>(`${this.baseUrl}/operaciones/${operacionId}/detalles/`);
  }

  createOperacion(payload: OperacionWrite): Observable<Operacion> {
    return this.http.post<Operacion>(`${this.baseUrl}/operaciones/`, payload);
  }

  // Solo cabecera: estado, observaciones, cliente, fecha_devolucion
  updateCabecera(id: number, payload: OperacionCabeceraPatch): Observable<Operacion> {
    return this.http.patch<Operacion>(`${this.baseUrl}/operaciones/${id}/`, payload);
  }

  deleteOperacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/operaciones/${id}/`);
  }

  // POST /operaciones/{id}/finalizar/ (@action finalizar)
  finalizarOperacion(id: number): Observable<AccionDetalleResponse> {
    return this.http.post<AccionDetalleResponse>(`${this.baseUrl}/operaciones/${id}/finalizar/`, {});
  }

  // POST /operaciones/{id}/cancelar/ (@action cancelar)
  cancelarOperacion(id: number): Observable<AccionDetalleResponse> {
    return this.http.post<AccionDetalleResponse>(`${this.baseUrl}/operaciones/${id}/cancelar/`, {});
  }

  // GET /operaciones/vencidos/ (@action vencidos): préstamos activos con fecha vencida
  getVencidos(page = 1): Observable<Paginated<Operacion>> {
    const params = new HttpParams().set('page', String(page));
    return this.http.get<Paginated<Operacion>>(`${this.baseUrl}/operaciones/vencidos/`, { params });
  }

  // ── DEVOLUCIONES ─────────────────────────────────

  getDevoluciones(filtros: DevolucionFiltros = {}): Observable<Paginated<Devolucion>> {
    let params = new HttpParams();

    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);

    return this.http.get<Paginated<Devolucion>>(`${this.baseUrl}/devoluciones/`, { params });
  }

  createDevolucion(payload: DevolucionWrite): Observable<Devolucion> {
    return this.http.post<Devolucion>(`${this.baseUrl}/devoluciones/`, payload);
  }
}
