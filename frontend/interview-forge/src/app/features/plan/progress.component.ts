import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OverallProgress } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { HeatmapComponent } from '../../shared/ui/heatmap.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';

@Component({
  selector: 'app-progress',
  imports: [RouterLink, DecimalPipe, SkeletonComponent, PageHeaderComponent, StatTileComponent, MeterComponent, HeatmapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Plan" title="Progress" description="Drill down: overall, section, topic, question." />
      @if (data(); as d) {
        <div class="tiles">
          <app-stat-tile label="Overall" tone="ready" [value]="(d.overall.percent | number:'1.0-1') + '%'" [sub]="d.overall.completed + ' of ' + d.overall.total + ' questions'" />
          <app-stat-tile label="Topics done" [value]="d.topicsCompleted" [total]="d.topicsTotal" sub="every question completed" />
          <app-stat-tile label="In progress" [value]="d.overall.inProgress" sub="started, not finished" />
          <app-stat-tile label="Needs review" [tone]="d.overall.needsReview ? 'warn' : ''" [value]="d.overall.needsReview" sub="marked for another pass" link="/review" />
        </div>

        <div class="top mt">
          <section class="panel" aria-labelledby="ov-h">
            <div class="panel-head"><h2 id="ov-h">Overall readiness</h2></div>
            <div class="panel-body">
              <app-meter class="lg" label="All questions" [value]="d.overall.completed" [total]="d.overall.total" [review]="d.overall.needsReview" />
              <div class="legend small dim"><span><i class="sw ready"></i>Completed</span><span><i class="sw warn"></i>Needs review</span><span><i class="sw rest"></i>Not done</span></div>
            </div>
          </section>
          <section class="panel" aria-labelledby="act-h">
            <div class="panel-head"><h2 id="act-h">Activity</h2><span class="spacer"></span><span class="dim small">last 30 days</span></div>
            <div class="panel-body"><app-heatmap [activity]="d.activity" [today]="d.localDate" [weeks]="5" [cell]="22" /></div>
          </section>
        </div>

        <section class="panel mt" aria-labelledby="sec-h">
          <div class="panel-head"><h2 id="sec-h">Sections</h2><span class="spacer"></span><span class="dim small">{{ sections().length }} with questions</span></div>
          <div class="table-wrap">
            <table class="data stack-sm">
              <thead><tr><th>Section</th><th class="meter-col">Readiness</th><th class="num">Done</th><th class="num">Review</th><th class="num">Topics</th></tr></thead>
              <tbody>
                @for (s of sections(); track s.id) {
                  <tr>
                    <td data-label="Section"><a [routerLink]="['/sections', s.id]">{{ s.name }}</a></td>
                    <td data-label="Readiness" class="meter-col"><app-meter [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" /></td>
                    <td data-label="Done" class="num">{{ s.progress.completed }}/{{ s.progress.total }}</td>
                    <td data-label="Review" class="num" [class.warnc]="s.progress.needsReview > 0">{{ s.progress.needsReview }}</td>
                    <td data-label="Topics" class="num">{{ s.topicCount }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else { <app-skeleton kind="stats" [count]="2" /> }
    </div>`,
  styles: [`
    .top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; }
    @media (max-width: 900px) { .top { grid-template-columns: minmax(0, 1fr); } }
    .legend { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
    .sw.ready { background: var(--ready); } .sw.warn { background: var(--warn); } .sw.rest { background: var(--heat-0); }
    .meter-col { width: 40%; }
    .warnc { color: var(--warn); }
    @media (max-width: 760px) { .meter-col { width: auto; } }
  `]
})
export class ProgressComponent {
  private api = inject(ApiService);
  readonly data = signal<OverallProgress | null>(null);
  readonly sections = computed(() => (this.data()?.sections ?? []).filter(s => s.progress.total > 0));
  constructor() { this.api.overallProgress().subscribe(d => this.data.set(d)); }
}
