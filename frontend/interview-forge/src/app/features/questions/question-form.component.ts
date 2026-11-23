import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, DIFFICULTIES, Difficulty, Section, Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { FieldValidationDirective, validateForm } from '../../shared/ui/field-validation.directive';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

@Component({
  selector: 'app-question-form',
  imports: [ReactiveFormsModule, RouterLink, MarkdownComponent, FieldValidationDirective, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header [title]="id() ? 'Edit question' : 'Create question'" description="Shared with every member. Your question works like imported content: search, plans and review.">
        <div crumbs class="breadcrumb"><a routerLink="/mine">My content</a> / {{ id() ? 'Edit question' : 'New question' }}</div>
      </app-page-header>
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="qgrid">
          <section class="panel"><div class="panel-head"><h2>Question</h2><span class="dim small">placement and metadata</span></div><div class="panel-body">
            <div class="field">
              <label for="sec">Section</label>
              <select id="sec" formControlName="sectionId" (change)="onSectionChange()">
                <option [value]="''">— choose —</option>
                @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                <option value="new">+ New section…</option>
              </select>
              @if (form.value.sectionId === 'new') { <input class="mt-s" type="text" formControlName="newSectionName" placeholder="e.g. Company Specific Questions" /> }
            </div>
            <div class="field">
              <label for="top">Topic</label>
              <select id="top" formControlName="topicId">
                <option [value]="''">— choose —</option>
                @for (t of topics(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
                <option value="new">+ New topic…</option>
              </select>
              @if (form.value.topicId === 'new' || form.value.sectionId === 'new') { <input class="mt-s" type="text" formControlName="newTopicName" placeholder="e.g. Company A" /> }
              @if (fieldError('section') || fieldError('newTopicName') || fieldError('topicId')) { <div class="field-error">{{ fieldError('section') || fieldError('newTopicName') || fieldError('topicId') }}</div> }
            </div>
            <div class="field"><label for="q">Question</label><textarea id="q" rows="3" appField="Question" [serverError]="errors()['text']?.[0]" formControlName="text" class="plain"></textarea></div>
            <div class="field"><label for="diff">Difficulty</label>
              <select id="diff" formControlName="difficulty">@for (d of difficulties; track d) { <option [value]="d">{{ d }}</option> }</select></div>
            <div class="field"><label for="tags">Tags (space or comma separated)</label><input id="tags" type="text" formControlName="tags" placeholder="#EFCore #Database" /></div>
            <div class="field">
              <label>References</label>
              <div formArrayName="references" class="stack">
                @for (r of refs.controls; track $index; let i = $index) {
                  <div class="row" [formGroupName]="i">
                    <input type="text" formControlName="title" placeholder="Title" class="f1" />
                    <input type="url" formControlName="url" placeholder="https://…" class="f2" />
                    <button type="button" class="btn sm ghost" (click)="refs.removeAt(i)" aria-label="Remove">✕</button>
                  </div>
                  @if (r.get('url')?.invalid && r.get('url')?.touched) { <div class="field-error">Use an absolute http(s) URL.</div> }
                }
              </div>
              <button type="button" class="btn sm mt-s" (click)="addRef()">+ Add URL</button>
            </div>
          </div></section>
          <section class="panel answer-panel">
            <div class="panel-head"><label for="a" class="ph-label">Answer</label><span class="dim small">Markdown</span><span class="spacer"></span>
              <div class="seg" role="group" aria-label="Answer view"><button type="button" class="btn sm" [class.on-tab]="!preview()" [attr.aria-pressed]="!preview()" (click)="preview.set(false)">Write</button>
                <button type="button" class="btn sm" [class.on-tab]="preview()" [attr.aria-pressed]="preview()" (click)="preview.set(true)">Preview</button></div></div>
            <div class="panel-body">
            @if (preview()) { <div class="preview"><app-markdown [source]="form.value.answer" /></div> }
            @else { <textarea id="a" rows="22" appField="Answer" [serverError]="errors()['answer']?.[0]" formControlName="answer" placeholder="Supports **bold**, lists, tables, \`\`\`csharp code blocks\`\`\` and [links](https://learn.microsoft.com). Bare URLs become links."></textarea> }
            </div>
          </section>
        </div>
        <div class="form-actions">
          @if (generalError()) { <span class="field-error">{{ generalError() }}</span> }
          <span class="spacer"></span>
          <a class="btn ghost" [routerLink]="id() ? ['/questions', id()] : ['/mine']">Cancel</a>
          <button class="btn primary" type="submit" [disabled]="saving()">Save question</button>
        </div>
      </form>
    </div>`,
  styles: [`
    .mt-s { margin-top: 8px; }
    textarea.plain { font-family: var(--font); font-size: 14px; min-height: 0; }
    .qgrid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 12px; align-items: start; }
    @media (max-width: 1100px) { .qgrid { grid-template-columns: minmax(0, 1fr); } }
    .ph-label { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--text); }
    .seg { display: inline-flex; } .seg .btn:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); } .seg .btn:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin-left: -1px; }
    .seg .btn.on-tab { background: var(--bg-active); color: var(--text); }
    .answer-panel textarea { min-height: 420px; }
    .spacer { flex: 1; }
    .preview { min-height: 420px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; background: var(--bg); }
  `]
})
export class QuestionFormComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly id = input<string>();
  readonly topic = input<string>();     // ?topic=
  readonly section = input<string>();   // ?section=

  readonly sections = signal<Section[]>([]);
  readonly topics = signal<Topic[]>([]);
  readonly preview = signal(false);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string[]>>({});
  readonly generalError = signal<string | null>(null);
  readonly difficulties = DIFFICULTIES;

  readonly form = this.fb.nonNullable.group({
    sectionId: [''],
    newSectionName: [''],
    topicId: [''],
    newTopicName: [''],
    text: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
    answer: ['', [Validators.required, Validators.maxLength(50000)]],
    difficulty: ['Intermediate' as Difficulty],
    tags: [''],
    references: this.fb.array<FormGroup>([])
  });
  get refs(): FormArray<FormGroup> { return this.form.controls.references; }

  readonly isEdit = computed(() => !!this.id());

  constructor() {
    this.api.sections().subscribe(s => this.sections.set(s));
    effect(() => {
      const presetTopic = this.topic(), presetSection = this.section(), id = this.id();
      if (id) {
        this.api.question(Number(id)).subscribe(q => {
          if(!q.canEdit){this.router.navigate(['/questions',q.id]);return;}
          this.form.patchValue({ sectionId: String(q.sectionId), topicId: String(q.topicId), text: q.text, answer: q.answerMarkdown,
            difficulty: q.difficulty, tags: q.tags.map(t => '#' + t).join(' ') });
          this.refs.clear();
          q.references.forEach(r => this.addRef(r.title, r.url));
          this.loadTopics(q.sectionId);
        });
      } else if (presetTopic) {
        this.api.topic(Number(presetTopic)).subscribe(t => {
          this.form.patchValue({ sectionId: String(t.sectionId), topicId: String(t.id) });
          this.loadTopics(t.sectionId);
        });
      } else if (presetSection) {
        this.form.patchValue({ sectionId: presetSection });
        this.loadTopics(Number(presetSection));
      }
    });
  }

  onSectionChange(): void {
    const v = this.form.value.sectionId;
    this.form.patchValue({ topicId: v === 'new' ? 'new' : '' });
    if (v && v !== 'new') this.loadTopics(Number(v)); else this.topics.set([]);
  }

  private loadTopics(sectionId: number): void { this.api.topics(sectionId).subscribe(t => this.topics.set(t)); }

  addRef(title = '', url = ''): void {
    this.refs.push(this.fb.nonNullable.group({ title: [title, Validators.maxLength(200)], url: [url, [Validators.required, Validators.pattern(URL_PATTERN)]] }));
  }

  fieldError(key: string): string | null {
    const c = this.form.get(key);
    if (c?.invalid && c.touched) return key === 'text' ? 'Question must be 5–2000 characters.' : 'This field is required.';
    return this.errors()[key]?.[0] ?? null;
  }

  private fields = viewChildren(FieldValidationDirective);

  save(): void {
    if (this.form.controls.answer.invalid) this.preview.set(false); // the answer box must be visible to show its message
    if (!validateForm(this.fields(), this.form)) return;
    const v = this.form.getRawValue();
    const newTopic = v.topicId === 'new' || v.sectionId === 'new';
    const body = {
      topicId: newTopic || !v.topicId ? null : Number(v.topicId),
      sectionId: v.sectionId && v.sectionId !== 'new' ? Number(v.sectionId) : null,
      newSectionName: v.sectionId === 'new' ? v.newSectionName : null,
      newTopicName: newTopic ? v.newTopicName : null,
      text: v.text, answer: v.answer, difficulty: v.difficulty,
      tags: v.tags.split(/[\s,]+/).map(t => t.replace(/^#/, '')).filter(Boolean),
      references: (v.references as { title: string; url: string }[]).filter(r => r.url)
    };
    this.saving.set(true);
    const id = Number(this.id());
    (id ? this.api.updateQuestion(id, body) : this.api.createQuestion(body)).subscribe({
      next: q => { this.toast.show('Question saved', 'ok'); this.router.navigate(['/questions', q.id]); },
      error: (e: ApiError) => { this.saving.set(false); this.errors.set(e.details ?? {}); this.generalError.set(e.details ? 'Please fix the highlighted fields.' : e.message); }
    });
  }
}
