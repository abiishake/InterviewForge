import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { AdminUserListItem } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row">
      <h1>Users</h1><span class="spacer"></span>
      <a class="btn primary" routerLink="/admin/users/new">New user</a>
    </div>
    <div class="row filters">
      <input type="search" name="search" [(ngModel)]="search" (ngModelChange)="typed.next()" placeholder="Search name, username or email" aria-label="Search users">
      <select name="role" [(ngModel)]="role" (ngModelChange)="reload()" aria-label="Role">
        <option value="all">All roles</option><option value="Admin">Admins</option><option value="Member">Members</option>
      </select>
      <select name="status" [(ngModel)]="status" (ngModelChange)="reload()" aria-label="Status">
        <option value="all">Any status</option><option value="active">Active</option><option value="disabled">Disabled</option>
      </select>
      <select name="sort" [(ngModel)]="sort" (ngModelChange)="reload()" aria-label="Sort">
        <option value="name">Name</option><option value="username">Username</option><option value="-created">Newest</option>
        <option value="-lastLogin">Last sign-in</option>
      </select>
    </div>
    @if (error()) {
      <div class="error-box mt" role="alert">Could not load users. <button class="btn sm" (click)="reload()">Retry</button></div>
    } @else if (loading() && !items().length) {
      <p class="loading" role="status">Loading users…</p>
    } @else {
      <div class="table-wrap mt">
        <table class="data stack-sm">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Completed</th><th>Contributions</th></tr></thead>
          <tbody>
            @for (u of items(); track u.id) {
              <tr>
                <td><a class="who" [routerLink]="['/admin/users', u.id]"><span class="avatar" aria-hidden="true">{{ initials(u.displayName) }}</span>
                  <span><b>{{ u.displayName }}</b><br><span class="muted small">&#64;{{ u.username }} · {{ u.email }}</span></span></a></td>
                <td data-label="Role"><span class="badge" [class.accent]="u.role === 'Admin'">{{ u.role }}</span></td>
                <td data-label="Status">@if (u.isDisabled) { <span class="badge danger">Disabled</span> } @else { <span class="badge ok">Active</span> }</td>
                <td data-label="Last sign-in" [title]="u.lastLoginAt ?? ''">{{ u.lastLoginAt ? (u.lastLoginAt | date:'medium') : 'Never' }}</td>
                <td data-label="Completed">{{ u.completed }}</td>
                <td data-label="Contributions">{{ u.contributions }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted">No users match these filters.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="row mt">
        <span class="muted" role="status">{{ rangeLabel() }}</span><span class="spacer"></span>
        <button class="btn sm" (click)="go(page() - 1)" [disabled]="page() <= 1">Previous</button>
        <button class="btn sm" (click)="go(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
      </div>
    }`,
  styles: [`
    .filters { margin-top: 12px; } .filters input { flex: 1 1 220px; width: auto; } .filters select { width: auto; flex: 0 1 auto; }
    .who { display: flex; align-items: center; gap: 10px; color: var(--text); } .who:hover { text-decoration: none; }
    .small { font-size: 12px; }
  `]
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly me = inject(AuthService).user;
  readonly items = signal<AdminUserListItem[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly typed = new Subject<void>();
  readonly pageSize = 25;
  search = ''; role = 'all'; status = 'all'; sort = 'name';

  constructor() { this.typed.pipe(debounceTime(250)).subscribe(() => this.reload()); }
  ngOnInit(): void { this.load(); }

  reload(): void { this.page.set(1); this.load(); }
  go(p: number): void { this.page.set(Math.max(1, Math.min(p, this.totalPages()))); this.load(); }

  rangeLabel(): string {
    const t = this.total();
    if (t === 0) return 'No users';
    const from = (this.page() - 1) * this.pageSize + 1;
    return `Showing ${from}-${Math.min(t, from + this.pageSize - 1)} of ${t}`;
  }

  initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?'; }

  private load(): void {
    this.loading.set(true); this.error.set(false);
    this.api.adminUsers({ search: this.search.trim(), role: this.role, status: this.status, sort: this.sort, page: this.page(), pageSize: this.pageSize }).subscribe({
      next: r => { this.items.set(r.items); this.total.set(r.totalCount); this.totalPages.set(Math.max(1, r.totalPages)); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }
}
