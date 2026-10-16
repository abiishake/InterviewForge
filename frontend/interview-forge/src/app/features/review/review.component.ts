import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { QuestionSummary, ReviewBucket, ReviewOverview } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { QuestionListComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-review',
  imports: [RouterLink, QuestionListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Review</div><h1>Revisit difficult questions</h1>
        <p>Ratings from interview mode schedule a lightweight spaced review.</p></div>
        <a class="btn primary" routerLink="/interview" [queryParams]="{ bucket: current() }">Practise this queue</a></div>
      @if (overview(); as o) {
        <div class="grid grid-4">
          @for (b of buckets; track b.value) {
            <button class="card link bucket" [class.active]="current() === b.value" (click)="select(b.value)">
              <div class="stat-label">{{ b.label }}</div><div class="stat-value">{{ count(o, b.value) }}</div></button>
          }
        </div>
      }
      <div class="mt-lg"><app-question-list [items]="items()" emptyText="Nothing in this queue. 🎉" /></div>
    </div>`,
  styles: [`.bucket { text-align: left; cursor: pointer; font: inherit; color: inherit; } .bucket.active { border-color: var(--accent); }`]
})
export class ReviewComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly bucket = input<ReviewBucket>();
  readonly current = signal<ReviewBucket>('All');
  readonly overview = signal<ReviewOverview | null>(null);
  readonly items = signal<QuestionSummary[]>([]);
  readonly buckets: { label: string; value: ReviewBucket }[] = [
    { label: 'All needing revision', value: 'All' }, { label: 'Due now', value: 'Due' }, { label: 'Needs review', value: 'NeedsReview' },
    { label: 'Hard', value: 'Hard' }, { label: 'Recently incorrect', value: 'RecentlyIncorrect' }, { label: 'Favorites', value: 'Favorites' }];

  constructor() {
    this.api.reviewOverview().subscribe(o => this.overview.set(o));
    effect(() => {
      const b = this.bucket() ?? 'All';
      this.current.set(b);
      this.api.reviewQueue(b).subscribe(p => this.items.set(p.items));
    });
  }

  select(b: ReviewBucket): void { this.router.navigate(['/review'], { queryParams: { bucket: b } }); }

  count(o: ReviewOverview, b: ReviewBucket): number {
    switch (b) {
      case 'Due': return o.dueNow; case 'Hard': return o.hard; case 'NeedsReview': return o.needsReview;
      case 'RecentlyIncorrect': return o.recentlyIncorrect; case 'Favorites': return o.favorites; default: return o.totalNeedingRevision;
    }
  }
}
