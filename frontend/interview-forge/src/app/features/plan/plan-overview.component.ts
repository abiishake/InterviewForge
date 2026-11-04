import { DialogService } from '../../core/services/dialog.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Plan, PlanDaySummary } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { MenuComponent, MenuItem } from '../../shared/ui/menu.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-plan-overview',
  imports: [RouterLink, ProgressBarComponent, DatePipe, DecimalPipe, MenuComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
      @else if (plan(); as p) {
        <div class="page-header">
          <div>
            <div class="eyebrow">Preparation plan</div>
            <h1>{{ p.name }}</h1>
            <p>Day <b>{{ p.currentDay }}</b> of {{ p.durationDays }} · {{ p.questionsPerDay }} questions/day · {{ p.studyMinutesPerDay }} min/day · started {{ p.startDate | date:'mediumDate' }}
              @if (p.status === 'Paused') { <span class="badge warn">paused</span> }</p>
          </div>
          <div class="row">
            @if (p.status === 'Completed') { <a class="btn primary" routerLink="/plan/new">Create next plan</a> }
            @else { <a class="btn primary" [routerLink]="['/plan', p.id, 'day', p.currentDay]">Today's target</a> }
            <app-menu label="Plan actions" [items]="menuItems()" />
          </div>
        </div>

        @if (p.status === 'Completed') {
          <div class="card done-card" role="status"><b>Plan complete.</b> Every planned question is done. Start a new plan to keep going.</div>
        }
        <div class="card" [class.mt]="p.status === 'Completed'">
          <div class="row"><b>{{ p.progress.completed }} / {{ p.progress.total }}</b><span class="muted">planned questions completed</span><span class="spacer"></span>
            <span class="mono">{{ p.progress.percent | number:'1.0-1' }}%</span></div>
          <div class="mt"><app-progress-bar [value]="p.progress.completed" [total]="p.progress.total" [review]="p.progress.needsReview" /></div>
          @if (p.unscheduledCount > 0) {
            <p class="muted mt">{{ p.unscheduledCount }} eligible questions did not fit the plan — increase questions/day or duration, then regenerate.</p>
          }
        </div>

        <h2 class="mt-lg">Calendar</h2>
        <div class="weekdays" aria-hidden="true">@for (w of weekdays; track w) { <span>{{ w }}</span> }</div>
        <div class="calendar">
          @for (d of days(); track d.id; let first = $first) {
            <a class="day" [routerLink]="['/plan', p.id, 'day', d.dayNumber]" [class.today]="d.isToday" [class.done]="d.status === 'Completed'"
               [class.skipped]="d.status === 'Skipped'" [class.overdue]="d.isPast && d.status === 'Pending' && d.total > 0" [style.grid-column-start]="first ? startColumn() : null">
              <div class="row"><b>Day {{ d.dayNumber }}</b><span class="spacer"></span><span class="dim small">{{ d.date | date:'EEE d MMM' }}</span></div>
              @if (d.isToday) { <span class="badge accent">today</span> } @else if (d.isPast && d.status === 'Pending' && d.total > 0 && d.completed < d.total) { <span class="badge warn">overdue</span> }
              <div class="small topics">{{ d.topicNames.slice(0, 3).join(' · ') || d.title }}</div>
              <app-progress-bar [value]="d.completed" [total]="d.total" [thin]="true" />
              <div class="small dim">{{ d.completed }}/{{ d.total }} @if (d.status === 'Skipped') { · skipped }</div>
            </a>
          }
        </div>

        @if (plans().length > 1) {
          <h2 class="mt-lg">Other plans</h2>
          <div class="grid grid-3">
            @for (o of plans(); track o.id) {
              @if (!o.isCurrent) {
                <div class="card"><h3>{{ o.name }}</h3><p class="muted small">{{ o.durationDays }} days · {{ o.progress.percent | number:'1.0-0' }}%</p>
                  <div class="row"><button class="btn sm" (click)="makeCurrent(o)">Make current</button><button class="btn sm danger" (click)="remove(o)">Delete</button></div></div>
              }
            }
          </div>
        }
        <p class="mt-lg"><a routerLink="/plan/new">+ Create another plan</a></p>
      } @else {
        <app-empty-state icon="calendar" title="No plan yet" hint="A plan spreads the knowledge base across days, following the skill-matrix order: fundamentals, architecture, cloud, interview scenarios.">
          <a class="btn primary" routerLink="/plan/new">Create a preparation plan</a></app-empty-state>
      }
    </div>`,
  styles: [`
    .mono { font-family: var(--mono); } .small { font-size: 12.5px; }
    .done-card { border-color: var(--ok); background: var(--ok-soft); margin-bottom: 14px; }
    .weekdays { display: none; }
    .calendar { display: flex; flex-direction: column; gap: 8px; }
    @media (min-width: 768px) {
      .weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-bottom: 6px; font: 600 11px var(--mono); text-transform: uppercase; letter-spacing: .1em; color: var(--text-dim); }
      .calendar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
      .day { min-height: 108px; }
    }
    .day { display: flex; flex-direction: column; gap: 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; color: var(--text); min-height: 118px; }
    .day:hover { border-color: var(--border-strong); text-decoration: none; }
    .day .topics { color: var(--text-muted); flex: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .day.today { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .day.done { background: var(--ok-soft); }
    .day.skipped { opacity: .55; }
    .day.overdue { border-color: var(--warn); }
  `]
})
export class PlanOverviewComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialogs = inject(DialogService);
  private router = inject(Router);
  readonly plans = signal<Plan[]>([]);
  readonly plan = signal<Plan | null>(null);
  readonly days = signal<PlanDaySummary[]>([]);
  readonly loading = signal(true);
  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  /** Month-style grid: day 1 starts in the column of its weekday (Monday = 1). */
  readonly startColumn = computed(() => {
    const first = this.days()[0];
    if (!first) return 1;
    const [y, m, d] = first.date.split('-').map(Number);
    return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
  });
  readonly menuItems = computed<MenuItem[]>(() => {
    const p = this.plan();
    if (!p) return [];
    return [
      p.status === 'Paused' ? { label: 'Resume', run: () => this.act('resume') } : { label: 'Pause', run: () => this.act('pause') },
      { label: 'Reschedule unfinished', run: () => this.reschedule() },
      { label: 'Regenerate remaining days', run: () => this.regenerate() },
      { label: 'Edit plan', run: () => this.router.navigate(['/plan', p.id, 'edit']) },
      { label: 'Restart from day 1', run: () => this.restart(), danger: true }
    ];
  });

  constructor() { this.load(); }

  load(): void {
    this.api.plans().subscribe(ps => {
      this.plans.set(ps);
      const current = ps.find(p => p.isCurrent) ?? ps[0] ?? null;
      this.plan.set(current);
      this.loading.set(false);
      if (current) this.api.planDays(current.id).subscribe(d => this.days.set(d));
    });
  }

  act(action: 'pause' | 'resume'): void {
    const p = this.plan(); if (!p) return;
    this.api.planAction(p.id, action).subscribe(() => { this.toast.show(action === 'pause' ? 'Plan paused' : 'Plan resumed', 'ok'); this.load(); });
  }

  async restart(): Promise<void> {
    const p = this.plan(); if (!p || !await this.dialogs.confirm({ title: 'Restart from day 1?', message: 'The plan restarts today. Your question progress is kept.', confirmLabel: 'Restart' })) return;
    this.api.planAction(p.id, 'restart').subscribe(() => { this.toast.show('Plan restarted', 'ok'); this.load(); });
  }

  async regenerate(): Promise<void> {
    const p = this.plan(); if (!p || !await this.dialogs.confirm({ title: `Regenerate days ${p.currentDay}–${p.durationDays}?`, message: 'Earlier days and all progress are kept.', confirmLabel: 'Regenerate' })) return;
    this.api.regenerate(p.id).subscribe(() => { this.toast.show('Plan regenerated', 'ok'); this.load(); });
  }

  reschedule(): void {
    const p = this.plan(); if (!p) return;
    this.api.reschedule(p.id).subscribe(r => { this.toast.show(`${r.moved} unfinished questions moved to today`, 'ok'); this.load(); });
  }

  makeCurrent(o: Plan): void { this.api.planAction(o.id, 'current').subscribe(() => this.load()); }
  async remove(o: Plan): Promise<void> {
    if (!await this.dialogs.confirm({ title: `Delete plan "${o.name}"?`, message: 'Question progress is not affected.', confirmLabel: 'Delete plan', danger: true })) return;
    this.api.deletePlan(o.id).subscribe(() => this.load());
  }
}
