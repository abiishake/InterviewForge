import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChildren } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiError } from '../../core/models';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, FieldValidationDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <aside class="brand-side" aria-hidden="true">
          <div class="brand"><span class="mark">F</span><span>Interview<b>Forge</b></span></div>
          <h2>Senior .NET interview preparation, on your own server.</h2>
          <ul class="feats">
            <li><span class="fi"><app-icon name="calendar" [size]="16" /></span>Daily plans that follow the skill matrix</li>
            <li><span class="fi"><app-icon name="play" [size]="16" /></span>Interview mode with spaced review</li>
            <li><span class="fi"><app-icon name="chart" [size]="16" /></span>Readiness tracking by section and topic</li>
          </ul>
        </aside>
        <div class="form-side">
          <div class="eyebrow mobile-brand">InterviewForge</div>
          <h1>{{ signup() ? 'Create account' : 'Sign in' }}</h1>
          <p class="sub">{{ signup() ? 'New accounts start as members.' : 'Welcome back. Pick up where you left off.' }}</p>
          @if (auth.sessionExpired()) { <p class="notice" role="status">Your session expired. Please sign in again.</p> }
          @if (signup() && !registrationOpen()) {
            <p class="notice" role="status">Public sign-up is closed. Ask an administrator to create an account for you.</p>
          } @else {
          <form #f="ngForm" (ngSubmit)="submit(f)" class="stack mt">
            <label>Username
              <input appField="Username" [hintId]="signup() ? 'u-hint' : null" patternMessage="Use letters, digits, dot, dash or underscore." name="username" [(ngModel)]="username" required [minlength]="signup() ? 3 : 0" maxlength="32" [pattern]="signup() ? '[A-Za-z0-9._-]+' : ''" autocomplete="username" autocapitalize="none">
            </label>
            @if (signup()) {
              <p id="u-hint" class="hint">3-32 characters: letters, digits, dot, dash or underscore.</p>
              <label>Name<input appField="Name" name="name" [(ngModel)]="name" required maxlength="80" autocomplete="name"></label>
              <label>Email<input appField="Email" name="email" type="email" [(ngModel)]="email" required maxlength="254" autocomplete="email"></label>
            }
            <label>Password
              <span class="pw">
                <input appField="Password" [hintId]="signup() ? 'p-hint' : null" name="password" [type]="reveal() ? 'text' : 'password'" [(ngModel)]="password" required [minlength]="signup() ? 12 : 0" maxlength="128" [autocomplete]="signup() ? 'new-password' : 'current-password'">
                <button type="button" class="btn" (click)="reveal.set(!reveal())" [attr.aria-pressed]="reveal()">{{ reveal() ? 'Hide' : 'Show' }}</button>
              </span>
            </label>
            @if (signup()) { <p id="p-hint" class="hint">At least 12 characters (up to 128).</p> }
            @if (error()) { <p class="field-error" role="alert">{{ error() }}</p> }
            <button class="btn primary submit" [disabled]="busy()" [attr.aria-busy]="busy()">{{ busy() ? 'Please wait…' : signup() ? 'Create account' : 'Sign in' }}</button>
          </form>
          }
          @if (registrationOpen() || signup()) {
            <div class="switch">{{ signup() ? 'Already registered?' : 'New here?' }}
              <button class="linkbtn" type="button" (click)="signup.set(!signup()); error.set('')">{{ signup() ? 'Sign in' : 'Create an account' }}</button></div>
          }
        </div>
      </div>
    </div>`,
  styles: [`
    .auth-wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; background:
      radial-gradient(1200px 600px at 10% -10%, var(--accent-soft), transparent 60%), radial-gradient(900px 500px at 110% 110%, var(--ready-soft), transparent 60%), var(--bg); }
    .auth-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); width: 100%; max-width: 880px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); animation: if-rise-in var(--dur-2) var(--ease-out); }
    .brand-side { display: flex; flex-direction: column; gap: 18px; padding: 36px 32px; background: var(--bg-sunken); border-right: 1px solid var(--border); }
    .brand { display: flex; align-items: center; gap: 10px; font: 600 15px var(--font); }
    .brand b { color: var(--accent-text); }
    .mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-weight: 800; }
    .brand-side h2 { font-size: 1.3rem; line-height: 1.3; margin: 12px 0 0; }
    .feats { list-style: none; margin: auto 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; color: var(--text-muted); font-size: 13.5px; }
    .feats li { display: flex; align-items: center; gap: 10px; }
    .fi { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--ready-soft); color: var(--ready); flex: none; }
    .form-side { padding: 36px 32px; }
    .mobile-brand { display: none; }
    h1 { margin: 0; } .sub { margin: 4px 0 0; color: var(--text-muted); font-size: 13.5px; }
    .pw { display: flex; gap: 8px; } .pw input { flex: 1; min-width: 0; }
    .hint { margin: -6px 0 0; font-size: 12px; color: var(--text-muted); }
    .submit { min-height: 40px; margin-top: 4px; }
    .notice { background: var(--info-soft); border: 1px solid var(--info); border-radius: var(--radius-sm); padding: 10px 12px; margin: 12px 0 0; }
    .switch { margin-top: 18px; font-size: 13px; color: var(--text-muted); }
    .linkbtn { background: none; border: 0; padding: 0 2px; color: var(--accent-text); font: 600 13px var(--font); cursor: pointer; }
    .linkbtn:hover { text-decoration: underline; }
    @media (max-width: 720px) { .auth-card { grid-template-columns: 1fr; max-width: 440px; } .brand-side { display: none; } .mobile-brand { display: block; } .form-side { padding: 28px 22px; } }
  `]
})
export class AuthComponent implements OnInit {
  readonly auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly signup = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly reveal = signal(false);
  readonly registrationOpen = signal(true);
  private fields = viewChildren(FieldValidationDirective);
  username = ''; name = ''; email = ''; password = '';

  async ngOnInit(): Promise<void> { this.registrationOpen.set(await this.auth.registrationOpen()); }

  async submit(f: NgForm): Promise<void> {
    if (!validateForm(this.fields(), f.control)) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.signup()) await this.auth.register(this.username, this.name, this.email, this.password);
      else await this.auth.login(this.username, this.password);
      this.password = '';
      const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      const user = this.auth.user();
      await this.router.navigateByUrl(user?.mustChangePassword ? '/account' : url.startsWith('/') && !url.startsWith('//') ? url : '/');
    } catch (e) {
      const err = e as ApiError;
      this.error.set(err.message ?? 'Sign in failed.');
      if (err.code === 'REGISTRATION_CLOSED') this.registrationOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }
}
