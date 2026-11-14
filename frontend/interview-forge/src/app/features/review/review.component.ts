import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { createLatest } from '../../core/util/latest';
import { Router, RouterLink } from '@angular/router';
import { QuestionSummary, ReviewBucket, ReviewOverview } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { QuestionListComponent } from '../../shared/components/ui.components';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-review',
  imports: [RouterLink, QuestionListComponent, PaginationComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Practice</div><h1>Review</h1>
        <p>Ratings from interview mode schedule a lightweight spaced review.</p></div>
        <a class="btn primary practise" routerLink="/interview" [queryParams]="{ bucket: current() }">Practise this queue</a></div>
      @if (overview(); as o) {
        <div class="chips" role="group" aria-label="Review queue">
          @for (b of buckets; track b.value) {
            <button type="button" [class.active]="current() === b.value" [attr.aria-pressed]="current() === b.value" (click)="select(b.value)">{{ b.label }} · {{ count(o, b.value) }}</button>
          }
        </div>
      }
      <div class="mt">
        @if (loading()) { <app-skeleton kind="list" [count]="6" /> }
        @else if (!items().length) { <app-empty-state icon="check" title="Nothing in this queue" hint="Rate questions in interview mode and they will show up here when they are due." /> }
        @else { <app-question-list [items]="items()" [offset]="(page() - 1) * pageSize" /> }
      </div>
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    </div>`,
  styles: [`@media (max-width: 767px) { .practise { position: sticky; bottom: calc(var(--tab-h) + var(--safe-bottom) + 8px); z-index: 10; } }`]
})
export class ReviewComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly bucket = input<ReviewBucket>();
  readonly current = signal<ReviewBucket>('All');
  readonly overview = signal<ReviewOverview | null>(null);
  readonly items = signal<QuestionSummary[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  private latestQueue = createLatest();
  readonly loading = signal(true);
  readonly pageSize = 25;
  readonly buckets: { label: string; value: ReviewBucket }[] = [
    { label: 'All', value: 'All' }, { label: 'Due now', value: 'Due' }, { label: 'Needs review', value: 'NeedsReview' },
    { label: 'Hard', value: 'Hard' }, { label: 'Recently incorrect', value: 'RecentlyIncorrect' }, { label: 'Favorites', value: 'Favorites' }];

  constructor() {
    this.api.reviewOverview().subscribe(o => this.overview.set(o));
    effect(() => {
      const b = this.bucket() ?? 'All';
      untracked(() => { this.current.set(b); this.page.set(1); this.load(); });
    });
  }

  select(b: ReviewBucket): void { this.router.navigate(['/review'], { queryParams: { bucket: b } }); }
  go(p: number): void { this.page.set(p); this.load(); }

  private load(): void {
    this.loading.set(true);
    this.latestQueue(this.api.reviewQueue(this.current(), this.page(), this.pageSize), {
      next: p => { this.items.set(p.items); this.total.set(p.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  count(o: ReviewOverview, b: ReviewBucket): number {
    switch (b) {
      case 'Due': return o.dueNow; case 'Hard': return o.hard; case 'NeedsReview': return o.needsReview;
      case 'RecentlyIncorrect': return o.recentlyIncorrect; case 'Favorites': return o.favorites; default: return o.totalNeedingRevision;
    }
  }
}
