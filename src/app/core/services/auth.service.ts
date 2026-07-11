import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, map, finalize, BehaviorSubject } from 'rxjs';
import {
  LoginI,
  LoginResponseI,
  RefreshResponseI,
  RegisterI,
  RegisterResponseI,
  UserI,
} from '../../shared/models/auth';

const ACCESS_KEY = 'ferretex_access';
const REFRESH_KEY = 'ferretex_refresh';
const USER_KEY = 'ferretex_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:8000/api/auth';

  private readonly ADMIN_ROLES = ['administrador', 'admin'];

  // Estado del usuario actual (undefined = aún no verificado)
  private userSubject = new BehaviorSubject<UserI | null | undefined>(undefined);
  public user$ = this.userSubject.asObservable();

  // ¿El usuario actual es administrador? (observable para el menú)
  public isAdmin$ = this.user$.pipe(map((u) => this.esAdmin(u)));

  constructor(private http: HttpClient) {
    const token = this.getAccessToken();
    if (token) {
      // Restauramos la sesión persistida de inmediato: así, al recargar, el guard
      // NO redirige al login mientras validamos el token contra el backend.
      const stored = this.getStoredUser();
      if (stored) this.userSubject.next(stored);

      // Validamos en segundo plano (diferido para no re-inyectar el servicio a
      // medio construir a través del interceptor).
      Promise.resolve().then(() => this.checkSession());
    } else {
      this.userSubject.next(null);
    }
  }

  // ── Tokens / usuario persistido ─────────────────────────
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private storeTokens(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  }

  private storeUser(user: UserI): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSubject.next(user);
  }

  private getStoredUser(): UserI | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserI) : null;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
  }

  // ── Sesión ──────────────────────────────────────────────
  // Valida el token actual contra /me/. Solo cierra la sesión ante un fallo de
  // autenticación real (401/403); ante errores de red mantiene la sesión.
  checkSession(): void {
    this.http.get<{ user: UserI }>(`${this.baseUrl}/me/`).subscribe({
      next: (response) => this.storeUser(response.user),
      error: (err: HttpErrorResponse) => {
        if (err?.status === 401 || err?.status === 403) {
          this.clearSession();
        } else if (this.userSubject.value === undefined) {
          // No había sesión restaurada y no se pudo validar → sin sesión.
          this.userSubject.next(null);
        }
        // Otros errores (red/servidor caído) con sesión restaurada: la mantenemos.
      },
    });
  }

  login(credentials: LoginI): Observable<LoginResponseI> {
    return this.http.post<LoginResponseI>(`${this.baseUrl}/login/`, credentials).pipe(
      tap((response) => {
        this.storeTokens(response.access, response.refresh);
        this.storeUser(response.user);
      })
    );
  }

  register(userData: RegisterI): Observable<RegisterResponseI> {
    return this.http.post<RegisterResponseI>(`${this.baseUrl}/register/`, userData);
  }

  // Renueva el access token usando el refresh (usado por el interceptor en 401)
  refreshToken(): Observable<string> {
    const refresh = this.getRefreshToken();
    return this.http
      .post<RefreshResponseI>(`${this.baseUrl}/token/refresh/`, { refresh })
      .pipe(
        tap((res) => this.storeTokens(res.access)),
        map((res) => res.access)
      );
  }

  logout(): Observable<unknown> {
    const refresh = this.getRefreshToken();
    return this.http.post(`${this.baseUrl}/logout/`, { refresh }).pipe(
      finalize(() => this.clearSession())
    );
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null && this.userSubject.value !== undefined;
  }

  private esAdmin(user: UserI | null | undefined): boolean {
    return !!user?.roles?.some((r) => this.ADMIN_ROLES.includes(r.toLowerCase()));
  }

  isAdmin(): boolean {
    return this.esAdmin(this.userSubject.value);
  }

  getCurrentUser(): UserI | null {
    return this.userSubject.value ?? null;
  }
}
