import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Endpoints de autenticación que NO deben llevar el Bearer ni disparar refresh.
// (El registro ya NO va aquí: ahora es solo-admin y requiere el token.)
const AUTH_URLS = ['/api/auth/login', '/api/auth/token/refresh'];

function isAuthUrl(url: string): boolean {
  return AUTH_URLS.some((u) => url.includes(u));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq =
    token && !isAuthUrl(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el access expiró, intentamos renovar una sola vez y reintentar.
      if (error.status === 401 && !isAuthUrl(req.url) && auth.getRefreshToken()) {
        return auth.refreshToken().pipe(
          switchMap((newAccess) =>
            next(authReq.clone({ setHeaders: { Authorization: `Bearer ${newAccess}` } }))
          ),
          catchError((refreshError) => {
            auth.clearSession();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
