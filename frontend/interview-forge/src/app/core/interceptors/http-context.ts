import { HttpContextToken } from '@angular/common/http';

/** Set on a request whose caller shows its own error UI, so the global interceptor does not toast as well. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
