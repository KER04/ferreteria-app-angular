import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:8000/api/auth';

  // Estado del usuario actual (undefined = aún no verificado)
  private userSubject = new BehaviorSubject<UserI | null | undefined>(undefined);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    // Solo intentamos validar la sesión si hay un token guardado.
    if (this.getAccessToken()) {
      this.checkSession();
    } else {
      this.userSubject.next(null);
    }
  }

  // ── Tokens ──────────────────────────────────────────────
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

  clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.userSubject.next(null);
  }

  // ── Sesión ──────────────────────────────────────────────
  // Verifica el token actual contra /me/ (el interceptor añade el Bearer)
  checkSession(): void {
    this.http.get<{ user: UserI }>(`${this.baseUrl}/me/`).subscribe({
      next: (response) => this.userSubject.next(response.user),
      error: () => this.clearSession(),
    });
  }

  login(credentials: LoginI): Observable<LoginResponseI> {
    return this.http.post<LoginResponseI>(`${this.baseUrl}/login/`, credentials).pipe(
      tap((response) => {
        this.storeTokens(response.access, response.refresh);
        this.userSubject.next(response.user);
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

  getCurrentUser(): UserI | null {
    return this.userSubject.value ?? null;
  }
}
