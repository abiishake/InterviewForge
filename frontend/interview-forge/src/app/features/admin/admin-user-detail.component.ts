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

type Tab = 'profile' | 'security' | 'progress' | 'audit';

@Component({
  selector: 'app-admin-user-detail',
  imports: [FormsModule, RouterLink, DatePipe, FieldValidationDirective, TabListDirective],
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
        <p class="muted">Read-only summary. Private notes are never shown to administrators.</p>
        <div class="row stats">
          <div class="card"><div class="stat-label">Completed</div><div class="stat-value">{{ d.completed }}</div></div>
          <div class="card"><div class="stat-label">Needs review</div><div class="stat-value">{{ d.needsReview }}</div></div>
          <div class="card"><div class="stat-label">Reviews</div><div class="stat-value">{{ d.reviews }}</div></div>
          <div class="card"><div class="stat-label">Plans</div><div class="stat-value">{{ d.plans }}</div></div>
        </div>
        @if (progress(); as p) {
          <h3 class="mt">Question progress</h3>
          <div class="stack">
            @for (q of p.progress; track q.questionId) {
              <div class="row"><a [routerLink]="['/questions', q.questionId]">{{ q.question }}</a><span class="badge">{{ q.status }}</span><span class="muted small">{{ q.reviewCount }} reviews</span>@if (q.isFavorite) { <span aria-label="Favourite">★</span> }</div>
            } @empty { <p class="muted">No progress yet.</p> }
          </div>
          <h3 class="mt">Recent activity</h3>
          @for (a of p.activity; track $index) { <p class="small">{{ a.occurredAt | date:'medium' }} · {{ a.kind }} · question #{{ a.questionId }}</p> } @empty { <p class="muted">No activity.</p> }
        } @else { <p class="loading" role="status">Loading…</p> }
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
      <p class="loading" role="status">Loading…</p>
    }`,
  styles: [`
    .head { align-items: flex-start; gap: 16px; margin-bottom: 8px; } .big { width: 56px; height: 56px; font-size: 20px; }
    .narrow { max-width: 600px; } .small { font-size: 12px; } .stats .card { min-width: 130px; }
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
