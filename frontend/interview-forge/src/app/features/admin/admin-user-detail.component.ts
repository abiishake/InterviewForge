import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminProgress, AdminUserDetail, ApiError, AuditEntry } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';
import { TabListDirective } from '../../shared/ui/tab-list.directive';
import { HeatmapComponent } from '../../shared/ui/heatmap.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';

type Tab = 'profile' | 'security' | 'progress' | 'audit';

@Component({
  selector: 'app-admin-user-detail',
  imports: [FormsModule, RouterLink, DatePipe, FieldValidationDirective, TabListDirective, HeatmapComponent, IconComponent, MeterComponent, SkeletonComponent, StatTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="breadcrumb"><a routerLink="/admin/users">Users</a> / {{ u()?.displayName ?? '…' }}</p>
    @if (notFound()) {
      <div class="empty">This account no longer exists. <a routerLink="/admin/users">Back to users</a></div>
    } @else if (u(); as d) {
      <div class="row head">
        <span class="avatar big" aria-hidden="true">{{ d.displayName.slice(0, 1).toUpperCase() }}</span>
        <div>
          <h1>{{ d.displayName }}</h1>
          <div class="row">
            <span class="muted">&#64;{{ d.username }}</span>
            <span class="badge" [class.accent]="d.role === 'Admin'">{{ d.role }}</span>
            @if (d.isDisabled) { <span class="badge danger">Disabled</span> } @else { <span class="badge ok">Active</span> }
            @if (d.mustChangePassword) { <span class="badge warn">Password change pending</span> }
          </div>
          <p class="muted small">Created {{ d.createdAt | date:'medium' }} · Last sign-in {{ d.lastLoginAt ? (d.lastLoginAt | date:'medium') : 'never' }}</p>
        </div>
      </div>

      <div class="tabs" appTabList aria-label="User sections">
        @for (t of tabs; track t.id) {
          <button role="tab" [id]="'user-tab-' + t.id" aria-controls="user-panel" [attr.aria-selected]="tab() === t.id" [attr.tabindex]="tab() === t.id ? 0 : -1" [class.active]="tab() === t.id" (click)="select(t.id)">{{ t.label }}</button>
        }
      </div>
      <div id="user-panel" role="tabpanel" tabindex="0" [attr.aria-labelledby]="'user-tab-' + tab()">

      @if (tab() === 'profile') {
        <form #pf="ngForm" class="card stack narrow" (ngSubmit)="saveProfile(pf)">
          <label>Username<input appField="Username" [serverError]="err('username')" name="username" [(ngModel)]="username" required minlength="3" maxlength="32" autocapitalize="none"></label>
          <label>Display name<input appField="Display name" [serverError]="err('displayName')" name="displayName" [(ngModel)]="displayName" required maxlength="80"></label>
          <label>Email<input appField="Email" [serverError]="err('email')" name="email" type="email" [(ngModel)]="email" required maxlength="254"></label>
          <div><button class="btn primary" [disabled]="busy()">Save changes</button></div>
        </form>
        <div class="card mt narrow">
          <h3>Contributions</h3>
          <p class="muted">{{ d.sections }} sections · {{ d.topics }} topics · {{ d.questions }} questions · {{ d.algorithms }} algorithms · {{ d.feedbackSubmitted }} feedback items</p>
        </div>
        <div class="card mt narrow">
          <h3>Role</h3>
          <p class="muted">Administrators can manage users and review feedback. They still cannot read private notes.</p>
          <button class="btn" (click)="toggleRole()" [disabled]="isSelf()" [attr.title]="isSelf() ? 'Another administrator must change your own role' : null">{{ d.role === 'Admin' ? 'Make member' : 'Make administrator' }}</button>
        </div>
      }

      @if (tab() === 'security') {
        <div class="card narrow stack">
          <h3>Password and sessions</h3>
          <p class="muted">Password last changed: {{ d.passwordChangedAt ? (d.passwordChangedAt | date:'medium') : 'never' }}</p>
          <div class="row">
            <button class="btn" (click)="resetPassword()">Reset password</button>
            <button class="btn" (click)="revokeSessions()">Sign out all sessions</button>
            <button class="btn" (click)="toggleDisabled()" [disabled]="isSelf()" [attr.title]="isSelf() ? 'You cannot disable your own account' : null">{{ d.isDisabled ? 'Enable account' : 'Disable account' }}</button>
          </div>
        </div>
        <div class="card narrow mt danger-zone">
          <h3>Danger zone</h3>
          <p class="muted">Deleting removes this account and its private progress, notes, plans and feedback. Shared questions, topics and algorithms stay and are reassigned to you, labelled "former member". Prefer disabling.</p>
          <button class="btn danger" (click)="remove()" [disabled]="isSelf()" [attr.title]="isSelf() ? 'You cannot delete your own account' : null">Delete account…</button>
        </div>
      }

      @if (tab() === 'progress') {
        <p class="muted ro"><app-icon name="lock" [size]="14" /> Read-only summary. Private notes are never shown to administrators.</p>
        <div class="tiles">
          <app-stat-tile label="Completed" tone="ready" [value]="d.completed" />
          <app-stat-tile label="Needs review" [tone]="d.needsReview ? 'warn' : ''" [value]="d.needsReview" />
          <app-stat-tile label="Reviews" [value]="d.reviews" />
          <app-stat-tile label="Plans" [value]="d.plans" />
        </div>
        @if (progress(); as p) {
          <div class="pgrid mt">
            <section class="panel">
              <div class="panel-head"><h2>Status breakdown</h2><span class="spacer"></span><span class="dim small mono">{{ p.progress.length }} touched</span></div>
              <div class="panel-body stack">
                @for (s of statusBreakdown(); track s.status) { <app-meter [label]="s.label" [value]="s.count" [total]="p.progress.length" /> }
              </div>
            </section>
            <section class="panel">
              <div class="panel-head"><h2>Activity</h2><span class="spacer"></span><span class="dim small">recent events</span></div>
              <div class="panel-body"><app-heatmap [activity]="activityByDay()" [weeks]="8" [cell]="18" /></div>
            </section>
          </div>
          <section class="panel mt">
            <div class="panel-head"><h2>Question progress</h2></div>
            <div class="table-wrap">
              <table class="data stack-sm">
                <thead><tr><th>Question</th><th>Status</th><th class="num">Reviews</th><th>Next review</th></tr></thead>
                <tbody>
                  @for (q of p.progress; track q.questionId) {
                    <tr><td data-label="Question"><a [routerLink]="['/questions', q.questionId]">{{ q.question }}</a> @if (q.isFavorite) { <span class="fav" aria-label="Favourite">★</span> }</td>
                      <td data-label="Status"><span class="badge" [class.ok]="q.status === 'Completed'" [class.warn]="q.status === 'NeedsReview'" [class.info]="q.status === 'InProgress'">{{ q.status }}</span></td>
                      <td data-label="Reviews" class="num">{{ q.reviewCount }}</td>
                      <td data-label="Next review" class="small">{{ q.nextReviewAt ? (q.nextReviewAt | date:'MMM d, HH:mm') : '—' }}</td></tr>
                  } @empty { <tr><td colspan="4" class="muted">No progress yet.</td></tr> }
                </tbody>
              </table>
            </div>
          </section>
          <section class="panel mt">
            <div class="panel-head"><h2>Recent activity</h2></div>
            <ul class="events">
              @for (a of p.activity; track $index) { <li><span class="mono dim">{{ a.occurredAt | date:'MMM d, HH:mm' }}</span><span class="badge">{{ a.kind }}</span><a [routerLink]="['/questions', a.questionId]">question #{{ a.questionId }}</a></li> }
              @empty { <li class="muted">No activity.</li> }
            </ul>
          </section>
        } @else { <app-skeleton kind="card" [count]="2" /> }
      }

      @if (tab() === 'audit') {
        <div class="stack">
          @for (a of audit(); track a.id) {
            <div class="row"><span class="small muted">{{ a.at | date:'medium' }}</span><b>{{ a.action }}</b><span>by {{ a.actorName }}</span>@if (a.detail) { <code class="small">{{ a.detail }}</code> }</div>
          } @empty { <p class="muted">No administrative changes recorded for this user.</p> }
        </div>
      }
      </div>
    } @else {
      <app-skeleton kind="detail" />
    }`,
  styles: [`
    .head { align-items: flex-start; gap: 16px; margin-bottom: 8px; } .big { width: 56px; height: 56px; font-size: 20px; }
    .narrow { max-width: 640px; } .small { font-size: 12px; }
    .ro { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .pgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 12px; }
    .fav { color: var(--accent-text); }
    .events { list-style: none; margin: 0; padding: 4px 14px; max-height: 360px; overflow-y: auto; }
    .events li { display: flex; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .events li:last-child { border-bottom: 0; }
    .mono { font-family: var(--mono); font-size: 12px; }
    .danger-zone { border-color: var(--danger); }
  `]
})
export class AdminUserDetailComponent {
  readonly id = input.required<string>();
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private me = inject(AuthService).user;

  readonly u = signal<AdminUserDetail | null>(null);
  readonly notFound = signal(false);
  readonly tab = signal<Tab>('profile');
  readonly progress = signal<AdminProgress | null>(null);
  /** Read-only projections of the user's progress for the charts (no notes are ever loaded). */
  readonly statusBreakdown = computed(() => {
    const rows = this.progress()?.progress ?? [];
    const labels: Record<string, string> = { Completed: 'Completed', InProgress: 'In progress', NeedsReview: 'Needs review', NotStarted: 'Not started' };
    return Object.keys(labels).map(status => ({ status, label: labels[status], count: rows.filter(r => r.status === status).length })).filter(s => s.count > 0 || s.status !== 'NotStarted');
  });
  readonly activityByDay = computed(() => {
    const counts = new Map<string, number>();
    for (const a of this.progress()?.activity ?? []) {
      const d = new Date(a.occurredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].map(([date, count]) => ({ date, count }));
  });
  readonly audit = signal<AuditEntry[]>([]);
  readonly busy = signal(false);
  readonly errors = signal<Record<string, string[]>>({});
  readonly isSelf = computed(() => this.u()?.id === this.me()?.id);
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' }, { id: 'security', label: 'Security' }, { id: 'progress', label: 'Progress' }, { id: 'audit', label: 'Audit' }
  ];
  username = ''; displayName = ''; email = '';

  constructor() {
    effect(() => {
      const id = this.id();
      this.u.set(null); this.notFound.set(false); this.progress.set(null); this.audit.set([]);
      this.api.adminUser(id).subscribe({ next: d => this.apply(d), error: (e: ApiError) => { if (e.code?.endsWith('NOT_FOUND')) this.notFound.set(true); } });
    });
  }

  err(field: string): string { return (this.errors()[field] ?? []).join(' '); }

  select(t: Tab): void {
    this.tab.set(t);
    if (t === 'progress' && !this.progress()) this.api.adminProgress(this.id()).subscribe(p => this.progress.set(p));
    if (t === 'audit') this.api.audit({ target: this.id(), pageSize: 50 }).subscribe(r => this.audit.set(r.items));
  }

  private apply(d: AdminUserDetail): void {
    this.u.set(d); this.username = d.username; this.displayName = d.displayName; this.email = d.email;
  }

  private fields = viewChildren(FieldValidationDirective);

  saveProfile(f: NgForm): void {
    if (!validateForm(this.fields(), f.control)) return;
    this.busy.set(true); this.errors.set({});
    this.api.updateUser(this.id(), { username: this.username, displayName: this.displayName, email: this.email }).subscribe({
      next: d => { this.apply(d); this.busy.set(false); this.toast.show('Saved', 'ok'); },
      error: (e: ApiError) => {
        this.busy.set(false);
        if (e.code === 'USERNAME_TAKEN') this.errors.set({ username: [e.message] });
        else if (e.code === 'EMAIL_TAKEN') this.errors.set({ email: [e.message] });
        else if (e.details) this.errors.set(e.details);
      }
    });
  }

  async toggleRole(): Promise<void> {
    const d = this.u(); if (!d) return;
    const to = d.role === 'Admin' ? 'Member' : 'Admin';
    const ok = await this.dialogs.confirm({
      title: to === 'Admin' ? `Make ${d.displayName} an administrator?` : `Make ${d.displayName} a member?`,
      message: to === 'Admin' ? 'They will be able to manage users, review feedback and edit any shared content.' : 'They will lose all administrator access.',
      confirmLabel: to === 'Admin' ? 'Make administrator' : 'Make member'
    });
    if (ok) this.api.setUserRole(d.id, to).subscribe(x => { this.apply(x); this.toast.show('Role updated', 'ok'); });
  }

  async toggleDisabled(): Promise<void> {
    const d = this.u(); if (!d) return;
    const disable = !d.isDisabled;
    const ok = await this.dialogs.confirm({
      title: disable ? `Disable ${d.displayName}?` : `Enable ${d.displayName}?`,
      message: disable ? 'They are signed out within seconds and cannot sign in. Their data is kept and you can enable the account again.' : 'They can sign in again with their current password.',
      confirmLabel: disable ? 'Disable' : 'Enable', danger: disable
    });
    if (ok) this.api.setUserDisabled(d.id, disable).subscribe(x => { this.apply(x); this.toast.show(disable ? 'Account disabled' : 'Account enabled', 'ok'); });
  }

  async resetPassword(): Promise<void> {
    const d = this.u(); if (!d) return;
    const ok = await this.dialogs.confirm({
      title: `Reset password for ${d.displayName}?`,
      message: 'A temporary password is generated and every session is signed out. They must choose a new password at next sign-in.',
      confirmLabel: 'Reset password', danger: true
    });
    if (!ok) return;
    this.api.resetUserPassword(d.id).subscribe(async r => {
      this.u.update(x => x && { ...x, mustChangePassword: true });
      await this.dialogs.secret({ title: 'Temporary password', message: `Give this to ${d.displayName}.`, value: r.temporaryPassword });
    });
  }

  async revokeSessions(): Promise<void> {
    const d = this.u(); if (!d) return;
    if (await this.dialogs.confirm({ title: `Sign ${d.displayName} out everywhere?`, confirmLabel: 'Sign out', danger: true }))
      this.api.revokeUserSessions(d.id).subscribe(() => this.toast.show('Sessions revoked', 'ok'));
  }

  async remove(): Promise<void> {
    const d = this.u(); if (!d) return;
    const ok = await this.dialogs.confirm({
      title: `Delete ${d.displayName}?`,
      message: 'This permanently removes their progress, notes, plans and feedback. Shared content they added stays and is reassigned to you.',
      confirmLabel: 'Delete account', danger: true, requireText: d.username, inputLabel: `Type ${d.username} to confirm`
    });
    if (ok) this.api.deleteUser(d.id, d.username).subscribe(() => { this.toast.show('Account deleted', 'ok'); this.router.navigate(['/admin/users']); });
  }
}
