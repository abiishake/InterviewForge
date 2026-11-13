import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild, viewChildren } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Account, ApiError } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ThemeChoice, ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';

@Component({
  selector: 'app-account',
  imports: [FormsModule, FieldValidationDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <div class="eyebrow">Me</div>
      <h1>Account</h1>
      @if (auth.user()?.mustChangePassword) {
        <p class="notice" role="alert">An administrator set a temporary password for you. Choose a new password to continue.</p>
      }
      @if (!auth.user()?.mustChangePassword) {
      <section class="card mt" aria-labelledby="profile-h">
        <h2 id="profile-h">Profile</h2>
        <form #pf="ngForm" (ngSubmit)="saveProfile(pf)" class="stack">
          <label>Display name<input appField="Display name" name="displayName" [(ngModel)]="displayName" required maxlength="80" autocomplete="name"></label>
          <label>Email<input appField="Email" name="email" type="email" [(ngModel)]="email" required maxlength="254" autocomplete="email"></label>
          <label>Time zone
            <input name="tz" list="zones" [(ngModel)]="timeZone" autocomplete="off">
            <datalist id="zones">@for (z of zones; track z) { <option [value]="z"></option> }</datalist>
          </label>
          <p class="muted small">Used for "today", your streak and plan days. Detected from this browser: {{ detected }}.</p>
          @if (profileError()) { <p class="field-error" role="alert">{{ profileError() }}</p> }
          <div><button class="btn primary" [disabled]="busy()">Save profile</button></div>
        </form>
      </section>
      <section class="card mt" aria-labelledby="theme-h">
        <h2 id="theme-h">Theme</h2>
        <div class="chips" role="group" aria-label="Theme">
          @for (t of themes; track t) {
            <button type="button" [class.active]="theme.choice() === t" [attr.aria-pressed]="theme.choice() === t" (click)="theme.set(t)">{{ t }}</button>
          }
        </div>
      </section>
      }
      <section class="card mt" aria-labelledby="pw-h">
        <h2 id="pw-h">Change password</h2>
        <form #pwf="ngForm" (ngSubmit)="changePassword(pwf)" class="stack">
          <label>Current password<input appField="Current password" name="current" type="password" [(ngModel)]="current" required autocomplete="current-password"></label>
          <label>New password<input appField="New password" hintId="pw-rules" name="next" type="password" [(ngModel)]="next" required minlength="12" maxlength="128" autocomplete="new-password"></label>
          <label>Confirm new password<input #confirmEl appField="Confirm password" [serverError]="confirmError()" (input)="confirmError.set('')" name="confirm" type="password" [(ngModel)]="confirm" required autocomplete="new-password"></label>
          <p id="pw-rules" class="muted small">12-128 characters. Changing it signs out your other devices.</p>
          @if (pwError()) { <p class="field-error" role="alert">{{ pwError() }}</p> }
          <div><button class="btn primary" [disabled]="busy()">Change password</button></div>
        </form>
      </section>
      @if (!auth.user()?.mustChangePassword) {
      <section class="card mt" aria-labelledby="sess-h">
        <h2 id="sess-h">Sessions</h2>
        <p class="muted">Sign out everywhere except this browser.</p>
        <button class="btn" (click)="revokeOthers()">Sign out of other devices</button>
      </section>
      }
    </div>`,
  styles: [`.narrow { max-width: 680px; } .small { font-size: 12px; } .notice { background: var(--warn-soft); border: 1px solid var(--warn); border-radius: var(--radius-sm); padding: 10px 12px; }`]
})
export class AccountComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly themes: ThemeChoice[] = ['system', 'light', 'dark'];
  readonly busy = signal(false);
  readonly profileError = signal('');
  readonly pwError = signal('');
  readonly confirmError = signal('');
  private fields = viewChildren(FieldValidationDirective);
  private confirmEl = viewChild<ElementRef<HTMLInputElement>>('confirmEl');
  readonly detected = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
  readonly zones: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return ['UTC']; } })();
  displayName = ''; email = ''; timeZone = 'UTC'; current = ''; next = ''; confirm = '';

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) { this.displayName = u.displayName; this.email = u.email; this.timeZone = u.timeZone; }
  }

  async saveProfile(f: NgForm): Promise<void> {
    if (!validateForm(this.fields(), f.control)) return;
    this.busy.set(true); this.profileError.set('');
    try {
      const a = await firstValueFrom(this.http.put<Account>('/api/account', { displayName: this.displayName, email: this.email, timeZone: this.timeZone }));
      this.auth.user.set(a);
      this.toast.show('Profile saved', 'ok');
    } catch (e) { this.profileError.set((e as ApiError).message ?? 'Could not save.'); }
    finally { this.busy.set(false); }
  }

  async changePassword(f: NgForm): Promise<void> {
    this.pwError.set(''); this.confirmError.set('');
    if (!validateForm(this.fields(), f.control)) return;
    if (this.next !== this.confirm) { this.confirmError.set('The new passwords do not match.'); this.confirmEl()?.nativeElement.focus(); return; }
    this.busy.set(true);
    try {
      await firstValueFrom(this.http.post('/api/account/password', { currentPassword: this.current, newPassword: this.next }));
      this.current = this.next = this.confirm = '';
      await this.auth.refresh();
      this.toast.show('Password changed', 'ok');
      await this.router.navigate(['/']);
    } catch (e) {
      const err = e as ApiError;
      const detail = err.details ? Object.values(err.details).flat().join(' ') : '';
      this.pwError.set(detail || err.message || 'Could not change the password.');
    } finally { this.busy.set(false); }
  }

  async revokeOthers(): Promise<void> {
    await firstValueFrom(this.http.post('/api/account/sessions/revoke-others', {}));
    this.toast.show('Other devices were signed out', 'ok');
  }
}
