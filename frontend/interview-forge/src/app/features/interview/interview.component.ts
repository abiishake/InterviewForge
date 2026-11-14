import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { QuestionDetail, QuestionSummary, RecallRating, ReviewBucket } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { ShortcutService } from '../../core/services/shortcut.service';
import { ToastService } from '../../core/services/toast.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { DifficultyBadgeComponent } from '../../shared/components/ui.components';
import { IconComponent } from '../../shared/ui/icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

const LABELS: Record<RecallRating, string> = { Easy: 'Easy', Okay: 'Okay', Hard: 'Hard', DidNotKnow: "Didn't know" };

/** Focused self-test: answer hidden, reveal, then rate. Ratings feed the spaced-review scheduler. */
@Component({
  selector: 'app-interview',
  imports: [RouterLink, MarkdownComponent, DifficultyBadgeComponent, IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <p class="sr-only" aria-live="polite">@if (current()) { Question {{ index() + 1 }} of {{ queue().length }} }</p>
      @if (!queue().length && !loading()) {
        <div class="row head"><div><div class="eyebrow">Interview mode</div><h1>Answer out loud, then check yourself</h1></div><span class="spacer"></span><a class="btn ghost" routerLink="/">Exit</a></div>
        <div class="pools">
          <button class="pool" (click)="start('due')"><app-icon name="refresh" [size]="24" /><b>Due now</b><span class="muted">Spaced-review questions that are due</span></button>
          <button class="pool" (click)="start('notstarted')"><app-icon name="bolt" [size]="24" /><b>Not started</b><span class="muted">30 random questions you have not touched</span></button>
        </div>
        <h2 class="mt">By section</h2>
        <div class="chips wrapchips">
          @for (s of sections(); track s.id) { @if (s.progress.total > 0) { <button type="button" (click)="start('section', s.id)">{{ s.name }}</button> } }
        </div>
        @if (emptyPool()) { <p class="muted mt" role="status">That pool is empty. Choose another.</p> }
      } @else if (current(); as q) {
        <div class="topline">
          <button class="btn sm ghost" (click)="reset()"><app-icon name="x" [size]="16" /> End</button>
          <div class="bar" role="progressbar" aria-label="Session progress" [attr.aria-valuenow]="index() + 1" aria-valuemin="1" [attr.aria-valuemax]="queue().length"><div class="fill" [style.width.%]="progressPct()"></div></div>
          <span class="dim small">{{ index() + 1 }} / {{ queue().length }}</span>
        </div>
        <div class="row dim small meta"><span>{{ q.sectionName }} → {{ q.topicName }}</span><span class="spacer"></span><app-difficulty [value]="q.difficulty" /></div>
        <div class="card qcard">
          <app-markdown class="question" [source]="q.text" />
          @if (revealed()) { <hr /><div class="answer"><app-markdown [source]="q.answerMarkdown" /></div> }
        </div>
        <div class="controls">
          @if (!revealed()) {
            <button class="btn primary show" (click)="revealed.set(true)">Show answer <kbd class="hint">space</kbd></button>
            <div class="row"><a class="btn ghost" [routerLink]="['/questions', q.id]">Open full question</a><span class="spacer"></span><button class="btn ghost" (click)="skip()">Skip</button></div>
          } @else {
            <div class="grid4" role="group" aria-label="How well did you know this?">
              <button class="btn big ok" (click)="rate('Easy')"><app-icon name="check" [size]="18" /> Easy <kbd class="hint">1</kbd></button>
              <button class="btn big ok" (click)="rate('Okay')">Okay <kbd class="hint">2</kbd></button>
              <button class="btn big warn" (click)="rate('Hard')">Hard <kbd class="hint">3</kbd></button>
              <button class="btn big warn" (click)="rate('DidNotKnow')"><app-icon name="refresh" [size]="18" /> Didn't know <kbd class="hint">4</kbd></button>
            </div>
          }
        </div>
      } @else if (loading() || fetching()) {
        <app-skeleton kind="detail" />
      } @else {
        <div class="card done">
          <h2>Session complete</h2>
          <p class="muted">{{ rated() }} question(s) rated. Difficult ones are now in your review queue.</p>
          <ul class="counts">@for (c of summary(); track c.label) { <li><b>{{ c.count }}</b> {{ c.label }}</li> }</ul>
          <div class="row"><a class="btn primary" routerLink="/review">Go to review</a><button class="btn" (click)="reset()">New session</button><a class="btn ghost" routerLink="/">Exit</a></div>
        </div>
      }
    </div>`,
  styles: [`
    .wrap { max-width: 860px; margin: 0 auto; padding: 20px 16px calc(32px + var(--safe-bottom)); } .small { font-size: 13px; }
    .head { margin-bottom: 14px; }
    .pools { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 12px; }
    .pool { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; text-align: left; padding: 18px; border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-card); color: var(--text); cursor: pointer; font: 15px var(--font); }
    .pool:hover { border-color: var(--accent); }
    .wrapchips { flex-wrap: wrap; overflow: visible; }
    .topline { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .bar { flex: 1; height: 8px; background: var(--bg-hover); border-radius: 99px; overflow: hidden; } .fill { height: 100%; background: var(--accent); transition: width .2s; }
    .meta { margin: 6px 0; }
    .qcard { padding: 26px; } .question { display: block; font-size: var(--fs-lg, 1.2rem); font-weight: 500; }
    hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; } .answer { line-height: 1.75; }
    .controls { position: sticky; bottom: 0; background: var(--bg); padding: 14px 0 calc(8px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 10px; }
    .show { min-height: 52px; justify-content: center; font-size: 16px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .big { min-height: 56px; justify-content: center; font-size: 15px; }
    .hint { font: 11px var(--mono); border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; opacity: .7; }
    @media (pointer: coarse) { .hint { display: none; } }
    @media (max-width: 640px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    .counts { list-style: none; padding: 0; display: flex; gap: 18px; flex-wrap: wrap; }
  `]
})
export class InterviewComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private shortcuts = inject(ShortcutService);
  private ref = inject(ReferenceDataService);
  readonly topic = input<string>();
  readonly bucket = input<ReviewBucket>();
  readonly sections = computed(() => this.ref.sections() ?? []);
  readonly queue = signal<QuestionSummary[]>([]);
  readonly index = signal(0);
  readonly current = signal<QuestionDetail | null>(null);
  readonly revealed = signal(false);
  readonly loading = signal(false);
  readonly emptyPool = signal(false);
  readonly rated = signal(0);
  /** True while the current question's detail is still loading (it is usually prefetched, so rarely visible). */
  readonly fetching = signal(false);
  /** Question details already fetched this session, so moving to the next card needs no round trip. */
  private cache = new Map<number, QuestionDetail>();
  private pending = new Set<number>();
  private counts = signal<Record<RecallRating, number>>({ Easy: 0, Okay: 0, Hard: 0, DidNotKnow: 0 });
  readonly progressPct = computed(() => (this.queue().length ? ((this.index() + 1) / this.queue().length) * 100 : 0));
  readonly summary = computed(() => (Object.keys(LABELS) as RecallRating[]).map(k => ({ label: LABELS[k], count: this.counts()[k] })));

  constructor() {
    this.ref.refreshSections().subscribe({ error: () => undefined });
    effect(() => {
      const t = this.topic(), b = this.bucket();
      untracked(() => {
        if (t) this.load(this.api.topicQuestions(Number(t), 'All').pipe(map(p => p.items)));
        else if (b) this.load(this.api.reviewQueue(b).pipe(map(p => p.items)));
      });
    });
  }

  /** F3: pools are built on the server (section filter, random order, limit), never by filtering one page client-side. */
  start(kind: 'due' | 'notstarted' | 'section', sectionId?: number): void {
    if (kind === 'due') this.load(this.api.reviewQueue('Due', 1, 50).pipe(map(p => p.items)));
    else if (kind === 'notstarted') this.load(this.api.questions({ filter: 'NotStarted', random: true, limit: 30 }).pipe(map(p => p.items)));
    else this.load(this.api.questions({ sectionId, random: true, limit: 40 }).pipe(map(p => p.items)));
  }

  private load(source: Observable<QuestionSummary[]>): void {
    this.loading.set(true); this.emptyPool.set(false); this.rated.set(0);
    this.cache.clear();
    this.counts.set({ Easy: 0, Okay: 0, Hard: 0, DidNotKnow: 0 });
    source.subscribe({ next: items => this.begin(items), error: () => this.loading.set(false) });
  }

  private begin(items: QuestionSummary[]): void {
    // Fisher-Yates: an unbiased shuffle (sorting with a random comparator favours some orders).
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.queue.set(shuffled); this.index.set(0); this.loading.set(false);
    this.emptyPool.set(items.length === 0);
    this.show();
  }

  private show(): void {
    this.revealed.set(false);
    const item = this.queue()[this.index()];
    if (!item) { this.current.set(null); this.fetching.set(false); return; }
    const hit = this.cache.get(item.id);
    if (hit) { this.current.set(hit); this.fetching.set(false); }
    else { this.current.set(null); this.fetching.set(true); }
    this.fetch(item.id);
    const next = this.queue()[this.index() + 1];
    if (next) this.fetch(next.id); // prefetch, so the next card appears without a loading flash
  }

  private fetch(id: number): void {
    if (this.cache.has(id) || this.pending.has(id)) return;
    this.pending.add(id);
    this.api.question(id).subscribe({
      next: q => {
        this.pending.delete(id); this.cache.set(id, q);
        if (this.queue()[this.index()]?.id === id) { this.current.set(q); this.fetching.set(false); }
      },
      error: () => {
        this.pending.delete(id);
        if (this.queue()[this.index()]?.id === id) { this.fetching.set(false); this.skip(); } // can't show it: move on
      }
    });
  }

  /** Advances at once and saves in the background; a failed save offers a retry instead of blocking the session. */
  rate(r: RecallRating): void {
    const q = this.current();
    if (!q || !this.revealed()) return; // show() hides the answer again, so a double tap or key repeat cannot rate twice
    this.count(r, 1);
    this.save(q.id, r);
    this.skip();
  }

  private count(r: RecallRating, delta: number): void {
    this.rated.update(n => n + delta);
    this.counts.update(c => ({ ...c, [r]: c[r] + delta }));
  }

  private save(id: number, r: RecallRating): void {
    this.api.progress(id, { rating: r }, true).subscribe({
      error: () => {
        this.count(r, -1);
        this.toast.show('Could not save your last rating.', 'error', 0, { label: 'Retry', run: () => { this.count(r, 1); this.save(id, r); } });
      }
    });
  }

  skip(): void { this.index.update(i => i + 1); this.show(); }
  reset(): void { this.queue.set([]); this.current.set(null); this.index.set(0); this.fetching.set(false); this.cache.clear(); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.current() || this.shortcuts.ignore(e)) return;
    if (e.key === ' ' && !this.revealed()) { e.preventDefault(); this.revealed.set(true); return; }
    if (!this.revealed()) return;
    const keys: Record<string, RecallRating> = { '1': 'Easy', '2': 'Okay', '3': 'Hard', '4': 'DidNotKnow' };
    if (keys[e.key]) this.rate(keys[e.key]);
  }
}
