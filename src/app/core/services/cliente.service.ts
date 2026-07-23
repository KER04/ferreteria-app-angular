import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Paginated } from '../../shared/models/producto';
import { Cliente, ClienteFiltros, ClienteWrite } from '../../shared/models/cliente';

/** Convierte un error DRF (400 con dict de campos, 403, detail) en texto legible. */
export function extraerErrorCliente(err: unknown, fallback: string): string {
  const e = err as HttpErrorResponse;
  if (e?.status === 403) return 'No tienes permisos para esta acción.';
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
export class ClienteService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/clientes`;

  getClientes(filtros: ClienteFiltros = {}): Observable<Paginated<Cliente>> {
    let params = new HttpParams();
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.activo !== undefined && filtros.activo !== '') {
      params = params.set('activo', String(filtros.activo));
    }
    if (filtros.page) params = params.set('page', String(filtros.page));
    if (filtros.ordering) params = params.set('ordering', filtros.ordering);
    return this.http.get<Paginated<Cliente>>(`${this.baseUrl}/`, { params });
  }

  getCliente(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.baseUrl}/${id}/`);
  }

  createCliente(body: ClienteWrite): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.baseUrl}/`, body);
  }

  updateCliente(id: number, body: Partial<ClienteWrite>): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.baseUrl}/${id}/`, body);
  }

  // DELETE es borrado suave en el backend (marca activo=false).
  desactivarCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`);
  }

  reactivarCliente(id: number): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.baseUrl}/${id}/`, { activo: true });
  }
}
