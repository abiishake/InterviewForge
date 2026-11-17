import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ReferenceDataService } from '../services/reference-data.service';

/** Shared-content writes change the lists that ReferenceDataService caches. Progress and note writes do not (they revalidate). */
const STRUCTURE = /^\/api\/(sections|topics|algorithms|questions|admin)(\/|$)/;
const PERSONAL = /\/(progress|note)$/;

export const cacheInvalidationInterceptor: HttpInterceptorFn = (req, next) => {
  const ref = inject(ReferenceDataService);
  const path = req.url.split('?')[0];
  const mutates = req.method !== 'GET' && req.method !== 'HEAD' && STRUCTURE.test(path) && !PERSONAL.test(path);
  return next(req).pipe(tap((e: HttpEvent<unknown>) => { if (mutates && e instanceof HttpResponse) ref.clear(); }));
};
