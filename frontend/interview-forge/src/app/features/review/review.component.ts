import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { createLatest } from '../../core/util/latest';
import { Router, RouterLink } from '@angular/router';
import { QuestionSummary, ReviewBucket, ReviewOverview } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { QuestionListComponent } from '../../shared/components/ui.components';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-review',
  imports: [RouterLink, QuestionListComponent, PaginationComponent, SkeletonComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Practice" title="Review queue" description="Ratings from interview mode schedule a lightweight spaced review.">
        <div actions><a class="btn primary practise" routerLink="/interview" [queryParams]="{ bucket: current() }"><app-icon name="play" [size]="14" /> Practise this queue</a></div>
      </app-page-header>
      @if (overview(); as o) {
        <div class="buckets" role="group" aria-label="Review queue">
          @for (b of buckets; track b.value) {
            <button type="button" class="bucket" [class.active]="current() === b.value" [attr.aria-pressed]="current() === b.value" (click)="select(b.value)">
              <span class="bl">{{ b.label }}</span><span class="bv" [class.hot]="b.value === 'Due' && count(o, b.value) > 0">{{ count(o, b.value) }}</span>
            </button>
          }
        </div>
      }
      <section class="panel mt" aria-live="polite">
        <div class="panel-head"><h2>{{ currentLabel() }}</h2><span class="spacer"></span><span class="dim small mono">{{ total() }}</span></div>
        @if (loading()) { <div class="panel-body"><app-skeleton kind="list" [count]="6" /></div> }
        @else if (!items().length) { <div class="panel-body"><app-empty-state icon="check" title="Nothing in this queue" hint="Rate questions in interview mode and they will show up here when they are due." /></div> }
        @else { <app-question-list class="flush" [items]="items()" [offset]="(page() - 1) * pageSize" /> }
      </section>
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    </div>`,
  styles: [`
    .buckets { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 8px; }
    .bucket { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text-muted); cursor: pointer; font: 13px var(--font); text-align: left;
      transition: border-color var(--dur-1), background var(--dur-1), color var(--dur-1); }
    .bucket:hover { border-color: var(--border-strong); color: var(--text); }
    .bucket.active { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
    .bl { font: 600 10.5px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; }
    .bv { font: 600 1.35rem/1 var(--mono); color: var(--text); }
    .bv.hot { color: var(--warn); }
    app-question-list.flush ::ng-deep .qlist { border: 0; border-radius: 0 0 var(--radius) var(--radius); }
    @media (max-width: 767px) {
      .buckets { display: flex; overflow-x: auto; scrollbar-width: none; } .bucket { flex: none; min-width: 120px; }
      .practise { position: sticky; bottom: calc(var(--tab-h) + var(--safe-bottom) + 8px); z-index: 10; }
    }
  `]
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

  readonly currentLabel = computed(() => this.buckets.find(b => b.value === this.current())?.label ?? 'All');

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
