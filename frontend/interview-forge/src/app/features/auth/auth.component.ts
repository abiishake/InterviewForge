import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChildren } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiError } from '../../core/models';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, FieldValidationDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-wrap">
      <div class="card auth-card">
        <div class="eyebrow">InterviewForge</div>
        <h1>{{ signup() ? 'Create account' : 'Sign in' }}</h1>
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
              <button type="button" class="btn sm" (click)="reveal.set(!reveal())" [attr.aria-pressed]="reveal()">{{ reveal() ? 'Hide' : 'Show' }}</button>
            </span>
          </label>
          @if (signup()) { <p id="p-hint" class="hint">At least 12 characters (up to 128).</p> }
          @if (error()) { <p class="field-error" role="alert">{{ error() }}</p> }
          <button class="btn primary" [disabled]="busy()" [attr.aria-busy]="busy()">{{ busy() ? 'Please wait…' : signup() ? 'Create account' : 'Sign in' }}</button>
        </form>
        }
        @if (registrationOpen() || signup()) {
          <button class="btn ghost mt" type="button" (click)="signup.set(!signup()); error.set('')">{{ signup() ? 'Already registered? Sign in' : 'Create an account' }}</button>
        }
      </div>
    </div>`,
  styles: [`
    .auth-wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; }
    .auth-card { width: 100%; max-width: 420px; }
    .pw { display: flex; flex-wrap: wrap; gap: 8px; } .pw input { flex: 1; min-width: 0; }
    .hint { margin: -6px 0 0; font-size: 12px; color: var(--text-muted); }
    .notice { background: var(--info-soft); border: 1px solid var(--info); border-radius: var(--radius-sm); padding: 10px 12px; margin: 12px 0 0; }
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
