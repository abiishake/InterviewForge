import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
export const authGuard:CanActivateChildFn=async (_route,state)=>{
 const auth=inject(AuthService),router=inject(Router);
 try { return await auth.load() ? true : router.createUrlTree(['/auth'],{queryParams:{returnUrl:state.url}}); }
 catch {return router.createUrlTree(['/auth']);}
};
export const adminGuard:CanActivateFn=async ()=>{ const auth=inject(AuthService),router=inject(Router);return (await auth.load())?.isAdmin ? true : router.createUrlTree(['/']); };
