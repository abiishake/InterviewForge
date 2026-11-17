import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { SKIP_ERROR_TOAST } from './http-context';

/** Normalises API errors ({ error: { code, message, details } }) and surfaces non-validation failures as toasts. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const auth = inject(AuthService);
  if (req.url.startsWith('/api/') && !['GET', 'HEAD'].includes(req.method)) req = req.clone({ setHeaders: { 'X-InterviewForge': '1' } });
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const apiError: ApiError = err.error?.error ?? { code: 'NETWORK_ERROR', message: err.status === 0 ? 'Cannot reach the server.' : err.message };
      if (err.status === 401 && !req.url.includes('/auth/')) {
        auth.clear(true);
        router.navigate(['/auth'], { queryParams: { returnUrl: router.url }, replaceUrl: true });
        return throwError(() => apiError);
      }
      if (err.status === 403 && apiError.code === 'PASSWORD_CHANGE_REQUIRED') {
        void auth.refresh().then(() => router.navigate(['/account']));
      }
      if (apiError.code !== 'VALIDATION_FAILED' && err.status !== 404 && !req.context.get(SKIP_ERROR_TOAST)) toast.show(apiError.message, 'error', 5000);
      return throwError(() => apiError);
    })
  );
};
