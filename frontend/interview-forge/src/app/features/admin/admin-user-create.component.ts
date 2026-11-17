import { ChangeDetectionStrategy, Component, inject, signal, viewChildren } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { DialogService } from '../../core/services/dialog.service';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';

@Component({
  selector: 'app-admin-user-create',
  imports: [FormsModule, RouterLink, FieldValidationDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrow">
      <p class="breadcrumb"><a routerLink="/admin/users">Users</a> / New</p>
      <h1>New user</h1>
      <form #f="ngForm" class="card stack" (ngSubmit)="save(f)">
        <label>Username<input appField="Username" patternMessage="Use letters, digits, dot, dash or underscore." [serverError]="err('username')" name="username" [(ngModel)]="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9._-]+" autocapitalize="none" autocomplete="off"></label>
        <label>Display name<input appField="Display name" [serverError]="err('displayName')" name="displayName" [(ngModel)]="displayName" required maxlength="80" autocomplete="off"></label>
        <label>Email<input appField="Email" [serverError]="err('email')" name="email" type="email" [(ngModel)]="email" required maxlength="254" autocomplete="off"></label>
        <label>Role<select name="role" [(ngModel)]="role"><option>Member</option><option>Admin</option></select></label>
        <fieldset class="stack">
          <legend class="muted">Password</legend>
          <label class="checkbox"><input type="radio" name="mode" value="generate" [(ngModel)]="mode"> Generate a temporary password</label>
          <label class="checkbox"><input type="radio" name="mode" value="manual" [(ngModel)]="mode"> Set one manually</label>
          @if (mode === 'manual') {
            <label>Temporary password<input appField="Temporary password" [serverError]="err('password')" name="password" type="password" [(ngModel)]="password" required minlength="12" maxlength="128" autocomplete="new-password"></label>
          }
          <p class="muted small">The user must change it at first sign-in.</p>
        </fieldset>
        @if (general()) { <p class="field-error" role="alert">{{ general() }}</p> }
        <div class="row"><button class="btn primary" [disabled]="busy()">Create user</button><a class="btn ghost" routerLink="/admin/users">Cancel</a></div>
      </form>
    </div>`,
  styles: [`.narrow { max-width: 560px; } fieldset { border: 0; padding: 0; margin: 0; } .small { font-size: 12px; }`]
})
export class AdminUserCreateComponent {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private router = inject(Router);
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string[]>>({});
  readonly general = signal('');
  private fields = viewChildren(FieldValidationDirective);
  username = ''; displayName = ''; email = ''; role = 'Member'; mode: 'generate' | 'manual' = 'generate'; password = '';

  err(field: string): string { return (this.errors()[field] ?? []).join(' '); }

  save(f: NgForm): void {
    if (!validateForm(this.fields(), f.control)) return;
    this.busy.set(true); this.errors.set({}); this.general.set('');
    this.api.createUser({
      username: this.username, displayName: this.displayName, email: this.email, role: this.role,
      password: this.mode === 'manual' ? this.password : undefined, generatePassword: this.mode === 'generate'
    }).subscribe({
      next: async r => {
        this.busy.set(false);
        if (r.temporaryPassword) {
          await this.dialogs.secret({ title: 'Temporary password', message: `Give this to ${r.user.displayName}. They must change it at next sign-in.`, value: r.temporaryPassword });
        }
        await this.router.navigate(['/admin/users', r.user.id]);
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        if (e.code === 'USERNAME_TAKEN') this.errors.set({ username: [e.message] });
        else if (e.code === 'EMAIL_TAKEN') this.errors.set({ email: [e.message] });
        else if (e.details) this.errors.set(e.details);
        else this.general.set(e.message);
      }
    });
  }
}
