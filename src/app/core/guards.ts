import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from './models';
import { NotificationService } from './notification.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/booking']);
  }
  return true;
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  const allowedRoles = (route.data['roles'] as UserRole[]) ?? [];
  if (!auth.hasRole(allowedRoles)) {
    notify.error('Недостаточно прав для доступа к этому разделу.');
    return router.createUrlTree(['/booking']);
  }
  return true;
};
