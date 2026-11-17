import { Injectable, signal } from '@angular/core';

export interface ToastAction { label: string; run: () => void; }
export interface Toast { id: number; text: string; kind: 'info' | 'error' | 'ok'; action?: ToastAction; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;
  private timers = new Map<number, { handle: ReturnType<typeof setTimeout>; ms: number }>();

  /** `ms` of 0 keeps the toast until dismissed. Errors stay longer, and an action (e.g. Undo) gets extra time. */
  show(text: string, kind: Toast['kind'] = 'info', ms?: number, action?: ToastAction): number {
    const id = ++this.seq;
    this.toasts.update(t => [...t, { id, text, kind, action }]);
    const duration = ms ?? (action ? 8000 : kind === 'error' ? 5000 : 3500);
    if (duration > 0) this.arm(id, duration);
    return id;
  }

  dismiss(id: number): void {
    this.clear(id);
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  /** Hovering or focusing a toast gives people time to read it or press its action. */
  pause(id: number): void { this.clear(id); }
  resume(id: number): void { const t = this.toasts().find(x => x.id === id); if (t) this.arm(id, t.action ? 4000 : 2000); }

  runAction(id: number): void {
    const t = this.toasts().find(x => x.id === id);
    this.dismiss(id);
    t?.action?.run();
  }

  private arm(id: number, ms: number): void {
    this.clear(id);
    this.timers.set(id, { ms, handle: setTimeout(() => this.dismiss(id), ms) });
  }

  private clear(id: number): void {
    const t = this.timers.get(id);
    if (t) { clearTimeout(t.handle); this.timers.delete(id); }
  }
}
