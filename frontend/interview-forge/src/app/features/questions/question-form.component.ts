import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, DIFFICULTIES, Difficulty, Section, Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

@Component({
  selector: 'app-question-form',
  imports: [ReactiveFormsModule, RouterLink, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="breadcrumb"><a routerLink="/mine">My content</a> / {{ id() ? 'Edit question' : 'New question' }}</div>
      <h1>{{ id() ? 'Edit question' : 'Create question' }}</h1>
      <form [formGroup]="form" (ngSubmit)="save()" class="mt">
        <div class="grid grid-2">
          <div class="card">
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
            <div class="field"><label for="q">Question</label><textarea id="q" rows="3" formControlName="text" class="plain"></textarea>
              @if (fieldError('text')) { <div class="field-error">{{ fieldError('text') }}</div> }</div>
            <div class="field"><label for="diff">Difficulty</label>
              <select id="diff" formControlName="difficulty">@for (d of difficulties; track d) { <option [value]="d">{{ d }}</option> }</select></div>
            <div class="field"><label for="tags">Tags (space or comma separated)</label><input id="tags" type="text" formControlName="tags" placeholder="#EFCore #Database" /></div>
            <div class="field">
              <label>References</label>
              <div formArrayName="references" class="stack">
                @for (r of refs.controls; track $index; let i = $index) {
                  <div class="row" [formGroupName]="i">
                    <input type="text" formControlName="title" placeholder="Title" style="flex:1" />
                    <input type="url" formControlName="url" placeholder="https://…" style="flex:2" />
                    <button type="button" class="btn sm ghost" (click)="refs.removeAt(i)" aria-label="Remove">✕</button>
                  </div>
                  @if (r.get('url')?.invalid && r.get('url')?.touched) { <div class="field-error">Use an absolute http(s) URL.</div> }
                }
              </div>
              <button type="button" class="btn sm mt-s" (click)="addRef()">+ Add URL</button>
            </div>
          </div>
          <div class="card">
            <div class="row"><label for="a">Answer (Markdown)</label><span class="spacer"></span>
              <div class="tabs small"><button type="button" [class.active]="!preview()" (click)="preview.set(false)">Write</button>
                <button type="button" [class.active]="preview()" (click)="preview.set(true)">Preview</button></div></div>
            @if (preview()) { <div class="preview"><app-markdown [source]="form.value.answer" /></div> }
            @else { <textarea id="a" rows="22" formControlName="answer" placeholder="Supports **bold**, lists, tables, \`\`\`csharp code blocks\`\`\` and [links](https://learn.microsoft.com). Bare URLs become links."></textarea> }
            @if (fieldError('answer')) { <div class="field-error">{{ fieldError('answer') }}</div> }
          </div>
        </div>
        <div class="row mt">
          <button class="btn primary" type="submit" [disabled]="saving()">Save</button>
          <a class="btn ghost" [routerLink]="id() ? ['/questions', id()] : ['/mine']">Cancel</a>
          @if (generalError()) { <span class="field-error">{{ generalError() }}</span> }
        </div>
      </form>
    </div>`,
  styles: [`
    .mt-s { margin-top: 8px; }
    textarea.plain { font-family: var(--font); font-size: 14px; min-height: 0; }
    .tabs.small { margin: 0; border: none; } .tabs.small button { padding: 4px 10px; font-size: 13px; }
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

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
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
