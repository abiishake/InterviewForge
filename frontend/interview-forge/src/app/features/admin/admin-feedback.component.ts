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
    <div class="chips" role="group" aria-label="Status filter">
      @for (s of statuses; track s) { <button type="button" [class.active]="status() === s" [attr.aria-pressed]="status() === s" (click)="setStatus(s)">{{ s }}</button> }
    </div>
    @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
    @else {
      @for (f of items(); track f.id) {
        <article class="card mt">
          <div class="row"><b>{{ f.addedBy }}</b><span class="muted">{{ f.kind }}: {{ f.contentTitle ?? '(deleted)' }}</span><span class="badge">{{ f.status }}</span>
            <span class="spacer"></span><span class="muted small">{{ f.createdAt | date:'medium' }}</span>
            @if (f.contentExists && f.contentUrl) { <a class="btn sm" [routerLink]="f.contentUrl">Open content</a> }</div>
          <p class="pre">{{ f.message }}</p>
          <label>Admin response<textarea rows="2" [(ngModel)]="responses[f.id]" [name]="'r' + f.id"></textarea></label>
          <div class="row mt">
            <button class="btn ok" (click)="review(f, 'Accepted')">Accept</button>
            <button class="btn danger" (click)="review(f, 'Rejected')">Reject</button>
            <button class="btn" (click)="review(f, 'Pending')">Reopen</button>
          </div>
        </article>
      } @empty { <app-empty-state class="mt" icon="flag" title="No feedback here" hint="Nothing matches this status." /> }
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    }`,
  styles: [`.pre { white-space: pre-wrap; } .small { font-size: 12px; } :host { display: block; }`]
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
