import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Topic } from '../../core/models';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-topics',
  imports: [RouterLink, MeterComponent, PageHeaderComponent, FormsModule, SkeletonComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Knowledge base" title="All topics" description="Every topic grouped by section, with how far you are through each." />
      <div class="toolbar sticky">
        <input type="search" class="search" placeholder="Filter topics or sections…" aria-label="Filter topics" [ngModel]="filter()" (ngModelChange)="filter.set($event)" />
        <label class="checkbox"><input type="checkbox" [ngModel]="withQuestions()" (ngModelChange)="withQuestions.set($event)" /> Only topics with questions</label>
        <span class="spacer"></span><span class="dim small mono">{{ count() }} topics</span>
      </div>
      @if (state() === 'error') { <app-error-state class="mt" (retry)="load()" /> }
      @else if (state() === 'loading') { <app-skeleton kind="list" [count]="8" /> }
      @else {
      @for (g of groups(); track g.section) {
        <section class="panel group">
          <div class="panel-head"><h2>{{ g.section }}</h2><span class="spacer"></span><span class="dim small mono">{{ g.topics.length }}</span></div>
          <div class="list">
            @for (t of g.topics; track t.id) {
              <a class="trow" [routerLink]="['/topics', t.id]"><span class="tname">{{ t.name }} @if(t.addedBy){<span class="badge info">by {{t.addedBy}}</span>}</span>
                <app-meter [value]="t.progress.completed" [total]="t.progress.total" [review]="t.progress.needsReview" />
                <span class="dim mono">{{ t.progress.completed }}/{{ t.progress.total }}</span></a>
            }
          </div>
        </section>
      } @empty { <app-empty-state class="mt" icon="filter" title="No topics match" hint="Try a different filter." /> }
      }
    </div>`,
  styles: [`
    .group + .group { margin-top: 12px; }
    .list { padding: 4px; }
    .trow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(120px, 240px) 64px; gap: 16px; align-items: center; padding: 7px 10px; color: var(--text); border-radius: var(--radius-sm); font-size: 13.5px; transition: background var(--dur-1); }
    .trow:hover { background: var(--bg-hover); text-decoration: none; }
    .tname { min-width: 0; overflow-wrap: anywhere; }
    .mono { font-family: var(--mono); font-size: 12px; text-align: right; }
    @media (max-width: 640px) { .trow { grid-template-columns: minmax(0, 1fr) 56px; row-gap: 6px; } .trow app-meter { grid-column: 1 / -1; grid-row: 2; } }
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
  readonly count = computed(() => this.groups().reduce((n, g) => n + g.topics.length, 0));
  readonly state = signal<'loading' | 'ready' | 'error'>(this.ref.topics() ? 'ready' : 'loading');
  constructor() { this.load(); }
  load(): void {
    if (!this.ref.topics()) this.state.set('loading');
    this.ref.refreshTopics().subscribe({ next: () => this.state.set('ready'), error: () => { if (!this.ref.topics()) this.state.set('error'); } });
  }
}
