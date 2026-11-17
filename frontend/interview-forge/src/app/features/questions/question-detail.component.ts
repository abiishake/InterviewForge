import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, concatMap, debounceTime, EMPTY, firstValueFrom, map, of, switchMap } from 'rxjs';
import { DIFFICULTIES, Difficulty, QuestionDetail, RecallRating, UpdateProgress, UserState } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { ShortcutService } from '../../core/services/shortcut.service';
import { ToastService } from '../../core/services/toast.service';
import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { DifficultyBadgeComponent, StatusBadgeComponent } from '../../shared/components/ui.components';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

type NoteState = 'idle' | 'dirty' | 'saving' | 'saved';

@Component({
  selector: 'app-question-detail',
  imports: [FeedbackFormComponent, RouterLink, MarkdownComponent, DifficultyBadgeComponent, StatusBadgeComponent, FormsModule, DatePipe, NgTemplateOutlet,
    EmptyStateComponent, IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (q(); as q) {
        <div class="breadcrumb">
          <a [routerLink]="['/sections', q.sectionId]">{{ q.sectionName }}</a> → <a [routerLink]="['/topics', q.topicId]">{{ q.topicName }}</a>
          @if (plan()) { · <a [routerLink]="['/plan', plan(), 'day', day()]">back to day {{ day() }}</a> }
        </div>

        <div class="layout">
          <div class="main">
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

              <div class="label">Answer</div>
              @if (revealed()) {
                <div class="answer"><app-markdown [source]="q.answerMarkdown" /></div>
                @if (q.references.length) {
                  <div class="label">References</div>
                  <ul class="refs">@for (r of q.references; track r.url) { <li><a [href]="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }} ↗</a></li> }</ul>
                }
                @if (q.followUpsMarkdown) { <div class="label">Likely follow-ups</div><app-markdown [source]="q.followUpsMarkdown" /> }
              } @else {
                <button class="reveal" (click)="revealed.set(true)">Think about your answer first, then reveal it.</button>
              }
            </article>

            <div class="row meta2">
              <select class="diff" [ngModel]="q.difficulty" (ngModelChange)="setDifficulty($event)" aria-label="My difficulty">
                @for (d of difficulties; track d) { <option [value]="d">{{ d }}</option> }
              </select>
              <app-feedback-form kind="Question" [contentId]="q.id" />
              <span class="spacer"></span>
              @if (q.canEdit) {
                <a class="btn sm" [routerLink]="['/questions', q.id, 'edit']"><app-icon name="edit" [size]="16" /> Edit</a>
                <button class="btn sm danger" (click)="remove()"><app-icon name="trash" [size]="16" /> Delete</button>
              }
            </div>
            @if (q.userState.nextReviewAt) { <p class="dim small">Next spaced review: {{ q.userState.nextReviewAt | date:'medium' }} · reviewed {{ q.userState.reviewCount }}×</p> }

            <div class="row nav">
              @if (q.previousId) { <a class="btn big" [routerLink]="['/questions', q.previousId]" [queryParams]="navParams()"><app-icon name="chevron-left" /> Previous</a> }
              <span class="spacer"></span>
              @if (q.nextId) { <a class="btn big primary" [routerLink]="['/questions', q.nextId]" [queryParams]="navParams()">Next <app-icon name="chevron-right" /></a> }
            </div>

            <details class="card notes-inline mt" [open]="note.length > 0">
              <summary><b>My notes</b> <span class="dim small">· {{ noteLabel() }}</span></summary>
              <ng-container *ngTemplateOutlet="notesTpl" />
            </details>
          </div>

          <aside class="notes-panel" aria-label="My notes">
            <div class="card"><div class="row"><b>My notes</b><span class="spacer"></span><span class="dim small">{{ noteLabel() }}</span></div>
              <ng-container *ngTemplateOutlet="notesTpl" /></div>
          </aside>
        </div>

        <ng-template #notesTpl>
          <textarea class="mt" rows="6" [ngModel]="note" (ngModelChange)="noteEdited($event)" name="note" placeholder="Your own phrasing, project examples, links… (Markdown supported, saved automatically, private)" aria-label="My notes"></textarea>
          @if (note) { <button type="button" class="btn sm ghost mt" (click)="previewNote.set(!previewNote())">{{ previewNote() ? 'Hide preview' : 'Preview' }}</button> }
          @if (previewNote() && note) { <div class="mt"><app-markdown [source]="note" /></div> }
        </ng-template>

        <div class="actionbar" role="toolbar" aria-label="Question actions">
          @if (revealed()) {
            <div class="rates" role="group" aria-label="How well did you know this?">
              @for (r of ratings; track r.value) {
                <button class="btn" [class.on]="q.userState.lastRating === r.value" [class.ok]="r.value === 'Easy' || r.value === 'Okay'"
                        [class.warn]="r.value === 'Hard' || r.value === 'DidNotKnow'" (click)="rate(r.value)">{{ r.label }}</button>
              }
            </div>
          } @else {
            <button class="btn primary grow" (click)="revealed.set(true)">Reveal answer <kbd class="hint">space</kbd></button>
          }
          <div class="states">
            <button class="btn ok" [class.on]="q.userState.status === 'Completed'" [attr.aria-pressed]="q.userState.status === 'Completed'"
              (click)="setStatus(q.userState.status === 'Completed' ? 'InProgress' : 'Completed')"><app-icon name="check" [size]="16" /> {{ q.userState.status === 'Completed' ? 'Completed' : 'Complete' }}</button>
            <button class="btn warn" [class.on]="q.userState.status === 'NeedsReview'" [attr.aria-pressed]="q.userState.status === 'NeedsReview'"
              (click)="setStatus(q.userState.status === 'NeedsReview' ? 'InProgress' : 'NeedsReview')"><app-icon name="refresh" [size]="16" /> Review</button>
            <button class="btn fav" [class.on]="q.userState.isFavorite" [attr.aria-pressed]="q.userState.isFavorite" [attr.aria-label]="q.userState.isFavorite ? 'Remove favourite' : 'Add favourite'"
              (click)="update({ isFavorite: !q.userState.isFavorite })"><app-icon name="star" [size]="16" /></button>
            @if (revealed()) { <button class="btn ghost" (click)="revealed.set(false)">Hide</button> }
          </div>
        </div>
      } @else if (notFound()) {
        <app-empty-state icon="alert" title="Question not found" hint="It may have been deleted."><a class="btn" routerLink="/sections">Browse the library</a></app-empty-state>
      } @else { <app-skeleton kind="detail" /> }
    </div>`,
  styles: [`
    .page { max-width: 1200px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
    .main { max-width: 800px; width: 100%; margin: 0 auto; min-width: 0; }
    .notes-panel { display: none; }
    @media (min-width: 1440px) {
      .layout { grid-template-columns: minmax(0, 800px) 340px; justify-content: center; }
      .notes-panel { display: block; position: sticky; top: 16px; align-self: start; }
      .notes-inline { display: none; }
    }
    .qcard { padding: 22px 24px; }
    .meta { margin-bottom: 8px; } .mono { font-family: var(--mono); font-size: 12px; }
    .label { font: 600 11px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); margin: 20px 0 10px; }
    .question { display: block; font-size: var(--fs-lg, 1.15rem); font-weight: 500; }
    .answer { line-height: 1.75; }
    .reveal { width: 100%; padding: 32px 16px; border: 1px dashed var(--border-strong); border-radius: var(--radius); background: var(--bg); color: var(--text-muted); cursor: pointer; font: 14px var(--font); }
    .reveal:hover { border-color: var(--accent); color: var(--text); }
    .refs { margin: 0; padding-left: 1.2em; }
    .meta2 { margin-top: 14px; } .small { font-size: 13px; }
    .diff { width: auto; padding: 6px 8px; font-size: 13px; }
    .nav { margin: 18px 0; } .big { min-height: 48px; padding: 0 22px; }
    .actionbar { position: sticky; bottom: 0; z-index: 20; margin: 18px -16px 0; padding: 10px 16px calc(10px + var(--safe-bottom)); background: var(--bg-elev); border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
    .rates, .states { display: flex; gap: 8px; flex-wrap: wrap; }
    .rates .btn.on { color: #fff; } .rates .btn.ok.on { background: var(--ok); } .rates .btn.warn.on { background: var(--warn); }
    .grow { flex: 1; justify-content: center; min-height: 44px; }
    .hint { font: 11px var(--mono); border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; opacity: .7; }
    @media (pointer: coarse) { .hint { display: none; } }
    @media (max-width: 767px) { .actionbar .btn { flex: 1 1 auto; justify-content: center; min-height: 44px; } .rates { width: 100%; } .rates .btn { flex: 1 1 45%; } .big { flex: 1; justify-content: center; } }
    summary { cursor: pointer; }
  `]
})
export class QuestionDetailComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialogs = inject(DialogService);
  private router = inject(Router);
  private shortcuts = inject(ShortcutService);
  private isAdmin = inject(AuthService).user;

  readonly id = input.required<string>();
  readonly topic = input<string>();
  readonly plan = input<string>();
  readonly day = input<string>();

  readonly q = signal<QuestionDetail | null>(null);
  readonly notFound = signal(false);
  readonly revealed = signal(false);
  readonly previewNote = signal(false);
  readonly noteState = signal<NoteState>('idle');
  note = '';
  readonly difficulties = DIFFICULTIES;
  readonly ratings: { label: string; value: RecallRating }[] = [
    { label: 'Easy', value: 'Easy' }, { label: 'Okay', value: 'Okay' }, { label: 'Hard', value: 'Hard' }, { label: "Didn't know", value: 'DidNotKnow' }];
  readonly navParams = computed(() => ({ topic: this.topic() ?? null, plan: this.plan() ?? null, day: this.day() ?? null }));
  readonly noteLabel = computed(() => ({ idle: '', dirty: 'Unsaved…', saving: 'Saving…', saved: 'Saved ✓' })[this.noteState()]);

  private updates = new Subject<{ id: number; body: UpdateProgress }>();
  /** Last state the server confirmed. Optimistic changes are shown at once and rolled back to this if a save fails. */
  private confirmed: { id: number; state: UserState; difficulty: Difficulty } | null = null;
  private loads = new Subject<{ id: number; topic?: number }>();
  private notes = new Subject<{ id: number; body: string }>();

  constructor() {
    // F1: every response carries the id it belongs to and is dropped if the user already moved to another question.
    this.updates.pipe(
      concatMap(x => this.api.progress(x.id, x.body).pipe(
        map(state => ({ id: x.id, state, body: x.body })),
        catchError(() => { this.rollback(x.id); return EMPTY; }) // the error interceptor has already toasted
      )),
      takeUntilDestroyed()
    ).subscribe(({ id, state, body }) => { this.applyState(id, state); this.announce(id, body); });

    // switchMap cancels the previous request when the route changes.
    this.loads.pipe(
      switchMap(x => this.api.question(x.id, x.topic).pipe(catchError(() => { this.notFound.set(true); return of(null); }))),
      takeUntilDestroyed()
    ).subscribe(q => {
      if (!q) return;
      this.q.set(q); this.confirmed = { id: q.id, state: q.userState, difficulty: q.difficulty }; this.note = q.userState.note ?? ''; this.noteState.set('idle');
      if (q.userState.status === 'NotStarted') this.update({ status: 'InProgress' });
    });

    // F10: debounced autosave, tagged with the question id so a late save never lands on another question.
    this.notes.pipe(
      debounceTime(800),
      switchMap(n => { this.noteState.set('saving'); return this.api.saveNote(n.id, n.body).pipe(map(() => n), catchError(() => { this.noteState.set('dirty'); return EMPTY; })); }),
      takeUntilDestroyed()
    ).subscribe(n => {
      const cur = this.q();
      if (cur && cur.id === n.id) { this.q.set({ ...cur, userState: { ...cur.userState, note: n.body } }); this.noteState.set(this.note === n.body ? 'saved' : 'dirty'); }
    });

    effect(() => {
      const id = Number(this.id());
      const topic = this.topic() ? Number(this.topic()) : undefined;
      untracked(() => {
        this.flushNote();
        this.q.set(null); this.notFound.set(false); this.revealed.set(false); this.previewNote.set(false);
        this.loads.next({ id, topic });
      });
    });
  }

  noteEdited(v: string): void {
    const q = this.q(); if (!q) return;
    this.note = v; this.noteState.set('dirty');
    this.notes.next({ id: q.id, body: v });
  }

  /** Saves immediately when navigating away from a question with an unsaved note. */
  private flushNote(): void {
    const q = this.q();
    if (q && this.noteState() === 'dirty') this.api.saveNote(q.id, this.note).subscribe();
  }

  @HostListener('window:beforeunload', ['$event'])
  warnUnsaved(e: BeforeUnloadEvent): void { if (this.noteState() === 'dirty') { this.flushNote(); e.preventDefault(); } }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.shortcuts.ignore(e)) return;
    const q = this.q(); if (!q) return;
    if (e.key === ' ') { e.preventDefault(); this.revealed.set(true); }
    else if (e.key === 'h') this.revealed.set(false);
    else if (e.key === 'j' && q.nextId) this.router.navigate(['/questions', q.nextId], { queryParams: this.navParams() });
    else if (e.key === 'k' && q.previousId) this.router.navigate(['/questions', q.previousId], { queryParams: this.navParams() });
  }

  private applyState(id: number, state: UserState): void {
    const current = this.q();
    const difficulty = state.personalDifficulty ?? this.confirmed?.difficulty ?? current?.difficulty;
    if (difficulty) this.confirmed = { id, state, difficulty };
    if (!current || current.id !== id) return;
    this.q.set({ ...current, userState: state, difficulty: state.personalDifficulty ?? current.difficulty });
  }

  /** Shows the change immediately; the server's response then replaces it with the authoritative state. */
  private patch(q: QuestionDetail, body: UpdateProgress): QuestionDetail {
    const u: UserState = { ...q.userState };
    if (body.status) u.status = body.status;
    if (body.isFavorite !== undefined) u.isFavorite = body.isFavorite;
    if (body.personalDifficulty) u.personalDifficulty = body.personalDifficulty;
    if (body.rating) u.lastRating = body.rating;
    return { ...q, userState: u, difficulty: body.personalDifficulty ?? q.difficulty };
  }

  private rollback(id: number): void {
    const cur = this.q(), c = this.confirmed;
    if (cur && c && cur.id === id && c.id === id) this.q.set({ ...cur, userState: c.state, difficulty: c.difficulty });
  }

  /** Success feedback only once the server has confirmed the change. */
  private announce(id: number, body: UpdateProgress): void {
    if (body.rating) this.toast.show('Saved for spaced review', 'ok');
    if (body.isFavorite !== undefined) {
      this.toast.show(body.isFavorite ? 'Added to favorites' : 'Removed from favorites', 'ok', undefined,
        { label: 'Undo', run: () => { if (this.q()?.id === id) this.update({ isFavorite: !body.isFavorite }); } });
    }
  }

  update(body: UpdateProgress): void {
    const q = this.q(); if (!q) return;
    this.q.set(this.patch(q, body));
    this.updates.next({ id: q.id, body });
  }

  setStatus(status: 'Completed' | 'NeedsReview' | 'InProgress'): void { this.update({ status }); }
  setDifficulty(d: Difficulty): void { this.update({ personalDifficulty: d }); }
  rate(rating: RecallRating): void { this.update({ rating }); }

  async remove(): Promise<void> {
    const q = this.q(); if (!q) return;
    const impact = await firstValueFrom(this.api.impact('questions', q.id));
    const others = impact.usersWithProgress + impact.usersWithNotes;
    if (others > 0 && !this.isAdmin()?.isAdmin) {
      this.toast.show('Other members have studied this question. Ask an administrator to remove it (use “Suggest a change”).', 'error', 7000);
      return;
    }
    const impactText = others > 0 || impact.planItems > 0
      ? ` Affected: ${impact.usersWithProgress} member(s) with progress, ${impact.usersWithNotes} with notes, ${impact.planItems} plan item(s).`
      : '';
    const ok = await this.dialogs.confirm({
      title: 'Delete this shared question?',
      message: 'It disappears for every member, including their notes and progress on it.' + impactText + (q.externalId ? ' Imported questions are not re-imported unless an administrator restores them.' : ''),
      confirmLabel: 'Delete question', danger: true
    });
    if (!ok) return;
    this.api.deleteQuestion(q.id).subscribe(() => { this.toast.show('Question deleted', 'ok'); this.router.navigate(['/topics', q.topicId]); });
  }
}
