import { DestroyRef, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

/**
 * Runs requests so that only the most recent one can deliver a result: starting a new one cancels the
 * previous one, so a slow earlier response can never overwrite newer data. Must be created in an
 * injection context (field initialiser or constructor); it cancels on destroy.
 */
export function createLatest(): <T>(source: Observable<T>, handlers: { next?: (v: T) => void; error?: (e: unknown) => void }) => void {
  let sub: Subscription | undefined;
  inject(DestroyRef).onDestroy(() => sub?.unsubscribe());
  return (source, handlers) => {
    sub?.unsubscribe();
    sub = source.subscribe(handlers);
  };
}
