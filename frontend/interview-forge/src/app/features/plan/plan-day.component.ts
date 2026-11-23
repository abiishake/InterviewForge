import { DialogService } from '../../core/services/dialog.service';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Plan, PlanDayDetail, PlanItem } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { createLatest } from '../../core/util/latest';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { DifficultyBadgeComponent, StatusBadgeComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-plan-day',
  imports: [RouterLink, DifficultyBadgeComponent, StatusBadgeComponent, DatePipe, FormsModule, SkeletonComponent, ErrorStateComponent, IconComponent, MeterComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (detail(); as d) {
        <app-page-header [title]="'Day ' + d.day.dayNumber" [description]="(d.day.date | date:'fullDate') + ' · ' + d.day.completed + ' of ' + d.day.total + ' completed'">
          <div crumbs class="breadcrumb"><a routerLink="/plan">{{ plan()?.name ?? 'Plan' }}</a> / Day {{ d.day.dayNumber }}</div>
          <div class="badges">@if (d.day.isToday) { <span class="badge accent">today</span> } @if (d.day.status === 'Skipped') { <span class="badge">skipped</span> }</div>
          <div actions>
            <div class="seg" role="group" aria-label="Change day">
              <a class="btn icon" [class.disabled]="dayNum() <= 1" [attr.aria-disabled]="dayNum() <= 1" [routerLink]="dayNum() > 1 ? ['/plan', planIdNum(), 'day', dayNum() - 1] : null" [attr.aria-label]="'Day ' + (dayNum() - 1)"><app-icon name="chevron-left" [size]="16" /></a>
              <a class="btn icon" [class.disabled]="!plan() || dayNum() >= plan()!.durationDays" [routerLink]="plan() && dayNum() < plan()!.durationDays ? ['/plan', planIdNum(), 'day', dayNum() + 1] : null" [attr.aria-label]="'Day ' + (dayNum() + 1)"><app-icon name="chevron-right" [size]="16" /></a>
            </div>
            @if (d.day.status !== 'Skipped' && d.day.completed < d.day.total) { <button class="btn" (click)="skip()">Skip day</button> }
            @if (firstOpen(); as f) { <a class="btn primary" [routerLink]="['/questions', f.questionId]" [queryParams]="{ plan: planIdNum(), day: dayNum() }"><app-icon name="play" [size]="14" /> Start</a> }
          </div>
        </app-page-header>
        <section class="panel"><div class="panel-body"><app-meter class="lg" label="Day progress" [value]="d.day.completed" [total]="d.day.total" /></div></section>

        @for (g of d.topics; track g.topicId) {
          <section class="panel mt">
            <div class="panel-head"><span class="dim small">{{ g.sectionName }} /</span><a [routerLink]="['/topics', g.topicId]"><h2>{{ g.topicName }}</h2></a>
              <span class="spacer"></span><span class="dim small mono">{{ g.completed }}/{{ g.total }}</span></div>
            <ol class="qlist">
              @for (i of itemsFor(g.topicId); track i.id) {
                <li class="item">
                  <a [routerLink]="['/questions', i.questionId]" [queryParams]="{ plan: planIdNum(), day: dayNum() }">
                    <span [class]="'status-dot ' + i.status" aria-hidden="true"></span>
                    <span class="qtext">{{ i.questionText }}</span>
                    <app-difficulty [value]="i.difficulty" />
                    <app-status [value]="i.status" />
                  </a>
                  @if (i.status !== 'Completed') {
                    <div class="move"><button type="button" class="btn sm" (click)="pickDay(i)" [attr.aria-label]="'Move question to another day'">Move…</button></div>
                  }
                </li>
              }
            </ol>
          </section>
        } @empty { <div class="empty mt">No questions scheduled for this day. Use it to catch up or review.</div> }
      } @else if (failed()) { <app-error-state title="Day not available" hint="This day could not be loaded." (retry)="load()" /> }
      @else { <app-skeleton kind="list" [count]="6" /> }
    </div>`,
  styles: [`
    .badges { display: flex; gap: 6px; margin-top: 6px; } .badges:empty { display: none; }
    .seg { display: inline-flex; } .seg .btn:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); } .seg .btn:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin-left: -1px; }
    .btn.disabled { opacity: .45; pointer-events: none; }
    .panel-head a { color: var(--text); } .panel-head a:hover h2 { text-decoration: underline; }
    .item { display: flex; align-items: center; flex-wrap: wrap; }
    .item a { flex: 1; align-items: center !important; }
    .move { padding-right: 12px; }
  `]
})
export class PlanDayComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialogs = inject(DialogService);
  readonly planId = input.required<string>();
  readonly day = input.required<string>();
  readonly planIdNum = computed(() => Number(this.planId()));
  readonly dayNum = computed(() => Number(this.day()));
  readonly plan = signal<Plan | null>(null);
  readonly detail = signal<PlanDayDetail | null>(null);
  readonly firstOpen = computed(() => this.detail()?.items.find(i => i.status !== 'Completed') ?? null);
  readonly dayNumbers = computed(() => Array.from({ length: this.plan()?.durationDays ?? 0 }, (_, i) => i + 1));

  constructor() {
    effect(() => { this.planIdNum(); this.dayNum(); this.load(); });
  }

  readonly failed = signal(false);
  private latestPlan = createLatest();
  private latestDay = createLatest();

  load(): void {
    const id = this.planIdNum(), day = this.dayNum();
    this.failed.set(false); this.detail.set(null);
    this.latestPlan(this.api.plan(id), { next: p => this.plan.set(p), error: () => this.failed.set(true) });
    this.latestDay(this.api.planDay(id, day), { next: d => this.detail.set(d), error: () => this.failed.set(true) });
  }

  itemsFor(topicId: number): PlanItem[] { return this.detail()?.items.filter(i => i.topicId === topicId) ?? []; }

  reload(): void { this.api.planDay(this.planIdNum(), this.dayNum()).subscribe(d => this.detail.set(d)); }

  async pickDay(item: PlanItem): Promise<void> {
    const p = this.plan(); if (!p) return;
    // The server accepts days 1 to duration+1 so a plan never gets gaps.
    const choices = Array.from({ length: p.durationDays + 1 }, (_, i) => i + 1).filter(n => n !== this.dayNum()).map(n => ({ value: String(n), label: 'Day ' + n }));
    const chosen = await this.dialogs.choose({ title: 'Move to which day?', message: 'Pick the day this question should be studied.', choices });
    if (chosen) this.move(item, Number(chosen));
  }

  move(item: PlanItem, target: number): void {
    if (!target) return;
    this.api.moveItem(this.planIdNum(), item.id, target).subscribe(() => { this.toast.show(`Moved to day ${target}`, 'ok'); this.reload(); });
  }

  async skip(): Promise<void> {
    if (!await this.dialogs.confirm({ title: 'Skip this day?', message: 'Unfinished questions move to the next day.', confirmLabel: 'Skip day' })) return;
    this.api.skipDay(this.planIdNum(), this.dayNum()).subscribe(() => { this.toast.show('Day skipped', 'ok'); this.reload(); });
  }
}
