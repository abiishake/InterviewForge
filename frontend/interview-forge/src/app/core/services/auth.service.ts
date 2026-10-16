import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Account } from '../models';
@Injectable({providedIn:'root'})
export class AuthService {
  private http=inject(HttpClient);
  readonly user=signal<Account|null>(null);
  private loaded=false;
  async load(): Promise<Account|null> {
    if (!this.loaded) { const res=await firstValueFrom(this.http.get<{user:Account|null}>('/api/auth/me'));this.user.set(res.user);this.loaded=true; }
    return this.user();
  }
  async login(username:string,password:string):Promise<void> { const res=await firstValueFrom(this.http.post<{user:Account}>('/api/auth/login',{username,password}));this.user.set(res.user);this.loaded=true; }
  async register(username:string,name:string,email:string,password:string):Promise<void> { const res=await firstValueFrom(this.http.post<{user:Account}>('/api/auth/register',{username,name,email,password}));this.user.set(res.user);this.loaded=true; }
  async logout():Promise<void> { await firstValueFrom(this.http.post('/api/auth/logout',{}));this.user.set(null);this.loaded=true; }
}
