import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ApiError } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

/** "Suggest a change" button that opens a modal. State resets whenever the target content changes (F9). */
@Component({
  selector: 'app-feedback-form',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn sm ghost" (click)="open()">Suggest a change</button>
    <dialog #dlg class="fb" (cancel)="close($event)" aria-labelledby="fb-title">
      <form (ngSubmit)="send()" class="body">
        <h2 id="fb-title">Suggest a change</h2>
        <p class="muted">Sent privately to the administrators. The content itself is never changed automatically.</p>
        <label>Your feedback
          <textarea name="feedback" rows="6" [(ngModel)]="message" required maxlength="10000" aria-describedby="fb-count"></textarea>
        </label>
        <p id="fb-count" class="muted small">{{ message.length }} / 10000</p>
        @if (error()) { <p class="field-error" role="alert">{{ error() }}</p> }
        <div class="row end">
          <button type="button" class="btn" (click)="close()">Cancel</button>
          <button class="btn primary" [disabled]="busy() || !message.trim()" [attr.aria-busy]="busy()">{{ busy() ? 'Sending…' : 'Send to administrator' }}</button>
        </div>
      </form>
    </dialog>`,
  styles: [`
    .fb { border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-card); color: var(--text); padding: 0; width: min(94vw, 520px); box-shadow: var(--shadow); }
    .fb::backdrop { background: rgb(0 0 0 / .5); }
    .body { padding: 20px; display: flex; flex-direction: column; gap: 10px; } .body h2, .body p { margin: 0; } .end { justify-content: flex-end; } .small { font-size: 12px; }
    textarea { min-height: 140px; }
    @media (max-width: 600px) { .fb { width: 100vw; max-width: 100vw; margin: auto 0 0; border-radius: var(--radius) var(--radius) 0 0; } }
  `]
})
export class FeedbackFormComponent {
  readonly kind = input.required<string>();
  readonly contentId = input.required<number>();
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  message = '';
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      this.kind(); this.contentId();
      untracked(() => { this.message = ''; this.error.set(''); this.busy.set(false); if (this.dlg().nativeElement.open) this.dlg().nativeElement.close(); });
    });
  }

  open(): void { this.error.set(''); this.dlg().nativeElement.showModal(); }
  close(e?: Event): void { e?.preventDefault(); this.dlg().nativeElement.close(); }

  send(): void {
    this.busy.set(true); this.error.set('');
    this.api.sendFeedback(this.kind(), this.contentId(), this.message).subscribe({
      next: () => { this.message = ''; this.busy.set(false); this.dlg().nativeElement.close(); this.toast.show('Feedback submitted for review', 'ok'); },
      error: (e: ApiError) => { this.busy.set(false); this.error.set(e.details ? Object.values(e.details).flat().join(' ') : e.message ?? 'Could not send feedback.'); }
    });
  }
}
