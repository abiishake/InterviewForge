import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { AlgorithmSummary } from '../../core/models';
import { ReferenceDataService } from '../../core/services/reference-data.service';

@Component({
  selector: 'app-algorithms',
  imports: [RouterLink, FormsModule, SkeletonComponent, EmptyStateComponent, ErrorStateComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Library" title="Algorithms and data structures" description="Interview classics with modern C# implementations, complexity and common mistakes.">
        <div actions><a class="btn primary" routerLink="/algorithms/new"><app-icon name="plus" [size]="14" /> Add algorithm</a></div>
      </app-page-header>
      <div class="toolbar sticky">
        <input type="search" class="search" name="q" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Filter algorithms…" aria-label="Filter algorithms">
        <div class="chips" role="group" aria-label="Category">
          <button type="button" [class.active]="category() === ''" [attr.aria-pressed]="category() === ''" (click)="category.set('')">All</button>
          @for (c of categories(); track c) { <button type="button" [class.active]="category() === c" [attr.aria-pressed]="category() === c" (click)="category.set(c)">{{ c }}</button> }
        </div>
      </div>
      @if (state() === 'error') { <app-error-state class="mt" (retry)="load()" /> }
      @else if (state() === 'loading') { <app-skeleton kind="grid" [count]="6" /> }
      @else {
      @for (g of groups(); track g.category) {
        <div class="cat"><h2>{{ g.category }}</h2><span class="dim small mono">{{ g.items.length }}</span></div>
        <div class="algos">
          @for (a of g.items; track a.id) {
            <a class="algo" [routerLink]="['/algorithms', a.slug]">
              <span class="aico" aria-hidden="true"><app-icon name="code" [size]="16" /></span>
              <span class="abody"><span class="aname">{{ a.name }}</span>
                <span class="cx"><span title="Time complexity"><i>T</i> {{ a.timeComplexity }}</span><span title="Space complexity"><i>S</i> {{ a.spaceComplexity }}</span>@if (a.addedBy) { <span class="badge info">by {{ a.addedBy }}</span> }</span></span>
              <app-icon class="chev" name="chevron-right" [size]="16" />
            </a>
          }
        </div>
      } @empty { @if (items().length) { <app-empty-state class="mt" icon="code" title="No algorithms match" hint="Try another category or fewer words." /> } @else { <app-empty-state class="mt" icon="code" title="No algorithms yet" hint="Add the first one." /> } }
      }
    </div>`,
  styles: [`
    .toolbar .chips { flex: 1 1 auto; min-width: 0; padding-bottom: 0; }
    .cat { display: flex; align-items: baseline; gap: 8px; margin: 18px 0 8px; } .cat h2 { margin: 0; font-size: 14px; }
    .algos { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 8px; }
    .algo { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text);
      transition: border-color var(--dur-1), background var(--dur-1); }
    .algo:hover { border-color: var(--border-strong); background: var(--bg-hover); text-decoration: none; }
    .algo:hover .chev { transform: translateX(2px); color: var(--text); }
    .aico { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: var(--info-soft); color: var(--info); flex: none; }
    .abody { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
    .aname { font-weight: 500; font-size: 13.5px; }
    .cx { display: flex; gap: 10px; flex-wrap: wrap; font: 11.5px var(--mono); color: var(--text-muted); }
    .cx i { font-style: normal; color: var(--text-dim); }
    .chev { color: var(--text-dim); transition: transform var(--dur-1), color var(--dur-1); }
  `]
})
export class AlgorithmsComponent {
  private ref = inject(ReferenceDataService);
  readonly items = computed<AlgorithmSummary[]>(() => this.ref.algorithms() ?? []);
  readonly query = signal('');
  readonly category = signal('');
  readonly categories = computed(() => [...new Set(this.items().map(a => a.category))]);
  readonly groups = computed(() => {
    const m = new Map<string, AlgorithmSummary[]>();
    const q = this.query().trim().toLowerCase();
    for (const a of this.items().filter(x => (!this.category() || x.category === this.category()) && (!q || x.name.toLowerCase().includes(q)))) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()].map(([category, items]) => ({ category, items }));
  });
  readonly state = signal<'loading' | 'ready' | 'error'>(this.ref.algorithms() ? 'ready' : 'loading');
  constructor() { this.load(); }
  load(): void {
    if (!this.ref.algorithms()) this.state.set('loading');
    this.ref.refreshAlgorithms().subscribe({ next: () => this.state.set('ready'), error: () => { if (!this.ref.algorithms()) this.state.set('error'); } });
  }
}
