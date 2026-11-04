import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="eyebrow">Administration</div>
      <nav class="chips" aria-label="Administration">
        <a routerLink="users" routerLinkActive="active" ariaCurrentWhenActive="page">Users</a>
        <a routerLink="feedback" routerLinkActive="active" ariaCurrentWhenActive="page">Feedback</a>
        <a routerLink="import" routerLinkActive="active" ariaCurrentWhenActive="page">Import</a>
        <a routerLink="settings" routerLinkActive="active" ariaCurrentWhenActive="page">Settings</a>
        <a routerLink="audit" routerLinkActive="active" ariaCurrentWhenActive="page">Audit log</a>
      </nav>
      <div class="mt"><router-outlet /></div>
    </div>`
})
export class AdminShellComponent {}
