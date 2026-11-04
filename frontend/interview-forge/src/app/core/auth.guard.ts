import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

/** Requires a signed-in user and sends accounts with a temporary password to the account page. */
export const authGuard: CanActivateChildFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const user = await auth.load();
    if (!user) return router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
    if (user.mustChangePassword && !state.url.startsWith('/account')) return router.createUrlTree(['/account']);
    return true;
  } catch {
    return router.createUrlTree(['/auth']);
  }
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.load())?.isAdmin ? true : router.createUrlTree(['/']);
};
