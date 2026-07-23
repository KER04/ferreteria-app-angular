import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EMPTY, Observable } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import {
  AccionDetalleResponse,
  DetalleOperacion,
  Devolucion,
  EstadoPerdida,
  DevolucionFiltros,
  DevolucionWrite,
  Operacion,
  OperacionCabeceraPatch,
  OperacionFiltros,
  OperacionWrite,
  Paginated,
  Perdida,
  PerdidaFiltros,
  PerdidaUpdate,
} from '../../shared/models/operacion';

@Injectable({ providedIn: 'root' })
export class OperacionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/operaciones`;

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

  // POST /operaciones/{id}/cancelar/ (@action cancelar)
  cancelarOperacion(id: number): Observable<AccionDetalleResponse> {
    return this.http.post<AccionDetalleResponse>(`${this.baseUrl}/operaciones/${id}/cancelar/`, {});
  }

  // GET /operaciones/vencidos/ (@action vencidos): préstamos activos con fecha vencida
  getVencidos(page = 1): Observable<Paginated<Operacion>> {
    const params = new HttpParams().set('page', String(page));
    return this.http.get<Paginated<Operacion>>(`${this.baseUrl}/operaciones/vencidos/`, { params });
  }

  // Resumen de las ventas de una fecha (recorre todas las páginas para el total).
  // `fecha` en formato YYYY-MM-DD (local). Devuelve nº de ventas + valor total.
  getVentasResumen(fecha: string): Observable<{ count: number; total: number }> {
    return this.getOperaciones({ tipo_operacion: 'venta', fecha_operacion: fecha, page: 1 }).pipe(
      expand((r) => (r.next ? this.http.get<Paginated<Operacion>>(r.next) : EMPTY)),
      reduce(
        (acc, r) => {
          acc.count = r.count;
          for (const o of r.results) acc.total += Number(o.total || 0);
          return acc;
        },
        { count: 0, total: 0 },
      ),
    );
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

  // ── PÉRDIDAS (cargos al cliente) ─────────────────

  getPerdidas(filtros: PerdidaFiltros = {}): Observable<Paginated<Perdida>> {
    let params = new HttpParams();
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);
    return this.http.get<Paginated<Perdida>>(`${this.baseUrl}/perdidas/`, { params });
  }

  // PATCH /perdidas/{id}/ — ajusta valor / notas mientras esté pendiente
  updatePerdida(id: number, payload: PerdidaUpdate): Observable<Perdida> {
    return this.http.patch<Perdida>(`${this.baseUrl}/perdidas/${id}/`, payload);
  }

  // POST /perdidas/{id}/cobrar/ — marca el cargo como cobrado
  cobrarPerdida(id: number): Observable<Perdida> {
    return this.http.post<Perdida>(`${this.baseUrl}/perdidas/${id}/cobrar/`, {});
  }

  // POST /perdidas/{id}/condonar/ — perdona el cargo
  condonarPerdida(id: number): Observable<Perdida> {
    return this.http.post<Perdida>(`${this.baseUrl}/perdidas/${id}/condonar/`, {});
  }

  // Suma el monto de TODOS los cargos de un estado (recorre las páginas DRF)
  // para los KPIs de "$ pendiente de cobro" y "$ cobrado".
  getTotalPorEstado(estado: EstadoPerdida): Observable<{ count: number; monto: number }> {
    return this.getPerdidas({ estado, page: 1 }).pipe(
      expand((res) => (res.next ? this.http.get<Paginated<Perdida>>(res.next) : EMPTY)),
      reduce(
        (acc, res) => {
          acc.count = res.count;
          for (const p of res.results) acc.monto += Number(p.monto_total);
          return acc;
        },
        { count: 0, monto: 0 },
      ),
    );
  }
}
