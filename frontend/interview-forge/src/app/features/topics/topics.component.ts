import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-topics',
  imports: [RouterLink, ProgressBarComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Knowledge base</div><h1>All topics</h1></div>
        <input type="search" class="filter" placeholder="Filter topics…" [ngModel]="filter()" (ngModelChange)="filter.set($event)" />
        <label class="checkbox"><input type="checkbox" [ngModel]="withQuestions()" (ngModelChange)="withQuestions.set($event)" /> Only topics with questions</label>
      </div>
      @for (g of groups(); track g.section) {
        <h2 class="mt">{{ g.section }}</h2>
        <div class="list">
          @for (t of g.topics; track t.id) {
            <a class="trow" [routerLink]="['/topics', t.id]"><span>{{ t.name }} @if(t.addedBy){<span class="badge info">Added by {{t.addedBy}}</span>}</span>
              <app-progress-bar [value]="t.progress.completed" [total]="t.progress.total" [thin]="true" />
              <span class="dim mono">{{ t.progress.completed }}/{{ t.progress.total }}</span></a>
          }
        </div>
      }
    </div>`,
  styles: [`
    .filter { max-width: 260px; }
    .list { display: grid; gap: 1px; }
    .trow { display: grid; grid-template-columns: 1fr 200px 60px; gap: 14px; align-items: center; padding: 7px 10px; color: var(--text); border-radius: var(--radius-sm); }
    .trow:hover { background: var(--bg-hover); text-decoration: none; }
    .mono { font-family: var(--mono); font-size: 12px; text-align: right; }
  `]
})
export class TopicsComponent {
  private api = inject(ApiService);
  readonly topics = signal<Topic[]>([]);
  readonly filter = signal('');
  readonly withQuestions = signal(true);
  readonly groups = computed(() => {
    const f = this.filter().toLowerCase();
    const map = new Map<string, Topic[]>();
    for (const t of this.topics()) {
      if (this.withQuestions() && t.progress.total === 0) continue;
      if (f && !t.name.toLowerCase().includes(f) && !t.sectionName.toLowerCase().includes(f)) continue;
      map.set(t.sectionName, [...(map.get(t.sectionName) ?? []), t]);
    }
    return [...map.entries()].map(([section, topics]) => ({ section, topics }));
  });
  constructor() { this.api.topics().subscribe(t => this.topics.set(t)); }
}
