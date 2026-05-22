import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  const token = authService.getToken();
  const isAuthRoute = req.url.includes('/auth/login') || req.url.includes('/auth/register');

  const request = !isAuthRoute && token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        notify.clear();
        authService.logout();
        router.navigateByUrl('/login');
      } else if (error.status === 403) {
        const msg =
          (error.error as { message?: string } | null)?.message ?? 'Недостаточно прав для выполнения операции.';
        notify.error(msg);
      }
      return throwError(() => error);
    })
  );
};
