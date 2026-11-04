import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiError } from '../../core/models';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
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
        <form (ngSubmit)="submit()" class="stack mt">
          <label>Username
            <input name="username" [(ngModel)]="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" autocomplete="username" autocapitalize="none" [attr.aria-describedby]="signup() ? 'u-hint' : null">
          </label>
          @if (signup()) {
            <p id="u-hint" class="hint">3-32 characters: letters, digits, dot, dash or underscore.</p>
            <label>Name<input name="name" [(ngModel)]="name" required maxlength="80" autocomplete="name"></label>
            <label>Email<input name="email" type="email" [(ngModel)]="email" required maxlength="254" autocomplete="email"></label>
          }
          <label>Password
            <span class="pw">
              <input name="password" [type]="reveal() ? 'text' : 'password'" [(ngModel)]="password" required [minlength]="signup() ? 12 : 1" maxlength="128" [autocomplete]="signup() ? 'new-password' : 'current-password'" [attr.aria-describedby]="signup() ? 'p-hint' : null">
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
    .pw { display: flex; gap: 8px; }
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
  username = ''; name = ''; email = ''; password = '';

  async ngOnInit(): Promise<void> { this.registrationOpen.set(await this.auth.registrationOpen()); }

  async submit(): Promise<void> {
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
