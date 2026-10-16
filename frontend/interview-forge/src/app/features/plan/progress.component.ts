import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OverallProgress } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-progress',
  imports: [RouterLink, ProgressBarComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Progress</div><h1>Overall preparation</h1>
        <p>Drill down: overall → section → topic → question.</p></div></div>
      @if (data(); as d) {
        <div class="card">
          <div class="row"><span class="big">{{ d.overall.percent | number:'1.0-1' }}%</span>
            <span class="muted">{{ d.overall.completed }} / {{ d.overall.total }} questions · {{ d.topicsCompleted }} / {{ d.topicsTotal }} topics · {{ d.overall.needsReview }} need review</span></div>
          <div class="mt"><app-progress-bar [value]="d.overall.completed" [total]="d.overall.total" [review]="d.overall.needsReview" /></div>
        </div>

        <h2 class="mt-lg">Last 30 days</h2>
        <div class="heat card">
          @for (c of cells(); track c.date) { <span class="cell" [style.opacity]="c.count ? 0.25 + Math.min(c.count, 20) / 26 : 1" [class.on]="c.count > 0" [attr.title]="c.date + ': ' + c.count + ' actions'"></span> }
        </div>

        <h2 class="mt-lg">Sections</h2>
        <div class="grid grid-3">
          @for (s of d.sections; track s.id) {
            @if (s.progress.total > 0) {
              <a class="card link" [routerLink]="['/sections', s.id]">
                <div class="row"><h3>{{ s.name }}</h3><span class="spacer"></span><span class="mono">{{ s.progress.percent | number:'1.0-0' }}%</span></div>
                <p class="muted small">{{ s.progress.completed }} / {{ s.progress.total }} questions</p>
                <app-progress-bar [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" />
              </a>
            }
          }
        </div>
      } @else { <div class="loading">Loading…</div> }
    </div>`,
  styles: [`
    .big { font: 600 2rem var(--mono); margin-right: 12px; }
    .mono { font-family: var(--mono); font-size: 13px; } .small { font-size: 13px; margin: 0 0 10px; }
    .heat { display: grid; grid-template-columns: repeat(30, 1fr); gap: 4px; }
    .cell { aspect-ratio: 1; border-radius: 3px; background: var(--bg); border: 1px solid var(--border); }
    .cell.on { background: var(--ok); border-color: transparent; }
  `]
})
export class ProgressComponent {
  private api = inject(ApiService);
  readonly Math = Math;
  readonly data = signal<OverallProgress | null>(null);
  readonly cells = computed(() => {
    const map = new Map((this.data()?.activity ?? []).map(a => [a.date, a.count]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: map.get(key) ?? 0 };
    });
  });
  constructor() { this.api.overallProgress().subscribe(d => this.data.set(d)); }
}
