import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, Section } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-plan-form',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <div class="breadcrumb"><a routerLink="/plan">Plan</a> / {{ planId() ? 'Edit' : 'New' }}</div>
      <h1>{{ planId() ? 'Edit plan' : 'Create a preparation plan' }}</h1>
      <p class="muted">Questions are distributed in skill-matrix order, keeping topics together. Completed questions are skipped unless you include them.</p>

      <form [formGroup]="form" (ngSubmit)="save()" class="card mt">
        <div class="field"><label for="name">Plan name</label><input id="name" type="text" formControlName="name" />
          @if (err('name')) { <div class="field-error">{{ err('name') }}</div> }</div>
        <div class="grid grid-3">
          <div class="field"><label for="d">Duration (days)</label><input id="d" type="number" min="1" max="365" formControlName="durationDays" />
            @if (err('durationDays')) { <div class="field-error">{{ err('durationDays') }}</div> }</div>
          <div class="field"><label for="q">Questions per day</label><input id="q" type="number" min="1" max="200" formControlName="questionsPerDay" />
            @if (err('questionsPerDay')) { <div class="field-error">{{ err('questionsPerDay') }}</div> }</div>
          <div class="field"><label for="m">Study minutes per day (0 = no limit)</label><input id="m" type="number" min="0" max="1440" formControlName="studyMinutesPerDay" /></div>
        </div>
        @if (!planId()) {
          <div class="field"><label for="s">Start date</label><input id="s" type="date" formControlName="startDate" /></div>
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
        <div class="row mt">
          <button class="btn primary" type="submit" [disabled]="form.invalid || saving()">{{ planId() ? 'Save & regenerate from today' : 'Generate plan' }}</button>
          <a class="btn ghost" routerLink="/plan">Cancel</a>
        </div>
      </form>
    </div>`,
  styles: [`
    .narrow { max-width: 820px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: var(--bg); border: 1px solid var(--border-strong); color: var(--text-muted); border-radius: 99px; padding: 4px 12px; font: 13px var(--font); cursor: pointer; }
    .chip.on { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
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
  readonly serverErrors = signal<Record<string, string[]>>({});

  readonly form = this.fb.nonNullable.group({
    name: ['30 Day Senior .NET Interview Preparation', [Validators.required, Validators.maxLength(120)]],
    durationDays: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
    questionsPerDay: [10, [Validators.required, Validators.min(1), Validators.max(200)]],
    studyMinutesPerDay: [120, [Validators.min(0), Validators.max(1440)]],
    startDate: [new Date().toISOString().slice(0, 10)],
    includeCompleted: [false]
  });

  constructor() {
    this.api.sections().subscribe(s => this.sections.set(s.filter(x => x.progress.total > 0)));
    effect(() => {
      const id = Number(this.planId());
      if (!id) return;
      this.api.plan(id).subscribe(p => {
        this.form.patchValue({ name: p.name, durationDays: p.durationDays, questionsPerDay: p.questionsPerDay, studyMinutesPerDay: p.studyMinutesPerDay, includeCompleted: p.includeCompleted });
        this.selected.set(new Set(p.sectionIds));
      });
    });
  }

  toggle(id: number): void {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }

  err(field: string): string | null {
    const c = this.form.get(field);
    if (c && c.invalid && c.touched) return 'Please enter a valid value.';
    return this.serverErrors()[field]?.[0] ?? null;
  }

  save(): void {
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body = { ...v, sectionIds: [...this.selected()], topicIds: [], makeCurrent: true };
    const id = Number(this.planId());
    const req = id ? this.api.updatePlan(id, { ...body, regenerate: true }) : this.api.createPlan(body);
    req.subscribe({
      next: () => { this.toast.show('Plan saved', 'ok'); this.router.navigate(['/plan']); },
      error: (e: ApiError) => { this.saving.set(false); this.serverErrors.set(e.details ?? {}); }
    });
  }
}
