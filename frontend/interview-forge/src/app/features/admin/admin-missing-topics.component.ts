import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MissingTopic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

/** Skills found in uploaded resumes that the knowledge base does not cover. Shows no resume content or uploader. */
@Component({
  selector: 'app-admin-missing-topics',
  imports: [DatePipe, RouterLink, EmptyStateComponent, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Missing topics</h1>
    <p class="muted sub">Skills that members' resumes mention but the knowledge base doesn't cover. Add a topic with questions and the entry closes automatically, or dismiss skills that don't need content. Uploaders stay anonymous.</p>
    <div class="chips" role="group" aria-label="Status filter">
      @for (s of statuses; track s) { <button type="button" [class.active]="status() === s" [attr.aria-pressed]="status() === s" (click)="setStatus(s)">{{ s }}</button> }
    </div>
    @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
    @else {
      <div class="stack mt">
        @for (t of items(); track t.id) {
          <article class="panel">
            <div class="panel-head">
              <b>{{ t.name }}</b>
              <span class="badge">{{ t.requestCount }} resume{{ t.requestCount === 1 ? '' : 's' }}</span>
              <span class="spacer"></span>
              <span class="badge" [class.warn]="t.status === 'Open'" [class.ok]="t.status === 'Added'">{{ t.status }}</span>
            </div>
            <div class="panel-body row">
              <span class="dim small">First {{ t.firstRequestedAt | date:'MMM d, y' }} · last {{ t.lastRequestedAt | date:'MMM d, y' }}
                @if (t.resolvedBy) { · {{ t.status === 'Dismissed' ? 'dismissed' : 'closed' }} by {{ t.resolvedBy }} }
                @if (t.emailedAt) { · emailed }</span>
              <span class="spacer"></span>
              @if (t.status === 'Open') {
                <a class="btn sm primary" routerLink="/questions/new">Add a question</a>
                <button type="button" class="btn sm" (click)="act(t, 'added')">Mark added</button>
                <button type="button" class="btn sm" (click)="act(t, 'dismiss')">Dismiss</button>
              } @else { <button type="button" class="btn sm" (click)="act(t, 'reopen')">Reopen</button> }
            </div>
          </article>
        } @empty { <app-empty-state icon="check" title="Nothing here" hint="No resume skills with this status." /> }
      </div>
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    }`,
  styles: [`:host { display: block; } h1 { margin: 0; } .sub { margin: 2px 0 12px; font-size: 13px; max-width: 75ch; }
    .small { font-size: 12.5px; } .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }`]
})
export class AdminMissingTopicsComponent implements OnInit {
  private api = inject(ApiService);
  readonly statuses = ['Open', 'Added', 'Dismissed', 'All'];
  readonly status = signal('Open');
  readonly items = signal<MissingTopic[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly pageSize = 50;

  ngOnInit(): void { this.load(); }
  setStatus(s: string): void { this.status.set(s); this.page.set(1); this.load(); }
  go(p: number): void { this.page.set(p); this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.missingTopics(this.status() === 'All' ? '' : this.status(), this.page(), this.pageSize).subscribe({
      next: r => { this.items.set(r.items); this.total.set(r.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  act(t: MissingTopic, action: 'dismiss' | 'added' | 'reopen'): void { this.api.setMissingTopic(t.id, action).subscribe(() => this.load()); }
}
