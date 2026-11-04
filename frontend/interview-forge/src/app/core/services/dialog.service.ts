import { Injectable, signal } from '@angular/core';

export interface DialogRequest {
  kind: 'confirm' | 'prompt' | 'secret' | 'choose';
  choices?: { value: string; label: string }[];
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  /** prompt: initial value. confirm with `requireText`: the text the user must type. */
  value?: string;
  requireText?: string;
  inputLabel?: string;
  resolve: (result: DialogResult) => void;
}
export interface DialogResult { ok: boolean; value: string; }

/** Themeable replacement for window.confirm()/prompt(). The host component renders `current()`. */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly current = signal<DialogRequest | null>(null);

  confirm(opts: { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; requireText?: string; inputLabel?: string }): Promise<boolean> {
    return this.open({ kind: 'confirm', confirmLabel: 'Confirm', cancelLabel: 'Cancel', danger: false, ...opts }).then(r => r.ok);
  }

  /** Resolves with the entered text, or null when cancelled. */
  async prompt(opts: { title: string; message?: string; value?: string; inputLabel?: string; confirmLabel?: string }): Promise<string | null> {
    const r = await this.open({ kind: 'prompt', confirmLabel: 'Save', cancelLabel: 'Cancel', danger: false, ...opts });
    return r.ok ? r.value : null;
  }

  /** Day-picker style chooser. Resolves with the chosen value, or null when cancelled. */
  async choose(opts: { title: string; message?: string; choices: { value: string; label: string }[] }): Promise<string | null> {
    const r = await this.open({ kind: 'choose', confirmLabel: '', cancelLabel: 'Cancel', danger: false, ...opts });
    return r.ok ? r.value : null;
  }

  /** Shows a value exactly once (e.g. a temporary password) with a copy button. */
  secret(opts: { title: string; message?: string; value: string }): Promise<void> {
    return this.open({ kind: 'secret', confirmLabel: 'Done', cancelLabel: '', danger: false, ...opts }).then(() => undefined);
  }

  private open(req: Omit<DialogRequest, 'resolve'>): Promise<DialogResult> {
    return new Promise(resolve => this.current.set({ ...req, resolve: r => { this.current.set(null); resolve(r); } }));
  }
}
