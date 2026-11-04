import { Injectable, signal } from '@angular/core';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'if-theme';

/** Stores the theme in localStorage and mirrors it onto <html data-theme>. public/theme-init.js applies it before first paint. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly choice = signal<ThemeChoice>(this.read());

  constructor() { this.apply(this.choice()); }

  set(choice: ThemeChoice): void {
    this.choice.set(choice);
    try { localStorage.setItem(KEY, choice); } catch { /* storage unavailable: the choice lasts for this page only */ }
    this.apply(choice);
  }

  toggle(): void {
    const dark = this.effective() === 'dark';
    this.set(dark ? 'light' : 'dark');
  }

  effective(): 'light' | 'dark' {
    const c = this.choice();
    if (c !== 'system') return c;
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private read(): ThemeChoice {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch { return 'system'; }
  }

  private apply(choice: ThemeChoice): void {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', choice);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', this.effective() === 'dark' ? '#0d1117' : '#f6f7f9');
  }
}
