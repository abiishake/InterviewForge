import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { AlgorithmSummary } from '../../core/models';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-algorithms',
  imports: [RouterLink, FormsModule, SkeletonComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Independent of the skill matrix</div><h1>Common Algorithms & Data Structures</h1>
        <p>Interview classics with modern C# implementations, complexity and common mistakes.</p></div><a class="btn primary" routerLink="/algorithms/new">+ Add algorithm</a></div>
      <input type="search" name="q" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Filter algorithms…" aria-label="Filter algorithms">
      <div class="chips mt" role="group" aria-label="Category">
        <button type="button" [class.active]="category() === ''" [attr.aria-pressed]="category() === ''" (click)="category.set('')">All</button>
        @for (c of categories(); track c) { <button type="button" [class.active]="category() === c" [attr.aria-pressed]="category() === c" (click)="category.set(c)">{{ c }}</button> }
      </div>
      @if (state() === 'error') { <app-error-state class="mt" (retry)="load()" /> }
      @else if (state() === 'loading') { <app-skeleton kind="card" [count]="3" /> }
      @else {
      @for (g of groups(); track g.category) {
        <h2 class="mt">{{ g.category }}</h2>
        <div class="grid grid-3">
          @for (a of g.items; track a.id) {
            <a class="card link" [routerLink]="['/algorithms', a.slug]"><h3>{{ a.name }}</h3>@if(a.addedBy){<span class="badge info">Added by {{a.addedBy}}</span>}
              <div class="row"><span class="badge">time {{ a.timeComplexity }}</span><span class="badge">space {{ a.spaceComplexity }}</span></div></a>
          }
        </div>
      } @empty { @if (items().length) { <app-empty-state class="mt" icon="code" title="No algorithms match" hint="Try another category or fewer words." /> } @else { <app-empty-state class="mt" icon="code" title="No algorithms yet" hint="Add the first one." /> } }
      }
    </div>`
})
export class AlgorithmsComponent {
  private api = inject(ApiService);
  readonly items = signal<AlgorithmSummary[]>([]);
  readonly query = signal('');
  readonly category = signal('');
  readonly categories = computed(() => [...new Set(this.items().map(a => a.category))]);
  readonly groups = computed(() => {
    const m = new Map<string, AlgorithmSummary[]>();
    const q = this.query().trim().toLowerCase();
    for (const a of this.items().filter(x => (!this.category() || x.category === this.category()) && (!q || x.name.toLowerCase().includes(q)))) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()].map(([category, items]) => ({ category, items }));
  });
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  constructor() { this.load(); }
  load(): void {
    this.state.set('loading');
    this.api.algorithms().subscribe({ next: a => { this.items.set(a); this.state.set('ready'); }, error: () => this.state.set('error') });
  }
}
