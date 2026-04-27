import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { LoginI, LoginResponseI, RegisterI, RegisterResponseI, UserI } from '../../shared/models/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:8000/api/auth';

  // Guarda el estado del usuario actual
  private userSubject = new BehaviorSubject<UserI | null | undefined>(undefined);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkSession(); // ← verifica la cookie al arrancar la app
  }

  // Llama al backend para ver si la cookie sigue válida
  checkSession(): void {
    this.http.get<{ message: string, user: UserI }>(
      `${this.baseUrl}/hello/`,
      { withCredentials: true }
    ).subscribe({
      next: (response) => this.userSubject.next(response.user), // ← lee response.user
      error: () => this.userSubject.next(null)
    });
  }

  login(credentials: LoginI): Observable<LoginResponseI> {
    return this.http.post<LoginResponseI>(
      `${this.baseUrl}/login/`,
      credentials,
      { withCredentials: true } // ← recibe las cookies httpOnly
    ).pipe(
      tap(response => {
        // Guardamos el usuario en memoria (no el token, ese va en cookie)
        this.userSubject.next(response.user);
      })
    );
  }

  register(userData: RegisterI): Observable<RegisterResponseI> {
    return this.http.post<RegisterResponseI>(
      `${this.baseUrl}/register/`,
      userData,
      { withCredentials: true }
    );
  }

  logout(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/logout/`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.userSubject.next(null))
    );
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null && this.userSubject.value !== undefined;
  }

  getCurrentUser(): UserI | null {
  return this.userSubject.value ?? null;
}
}