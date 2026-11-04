import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Settings</h1>
    <section class="card narrow" aria-labelledby="reg-h">
      <h2 id="reg-h">Public registration</h2>
      <p class="muted">When closed, the sign-up form is hidden and new accounts can only be created by an administrator. Changes are written to the audit log.</p>
      @if (value(); as v) {
        <p>Currently <span class="badge" [class.ok]="v === 'Open'" [class.warn]="v === 'Closed'">{{ v }}</span></p>
        <button class="btn" (click)="toggle()">{{ v === 'Open' ? 'Close registration' : 'Open registration' }}</button>
      } @else { <p class="loading" role="status">Loading…</p> }
    </section>`,
  styles: [`.narrow { max-width: 600px; }`]
})
export class AdminSettingsComponent implements OnInit {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  readonly value = signal<'Open' | 'Closed' | null>(null);

  ngOnInit(): void { this.api.registrationSetting().subscribe(r => this.value.set(r.registration)); }

  async toggle(): Promise<void> {
    const next = this.value() === 'Open' ? 'Closed' : 'Open';
    const ok = await this.dialogs.confirm({
      title: next === 'Closed' ? 'Close public registration?' : 'Open public registration?',
      message: next === 'Closed' ? 'Nobody can sign up on their own until you reopen it.' : 'Anyone who can reach this site will be able to create a member account.',
      confirmLabel: next === 'Closed' ? 'Close registration' : 'Open registration'
    });
    if (ok) this.api.setRegistration(next).subscribe(r => { this.value.set(r.registration); this.toast.show('Registration ' + r.registration.toLowerCase(), 'ok'); });
  }
}
