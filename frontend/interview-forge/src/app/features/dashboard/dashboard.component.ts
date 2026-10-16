import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dashboard } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ProgressBarComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (data(); as d) {
        <div class="page-header">
          <div>
            <div class="eyebrow">{{ today }}</div>
            <h1>{{ greeting() }}</h1>
            @if (d.currentPlan; as p) {
              <p>{{ p.name }} — <b>Day {{ p.currentDay }} of {{ p.durationDays }}</b>@if (p.status === 'Paused') { <span class="badge warn">paused</span> }</p>
            } @else {
              <p>No active plan. Explore freely, or <a routerLink="/plan/new">create a preparation plan</a>.</p>
            }
          </div>
          @if (d.continue; as c) {
            <a class="btn primary" [routerLink]="['/questions', c.questionId]">Continue preparation →</a>
          }
        </div>

        <div class="grid grid-4">
          <div class="card"><div class="stat-label">Today's target</div>
            <div class="stat-value">{{ d.today?.day?.completed ?? 0 }}<span class="dim"> / {{ d.today?.day?.total ?? 0 }}</span></div>
            <div class="stat-sub">questions in today's plan</div></div>
          <div class="card"><div class="stat-label">Overall</div>
            <div class="stat-value">{{ d.overall.percent | number:'1.0-1' }}%</div>
            <div class="stat-sub">{{ d.overall.completed }} / {{ d.overall.total }} questions</div></div>
          <div class="card"><div class="stat-label">Topics completed</div>
            <div class="stat-value">{{ d.topicsCompleted }}<span class="dim"> / {{ d.topicsTotal }}</span></div>
            <div class="stat-sub">{{ d.questionsRemaining }} questions remaining</div></div>
          <div class="card"><div class="stat-label">Streak</div>
            <div class="stat-value">{{ d.streak }}<span class="dim"> d</span></div>
            <div class="stat-sub">{{ d.completedToday }} completed today</div></div>
        </div>

        <div class="grid grid-2 mt">
          <div class="card">
            <div class="row"><h2>Today's topics</h2><span class="spacer"></span>
              @if (d.currentPlan; as p) { <a class="btn sm" [routerLink]="['/plan', p.id, 'day', p.currentDay]">Open day {{ p.currentDay }}</a> }</div>
            @if (d.today; as t) {
              <app-progress-bar [value]="t.day.completed" [total]="t.day.total" />
              <ul class="topics">
                @for (g of t.topics; track g.topicId) {
                  <li [class.done]="g.completed === g.total">
                    <span class="mark">{{ g.completed === g.total ? '✓' : (g.completed > 0 ? '→' : '○') }}</span>
                    <a [routerLink]="['/topics', g.topicId]">{{ g.topicName }}</a>
                    <span class="spacer"></span><span class="dim mono">{{ g.completed }}/{{ g.total }}</span>
                  </li>
                } @empty { <li class="muted">Nothing scheduled today — a buffer day. Catch up on review.</li> }
              </ul>
            } @else { <p class="muted">Create a plan to get daily targets.</p> }
          </div>

          <div class="card">
            <h2>Attention</h2>
            <div class="attn">
              <a routerLink="/plan" class="attn-item"><span class="stat-value warnc">{{ d.overdueItems }}</span><span>overdue plan questions</span></a>
              <a routerLink="/review" [queryParams]="{ bucket: 'Due' }" class="attn-item"><span class="stat-value infoc">{{ d.dueForReview }}</span><span>due for spaced review</span></a>
              <a routerLink="/review" [queryParams]="{ bucket: 'NeedsReview' }" class="attn-item"><span class="stat-value warnc">{{ d.needsReview }}</span><span>marked needs review</span></a>
            </div>
            @if (d.continue; as c) {
              <div class="next mt"><div class="stat-label">{{ c.reason }}</div>
                <a [routerLink]="['/questions', c.questionId]">{{ c.questionText }}</a><div class="dim">{{ c.topicName }}</div></div>
            }
          </div>
        </div>

        <h2 class="mt-lg">Progress by section</h2>
        <div class="sections">
          @for (s of d.sections; track s.id) {
            @if (s.progress.total > 0) {
              <a class="srow" [routerLink]="['/sections', s.id]">
                <span class="sname">{{ s.name }}</span>
                <app-progress-bar [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" />
                <span class="mono dim">{{ s.progress.percent | number:'1.0-0' }}%</span>
              </a>
            }
          }
        </div>
      } @else if (error()) { <div class="error-box">{{ error() }}</div> } @else { <div class="loading">Loading dashboard…</div> }
    </div>`,
  styles: [`
    .topics { list-style: none; padding: 0; margin: 14px 0 0; }
    .topics li { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border); align-items: center; }
    .topics li:last-child { border-bottom: none; }
    .topics .mark { width: 16px; font-family: var(--mono); color: var(--text-dim); }
    .topics li.done .mark { color: var(--ok); } .topics li.done a { color: var(--text-muted); }
    .mono { font-family: var(--mono); font-size: 13px; }
    .attn { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .attn-item { display: flex; flex-direction: column; color: var(--text-muted); font-size: 13px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
    .attn-item:hover { border-color: var(--border-strong); text-decoration: none; }
    .attn .stat-value { margin: 0 0 2px; font-size: 1.4rem; }
    .warnc { color: var(--warn); } .infoc { color: var(--info); }
    .next a { display: block; color: var(--text); margin-top: 6px; }
    .sections { display: grid; gap: 2px; }
    .srow { display: grid; grid-template-columns: 260px 1fr 52px; gap: 14px; align-items: center; padding: 7px 10px; border-radius: var(--radius-sm); color: var(--text); }
    .srow:hover { background: var(--bg-hover); text-decoration: none; }
    .sname { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 760px) { .srow { grid-template-columns: 1fr 48px; } .srow app-progress-bar { grid-column: 1 / -1; grid-row: 2; } .attn { grid-template-columns: 1fr; } }
  `]
})
export class DashboardComponent {
  private api = inject(ApiService);
  readonly data = signal<Dashboard | null>(null);
  readonly error = signal<string | null>(null);
  readonly today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  constructor() {
    this.api.dashboard().subscribe({ next: d => this.data.set(d), error: e => this.error.set(e.message) });
  }
}
