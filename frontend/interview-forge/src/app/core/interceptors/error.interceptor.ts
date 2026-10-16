import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models';
import { ToastService } from '../services/toast.service';

/** Normalises API errors ({ error: { code, message, details } }) and surfaces non-validation failures as toasts. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  if (req.url.startsWith('/api/') && !['GET','HEAD'].includes(req.method)) req=req.clone({setHeaders:{'X-InterviewForge':'1'}});
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status===401 && !req.url.includes('/auth/')) router.navigate(['/auth'], {queryParams:{returnUrl:router.url},replaceUrl:true});
      const apiError: ApiError = err.error?.error ?? { code: 'NETWORK_ERROR', message: err.status === 0 ? 'Cannot reach the server.' : err.message };
      if (apiError.code !== 'VALIDATION_FAILED' && err.status !== 404) toast.show(apiError.message, 'error', 5000);
      return throwError(() => apiError);
    })
  );
};
