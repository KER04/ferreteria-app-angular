import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs';

// Permite el acceso solo a administradores. Si no lo es, redirige al dashboard.
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    filter((user) => user !== undefined),
    take(1),
    map((user) => {
      const roles = user?.roles ?? [];
      if (roles.some((r) => ['administrador', 'admin'].includes(r.toLowerCase()))) return true;
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
