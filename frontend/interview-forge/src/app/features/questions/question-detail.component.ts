import { Subject, concatMap, catchError, EMPTY } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DIFFICULTIES, Difficulty, QuestionDetail, RecallRating, UpdateProgress } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { DifficultyBadgeComponent, StatusBadgeComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-question-detail',
  imports: [FeedbackFormComponent, RouterLink, MarkdownComponent, DifficultyBadgeComponent, StatusBadgeComponent, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      @if (q(); as q) {
        <div class="breadcrumb">
          <a [routerLink]="['/sections', q.sectionId]">{{ q.sectionName }}</a> → <a [routerLink]="['/topics', q.topicId]">{{ q.topicName }}</a>
          @if (plan()) { · <a [routerLink]="['/plan', plan(), 'day', day()]">back to day {{ day() }}</a> }
        </div>

        <article class="card qcard">
          <div class="row meta">
            <app-difficulty [value]="q.difficulty" /><app-status [value]="q.userState.status" />
            @if (q.isUserCreated) { <span class="badge accent">Added by {{ q.addedBy }}</span> }
            @if (q.externalId) { <span class="dim mono">{{ q.externalId }}</span> }
            <span class="spacer"></span>
            @for (t of q.tags; track t) { <a class="tag" [routerLink]="['/search']" [queryParams]="{ q: t }">#{{ t }}</a> }
          </div>
          <div class="label">Question</div>
          <app-markdown class="question" [source]="q.text" />

          <div class="label row">Answer <span class="spacer"></span>
            <button class="btn sm ghost" (click)="revealed.set(!revealed())">{{ revealed() ? 'Hide answer (h)' : 'Reveal answer (space)' }}</button></div>
          @if (revealed()) {
            <app-markdown [source]="q.answerMarkdown" />
            @if (q.references.length) {
              <div class="label">References</div>
              <ul class="refs">@for (r of q.references; track r.url) { <li><a [href]="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }} ↗</a></li> }</ul>
            }
            @if (q.followUpsMarkdown) { <div class="label">Likely follow-ups</div><app-markdown [source]="q.followUpsMarkdown" /> }
            <div class="rate">
              <span class="muted small">How well did you know this?</span>
              @for (r of ratings; track r.value) {
                <button class="btn sm" [class.on]="q.userState.lastRating === r.value" [class.ok]="r.value === 'Easy' || r.value === 'Okay'"
                        [class.warn]="r.value === 'Hard' || r.value === 'DidNotKnow'" (click)="rate(r.value)">{{ r.label }}</button>
              }
            </div>
          } @else {
            <button class="reveal" (click)="revealed.set(true)">Think about your answer first — then click to reveal.</button>
          }
        </article>

        <div class="row actions">
          <button class="btn ok" [class.on]="q.userState.status === 'Completed'" (click)="setStatus(q.userState.status === 'Completed' ? 'InProgress' : 'Completed')">✓ {{ q.userState.status === 'Completed' ? 'Completed' : 'Mark complete' }}</button>
          <button class="btn warn" [class.on]="q.userState.status === 'NeedsReview'" (click)="setStatus(q.userState.status === 'NeedsReview' ? 'InProgress' : 'NeedsReview')">↻ Needs review</button>
          <button class="btn fav" [class.on]="q.userState.isFavorite" (click)="update({ isFavorite: !q.userState.isFavorite })">{{ q.userState.isFavorite ? '★ Favorite' : '☆ Favorite' }}</button>
          <select class="diff" [ngModel]="q.difficulty" (ngModelChange)="setDifficulty($event)" aria-label="My difficulty">
            @for (d of difficulties; track d) { <option [value]="d">{{ d }}</option> }
          </select>
          <span class="spacer"></span>
          @if (q.canEdit) {
            <a class="btn" [routerLink]="['/questions', q.id, 'edit']">Edit</a>
            <button class="btn danger" (click)="remove()">Delete</button>
          }
        </div>
        <app-feedback-form kind="Question" [contentId]="q.id" />
        @if (q.userState.nextReviewAt) { <p class="dim small">Next spaced review: {{ q.userState.nextReviewAt | date:'medium' }} · reviewed {{ q.userState.reviewCount }}×</p> }

        <div class="card mt">
          <div class="row"><b>My notes</b><span class="spacer"></span><span class="dim small">private; the original answer is never changed</span></div>
          <textarea class="mt" rows="5" [(ngModel)]="note" placeholder="Your own phrasing, project examples, links… (Markdown supported)"></textarea>
          <div class="row mt"><button class="btn sm primary" (click)="saveNote()" [disabled]="note === (q.userState.note ?? '')">Save note</button>
            @if (note) { <button class="btn sm ghost" (click)="previewNote.set(!previewNote())">{{ previewNote() ? 'Hide preview' : 'Preview' }}</button> }</div>
          @if (previewNote() && note) { <div class="mt"><app-markdown [source]="note" /></div> }
        </div>

        <div class="row nav mt">
          @if (q.previousId) { <a class="btn" [routerLink]="['/questions', q.previousId]" [queryParams]="navParams()">← Previous (k)</a> }
          <span class="spacer"></span>
          @if (q.nextId) { <a class="btn primary" [routerLink]="['/questions', q.nextId]" [queryParams]="navParams()">Next (j) →</a> }
        </div>
      } @else if (notFound()) { <div class="empty">Question not found.</div> } @else { <div class="loading">Loading…</div> }
    </div>`,
  styles: [`
    .narrow { max-width: 900px; }
    .qcard { padding: 24px 26px; }
    .meta { margin-bottom: 14px; } .mono { font-family: var(--mono); font-size: 12px; }
    .label { font: 600 11px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); margin: 22px 0 10px; }
    .question { display: block; font-size: 1.15rem; font-weight: 500; }
    .reveal { width: 100%; padding: 32px; border: 1px dashed var(--border-strong); border-radius: var(--radius); background: var(--bg); color: var(--text-muted); cursor: pointer; font: 14px var(--font); }
    .reveal:hover { border-color: var(--accent); color: var(--text); }
    .rate { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--border); }
    .rate .btn.on { color: var(--bg); }
    .rate .btn.ok.on { background: var(--ok); } .rate .btn.warn.on { background: var(--warn); }
    .refs { margin: 0; padding-left: 1.2em; }
    .actions { margin-top: 16px; } .small { font-size: 13px; }
    .diff { width: auto; padding: 6px 8px; font-size: 13px; }
  `]
})
export class QuestionDetailComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private updates=new Subject<{id:number;body:UpdateProgress;silent:boolean}>();

  readonly id = input.required<string>();
  readonly topic = input<string>();
  readonly plan = input<string>();
  readonly day = input<string>();

  readonly q = signal<QuestionDetail | null>(null);
  readonly notFound = signal(false);
  readonly revealed = signal(false);
  readonly previewNote = signal(false);
  note = '';
  readonly difficulties = DIFFICULTIES;
  readonly ratings: { label: string; value: RecallRating }[] = [
    { label: 'Easy', value: 'Easy' }, { label: 'Okay', value: 'Okay' }, { label: 'Hard', value: 'Hard' }, { label: "Didn't know", value: 'DidNotKnow' }];
  readonly navParams = computed(() => ({ topic: this.topic() ?? null, plan: this.plan() ?? null, day: this.day() ?? null }));

  constructor() {
    this.updates.pipe(concatMap(x=>this.api.progress(x.id,x.body).pipe(catchError(()=>EMPTY))),takeUntilDestroyed()).subscribe(state=>{
      const current=this.q();if(current)this.q.set({...current,userState:state,difficulty:state.personalDifficulty??current.difficulty});
    });
    effect(() => {
      const id = Number(this.id());
      const topic = this.topic() ? Number(this.topic()) : undefined;
      this.revealed.set(false); this.previewNote.set(false);
      this.api.question(id, topic).subscribe({
        next: q => {
          this.q.set(q); this.note = q.userState.note ?? '';
          if (q.userState.status === 'NotStarted') this.update({ status: 'InProgress' }, true);
        },
        error: () => this.notFound.set(true)
      });
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
    const q = this.q(); if (!q) return;
    if (e.key === ' ') { e.preventDefault(); this.revealed.set(true); }
    else if (e.key === 'h') this.revealed.set(false);
    else if (e.key === 'j' && q.nextId) this.router.navigate(['/questions', q.nextId], { queryParams: this.navParams() });
    else if (e.key === 'k' && q.previousId) this.router.navigate(['/questions', q.previousId], { queryParams: this.navParams() });
  }

  update(body: UpdateProgress, silent = false): void {
    const q = this.q(); if (!q) return;
    this.updates.next({id:q.id,body,silent});
    if(!silent && body.isFavorite!==undefined)this.toast.show(body.isFavorite?'Added to favorites':'Removed from favorites','ok');
  }

  setStatus(status: 'Completed' | 'NeedsReview' | 'InProgress'): void { this.update({ status }); }
  setDifficulty(d: Difficulty): void { this.update({ personalDifficulty: d }); }
  rate(rating: RecallRating): void { this.update({ rating }); this.toast.show('Saved for spaced review', 'ok'); }

  saveNote(): void {
    const q = this.q(); if (!q) return;
    this.api.saveNote(q.id, this.note).subscribe(() => {
      this.q.set({ ...q, userState: { ...q.userState, note: this.note } });
      this.toast.show('Note saved', 'ok');
    });
  }

  remove(): void {
    const q = this.q(); if (!q || !confirm('Delete this question and its notes/progress?')) return;
    this.api.deleteQuestion(q.id).subscribe(() => { this.toast.show('Question deleted', 'ok'); this.router.navigate(['/topics', q.topicId]); });
  }
}
