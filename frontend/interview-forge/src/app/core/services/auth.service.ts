import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Account } from '../models';
import { ReferenceDataService } from './reference-data.service';

function detectTimeZone(): string | undefined {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private reference = inject(ReferenceDataService);
  readonly user = signal<Account | null>(null);
  /** Set when a request returned 401 while signed in, so the sign-in page can explain it. */
  readonly sessionExpired = signal(false);
  private loaded = false;

  async load(): Promise<Account | null> {
    if (!this.loaded) {
      const res = await firstValueFrom(this.http.get<{ user: Account | null }>('/api/auth/me'));
      this.user.set(res.user);
      this.loaded = true;
    }
    return this.user();
  }

  /** Forgets the cached user so the next guard run re-validates against the server. */
  clear(expired = false): void {
    if (expired && this.user()) this.sessionExpired.set(true);
    this.user.set(null);
    this.loaded = false;
    this.reference.clear();
  }

  async refresh(): Promise<Account | null> {
    this.loaded = false;
    return this.load();
  }

  async registrationOpen(): Promise<boolean> {
    try { return (await firstValueFrom(this.http.get<{ registrationOpen: boolean }>('/api/auth/config'))).registrationOpen; } catch { return true; }
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<{ user: Account }>('/api/auth/login', { username, password, timeZone: detectTimeZone() }));
    this.reference.clear();
    this.user.set(res.user); this.loaded = true; this.sessionExpired.set(false);
  }

  async register(username: string, name: string, email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<{ user: Account }>('/api/auth/register', { username, name, email, password, timeZone: detectTimeZone() }));
    this.reference.clear();
    this.user.set(res.user); this.loaded = true; this.sessionExpired.set(false);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.reference.clear();
    this.user.set(null); this.loaded = true; this.sessionExpired.set(false);
  }
}
