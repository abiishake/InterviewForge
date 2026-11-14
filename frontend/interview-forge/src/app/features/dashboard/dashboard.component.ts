import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dashboard } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { RingComponent } from '../../shared/ui/ring.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe, RingComponent, IconComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (data(); as d) {
        <div class="head">
          <div class="eyebrow">{{ dateLabel() }}</div>
          <h1>{{ greeting() }}</h1>
          @if (d.currentPlan; as p) {
            @if (p.status === 'Completed') {
              <p>{{ p.name }}: <b>all {{ p.progress.total }} questions completed.</b> <a routerLink="/plan/new">Create your next plan</a></p>
            } @else {
              <p>{{ p.name }}: <b>Day {{ p.currentDay }} of {{ p.durationDays }}</b>@if (p.status === 'Paused') { <span class="badge warn">paused</span> }</p>
            }
          }
        </div>

        @if (d.continue; as c) {
          <a class="card continue" [routerLink]="['/questions', c.questionId]">
            <div class="stat-label">{{ c.reason }}</div>
            <div class="ctext">{{ c.questionText }}</div>
            <div class="row"><span class="dim">{{ c.topicName }}</span><span class="spacer"></span><span class="btn primary">Continue <app-icon name="chevron-right" [size]="16" /></span></div>
          </a>
        }

        <div class="stats mt">
          <div class="card"><div class="stat-label">Today</div>
            <div class="stat-value">{{ d.today?.day?.completed ?? 0 }}<span class="dim"> / {{ d.today?.day?.total ?? 0 }}</span></div>
            <div class="stat-sub">planned questions</div></div>
          <div class="card"><div class="stat-label">Overall</div>
            <div class="stat-value">{{ d.overall.percent | number:'1.0-1' }}%</div>
            <div class="stat-sub">{{ d.overall.completed }} / {{ d.overall.total }}</div></div>
          <div class="card"><div class="stat-label">Topics</div>
            <div class="stat-value">{{ d.topicsCompleted }}<span class="dim"> / {{ d.topicsTotal }}</span></div>
            <div class="stat-sub">{{ d.questionsRemaining }} questions left</div></div>
          <div class="card"><div class="stat-label">Streak</div>
            <div class="stat-value">{{ d.streak }}<span class="dim"> d</span></div>
            <div class="stat-sub">{{ d.completedToday }} done today</div></div>
        </div>

        <div class="attn mt" aria-label="Needs attention">
          <a routerLink="/plan" class="chip-card"><b class="warnc">{{ d.overdueItems }}</b> overdue</a>
          <a routerLink="/review" [queryParams]="{ bucket: 'Due' }" class="chip-card"><b class="infoc">{{ d.dueForReview }}</b> due for review</a>
          <a routerLink="/review" [queryParams]="{ bucket: 'NeedsReview' }" class="chip-card"><b class="warnc">{{ d.needsReview }}</b> need review</a>
        </div>

        <div class="card mt">
          <div class="row"><h2>Today's plan</h2><span class="spacer"></span>
            @if (d.currentPlan; as p) { <a class="btn sm" [routerLink]="['/plan', p.id, 'day', p.currentDay]">Open day {{ p.currentDay }}</a> }</div>
          @if (d.today; as t) {
            <div class="row"><app-ring [value]="t.day.completed" [total]="t.day.total" [size]="64" label="Today's completion" />
              <span class="muted">{{ t.day.completed }} of {{ t.day.total }} done</span></div>
            <ul class="topics">
              @for (g of t.topics; track g.topicId) {
                <li [class.done]="g.completed === g.total">
                  <app-icon [name]="g.completed === g.total ? 'check' : 'list'" [size]="16" />
                  <a [routerLink]="['/topics', g.topicId]">{{ g.topicName }}</a>
                  <span class="spacer"></span><span class="dim mono">{{ g.completed }}/{{ g.total }}</span>
                </li>
              } @empty { <li class="muted">Nothing scheduled today. A buffer day: catch up on review.</li> }
            </ul>
          } @else {
            <app-empty-state icon="calendar" title="No plan yet" hint="Create a plan to get a daily target and a checklist here."><a class="btn primary" routerLink="/plan/new">Create plan</a></app-empty-state>
          }
        </div>

        <h2 class="mt-lg">Progress by section</h2>
        <div class="rings">
          @for (s of d.sections; track s.id) {
            @if (s.progress.total > 0) {
              <a class="ringcard" [routerLink]="['/sections', s.id]">
                <app-ring [value]="s.progress.completed" [total]="s.progress.total" [size]="52" [label]="s.name + ' progress'" />
                <span class="rname">{{ s.name }}<br><span class="dim small">{{ s.progress.completed }} / {{ s.progress.total }}</span></span>
              </a>
            }
          }
        </div>
      } @else if (error()) { <div class="error-box" role="alert">{{ error() }}</div> }
      @else { <app-skeleton kind="stats" [count]="3" /> }
    </div>`,
  styles: [`
    .head p { margin: 0; color: var(--text-muted); }
    .continue { display: flex; flex-direction: column; gap: 10px; color: var(--text); border-color: var(--accent); }
    .continue:hover { text-decoration: none; background: var(--bg-hover); }
    .ctext { font-size: var(--fs-lg, 1.2rem); font-weight: 500; }
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (min-width: 900px) { .stats { grid-template-columns: repeat(4, 1fr); } }
    .attn { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip-card { display: inline-flex; gap: 6px; align-items: baseline; padding: 8px 14px; border: 1px solid var(--border-strong); border-radius: 999px; color: var(--text); background: var(--bg-card); min-height: 40px; align-items: center; }
    .chip-card:hover { text-decoration: none; border-color: var(--accent); }
    .warnc { color: var(--warn); } .infoc { color: var(--info); }
    .topics { list-style: none; padding: 0; margin: 14px 0 0; }
    .topics li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); align-items: center; }
    .topics li:last-child { border-bottom: none; }
    .topics li.done { color: var(--ok); } .topics li.done a { color: var(--text-muted); }
    .mono { font-family: var(--mono); font-size: 13px; } .small { font-size: 12px; }
    .rings { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: 10px; }
    .ringcard { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text); }
    .ringcard:hover { text-decoration: none; border-color: var(--border-strong); background: var(--bg-hover); }
    .rname { font-size: 14px; min-width: 0; overflow-wrap: anywhere; }
  `]
})
export class DashboardComponent {
  private api = inject(ApiService);
  readonly data = signal<Dashboard | null>(null);
  readonly error = signal<string | null>(null);
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
  }
}
