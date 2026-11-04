import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OverallProgress } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';
import { RingComponent } from '../../shared/ui/ring.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-progress',
  imports: [RouterLink, ProgressBarComponent, DecimalPipe, RingComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Plan</div><h1>Progress</h1>
        <p>Drill down: overall, section, topic, question.</p></div></div>
      @if (data(); as d) {
        <div class="card">
          <div class="row"><span class="big">{{ d.overall.percent | number:'1.0-1' }}%</span>
            <span class="muted">{{ d.overall.completed }} / {{ d.overall.total }} questions · {{ d.topicsCompleted }} / {{ d.topicsTotal }} topics · {{ d.overall.needsReview }} need review</span></div>
          <div class="mt"><app-progress-bar [value]="d.overall.completed" [total]="d.overall.total" [review]="d.overall.needsReview" /></div>
        </div>

        <h2 class="mt-lg">Last 30 days</h2>
        <div class="card heatwrap" tabindex="0" role="group" aria-label="Activity in the last 30 days (scrolls horizontally)">
          <div class="heat">
            @for (c of cells(); track c.date) {
              <span class="cell" [style.opacity]="c.count ? 0.35 + Math.min(c.count, 20) / 31 : 1" [class.on]="c.count > 0" role="img"
                [attr.aria-label]="c.date + ': ' + c.count + ' actions'" [attr.title]="c.date + ': ' + c.count + ' actions'"></span>
            }
          </div>
          <div class="legend muted small"><span>{{ cells()[0].date }}</span><span>{{ d.localDate }}</span></div>
        </div>

        <h2 class="mt-lg">Sections</h2>
        <div class="grid grid-3">
          @for (s of d.sections; track s.id) {
            @if (s.progress.total > 0) {
              <a class="card link sec" [routerLink]="['/sections', s.id]">
                <app-ring [value]="s.progress.completed" [total]="s.progress.total" [size]="56" [label]="s.name + ' progress'" />
                <div class="grow"><h3>{{ s.name }}</h3>
                  <p class="muted small">{{ s.progress.completed }} / {{ s.progress.total }} questions</p>
                  <app-progress-bar [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" [thin]="true" /></div>
              </a>
            }
          }
        </div>
      } @else { <app-skeleton kind="card" [count]="3" /> }
    </div>`,
  styles: [`
    .big { font: 600 2rem var(--mono); margin-right: 12px; }
    .small { font-size: 13px; margin: 0 0 10px; }
    .heatwrap { overflow-x: auto; }
    .heat { display: grid; grid-template-columns: repeat(30, minmax(22px, 1fr)); gap: 4px; min-width: 700px; }
    .cell { aspect-ratio: 1; border-radius: 3px; background: var(--bg); border: 1px solid var(--border-strong); }
    .cell.on { background: var(--ok); border-color: transparent; }
    .legend { display: flex; justify-content: space-between; margin-top: 8px; min-width: 700px; }
    .sec { display: flex; gap: 14px; align-items: center; } .grow { flex: 1; min-width: 0; }
    @media (max-width: 767px) { .heat { grid-template-columns: repeat(10, 1fr); min-width: 0; } .legend { min-width: 0; } }
  `]
})
export class ProgressComponent {
  private api = inject(ApiService);
  readonly Math = Math;
  readonly data = signal<OverallProgress | null>(null);
  /** Cells end on the server's local "today" and count back; no UTC arithmetic in the browser. */
  readonly cells = computed(() => {
    const d = this.data();
    const map = new Map((d?.activity ?? []).map(a => [a.date, a.count]));
    const [y, m, day] = (d?.localDate ?? new Date().toISOString().slice(0, 10)).split('-').map(Number);
    return Array.from({ length: 30 }, (_, i) => {
      const dt = new Date(Date.UTC(y, m - 1, day - (29 - i)));
      const key = dt.toISOString().slice(0, 10);
      return { date: key, count: map.get(key) ?? 0 };
    });
  });
  constructor() { this.api.overallProgress().subscribe(d => this.data.set(d)); }
}
