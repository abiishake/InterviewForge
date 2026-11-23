import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, Section } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-plan-form',
  imports: [ReactiveFormsModule, RouterLink, FieldValidationDirective, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <app-page-header [title]="planId() ? 'Edit plan' : 'Create a preparation plan'" description="Questions are distributed in skill-matrix order, keeping topics together. Completed questions are skipped unless you include them.">
        <div crumbs class="breadcrumb"><a routerLink="/plan">Plan</a> / {{ planId() ? 'Edit' : 'New' }}</div>
      </app-page-header>

      <form [formGroup]="form" (ngSubmit)="save()" class="panel">
        <div class="panel-body">
          <div class="form-section">
            <header><h2>Basics</h2><p>Name the plan and set its length and pace.</p></header>
            <div>
              <div class="field"><label for="name">Plan name</label><input id="name" type="text" appField="Plan name" [serverError]="serverErrors()['name']?.[0]" formControlName="name" /></div>
              <div class="grid grid-3">
                <div class="field"><label for="d">Duration (days)</label><input id="d" type="number" min="1" max="365" appField="Duration" [serverError]="serverErrors()['durationDays']?.[0]" formControlName="durationDays" /></div>
                <div class="field"><label for="q">Questions per day</label><input id="q" type="number" min="1" max="200" appField="Questions per day" [serverError]="serverErrors()['questionsPerDay']?.[0]" formControlName="questionsPerDay" /></div>
                <div class="field"><label for="m">Minutes per day</label><input id="m" type="number" min="0" max="1440" appField="Study minutes" formControlName="studyMinutesPerDay" aria-describedby="m-hint" /><div id="m-hint" class="field-hint">0 means no limit.</div></div>
              </div>
              @if (!planId()) {
                <div class="field"><label for="s">Start date</label><input id="s" type="date" formControlName="startDate" aria-describedby="s-hint" /><div id="s-hint" class="field-hint">Leave empty to start today in your time zone.</div></div>
              }
            </div>
          </div>
          <div class="form-section">
            <header><h2>Scope</h2><p>Pick sections to focus on. None selected means everything.</p></header>
            <div>
              <div class="chips wrap" role="group" aria-label="Sections">
                @for (s of sections(); track s.id) {
                  <button type="button" [class.active]="selected().has(s.id)" [attr.aria-pressed]="selected().has(s.id)" (click)="toggle(s.id)">{{ s.name }} <span class="dim mono">{{ s.progress.total }}</span></button>
                }
              </div>
              <label class="checkbox mt"><input type="checkbox" formControlName="includeCompleted" /> Include questions I already completed</label>
              @if (!planId()) { <label class="checkbox mt"><input type="checkbox" formControlName="makeCurrent" /> Make this my current plan</label> }
              <p class="estimate" role="status"><app-icon name="target" [size]="16" /> {{ estimate() }}</p>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <a class="btn ghost" routerLink="/plan">Cancel</a>
          <button class="btn primary" type="submit" [disabled]="saving()">{{ planId() ? 'Save and regenerate from today' : 'Generate plan' }}</button>
        </div>
      </form>
    </div>`,
  styles: [`
    .chips.wrap { flex-wrap: wrap; overflow: visible; }
    .estimate { display: flex; gap: 8px; align-items: flex-start; margin: 14px 0 0; padding: 10px 12px; background: var(--info-soft); border-radius: var(--radius-sm); font-size: 13px; }
    .estimate app-icon { color: var(--info); margin-top: 2px; }
    form.panel .form-actions { margin: 0; border-radius: 0 0 var(--radius) var(--radius); }
  `]
})
export class PlanFormComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly planId = input<string>();
  readonly sections = signal<Section[]>([]);
  readonly selected = signal(new Set<number>());
  readonly saving = signal(false);
  /** B9: topic-level selection made through the API is preserved when a plan is edited. */
  private topicIds: number[] = [];
  private formValue = signal<{ durationDays: number; questionsPerDay: number; includeCompleted: boolean }>({ durationDays: 30, questionsPerDay: 10, includeCompleted: false });
  readonly estimate = computed(() => {
    const all = this.sections();
    const chosen = this.selected();
    const pool = (chosen.size ? all.filter(s => chosen.has(s.id)) : all).reduce((n, s) => n + s.progress.total - (this.formValue().includeCompleted ? 0 : s.progress.completed), 0);
    const v = this.formValue();
    if (!v.durationDays || pool <= 0) return 'No unfinished questions match this selection.';
    const perDay = Math.min(v.questionsPerDay, Math.ceil(pool / v.durationDays));
    const days = Math.ceil(pool / Math.max(1, v.questionsPerDay));
    return `${pool} questions available: about ${perDay} per day will fit${days > v.durationDays ? ` (${pool - v.questionsPerDay * v.durationDays} will not fit; raise questions per day or the duration)` : ''}.`;
  });
  readonly serverErrors = signal<Record<string, string[]>>({});

  readonly form = this.fb.nonNullable.group({
    name: ['30 Day Senior .NET Interview Preparation', [Validators.required, Validators.maxLength(120)]],
    durationDays: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
    questionsPerDay: [10, [Validators.required, Validators.min(1), Validators.max(200)]],
    studyMinutesPerDay: [120, [Validators.min(0), Validators.max(1440)]],
    startDate: [''],
    includeCompleted: [false],
    makeCurrent: [true]
  });

  constructor() {
    this.api.sections().subscribe(s => this.sections.set(s.filter(x => x.progress.total > 0)));
    this.form.valueChanges.subscribe(() => { const v = this.form.getRawValue(); this.formValue.set({ durationDays: v.durationDays, questionsPerDay: v.questionsPerDay, includeCompleted: v.includeCompleted }); });
    this.api.plans().subscribe(p => { if (!Number(this.planId())) this.form.patchValue({ makeCurrent: p.length === 0 }); });
    effect(() => {
      const id = Number(this.planId());
      if (!id) return;
      this.api.plan(id).subscribe(p => {
        this.form.patchValue({ name: p.name, durationDays: p.durationDays, questionsPerDay: p.questionsPerDay, studyMinutesPerDay: p.studyMinutesPerDay, includeCompleted: p.includeCompleted });
        this.selected.set(new Set(p.sectionIds));
        this.topicIds = p.topicIds;
      });
    });
  }

  toggle(id: number): void {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }

  private fields = viewChildren(FieldValidationDirective);

  save(): void {
    if (!validateForm(this.fields(), this.form)) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const { makeCurrent, startDate, ...rest } = v;
    const id = Number(this.planId());
    const body = { ...rest, sectionIds: [...this.selected()], topicIds: id ? this.topicIds : [] };
    const req = id ? this.api.updatePlan(id, { ...body, regenerate: true }) : this.api.createPlan({ ...body, makeCurrent, startDate: startDate || undefined });
    req.subscribe({
      next: () => { this.toast.show('Plan saved', 'ok'); this.router.navigate(['/plan']); },
      error: (e: ApiError) => { this.saving.set(false); this.serverErrors.set(e.details ?? {}); }
    });
  }
}
