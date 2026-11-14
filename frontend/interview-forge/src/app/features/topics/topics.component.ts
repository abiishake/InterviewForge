import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Topic } from '../../core/models';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-topics',
  imports: [RouterLink, ProgressBarComponent, FormsModule, SkeletonComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Knowledge base</div><h1>All topics</h1></div>
        <input type="search" class="filter" placeholder="Filter topics…" [ngModel]="filter()" (ngModelChange)="filter.set($event)" />
        <label class="checkbox"><input type="checkbox" [ngModel]="withQuestions()" (ngModelChange)="withQuestions.set($event)" /> Only topics with questions</label>
      </div>
      @if (state() === 'error') { <app-error-state class="mt" (retry)="load()" /> }
      @else if (state() === 'loading') { <app-skeleton kind="list" [count]="8" /> }
      @else {
      @for (g of groups(); track g.section) {
        <h2 class="mt">{{ g.section }}</h2>
        <div class="list">
          @for (t of g.topics; track t.id) {
            <a class="trow" [routerLink]="['/topics', t.id]"><span>{{ t.name }} @if(t.addedBy){<span class="badge info">Added by {{t.addedBy}}</span>}</span>
              <app-progress-bar [value]="t.progress.completed" [total]="t.progress.total" [thin]="true" />
              <span class="dim mono">{{ t.progress.completed }}/{{ t.progress.total }}</span></a>
          }
        </div>
      } @empty { <app-empty-state class="mt" icon="filter" title="No topics match" hint="Try a different filter." /> }
      }
    </div>`,
  styles: [`
    .filter { max-width: 260px; }
    .list { display: grid; gap: 1px; }
    .trow { display: grid; grid-template-columns: 1fr 200px 60px; gap: 14px; align-items: center; padding: 7px 10px; color: var(--text); border-radius: var(--radius-sm); }
    .trow:hover { background: var(--bg-hover); text-decoration: none; }
    .mono { font-family: var(--mono); font-size: 12px; text-align: right; }
    @media (max-width: 640px) { .trow { grid-template-columns: minmax(0, 1fr) 56px; } .trow app-progress-bar { grid-column: 1 / -1; grid-row: 2; } .filter { max-width: none; } }
  `]
})
export class TopicsComponent {
  private ref = inject(ReferenceDataService);
  readonly topics = computed<Topic[]>(() => this.ref.topics() ?? []);
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
  readonly state = signal<'loading' | 'ready' | 'error'>(this.ref.topics() ? 'ready' : 'loading');
  constructor() { this.load(); }
  load(): void {
    if (!this.ref.topics()) this.state.set('loading');
    this.ref.refreshTopics().subscribe({ next: () => this.state.set('ready'), error: () => { if (!this.ref.topics()) this.state.set('error'); } });
  }
}
