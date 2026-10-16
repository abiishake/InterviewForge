import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Plan, PlanDayDetail, PlanItem } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { DifficultyBadgeComponent, ProgressBarComponent, StatusBadgeComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-plan-day',
  imports: [RouterLink, ProgressBarComponent, DifficultyBadgeComponent, StatusBadgeComponent, DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (detail(); as d) {
        <div class="breadcrumb"><a routerLink="/plan">{{ plan()?.name ?? 'Plan' }}</a> / Day {{ d.day.dayNumber }}</div>
        <div class="page-header">
          <div>
            <h1>Day {{ d.day.dayNumber }} @if (d.day.isToday) { <span class="badge accent">today</span> } @if (d.day.status === 'Skipped') { <span class="badge">skipped</span> }</h1>
            <p>{{ d.day.date | date:'fullDate' }} · {{ d.day.completed }} / {{ d.day.total }} completed</p>
          </div>
          <div class="row">
            @if (dayNum() > 1) { <a class="btn" [routerLink]="['/plan', planIdNum(), 'day', dayNum() - 1]">← Day {{ dayNum() - 1 }}</a> }
            @if (plan() && dayNum() < plan()!.durationDays) { <a class="btn" [routerLink]="['/plan', planIdNum(), 'day', dayNum() + 1]">Day {{ dayNum() + 1 }} →</a> }
            @if (firstOpen(); as f) { <a class="btn primary" [routerLink]="['/questions', f.questionId]" [queryParams]="{ plan: planIdNum(), day: dayNum() }">Start</a> }
            @if (d.day.status !== 'Skipped' && d.day.completed < d.day.total) { <button class="btn ghost" (click)="skip()">Skip day</button> }
          </div>
        </div>
        <app-progress-bar [value]="d.day.completed" [total]="d.day.total" />

        @for (g of d.topics; track g.topicId) {
          <div class="group mt">
            <div class="row"><span class="dim small">{{ g.sectionName }} →</span><a [routerLink]="['/topics', g.topicId]"><b>{{ g.topicName }}</b></a>
              <span class="spacer"></span><span class="dim small">{{ g.completed }}/{{ g.total }}</span></div>
            <ol class="qlist mt">
              @for (i of itemsFor(g.topicId); track i.id) {
                <li class="item">
                  <a [routerLink]="['/questions', i.questionId]" [queryParams]="{ plan: planIdNum(), day: dayNum() }">
                    <span [class]="'status-dot ' + i.status"></span>
                    <span class="qtext">{{ i.questionText }}</span>
                    <app-difficulty [value]="i.difficulty" />
                    <app-status [value]="i.status" />
                  </a>
                  @if (i.status !== 'Completed') {
                    <div class="move">
                      <select [ngModel]="''" (ngModelChange)="move(i, +$event)" aria-label="Move to day">
                        <option value="" disabled>Move…</option>
                        @for (n of dayNumbers(); track n) { @if (n !== dayNum()) { <option [value]="n">Day {{ n }}</option> } }
                      </select>
                    </div>
                  }
                </li>
              }
            </ol>
          </div>
        } @empty { <div class="empty mt">No questions scheduled for this day. Use it to catch up or review.</div> }
      } @else { <div class="loading">Loading day…</div> }
    </div>`,
  styles: [`
    .small { font-size: 13px; }
    .item { display: flex; align-items: center; }
    .item a { flex: 1; align-items: center !important; }
    .move { padding-right: 12px; }
    .move select { width: 110px; padding: 4px 6px; font-size: 12px; }
  `]
})
export class PlanDayComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly planId = input.required<string>();
  readonly day = input.required<string>();
  readonly planIdNum = computed(() => Number(this.planId()));
  readonly dayNum = computed(() => Number(this.day()));
  readonly plan = signal<Plan | null>(null);
  readonly detail = signal<PlanDayDetail | null>(null);
  readonly firstOpen = computed(() => this.detail()?.items.find(i => i.status !== 'Completed') ?? null);
  readonly dayNumbers = computed(() => Array.from({ length: this.plan()?.durationDays ?? 0 }, (_, i) => i + 1));

  constructor() {
    effect(() => {
      const id = this.planIdNum(), day = this.dayNum();
      this.detail.set(null);
      this.api.plan(id).subscribe(p => this.plan.set(p));
      this.api.planDay(id, day).subscribe(d => this.detail.set(d));
    });
  }

  itemsFor(topicId: number): PlanItem[] { return this.detail()?.items.filter(i => i.topicId === topicId) ?? []; }

  reload(): void { this.api.planDay(this.planIdNum(), this.dayNum()).subscribe(d => this.detail.set(d)); }

  move(item: PlanItem, target: number): void {
    if (!target) return;
    this.api.moveItem(this.planIdNum(), item.id, target).subscribe(() => { this.toast.show(`Moved to day ${target}`, 'ok'); this.reload(); });
  }

  skip(): void {
    if (!confirm('Skip this day? Unfinished questions move to the next day.')) return;
    this.api.skipDay(this.planIdNum(), this.dayNum()).subscribe(() => { this.toast.show('Day skipped', 'ok'); this.reload(); });
  }
}
