import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlgorithmSummary } from '../../core/models';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-algorithms',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Independent of the skill matrix</div><h1>Common Algorithms & Data Structures</h1>
        <p>Interview classics with modern C# implementations, complexity and common mistakes.</p></div><a class="btn primary" routerLink="/algorithms/new">+ Add algorithm</a></div>
      @for (g of groups(); track g.category) {
        <h2 class="mt">{{ g.category }}</h2>
        <div class="grid grid-3">
          @for (a of g.items; track a.id) {
            <a class="card link" [routerLink]="['/algorithms', a.slug]"><h3>{{ a.name }}</h3>@if(a.addedBy){<span class="badge info">Added by {{a.addedBy}}</span>}
              <div class="row"><span class="badge">time {{ a.timeComplexity }}</span><span class="badge">space {{ a.spaceComplexity }}</span></div></a>
          }
        </div>
      } @empty { <div class="loading">Loading…</div> }
    </div>`
})
export class AlgorithmsComponent {
  private api = inject(ApiService);
  readonly items = signal<AlgorithmSummary[]>([]);
  readonly groups = computed(() => {
    const m = new Map<string, AlgorithmSummary[]>();
    for (const a of this.items()) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()].map(([category, items]) => ({ category, items }));
  });
  constructor() { this.api.algorithms().subscribe(a => this.items.set(a)); }
}
