import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuestionFilter, SearchResult } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { QuestionListComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-search',
  imports: [FormsModule, RouterLink, QuestionListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="eyebrow">Explore</div>
      <h1>Search topics & questions</h1>
      <form class="search-box" (ngSubmit)="go()">
        <input type="search" name="q" [(ngModel)]="text" placeholder="Entity Framework, async await, RabbitMQ, Kubernetes, System Design…" autofocus />
        <select name="filter" [(ngModel)]="filterValue" (change)="go()">
          <option value="All">All questions</option><option value="Mine">My questions</option><option value="NotStarted">Not started</option>
          <option value="Completed">Completed</option><option value="NeedsReview">Needs review</option><option value="Favorites">Favorites</option>
        </select>
        <button class="btn primary" type="submit">Search</button>
      </form>
      <div class="chips">
        @for (s of suggestions; track s) { <a [routerLink]="['/search']" [queryParams]="{ q: s }" class="badge">{{ s }}</a> }
      </div>

      @if (result(); as r) {
        @if (r.sections.length || r.topics.length) {
          <div class="grid grid-2 mt-lg">
            @if (r.sections.length) {
              <div><h3 class="dim">Sections</h3>
                @for (s of r.sections; track s.id) { <a class="hit" [routerLink]="['/sections', s.id]">{{ s.name }} <span class="dim">· {{ s.topicCount }} topics</span></a> }</div>
            }
            @if (r.topics.length) {
              <div><h3 class="dim">Topics</h3>
                @for (t of r.topics; track t.id) { <a class="hit" [routerLink]="['/topics', t.id]">{{ t.sectionName }} → <b>{{ t.name }}</b> <span class="dim">· {{ t.questionCount }} questions</span></a> }</div>
            }
          </div>
        }
        @if (r.algorithms.length) {
          <h3 class="dim mt-lg">Algorithms</h3>
          <div class="row">@for (a of r.algorithms; track a.id) { <a class="badge info" [routerLink]="['/algorithms', a.slug]">{{ a.name }}</a> }</div>
        }
        <h3 class="dim mt-lg">{{ r.questions.totalCount }} question{{ r.questions.totalCount === 1 ? '' : 's' }}</h3>
        <app-question-list [items]="r.questions.items" [offset]="(r.questions.page - 1) * r.questions.pageSize" emptyText="No questions match. Try fewer words." />
        @if (r.questions.totalPages > 1) {
          <div class="row mt">
            <button class="btn sm" [disabled]="r.questions.page <= 1" (click)="page(r.questions.page - 1)">← Prev</button>
            <span class="dim">Page {{ r.questions.page }} / {{ r.questions.totalPages }}</span>
            <button class="btn sm" [disabled]="r.questions.page >= r.questions.totalPages" (click)="page(r.questions.page + 1)">Next →</button>
          </div>
        }
      } @else if (loading()) { <div class="loading">Searching…</div> }
    </div>`,
  styles: [`
    .search-box { display: flex; gap: 8px; margin-top: 14px; }
    .search-box input { font-size: 16px; padding: 11px 14px; }
    .search-box select { width: 170px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
    .chips a:hover { color: var(--text); text-decoration: none; border-color: var(--accent); }
    .hit { display: block; padding: 6px 0; color: var(--text); border-bottom: 1px solid var(--border); font-size: 14px; }
    @media (max-width: 700px) { .search-box { flex-wrap: wrap; } }
  `]
})
export class SearchComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly q = input<string>();
  readonly filter = input<QuestionFilter>();
  readonly result = signal<SearchResult | null>(null);
  readonly loading = signal(false);
  text = '';
  filterValue: QuestionFilter = 'All';
  readonly suggestions = ['Entity Framework', 'async await', 'RabbitMQ', 'Kubernetes', 'System Design', 'dependency injection', 'Redis', 'OAuth'];

  constructor() {
    effect(() => {
      const q = this.q() ?? '';
      this.text = q;
      this.filterValue = this.filter() ?? 'All';
      this.run(q, this.filterValue, 1);
    });
  }

  go(): void { this.router.navigate(['/search'], { queryParams: { q: this.text.trim() || null, filter: this.filterValue === 'All' ? null : this.filterValue } }); }
  page(p: number): void { this.run(this.text, this.filterValue, p); }

  private run(q: string, f: QuestionFilter, page: number): void {
    if (!q.trim()) { this.result.set(null); return; }
    this.loading.set(true);
    this.api.search(q, f, page).subscribe({ next: r => { this.result.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}
