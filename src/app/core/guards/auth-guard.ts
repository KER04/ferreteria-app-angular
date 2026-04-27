import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter,map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => {
      if (user !== null) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};