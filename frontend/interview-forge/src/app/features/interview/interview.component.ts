import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { QuestionDetail, QuestionSummary, RecallRating, ReviewBucket, Section } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { DifficultyBadgeComponent } from '../../shared/components/ui.components';

/** Focused self-test: answer hidden, reveal, then rate. Ratings feed the spaced-review scheduler. */
@Component({
  selector: 'app-interview',
  imports: [RouterLink, MarkdownComponent, DifficultyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <div class="page-header"><div><div class="eyebrow">Interview mode</div><h1>Answer out loud, then check yourself</h1></div></div>

      @if (!queue().length && !loading()) {
        <div class="card">
          <p>Pick a pool of questions:</p>
          <div class="row">
            <button class="btn" (click)="start('due')">Due for review</button>
            <button class="btn" (click)="start('notstarted')">Not started (all)</button>
            @for (s of sections(); track s.id) { @if (s.progress.total > 0) { <button class="btn sm" (click)="start('section', s.id)">{{ s.name }}</button> } }
          </div>
          @if (emptyPool()) { <p class="muted mt">That pool is empty — choose another.</p> }
        </div>
      } @else if (current(); as q) {
        <div class="row dim small"><span>Question {{ index() + 1 }} of {{ queue().length }}</span><span class="spacer"></span>
          <span>{{ q.sectionName }} → {{ q.topicName }}</span><app-difficulty [value]="q.difficulty" /></div>
        <div class="card qcard mt">
          <app-markdown class="question" [source]="q.text" />
          @if (!revealed()) {
            <button class="btn primary mt-lg" (click)="revealed.set(true)">Show answer (space)</button>
          } @else {
            <hr />
            <app-markdown [source]="q.answerMarkdown" />
            <div class="rate">
              <b>How well did you know this?</b>
              <button class="btn ok" (click)="rate('Easy')">1 · Easy</button>
              <button class="btn ok" (click)="rate('Okay')">2 · Okay</button>
              <button class="btn warn" (click)="rate('Hard')">3 · Hard</button>
              <button class="btn warn" (click)="rate('DidNotKnow')">4 · Didn't know</button>
            </div>
          }
        </div>
        <div class="row mt"><a class="btn ghost" [routerLink]="['/questions', q.id]">Open full question</a><span class="spacer"></span>
          <button class="btn ghost" (click)="next()">Skip →</button><button class="btn ghost" (click)="reset()">End session</button></div>
      } @else if (loading()) { <div class="loading">Preparing questions…</div> }
      @else {
        <div class="card"><h2>Session complete</h2><p class="muted">{{ rated() }} questions rated. Difficult ones are now in your review queue.</p>
          <div class="row"><a class="btn primary" routerLink="/review">Go to review</a><button class="btn" (click)="reset()">New session</button></div></div>
      }
    </div>`,
  styles: [`
    .narrow { max-width: 860px; } .small { font-size: 13px; }
    .qcard { padding: 28px; } .question { display: block; font-size: 1.2rem; font-weight: 500; }
    hr { border: none; border-top: 1px solid var(--border); margin: 22px 0; }
    .rate { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
  `]
})
export class InterviewComponent {
  private api = inject(ApiService);
  readonly topic = input<string>();
  readonly bucket = input<ReviewBucket>();
  readonly sections = signal<Section[]>([]);
  readonly queue = signal<QuestionSummary[]>([]);
  readonly index = signal(0);
  readonly current = signal<QuestionDetail | null>(null);
  readonly revealed = signal(false);
  readonly loading = signal(false);
  readonly emptyPool = signal(false);
  readonly rated = signal(0);
  readonly finished = computed(() => this.queue().length > 0 && this.index() >= this.queue().length);

  constructor() {
    this.api.sections().subscribe(s => this.sections.set(s));
    effect(() => {
      const t = this.topic(), b = this.bucket();
      if (t) this.load(this.api.topicQuestions(Number(t), 'All').pipe(map(p => p.items)));
      else if (b) this.load(this.api.reviewQueue(b).pipe(map(p => p.items)));
    });
  }

  start(kind: 'due' | 'notstarted' | 'section', sectionId?: number): void {
    if (kind === 'due') this.load(this.api.reviewQueue('Due').pipe(map(p => p.items)));
    else if (kind === 'notstarted') this.load(this.api.questions({ filter: 'NotStarted', pageSize: 30 }).pipe(map(p => p.items)));
    else this.load(this.api.topics(sectionId).pipe(map(ts => ts)), sectionId);
  }

  private load(source: Observable<QuestionSummary[]> | Observable<unknown>, sectionId?: number): void {
    this.loading.set(true); this.emptyPool.set(false); this.rated.set(0);
    if (sectionId !== undefined) {
      // Section pool: gather up to 40 questions across its topics via search-free listing.
      this.api.questions({ pageSize: 200 }).pipe(map(p => p.items.filter(q => q.sectionId === sectionId).slice(0, 40)))
        .subscribe(items => this.begin(items));
      return;
    }
    (source as Observable<QuestionSummary[]>).subscribe(items => this.begin(items));
  }

  private begin(items: QuestionSummary[]): void {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    this.queue.set(shuffled); this.index.set(0); this.loading.set(false);
    this.emptyPool.set(items.length === 0);
    this.show();
  }

  private show(): void {
    this.revealed.set(false);
    const item = this.queue()[this.index()];
    if (!item) { this.current.set(null); return; }
    this.api.question(item.id).subscribe(q => this.current.set(q));
  }

  rate(r: RecallRating): void {
    const q = this.current(); if (!q) return;
    this.api.progress(q.id, { rating: r }).subscribe(() => { this.rated.update(n => n + 1); this.next(); });
  }

  next(): void { this.index.update(i => i + 1); this.show(); }
  reset(): void { this.queue.set([]); this.current.set(null); this.index.set(0); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.current()) return;
    if (e.key === ' ' && !this.revealed()) { e.preventDefault(); this.revealed.set(true); return; }
    if (!this.revealed()) return;
    const map: Record<string, RecallRating> = { '1': 'Easy', '2': 'Okay', '3': 'Hard', '4': 'DidNotKnow' };
    if (map[e.key]) this.rate(map[e.key]);
  }
}
