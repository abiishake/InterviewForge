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
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';

@Component({
  selector: 'app-plan-overview',
  imports: [RouterLink, ProgressBarComponent, DatePipe, DecimalPipe, MenuComponent, SkeletonComponent, EmptyStateComponent, IconComponent, MeterComponent, PageHeaderComponent, StatTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
      @else if (plan(); as p) {
        <app-page-header eyebrow="Preparation plan" [title]="p.name" [description]="'Started ' + (p.startDate | date:'mediumDate') + ' · ' + p.studyMinutesPerDay + ' min/day'">
          @if (p.status === 'Paused') { <span class="badge warn mt-s">paused</span> }
          <div actions>
            <app-menu label="Plan actions" [items]="menuItems()" />
            @if (p.status === 'Completed') { <a class="btn primary" routerLink="/plan/new">Create next plan</a> }
            @else { <a class="btn primary" [routerLink]="['/plan', p.id, 'day', p.currentDay]">Today's target</a> }
          </div>
        </app-page-header>

        @if (p.status === 'Completed') {
          <div class="done-card" role="status"><b>Plan complete.</b> Every planned question is done. Start a new plan to keep going.</div>
        }
        <div class="tiles">
          <app-stat-tile label="Day" icon="calendar" [value]="p.currentDay" [total]="p.durationDays" [sub]="(p.durationDays - p.currentDay) + ' days left'" />
          <app-stat-tile label="Completed" icon="check" tone="ready" [value]="p.progress.completed" [total]="p.progress.total" [sub]="(p.progress.percent | number:'1.0-1') + '% of the plan'" />
          <app-stat-tile label="Pace" icon="bolt" [value]="p.questionsPerDay" unit="/day" [sub]="p.studyMinutesPerDay + ' minutes a day'" />
          <app-stat-tile label="Needs review" icon="flag" [tone]="p.progress.needsReview ? 'warn' : ''" [value]="p.progress.needsReview" sub="in this plan" link="/review" />
        </div>
        <section class="panel mt">
          <div class="panel-body">
            <app-meter class="lg" label="Plan progress" [value]="p.progress.completed" [total]="p.progress.total" [review]="p.progress.needsReview" />
            @if (p.unscheduledCount > 0) {
              <p class="muted small unsched"><app-icon name="alert" [size]="14" /> {{ p.unscheduledCount }} eligible questions did not fit the plan. Increase questions/day or duration, then regenerate.</p>
            }
          </div>
        </section>

        <section class="panel mt" aria-labelledby="cal-h">
          <div class="panel-head"><h2 id="cal-h">Calendar</h2><span class="spacer"></span>
            <span class="legend small dim" aria-hidden="true"><span><i class="sw today"></i>Today</span><span><i class="sw done"></i>Done</span><span><i class="sw over"></i>Overdue</span></span></div>
          <div class="panel-body">
        <div class="weekdays" aria-hidden="true">@for (w of weekdays; track w) { <span>{{ w }}</span> }</div>
        <div class="calendar">
          @for (d of days(); track d.id; let first = $first) {
            <a class="day" [routerLink]="['/plan', p.id, 'day', d.dayNumber]" [class.today]="d.isToday" [class.done]="d.status === 'Completed'"
               [class.skipped]="d.status === 'Skipped'" [class.overdue]="d.isPast && d.status === 'Pending' && d.total > 0" [style.grid-column-start]="first ? startColumn() : null">
              <div class="row"><b>Day {{ d.dayNumber }}</b><span class="spacer"></span><span class="dim small">{{ d.date | date:'EEE d MMM' }}</span></div>
              @if (d.isToday) { <span class="badge accent">today</span> } @else if (d.isPast && d.status === 'Pending' && d.total > 0 && d.completed < d.total) { <span class="badge warn">overdue</span> }
              <div class="small topics">{{ d.topicNames.slice(0, 3).join(' · ') || d.title }}</div>
              <app-progress-bar [value]="d.completed" [total]="d.total" [thin]="true" />
              <div class="small dim mono">{{ d.completed }}/{{ d.total }} @if (d.status === 'Skipped') { · skipped }</div>
            </a>
          }
        </div>
          </div>
        </section>

        <section class="panel mt" aria-labelledby="other-h">
          <div class="panel-head"><h2 id="other-h">Other plans</h2><span class="spacer"></span><a class="btn sm" routerLink="/plan/new"><app-icon name="plus" [size]="14" /> New plan</a></div>
          @if (plans().length > 1) {
            <div class="table-wrap">
              <table class="data stack-sm">
                <thead><tr><th>Plan</th><th class="num">Days</th><th class="meter-col">Progress</th><th><span class="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  @for (o of plans(); track o.id) {
                    @if (!o.isCurrent) {
                      <tr>
                        <td data-label="Plan"><b>{{ o.name }}</b></td>
                        <td data-label="Days" class="num">{{ o.durationDays }}</td>
                        <td data-label="Progress" class="meter-col"><app-meter [value]="o.progress.completed" [total]="o.progress.total" /></td>
                        <td class="acts"><button class="btn sm" (click)="makeCurrent(o)">Make current</button> <button class="btn sm danger" (click)="remove(o)">Delete</button></td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          } @else { <div class="panel-body muted small">This is your only plan.</div> }
        </section>
      } @else {
        <app-empty-state icon="calendar" title="No plan yet" hint="A plan spreads the knowledge base across days, following the skill-matrix order: fundamentals, architecture, cloud, interview scenarios.">
          <a class="btn primary" routerLink="/plan/new">Create a preparation plan</a></app-empty-state>
      }
    </div>`,
  styles: [`
    .done-card { border: 1px solid var(--ok); background: var(--ok-soft); border-radius: var(--radius); padding: 10px 14px; margin-bottom: 12px; }
    .mt-s { margin-top: 6px; }
    .unsched { display: flex; gap: 6px; align-items: center; margin: 10px 0 0; }
    .legend { display: flex; gap: 12px; }
    .sw { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 5px; }
    .sw.today { background: var(--accent); } .sw.done { background: var(--ready); } .sw.over { background: var(--warn); }
    .meter-col { width: 34%; }
    .acts { text-align: right; white-space: nowrap; }
    .weekdays { display: none; }
    .calendar { display: flex; flex-direction: column; gap: 6px; }
    @media (min-width: 768px) {
      .weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px; font: 600 10.5px var(--mono); text-transform: uppercase; letter-spacing: .1em; color: var(--text-dim); }
      .calendar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
      .day { min-height: 104px; }
    }
    @media (max-width: 760px) { .meter-col { width: auto; } .acts { text-align: left; } .legend { display: none; } }
    .day { position: relative; display: flex; flex-direction: column; gap: 5px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 9px 10px; color: var(--text); font-size: 12.5px;
      transition: border-color var(--dur-1), background var(--dur-1); }
    .day:hover { border-color: var(--border-strong); background: var(--bg-hover); text-decoration: none; }
    .day .topics { color: var(--text-muted); flex: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .day.today { background: var(--bg-card); border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
    .day.done { background: var(--ready-soft); border-color: transparent; }
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
