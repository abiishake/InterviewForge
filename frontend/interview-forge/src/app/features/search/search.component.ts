import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { of } from 'rxjs';
import { createLatest } from '../../core/util/latest';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuestionFilter, SearchResult } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { QuestionListComponent } from '../../shared/components/ui.components';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';


@Component({
  selector: 'app-search',
  imports: [FormsModule, RouterLink, QuestionListComponent, PaginationComponent, SkeletonComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Explore" title="Search" description="Find sections, topics, algorithms and questions across the whole knowledge base." />
      <form class="search-box" (ngSubmit)="go()" role="search">
        <div class="inp"><app-icon name="search" [size]="18" /><input type="search" name="q" [(ngModel)]="text" placeholder="Entity Framework, async await, RabbitMQ, Kubernetes…" aria-label="Search" /></div>
        <select name="filter" [(ngModel)]="filterValue" (change)="go()" aria-label="Question filter">
          <option value="All">All questions</option><option value="Mine">My questions</option><option value="NotStarted">Not started</option>
          <option value="Completed">Completed</option><option value="NeedsReview">Needs review</option><option value="Favorites">Favorites</option>
        </select>
        <button class="btn primary" type="submit">Search</button>
      </form>
      <div class="chips sugg" aria-label="Suggestions">
        @for (s of suggestions; track s) { <a [routerLink]="['/search']" [queryParams]="{ q: s }">{{ s }}</a> }
      </div>

      @if (result(); as r) {
        @if (r.sections.length || r.topics.length || r.algorithms.length) {
          <div class="hits mt">
            @if (r.sections.length) {
              <section class="panel"><div class="panel-head"><app-icon name="layers" [size]="16" /><h2>Sections</h2><span class="spacer"></span><span class="dim small mono">{{ r.sections.length }}</span></div>
                <ul class="hitlist">@for (s of r.sections; track s.id) { <li><a [routerLink]="['/sections', s.id]">{{ s.name }}</a><span class="dim small">{{ s.topicCount }} topics</span></li> }</ul></section>
            }
            @if (r.topics.length) {
              <section class="panel"><div class="panel-head"><app-icon name="hash" [size]="16" /><h2>Topics</h2><span class="spacer"></span><span class="dim small mono">{{ r.topics.length }}</span></div>
                <ul class="hitlist">@for (t of r.topics; track t.id) { <li><a [routerLink]="['/topics', t.id]">{{ t.name }}</a><span class="dim small">{{ t.sectionName }} · {{ t.questionCount }}</span></li> }</ul></section>
            }
            @if (r.algorithms.length) {
              <section class="panel"><div class="panel-head"><app-icon name="code" [size]="16" /><h2>Algorithms</h2><span class="spacer"></span><span class="dim small mono">{{ r.algorithms.length }}</span></div>
                <ul class="hitlist">@for (a of r.algorithms; track a.id) { <li><a [routerLink]="['/algorithms', a.slug]">{{ a.name }}</a></li> }</ul></section>
            }
          </div>
        }
        <section class="panel mt" aria-labelledby="qh">
          <div class="panel-head"><app-icon name="list" [size]="16" /><h2 id="qh" role="status">{{ r.questions.totalCount }} question{{ r.questions.totalCount === 1 ? '' : 's' }}</h2></div>
          <app-question-list class="flush" [items]="r.questions.items" [offset]="(r.questions.page - 1) * r.questions.pageSize" emptyText="No questions match. Try fewer words." />
        </section>
        <app-pagination [page]="r.questions.page" [pageSize]="r.questions.pageSize" [total]="r.questions.totalCount" (pageChange)="page($event)" />
      } @else if (loading()) { <app-skeleton kind="list" [count]="6" /> }
      @else { <div class="hint dim"><app-icon name="search" [size]="28" /><p>Type a term above or pick a suggestion. Press <kbd>Ctrl K</kbd> anywhere for quick search.</p></div> }
    </div>`,
  styles: [`
    .search-box { display: flex; gap: 8px; }
    .inp { position: relative; flex: 1; }
    .inp app-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); pointer-events: none; }
    .inp input { font-size: 15px; height: 42px; padding-left: 38px; }
    .search-box select { width: 170px; height: 42px; }
    .search-box .btn { height: 42px; }
    .sugg { margin-top: 10px; }
    .hits { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 12px; align-items: start; }
    .hitlist { list-style: none; margin: 0; padding: 4px; max-height: 320px; overflow-y: auto; }
    .hitlist li { display: flex; align-items: baseline; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); font-size: 13.5px; }
    .hitlist li:hover { background: var(--bg-hover); }
    .hitlist a { color: var(--text); flex: 1; min-width: 0; overflow-wrap: anywhere; }
    app-question-list.flush ::ng-deep .qlist { border: 0; border-radius: 0 0 var(--radius) var(--radius); }
    app-question-list.flush ::ng-deep .empty { border: 0; }
    .hint { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 16px; }
    .hint p { margin: 8px 0 0; }
    @media (max-width: 700px) { .search-box { flex-wrap: wrap; } .search-box select { flex: 1; } }
  `]
})
export class SearchComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly q = input<string>();
  readonly filter = input<QuestionFilter>();
  readonly result = signal<SearchResult | null>(null);
  readonly loading = signal(false);
  private latestSearch = createLatest();
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
  /** F8: paging always uses the query that produced the current results, not whatever is typed in the box now. */
  private lastQuery = { q: '', f: 'All' as QuestionFilter };
  page(p: number): void { this.run(this.lastQuery.q, this.lastQuery.f, p); }

  private run(q: string, f: QuestionFilter, page: number): void {
    if (!q.trim()) { this.latestSearch(of(null), { next: () => { this.result.set(null); this.loading.set(false); } }); return; } // also cancels any search still in flight
    this.lastQuery = { q, f };
    this.loading.set(true);
    this.latestSearch(this.api.search(q, f, page), { next: r => { this.result.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}
