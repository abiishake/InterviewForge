import { DatePipe } from '@angular/common';
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
  imports: [FeedbackFormComponent, RouterLink, MarkdownComponent, DifficultyBadgeComponent, StatusBadgeComponent, FormsModule, DatePipe,
    EmptyStateComponent, IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (q(); as q) {
        <div class="breadcrumb">
          <a [routerLink]="['/sections', q.sectionId]">{{ q.sectionName }}</a> / <a [routerLink]="['/topics', q.topicId]">{{ q.topicName }}</a>
          @if (plan()) { · <a [routerLink]="['/plan', plan(), 'day', day()]">back to day {{ day() }}</a> }
        </div>

        <div class="split">
          <div class="main">
            <article class="panel qcard">
              <div class="panel-head meta">
                <app-difficulty [value]="q.difficulty" /><app-status [value]="q.userState.status" />
                @if (q.isUserCreated) { <span class="badge accent">Added by {{ q.addedBy }}</span> }
                <span class="spacer"></span>
                @if (q.externalId) { <span class="dim mono">{{ q.externalId }}</span> }
                <div class="seg" role="group" aria-label="Previous and next question">
                  <a class="btn sm icon" [class.disabled]="!q.previousId" [routerLink]="q.previousId ? ['/questions', q.previousId] : null" [queryParams]="navParams()" aria-label="Previous question" title="Previous (k)"><app-icon name="chevron-left" [size]="16" /></a>
                  <a class="btn sm icon" [class.disabled]="!q.nextId" [routerLink]="q.nextId ? ['/questions', q.nextId] : null" [queryParams]="navParams()" aria-label="Next question" title="Next (j)"><app-icon name="chevron-right" [size]="16" /></a>
                </div>
              </div>
              <div class="qbody">
                <div class="label">Question</div>
                <app-markdown class="question" [source]="q.text" />

                <div class="label">Answer</div>
                @if (revealed()) {
                  <div class="answer"><app-markdown [source]="q.answerMarkdown" /></div>
                  @if (q.followUpsMarkdown) { <div class="label">Likely follow-ups</div><app-markdown [source]="q.followUpsMarkdown" /> }
                  @if (q.references.length) {
                    <div class="label">References</div>
                    <ul class="refs">@for (r of q.references; track r.url) { <li><a [href]="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }} ↗</a></li> }</ul>
                  }
                } @else {
                  <button class="reveal" (click)="revealed.set(true)"><app-icon name="lock" [size]="20" /><span>Think about your answer first, then reveal it.</span><kbd class="hint">space</kbd></button>
                }
              </div>
            </article>

            <div class="row nav">
              @if (q.previousId) { <a class="btn big" [routerLink]="['/questions', q.previousId]" [queryParams]="navParams()"><app-icon name="chevron-left" /> Previous</a> }
              <span class="spacer"></span>
              @if (q.nextId) { <a class="btn big primary" [routerLink]="['/questions', q.nextId]" [queryParams]="navParams()">Next <app-icon name="chevron-right" /></a> }
            </div>
          </div>

          <aside class="rail-col" aria-label="Question details and notes">
            <section class="panel">
              <div class="panel-head"><h2>Details</h2></div>
              <dl class="facts">
                <div><dt>Section</dt><dd><a [routerLink]="['/sections', q.sectionId]">{{ q.sectionName }}</a></dd></div>
                <div><dt>Topic</dt><dd><a [routerLink]="['/topics', q.topicId]">{{ q.topicName }}</a></dd></div>
                <div><dt><label for="diff">My difficulty</label></dt><dd>
                  <select id="diff" class="diff" [ngModel]="q.difficulty" (ngModelChange)="setDifficulty($event)">
                    @for (d of difficulties; track d) { <option [value]="d">{{ d }}</option> }
                  </select></dd></div>
                <div><dt>Last rating</dt><dd>{{ ratingLabel(q.userState.lastRating) }}</dd></div>
                <div><dt>Next review</dt><dd>@if (q.userState.nextReviewAt) { {{ q.userState.nextReviewAt | date:'MMM d, HH:mm' }} } @else { <span class="dim">not scheduled</span> }</dd></div>
                <div><dt>Reviewed</dt><dd class="mono">{{ q.userState.reviewCount }}×</dd></div>
              </dl>
              @if (q.tags.length) { <div class="tags">@for (t of q.tags; track t) { <a class="tag" [routerLink]="['/search']" [queryParams]="{ q: t }">#{{ t }}</a> }</div> }
              <div class="panel-foot">
                <app-feedback-form kind="Question" [contentId]="q.id" />
                @if (q.canEdit) {
                  <span class="spacer"></span>
                  <a class="btn sm" [routerLink]="['/questions', q.id, 'edit']"><app-icon name="edit" [size]="14" /> Edit</a>
                  <button class="btn sm danger icon" (click)="remove()" aria-label="Delete question" title="Delete question"><app-icon name="trash" [size]="14" /></button>
                }
              </div>
            </section>

            <section class="panel" aria-labelledby="notes-h">
              <div class="panel-head"><h2 id="notes-h">My notes</h2><span class="spacer"></span><span class="dim small" aria-live="polite">{{ noteLabel() }}</span></div>
              <div class="panel-body">
                <textarea rows="6" [ngModel]="note" (ngModelChange)="noteEdited($event)" name="note" placeholder="Your own phrasing, project examples, links… (Markdown, saved automatically, private)" aria-labelledby="notes-h"></textarea>
                @if (note) { <button type="button" class="btn sm ghost mt-s" (click)="previewNote.set(!previewNote())">{{ previewNote() ? 'Hide preview' : 'Preview' }}</button> }
                @if (previewNote() && note) { <div class="mt-s"><app-markdown [source]="note" /></div> }
              </div>
            </section>
          </aside>
        </div>

        <div class="actionbar" role="toolbar" aria-label="Question actions">
          @if (revealed()) {
            <div class="rates" role="group" aria-label="How well did you know this?">
              <span class="rl dim small">Recall</span>
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
            <button class="btn fav icon" [class.on]="q.userState.isFavorite" [attr.aria-pressed]="q.userState.isFavorite" [attr.aria-label]="q.userState.isFavorite ? 'Remove favourite' : 'Add favourite'"
              (click)="update({ isFavorite: !q.userState.isFavorite })"><app-icon name="star" [size]="16" /></button>
            @if (revealed()) { <button class="btn ghost" (click)="revealed.set(false)">Hide <kbd class="hint">h</kbd></button> }
          </div>
        </div>
      } @else if (notFound()) {
        <app-empty-state icon="alert" title="Question not found" hint="It may have been deleted."><a class="btn" routerLink="/sections">Browse the library</a></app-empty-state>
      } @else { <app-skeleton kind="detail" /> }
    </div>`,
  styles: [`
    .main { min-width: 0; }
    .meta { flex-wrap: wrap; row-gap: 6px; }
    .mono { font-family: var(--mono); font-size: 12px; }
    .seg { display: inline-flex; margin-left: 4px; }
    .seg .btn:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); } .seg .btn:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; margin-left: -1px; }
    .btn.disabled { opacity: .4; pointer-events: none; }
    .qbody { padding: 6px 22px 22px; }
    .label { font: 600 10.5px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); margin: 20px 0 10px; display: flex; align-items: center; gap: 10px; }
    .label::after { content: ""; flex: 1; height: 1px; background: var(--border); }
    .question { display: block; font-size: 1.12rem; font-weight: 500; line-height: 1.55; }
    .answer { line-height: 1.75; }
    .reveal { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; padding: 36px 16px; border: 1px dashed var(--border-strong); border-radius: var(--radius); background: var(--bg-sunken); color: var(--text-muted); cursor: pointer; font: 14px var(--font); transition: border-color var(--dur-1), color var(--dur-1); }
    .reveal:hover { border-color: var(--accent); color: var(--text); }
    .refs { margin: 0; padding-left: 1.2em; }
    .nav { margin: 14px 0; } .big { min-height: 44px; padding: 0 20px; }
    .facts { margin: 0; padding: 6px 14px; }
    .facts > div { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .facts > div:last-child { border-bottom: 0; }
    .facts dt { color: var(--text-dim); width: 96px; flex: none; } .facts dt label { margin: 0; font-size: 13px; color: inherit; font-weight: 400; }
    .facts dd { margin: 0; flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .facts dd a { color: var(--text); }
    .diff { width: auto; min-height: 30px; padding: 4px 8px; font-size: 13px; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px 12px; }
    .panel-foot { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid var(--border); }
    .mt-s { margin-top: 8px; }
    textarea { min-height: 140px; }
    .actionbar { position: sticky; bottom: 0; z-index: 20; margin: 18px calc(-1 * var(--gutter)) 0; padding: 10px var(--gutter) calc(10px + var(--safe-bottom));
      background: color-mix(in srgb, var(--bg-elev) 90%, transparent); backdrop-filter: blur(12px); border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
    .rates, .states { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .rl { margin-right: 4px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .08em; font-size: 10.5px; }
    .rates .btn.on { color: #fff; } .rates .btn.ok.on { background: var(--ok); } .rates .btn.warn.on { background: var(--warn); }
    .grow { flex: 1; justify-content: center; min-height: 40px; max-width: 420px; }
    .hint { font-size: 10.5px; opacity: .8; background: transparent; color: inherit; border-color: currentColor; }
    @media (pointer: coarse) { .hint { display: none; } }
    @media (max-width: 767px) {
      .qbody { padding: 4px 14px 16px; }
      .actionbar .btn { flex: 1 1 auto; justify-content: center; min-height: 44px; }
      .rates { width: 100%; } .rates .btn { flex: 1 1 45%; } .rl { display: none; } .grow { max-width: none; }
      .big { flex: 1; justify-content: center; }
      .seg { display: none; }
    }
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
  ratingLabel(r?: RecallRating | null): string { return this.ratings.find(x => x.value === r)?.label ?? '—'; }
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
