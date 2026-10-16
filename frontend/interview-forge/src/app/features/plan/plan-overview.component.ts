import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Plan, PlanDaySummary } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-plan-overview',
  imports: [RouterLink, ProgressBarComponent, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (loading()) { <div class="loading">Loading plans…</div> }
      @else if (plan(); as p) {
        <div class="page-header">
          <div>
            <div class="eyebrow">Preparation plan</div>
            <h1>{{ p.name }}</h1>
            <p>Day <b>{{ p.currentDay }}</b> of {{ p.durationDays }} · {{ p.questionsPerDay }} questions/day · {{ p.studyMinutesPerDay }} min/day · started {{ p.startDate | date:'mediumDate' }}
              @if (p.status === 'Paused') { <span class="badge warn">paused</span> }</p>
          </div>
          <div class="row">
            <a class="btn primary" [routerLink]="['/plan', p.id, 'day', p.currentDay]">Today's target</a>
            @if (p.status === 'Paused') { <button class="btn" (click)="act('resume')">Resume</button> } @else { <button class="btn" (click)="act('pause')">Pause</button> }
            <button class="btn" (click)="reschedule()">Reschedule unfinished</button>
            <button class="btn" (click)="regenerate()">Regenerate</button>
            <a class="btn" [routerLink]="['/plan', p.id, 'edit']">Edit</a>
            <button class="btn ghost" (click)="restart()">Restart</button>
          </div>
        </div>

        <div class="card">
          <div class="row"><b>{{ p.progress.completed }} / {{ p.progress.total }}</b><span class="muted">planned questions completed</span><span class="spacer"></span>
            <span class="mono">{{ p.progress.percent | number:'1.0-1' }}%</span></div>
          <div class="mt"><app-progress-bar [value]="p.progress.completed" [total]="p.progress.total" [review]="p.progress.needsReview" /></div>
          @if (p.unscheduledCount > 0) {
            <p class="muted mt">{{ p.unscheduledCount }} eligible questions did not fit the plan — increase questions/day or duration, then regenerate.</p>
          }
        </div>

        <h2 class="mt-lg">Calendar</h2>
        <div class="calendar">
          @for (d of days(); track d.id) {
            <a class="day" [routerLink]="['/plan', p.id, 'day', d.dayNumber]" [class.today]="d.isToday" [class.done]="d.status === 'Completed'"
               [class.skipped]="d.status === 'Skipped'" [class.overdue]="d.isPast && d.status === 'Pending' && d.total > 0">
              <div class="row"><b>Day {{ d.dayNumber }}</b><span class="spacer"></span><span class="dim small">{{ d.date | date:'EEE d MMM' }}</span></div>
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
        <div class="page-header"><div><div class="eyebrow">Preparation plan</div><h1>No plan yet</h1>
          <p>A plan spreads the knowledge base across days, following the skill-matrix order: fundamentals → architecture → cloud → interview scenarios.</p></div></div>
        <a class="btn primary" routerLink="/plan/new">Create a preparation plan</a>
      }
    </div>`,
  styles: [`
    .mono { font-family: var(--mono); } .small { font-size: 12.5px; }
    .calendar { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
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
  readonly plans = signal<Plan[]>([]);
  readonly plan = signal<Plan | null>(null);
  readonly days = signal<PlanDaySummary[]>([]);
  readonly loading = signal(true);

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

  restart(): void {
    const p = this.plan(); if (!p || !confirm('Restart from day 1 starting today? Your question progress is kept.')) return;
    this.api.planAction(p.id, 'restart').subscribe(() => { this.toast.show('Plan restarted', 'ok'); this.load(); });
  }

  regenerate(): void {
    const p = this.plan(); if (!p || !confirm(`Regenerate days ${p.currentDay}–${p.durationDays}? Earlier days and all progress are kept.`)) return;
    this.api.regenerate(p.id).subscribe(() => { this.toast.show('Plan regenerated', 'ok'); this.load(); });
  }

  reschedule(): void {
    const p = this.plan(); if (!p) return;
    this.api.reschedule(p.id).subscribe(r => { this.toast.show(`${r.moved} unfinished questions moved to today`, 'ok'); this.load(); });
  }

  makeCurrent(o: Plan): void { this.api.planAction(o.id, 'current').subscribe(() => this.load()); }
  remove(o: Plan): void {
    if (!confirm(`Delete plan "${o.name}"? Question progress is not affected.`)) return;
    this.api.deletePlan(o.id).subscribe(() => this.load());
  }
}
