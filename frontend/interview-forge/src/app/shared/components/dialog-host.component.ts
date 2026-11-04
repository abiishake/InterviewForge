import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRequest, DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Renders DialogService requests in a native modal <dialog>: the browser provides the focus trap,
 * inert background, Esc handling and focus return. On narrow screens it becomes a bottom sheet.
 */
@Component({
  selector: 'app-dialog-host',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="dlg" (cancel)="cancel($event)" (click)="backdrop($event)" [attr.aria-labelledby]="'dlg-title'">
      @if (req(); as r) {
        <form method="dialog" (ngSubmit)="submit()" class="dlg-body">
          <h2 id="dlg-title">{{ r.title }}</h2>
          @if (r.message) { <p class="muted">{{ r.message }}</p> }
          @if (r.kind === 'secret') {
            <input class="secret" readonly [value]="r.value" aria-label="Value shown once" (focus)="$any($event.target).select()" />
            <p class="muted small">Shown once. Copy it now: it cannot be displayed again.</p>
            <div class="row"><button type="button" class="btn" (click)="copy(r.value ?? '')">Copy</button><span class="spacer"></span>
              <button type="submit" class="btn primary">{{ r.confirmLabel }}</button></div>
          } @else if (r.kind === 'choose') {
            <div class="choices" role="group" [attr.aria-label]="r.title">
              @for (c of r.choices ?? []; track c.value) { <button type="button" class="btn" (click)="pick(c.value)">{{ c.label }}</button> }
            </div>
            <div class="row end"><button type="button" class="btn" (click)="finish(false)">{{ r.cancelLabel }}</button></div>
          } @else {
            @if (r.kind === 'prompt' || r.requireText) {
              <label>{{ r.inputLabel ?? (r.requireText ? 'Type ' + r.requireText + ' to confirm' : 'Value') }}
                <input name="text" [(ngModel)]="text" autocomplete="off" autocapitalize="none" [attr.aria-describedby]="null" />
              </label>
            }
            <div class="row end">
              <button type="button" class="btn" (click)="finish(false)">{{ r.cancelLabel }}</button>
              <button type="submit" class="btn" [class.danger]="r.danger" [class.primary]="!r.danger" [disabled]="!valid()">{{ r.confirmLabel }}</button>
            </div>
          }
        </form>
      }
    </dialog>`,
  styles: [`
    .dlg { border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-card); color: var(--text); padding: 0; width: min(92vw, 460px); box-shadow: var(--shadow); }
    .dlg::backdrop { background: rgb(0 0 0 / .5); }
    .dlg-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .dlg-body h2 { margin: 0; }
    .dlg-body p { margin: 0; }
    .secret { font-family: var(--mono); font-size: 15px; }
    .end { justify-content: flex-end; }
    .choices { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; max-height: 50vh; overflow-y: auto; }
    .small { font-size: 12px; }
    @media (max-width: 600px) {
      .dlg { width: 100vw; max-width: 100vw; margin: auto 0 0; border-radius: var(--radius) var(--radius) 0 0; padding-bottom: var(--safe-bottom); }
    }
  `]
})
export class DialogHostComponent {
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private el = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  readonly req = this.dialogs.current;
  text = '';
  readonly open = signal(false);

  constructor() {
    effect(() => {
      const r = this.req();
      const dlg = this.el().nativeElement;
      if (r && !dlg.open) {
        this.text = r.kind === 'prompt' ? r.value ?? '' : '';
        dlg.showModal();
      } else if (!r && dlg.open) {
        dlg.close();
      }
    });
  }

  valid(): boolean {
    const r = this.req();
    if (!r) return false;
    if (r.requireText) return this.text.trim().toLowerCase() === r.requireText.toLowerCase();
    if (r.kind === 'prompt') return this.text.trim().length > 0;
    return true;
  }

  pick(value: string): void { this.text = value; this.finish(true); }
  submit(): void { if (this.valid()) this.finish(true); }
  finish(ok: boolean): void { const r = this.req() as DialogRequest | null; r?.resolve({ ok, value: this.text.trim() }); }
  cancel(e: Event): void { e.preventDefault(); this.finish(false); }

  backdrop(e: MouseEvent): void {
    const r = this.req();
    if (e.target === this.el().nativeElement && r && !r.danger && r.kind !== 'secret') this.finish(false);
  }

  async copy(value: string): Promise<void> {
    try { await navigator.clipboard.writeText(value); this.toast.show('Copied', 'ok', 1500); }
    catch { this.toast.show('Copy failed. Select the text and copy it manually.', 'error'); }
  }
}
