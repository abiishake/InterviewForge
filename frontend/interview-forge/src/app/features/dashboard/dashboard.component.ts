import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dashboard, OverallProgress } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { HeatmapComponent } from '../../shared/ui/heatmap.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { RingComponent } from '../../shared/ui/ring.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe, RingComponent, IconComponent, SkeletonComponent, EmptyStateComponent, PageHeaderComponent, StatTileComponent, MeterComponent, HeatmapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (data(); as d) {
        <app-page-header [eyebrow]="dateLabel()" [title]="greeting()">
          @if (d.currentPlan; as p) {
            <p class="plan-line">
              @if (p.status === 'Completed') { {{ p.name }}: all {{ p.progress.total }} questions completed. }
              @else { {{ p.name }} · Day {{ p.currentDay }} of {{ p.durationDays }} @if (p.status === 'Paused') { <span class="badge warn">paused</span> } }
            </p>
          } @else { <p class="plan-line">No active plan. Create one to get a daily target.</p> }
          <div actions>
            <a class="btn" routerLink="/interview"><app-icon name="play" [size]="16" /> Interview mode</a>
            @if (d.currentPlan; as p) {
              @if (p.status === 'Completed') { <a class="btn primary" routerLink="/plan/new">Create next plan</a> }
              @else { <a class="btn primary" [routerLink]="['/plan', p.id, 'day', p.currentDay]">Open day {{ p.currentDay }}</a> }
            } @else { <a class="btn primary" routerLink="/plan/new">Create plan</a> }
          </div>
        </app-page-header>

        @if (d.continue; as c) {
          <a class="next" [routerLink]="['/questions', c.questionId]">
            <span class="next-ico" aria-hidden="true"><app-icon name="arrow-right" [size]="18" /></span>
            <span class="next-txt"><span class="next-lbl">{{ c.reason }} · {{ c.topicName }}</span><span class="next-q">{{ c.questionText }}</span></span>
            <span class="btn primary sm">Continue</span>
          </a>
        }

        <div class="tiles">
          <app-stat-tile label="Today" icon="calendar" [value]="d.today?.day?.completed ?? 0" [total]="d.today?.day?.total ?? 0" sub="planned questions" />
          <app-stat-tile label="Overall" icon="target" tone="ready" [value]="(d.overall.percent | number:'1.0-1') + '%'" [sub]="d.overall.completed + ' of ' + d.overall.total + ' answered'" link="/progress" />
          <app-stat-tile label="Topics" icon="hash" [value]="d.topicsCompleted" [total]="d.topicsTotal" [sub]="d.questionsRemaining + ' questions left'" link="/topics" />
          <app-stat-tile label="Streak" icon="bolt" [value]="d.streak" unit="d" [sub]="d.completedToday + ' done today'" />
        </div>

        <div class="split mt">
          <div class="stack">
            <section class="panel" aria-labelledby="today-h">
              <div class="panel-head"><h2 id="today-h">Today's plan</h2><span class="spacer"></span>
                @if (d.today; as t) { <span class="dim mono small">{{ t.day.completed }}/{{ t.day.total }}</span> }</div>
              @if (d.today; as t) {
                <div class="today">
                  <app-ring [value]="t.day.completed" [total]="t.day.total" [size]="72" label="Today's completion" />
                  <ul class="checklist">
                    @for (g of t.topics; track g.topicId) {
                      <li [class.done]="g.completed === g.total">
                        <span class="tick" aria-hidden="true">@if (g.completed === g.total) { <app-icon name="check" [size]="13" /> }</span>
                        <a [routerLink]="['/topics', g.topicId]">{{ g.topicName }}</a>
                        <span class="dim small sec">{{ g.sectionName }}</span>
                        <span class="spacer"></span><span class="dim mono small">{{ g.completed }}/{{ g.total }}</span>
                      </li>
                    } @empty { <li class="muted">Nothing scheduled today. A buffer day: catch up on review.</li> }
                  </ul>
                </div>
              } @else {
                <div class="panel-body"><app-empty-state icon="calendar" title="No plan yet" hint="Create a plan to get a daily target and a checklist here."><a class="btn primary" routerLink="/plan/new">Create plan</a></app-empty-state></div>
              }
            </section>

            <section class="panel" aria-labelledby="ready-h">
              <div class="panel-head"><h2 id="ready-h">Readiness by section</h2><span class="spacer"></span><a class="btn sm ghost" routerLink="/sections">All sections</a></div>
              <div class="panel-body meters">
                @for (s of sections(); track s.id) {
                  <a class="meter-link" [routerLink]="['/sections', s.id]"><app-meter [label]="s.name" [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" /></a>
                } @empty { <p class="muted">No sections with questions yet.</p> }
              </div>
            </section>
          </div>

          <aside class="rail-col" aria-label="Activity and attention">
            <section class="panel" aria-labelledby="act-h">
              <div class="panel-head"><h2 id="act-h">Activity</h2><span class="spacer"></span><span class="dim small">last 30 days</span></div>
              <div class="panel-body">
                @if (activity(); as a) { <app-heatmap [activity]="a.activity" [today]="a.localDate" [weeks]="5" [cell]="22" /> }
                @else { <div class="heat-ph" aria-hidden="true"></div> }
              </div>
            </section>
            <section class="panel" aria-labelledby="attn-h">
              <div class="panel-head"><h2 id="attn-h">Needs attention</h2></div>
              <ul class="attn">
                <li><a routerLink="/plan"><app-icon name="clock" [size]="16" /><span>Overdue plan items</span><b [class.warnc]="d.overdueItems > 0">{{ d.overdueItems }}</b></a></li>
                <li><a routerLink="/review" [queryParams]="{ bucket: 'Due' }"><app-icon name="refresh" [size]="16" /><span>Due for review</span><b [class.infoc]="d.dueForReview > 0">{{ d.dueForReview }}</b></a></li>
                <li><a routerLink="/review" [queryParams]="{ bucket: 'NeedsReview' }"><app-icon name="flag" [size]="16" /><span>Marked needs review</span><b [class.warnc]="d.needsReview > 0">{{ d.needsReview }}</b></a></li>
              </ul>
            </section>
          </aside>
        </div>
      } @else if (error()) { <div class="error-box" role="alert">{{ error() }}</div> }
      @else { <app-skeleton kind="stats" [count]="3" /> }
    </div>`,
  styles: [`
    .plan-line { margin: 4px 0 0; color: var(--text-muted); font-size: 13.5px; }
    .next { display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 14px; margin-bottom: 12px; border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 0 var(--radius) var(--radius) 0;
      background: var(--bg-card); color: var(--text); transition: background var(--dur-1); }
    .next:hover { background: var(--bg-hover); text-decoration: none; }
    .next-ico { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: var(--accent-soft); color: var(--accent-text); flex: none; }
    .next-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .next-lbl { font: 600 10.5px/1.4 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); }
    .next-q { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .today { display: flex; gap: 18px; align-items: flex-start; padding: 14px; }
    .checklist { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 0; }
    .checklist li { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; min-width: 0; }
    .checklist li:last-child { border-bottom: 0; }
    .checklist a { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .checklist .sec { white-space: nowrap; }
    .checklist li.done a { color: var(--text-dim); text-decoration: line-through; text-decoration-color: var(--border-strong); }
    .tick { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border-strong); flex: none; }
    li.done .tick { background: var(--ready); border-color: var(--ready); color: var(--bg-card); }
    .meters { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 14px 24px; }
    .meter-link { display: block; color: inherit; padding: 4px; margin: -4px; border-radius: var(--radius-sm); }
    .meter-link:hover { background: var(--bg-hover); text-decoration: none; }
    .attn { list-style: none; margin: 0; padding: 4px; }
    .attn a { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 13.5px; }
    .attn a:hover { background: var(--bg-hover); color: var(--text); text-decoration: none; }
    .attn span { flex: 1; }
    .attn b { font: 600 13px var(--mono); color: var(--text-dim); }
    .warnc { color: var(--warn) !important; } .infoc { color: var(--info) !important; }
    .heat-ph { height: 180px; border-radius: var(--radius-sm); background: var(--heat-0); opacity: .5; }
    @media (max-width: 600px) { .today { flex-direction: column; align-items: stretch; } .today app-ring { align-self: center; } .checklist .sec { display: none; } }
  `]
})
export class DashboardComponent {
  private api = inject(ApiService);
  readonly data = signal<Dashboard | null>(null);
  readonly activity = signal<OverallProgress | null>(null);
  readonly error = signal<string | null>(null);
  /** Sections that have questions, in curriculum order. */
  readonly sections = computed(() => (this.data()?.sections ?? []).filter(s => s.progress.total > 0));
  /** "Today" comes from the server so it matches the account's time zone. */
  readonly dateLabel = computed(() => {
    const d = this.data()?.localDate;
    const date = d ? new Date(d + 'T00:00:00') : new Date();
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  });
  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  constructor() {
    this.api.dashboard().subscribe({ next: d => this.data.set(d), error: e => this.error.set(e.message) });
    // the heatmap is secondary: load it in parallel and never toast if it fails
    this.api.overallProgressQuiet().subscribe({ next: p => this.activity.set(p), error: () => {} });
  }
}
