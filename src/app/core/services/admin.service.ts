import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import {
  Paginated,
  Recurso,
  RecursoPayload,
  RecursoRol,
  RecursoRolPayload,
  Rol,
  RolPayload,
  Usuario,
  UsuarioRol,
  UsuarioRolPayload,
  UsuarioUpdate,
} from '../../shared/models/admin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // Rutas EXACTAS del backend (mi_proyecto/urls.py + apps/autenticacion/urls.py)
  private usuariosUrl = 'http://localhost:8000/usuarios';
  private authUrl = 'http://localhost:8000/api/auth';

  // Recorre todas las páginas DRF de un endpoint y acumula los results.
  private fetchAll<T>(url: string): Observable<T[]> {
    return this.http.get<Paginated<T>>(url).pipe(
      expand((res) => (res.next ? this.http.get<Paginated<T>>(res.next) : EMPTY)),
      reduce((acc, res) => acc.concat(res.results), [] as T[]),
    );
  }

  // ── USUARIOS ─────────────────────────────────────
  getUsuarios(page = 1, search = ''): Observable<Paginated<Usuario>> {
    let params = new HttpParams().set('page', String(page));
    if (search) params = params.set('search', search);
    return this.http.get<Paginated<Usuario>>(`${this.usuariosUrl}/`, { params });
  }

  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.usuariosUrl}/${id}/`);
  }

  getAllUsuarios(): Observable<Usuario[]> {
    return this.fetchAll<Usuario>(`${this.usuariosUrl}/`);
  }

  // Alta de usuario (solo-admin). Reusa el endpoint de registro del backend.
  crearUsuario(data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Observable<unknown> {
    return this.http.post(`${this.authUrl}/register/`, data);
  }

  updateUsuario(id: number, data: UsuarioUpdate): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.usuariosUrl}/${id}/`, data);
  }

  deleteUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.usuariosUrl}/${id}/`);
  }

  // ── ROLES ────────────────────────────────────────
  getRoles(page = 1): Observable<Paginated<Rol>> {
    const params = new HttpParams().set('page', String(page));
    return this.http.get<Paginated<Rol>>(`${this.authUrl}/roles/`, { params });
  }

  getAllRoles(): Observable<Rol[]> {
    return this.fetchAll<Rol>(`${this.authUrl}/roles/`);
  }

  createRol(data: RolPayload): Observable<Rol> {
    return this.http.post<Rol>(`${this.authUrl}/roles/`, data);
  }

  updateRol(id: number, data: RolPayload): Observable<Rol> {
    return this.http.put<Rol>(`${this.authUrl}/roles/${id}/`, data);
  }

  deleteRol(id: number): Observable<void> {
    return this.http.delete<void>(`${this.authUrl}/roles/${id}/`);
  }

  // ── RECURSOS ─────────────────────────────────────
  getRecursos(page = 1): Observable<Paginated<Recurso>> {
    const params = new HttpParams().set('page', String(page));
    return this.http.get<Paginated<Recurso>>(`${this.authUrl}/recursos/`, { params });
  }

  getAllRecursos(): Observable<Recurso[]> {
    return this.fetchAll<Recurso>(`${this.authUrl}/recursos/`);
  }

  createRecurso(data: RecursoPayload): Observable<Recurso> {
    return this.http.post<Recurso>(`${this.authUrl}/recursos/`, data);
  }

  updateRecurso(id: number, data: RecursoPayload): Observable<Recurso> {
    return this.http.put<Recurso>(`${this.authUrl}/recursos/${id}/`, data);
  }

  deleteRecurso(id: number): Observable<void> {
    return this.http.delete<void>(`${this.authUrl}/recursos/${id}/`);
  }

  // ── ASIGNACIONES ─────────────────────────────────
  // Asignar rol a usuario → POST /api/auth/roles/asignar-rol/ {usuario, rol}
  asignarRolAUsuario(data: UsuarioRolPayload): Observable<UsuarioRol> {
    return this.http.post<UsuarioRol>(`${this.authUrl}/roles/asignar-rol/`, data);
  }

  // Asignar recurso a rol → POST /api/auth/recursos-rol/ {rol, recurso}
  asignarRecursoARol(data: RecursoRolPayload): Observable<RecursoRol> {
    return this.http.post<RecursoRol>(`${this.authUrl}/recursos-rol/`, data);
  }

  // Asignaciones recurso–rol de un rol → GET /api/auth/recursos-rol/{rol_id}/
  getRecursosDeRol(rolId: number, page = 1): Observable<Paginated<RecursoRol>> {
    const params = new HttpParams().set('page', String(page));
    return this.http.get<Paginated<RecursoRol>>(`${this.authUrl}/recursos-rol/${rolId}/`, { params });
  }
}
