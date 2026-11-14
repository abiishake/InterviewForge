import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, Section } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';

@Component({
  selector: 'app-plan-form',
  imports: [ReactiveFormsModule, RouterLink, FieldValidationDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <div class="breadcrumb"><a routerLink="/plan">Plan</a> / {{ planId() ? 'Edit' : 'New' }}</div>
      <h1>{{ planId() ? 'Edit plan' : 'Create a preparation plan' }}</h1>
      <p class="muted">Questions are distributed in skill-matrix order, keeping topics together. Completed questions are skipped unless you include them.</p>

      <form [formGroup]="form" (ngSubmit)="save()" class="card mt">
        <div class="field"><label for="name">Plan name</label><input id="name" type="text" appField="Plan name" [serverError]="serverErrors()['name']?.[0]" formControlName="name" /></div>
        <div class="grid grid-3">
          <div class="field"><label for="d">Duration (days)</label><input id="d" type="number" min="1" max="365" appField="Duration" [serverError]="serverErrors()['durationDays']?.[0]" formControlName="durationDays" /></div>
          <div class="field"><label for="q">Questions per day</label><input id="q" type="number" min="1" max="200" appField="Questions per day" [serverError]="serverErrors()['questionsPerDay']?.[0]" formControlName="questionsPerDay" /></div>
          <div class="field"><label for="m">Study minutes per day (0 = no limit)</label><input id="m" type="number" min="0" max="1440" appField="Study minutes" formControlName="studyMinutesPerDay" /></div>
        </div>
        @if (!planId()) {
          <div class="field"><label for="s">Start date</label><input id="s" type="date" formControlName="startDate" aria-describedby="s-hint" /><div id="s-hint" class="muted small">Leave empty to start today in your time zone.</div></div>
        }
        <div class="field">
          <label>Sections (none selected = everything)</label>
          <div class="chips">
            @for (s of sections(); track s.id) {
              <button type="button" class="chip" [class.on]="selected().has(s.id)" (click)="toggle(s.id)">{{ s.name }} <span class="dim">{{ s.progress.total }}</span></button>
            }
          </div>
        </div>
        <label class="checkbox"><input type="checkbox" formControlName="includeCompleted" /> Include questions I already completed</label>
        @if (!planId()) { <label class="checkbox mt"><input type="checkbox" formControlName="makeCurrent" /> Make this my current plan</label> }
        <p class="estimate" role="status">{{ estimate() }}</p>
        <div class="row mt">
          <button class="btn primary" type="submit" [disabled]="saving()">{{ planId() ? 'Save & regenerate from today' : 'Generate plan' }}</button>
          <a class="btn ghost" routerLink="/plan">Cancel</a>
        </div>
      </form>
    </div>`,
  styles: [`
    .narrow { max-width: 820px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: var(--bg); border: 1px solid var(--border-strong); color: var(--text-muted); border-radius: 99px; padding: 4px 12px; font: 13px var(--font); cursor: pointer; }
    .chip.on { background: var(--accent-soft); color: var(--text); border-color: var(--accent); }
    .estimate { margin: 14px 0 0; padding: 10px 12px; background: var(--info-soft); border-radius: var(--radius-sm); } .small { font-size: 12px; }
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
