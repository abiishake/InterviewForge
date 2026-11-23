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
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-account',
  imports: [FormsModule, FieldValidationDirective, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <app-page-header eyebrow="Me" title="Account" description="Your profile, appearance, password and signed-in devices." />
      @if (auth.user()?.mustChangePassword) {
        <p class="notice" role="alert">An administrator set a temporary password for you. Choose a new password to continue.</p>
      }
      <div class="panel">
        <div class="panel-body">
          @if (!auth.user()?.mustChangePassword) {
          <section class="form-section" aria-labelledby="profile-h">
            <header><h2 id="profile-h">Profile</h2><p>How you appear to other members, and the time zone used for "today", streaks and plan days.</p></header>
            <form #pf="ngForm" (ngSubmit)="saveProfile(pf)">
              <div class="field"><label for="dn">Display name</label><input id="dn" appField="Display name" name="displayName" [(ngModel)]="displayName" required maxlength="80" autocomplete="name"></div>
              <div class="field"><label for="em">Email</label><input id="em" appField="Email" name="email" type="email" [(ngModel)]="email" required maxlength="254" autocomplete="email"></div>
              <div class="field"><label for="tz">Time zone</label>
                <input id="tz" name="tz" list="zones" [(ngModel)]="timeZone" autocomplete="off" aria-describedby="tz-hint">
                <datalist id="zones">@for (z of zones; track z) { <option [value]="z"></option> }</datalist>
                <div id="tz-hint" class="field-hint">Detected from this browser: {{ detected }}.</div></div>
              @if (profileError()) { <p class="field-error" role="alert">{{ profileError() }}</p> }
              <button class="btn primary" [disabled]="busy()">Save profile</button>
            </form>
          </section>
          <section class="form-section" aria-labelledby="theme-h">
            <header><h2 id="theme-h">Appearance</h2><p>System follows your device's light or dark setting.</p></header>
            <div class="themes" role="group" aria-label="Theme">
              @for (t of themes; track t) {
                <button type="button" class="theme" [class.active]="theme.choice() === t" [attr.aria-pressed]="theme.choice() === t" (click)="theme.set(t)">
                  <span class="sw" [class]="'sw ' + t" aria-hidden="true"><i></i><i></i></span><span class="tl">{{ t }}</span>
                </button>
              }
            </div>
          </section>
          }
          <section class="form-section" aria-labelledby="pw-h">
            <header><h2 id="pw-h">Password</h2><p>12-128 characters. Changing it signs out your other devices.</p></header>
            <form #pwf="ngForm" (ngSubmit)="changePassword(pwf)">
              <div class="field"><label for="cur">Current password</label><input id="cur" appField="Current password" name="current" type="password" [(ngModel)]="current" required autocomplete="current-password"></div>
              <div class="grid two">
                <div class="field"><label for="np">New password</label><input id="np" appField="New password" hintId="pw-rules" name="next" type="password" [(ngModel)]="next" required minlength="12" maxlength="128" autocomplete="new-password"></div>
                <div class="field"><label for="cp">Confirm new password</label><input id="cp" #confirmEl appField="Confirm password" [serverError]="confirmError()" (input)="confirmError.set('')" name="confirm" type="password" [(ngModel)]="confirm" required autocomplete="new-password"></div>
              </div>
              <p id="pw-rules" class="sr-only">12-128 characters. Changing it signs out your other devices.</p>
              @if (pwError()) { <p class="field-error" role="alert">{{ pwError() }}</p> }
              <button class="btn primary" [disabled]="busy()">Change password</button>
            </form>
          </section>
          @if (!auth.user()?.mustChangePassword) {
          <section class="form-section" aria-labelledby="sess-h">
            <header><h2 id="sess-h">Sessions</h2><p>Sign out everywhere except this browser.</p></header>
            <div><button class="btn" (click)="revokeOthers()"><app-icon name="logout" [size]="14" /> Sign out of other devices</button></div>
          </section>
          }
        </div>
      </div>
    </div>`,
  styles: [`
    .notice { background: var(--warn-soft); border: 1px solid var(--warn); border-radius: var(--radius-sm); padding: 10px 12px; }
    .grid.two { grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 0 14px; }
    .themes { display: flex; gap: 10px; flex-wrap: wrap; }
    .theme { display: flex; flex-direction: column; gap: 6px; align-items: center; padding: 8px; border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-elev); cursor: pointer; color: var(--text-muted); font: 12.5px var(--font); text-transform: capitalize; transition: border-color var(--dur-1); }
    .theme:hover { border-color: var(--text-dim); }
    .theme.active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); color: var(--text); }
    .sw { display: flex; width: 88px; height: 52px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); }
    .sw i { flex: 1; } .sw.light i { background: #f3f4f6; } .sw.light i:first-child { background: #fff; flex: .4; border-right: 1px solid #e3e6eb; }
    .sw.dark i { background: #0a0d12; } .sw.dark i:first-child { background: #10151c; flex: .4; border-right: 1px solid #1f2833; }
    .sw.system i:first-child { background: linear-gradient(135deg, #fff 50%, #10151c 50%); flex: .4; } .sw.system i { background: linear-gradient(135deg, #f3f4f6 50%, #0a0d12 50%); }
  `]
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
