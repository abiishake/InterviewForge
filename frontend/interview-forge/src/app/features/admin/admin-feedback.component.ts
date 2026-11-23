import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Feedback } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-admin-feedback',
  imports: [FormsModule, RouterLink, DatePipe, PaginationComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Feedback</h1>
    <p class="muted sub">Suggestions from members about shared content. Accept or reject them with a short reply.</p>
    <div class="chips" role="group" aria-label="Status filter">
      @for (s of statuses; track s) { <button type="button" [class.active]="status() === s" [attr.aria-pressed]="status() === s" (click)="setStatus(s)">{{ s }}</button> }
    </div>
    @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
    @else {
      @for (f of items(); track f.id) {
        <article class="panel mt">
          <div class="panel-head"><span class="avatar sm" aria-hidden="true">{{ f.addedBy.slice(0, 1).toUpperCase() }}</span><b>{{ f.addedBy }}</b>
            <span class="badge">{{ f.kind }}</span><span class="muted ttl">{{ f.contentTitle ?? '(deleted)' }}</span><span class="spacer"></span>
            <span class="badge" [class.ok]="f.status === 'Accepted'" [class.warn]="f.status === 'Pending'" [class.danger]="f.status === 'Rejected'">{{ f.status }}</span></div>
          <div class="panel-body">
            <p class="pre">{{ f.message }}</p>
            <label>Admin response<textarea rows="2" [(ngModel)]="responses[f.id]" [name]="'r' + f.id"></textarea></label>
            <div class="row mt">
              <button class="btn ok" (click)="review(f, 'Accepted')">Accept</button>
              <button class="btn danger" (click)="review(f, 'Rejected')">Reject</button>
              <button class="btn" (click)="review(f, 'Pending')">Reopen</button>
              <span class="spacer"></span><span class="muted small">{{ f.createdAt | date:'medium' }}</span>
              @if (f.contentExists && f.contentUrl) { <a class="btn sm" [routerLink]="f.contentUrl">Open content</a> }
            </div>
          </div>
        </article>
      } @empty { <app-empty-state class="mt" icon="flag" title="No feedback here" hint="Nothing matches this status." /> }
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    }`,
  styles: [`.pre { white-space: pre-wrap; margin: 0 0 12px; } .small { font-size: 12px; } :host { display: block; }
    h1 { margin: 0; } .sub { margin: 2px 0 12px; font-size: 13px; }
    .avatar.sm { width: 24px; height: 24px; font-size: 11px; }
    .ttl { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
    textarea { min-height: 64px; }`]
})
export class AdminFeedbackComponent implements OnInit {
  private api = inject(ApiService);
  readonly statuses = ['Pending', 'Accepted', 'Rejected', 'ContentDeleted', 'All'];
  readonly status = signal('Pending');
  readonly items = signal<Feedback[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = 25;
  responses: Record<number, string> = {};

  ngOnInit(): void { this.load(); }
  setStatus(s: string): void { this.status.set(s); this.page.set(1); this.load(); }
  go(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.feedbackAll(this.status() === 'All' ? '' : this.status(), this.page(), this.pageSize).subscribe({
      next: r => { this.items.set(r.items); this.total.set(r.totalCount); for (const x of r.items) this.responses[x.id] = x.adminResponse ?? ''; this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  review(f: Feedback, status: string): void { this.api.reviewFeedback(f.id, status, this.responses[f.id] ?? '').subscribe(() => this.load()); }
}
