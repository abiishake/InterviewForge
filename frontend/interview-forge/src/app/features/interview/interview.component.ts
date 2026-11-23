import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, effect, inject, input, signal, untracked } from '@angular/core';
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
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';

const LABELS: Record<RecallRating, string> = { Easy: 'Easy', Okay: 'Okay', Hard: 'Hard', DidNotKnow: "Didn't know" };

/** Focused self-test: answer hidden, reveal, then rate. Ratings feed the spaced-review scheduler. */
@Component({
  selector: 'app-interview',
  imports: [RouterLink, MarkdownComponent, DifficultyBadgeComponent, IconComponent, SkeletonComponent, MeterComponent, PageHeaderComponent, StatTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <p class="sr-only" aria-live="polite">@if (current()) { Question {{ index() + 1 }} of {{ queue().length }} }</p>
      @if (!queue().length && !loading()) {
        <app-page-header eyebrow="Practice" title="Interview mode" description="Answer out loud, reveal the model answer, then rate yourself. Ratings feed spaced review.">
          <div actions><a class="btn ghost" routerLink="/"><app-icon name="x" [size]="16" /> Exit</a></div>
        </app-page-header>
        <div class="pools">
          <button class="pool" (click)="start('due')"><span class="pico due"><app-icon name="refresh" [size]="20" /></span><b>Due now</b><span class="muted small">Spaced-review questions that are due</span><span class="go">Start <app-icon name="arrow-right" [size]="14" /></span></button>
          <button class="pool" (click)="start('notstarted')"><span class="pico new"><app-icon name="bolt" [size]="20" /></span><b>Not started</b><span class="muted small">30 random questions you have not touched</span><span class="go">Start <app-icon name="arrow-right" [size]="14" /></span></button>
        </div>
        <section class="panel mt">
          <div class="panel-head"><app-icon name="layers" [size]="16" /><h2>By section</h2><span class="spacer"></span><span class="dim small">40 random questions</span></div>
          <div class="secs">
            @for (s of sections(); track s.id) { @if (s.progress.total > 0) {
              <button type="button" class="sec" (click)="start('section', s.id)"><span class="sname">{{ s.name }}</span><app-meter [value]="s.progress.completed" [total]="s.progress.total" /></button>
            } }
          </div>
        </section>
        @if (emptyPool()) { <p class="muted mt" role="status">That pool is empty. Choose another.</p> }
      } @else if (current(); as q) {
        <div class="topline">
          <button class="btn sm ghost" (click)="reset()"><app-icon name="x" [size]="16" /> End</button>
          <div class="segs" role="progressbar" aria-label="Session progress" [attr.aria-valuenow]="index() + 1" aria-valuemin="1" [attr.aria-valuemax]="queue().length">
            @if (queue().length <= 40) { @for (s of queue(); track s.id; let i = $index) { <span class="sg" [class.done]="i < index()" [class.cur]="i === index()"></span> } }
            @else { <span class="fillbar"><span [style.width.%]="progressPct()"></span></span> }
          </div>
          <span class="dim small mono">{{ index() + 1 }}/{{ queue().length }}</span>
          <span class="timer mono" [attr.aria-label]="'Elapsed ' + elapsed()"><app-icon name="clock" [size]="14" /> {{ elapsed() }}</span>
        </div>
        <article class="panel qcard">
          <div class="panel-head"><span class="dim small crumb">{{ q.sectionName }} / {{ q.topicName }}</span><span class="spacer"></span><app-difficulty [value]="q.difficulty" /></div>
          <div class="qbody">
            <app-markdown class="question" [source]="q.text" />
            @if (revealed()) { <div class="sep"><span>Model answer</span></div><div class="answer"><app-markdown [source]="q.answerMarkdown" /></div> }
          </div>
        </article>
        <div class="controls">
          @if (!revealed()) {
            <button class="btn primary show" (click)="revealed.set(true)">Show answer <kbd class="hint">space</kbd></button>
            <div class="row"><a class="btn ghost" [routerLink]="['/questions', q.id]"><app-icon name="external" [size]="14" /> Open full question</a><span class="spacer"></span><button class="btn ghost" (click)="skip()">Skip</button></div>
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
        <section class="panel done">
          <div class="panel-body">
            <span class="pico new big-ico"><app-icon name="check" [size]="26" /></span>
            <h2>Session complete</h2>
            <p class="muted">{{ rated() }} question(s) rated in {{ elapsed() }}. Difficult ones are now in your review queue.</p>
            <div class="tiles">@for (c of summary(); track c.label) { <app-stat-tile [label]="c.label" [value]="c.count" [tone]="c.label === 'Easy' || c.label === 'Okay' ? 'ok' : (c.count ? 'warn' : '')" /> }</div>
            <div class="row mt"><a class="btn primary" routerLink="/review">Go to review</a><button class="btn" (click)="reset()">New session</button><a class="btn ghost" routerLink="/">Exit</a></div>
          </div>
        </section>
      }
    </div>`,
  styles: [`
    .wrap { max-width: 900px; margin: 0 auto; padding: 20px var(--gutter) calc(32px + var(--safe-bottom)); }
    .small { font-size: 12.5px; } .mono { font-family: var(--mono); }
    .pools { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 12px; }
    .pool { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; text-align: left; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text); cursor: pointer; font: 14px var(--font);
      transition: border-color var(--dur-1), transform var(--dur-2) var(--ease-out), box-shadow var(--dur-2) var(--ease-out); }
    .pool:hover { border-color: var(--accent); box-shadow: var(--shadow-lift); }
    .pool:active { transform: scale(.99); }
    .pool b { font-size: 15px; }
    .go { margin-top: 6px; display: inline-flex; gap: 4px; align-items: center; color: var(--accent-text); font-weight: 600; font-size: 13px; }
    .pico { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; margin-bottom: 4px; }
    .pico.due { background: var(--info-soft); color: var(--info); } .pico.new { background: var(--ready-soft); color: var(--ready); }
    .secs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 6px; padding: 8px; }
    .sec { display: flex; flex-direction: column; gap: 6px; align-items: stretch; text-align: left; padding: 9px 10px; border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; color: var(--text); font: 13.5px var(--font); cursor: pointer; }
    .sec:hover { background: var(--bg-hover); border-color: var(--border); }
    .sname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .topline { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .segs { flex: 1; display: flex; gap: 3px; min-width: 0; }
    .sg { flex: 1; height: 6px; border-radius: 99px; background: var(--heat-0); transition: background var(--dur-2); }
    .sg.done { background: var(--ready); } .sg.cur { background: var(--accent); }
    .fillbar { flex: 1; height: 6px; border-radius: 99px; background: var(--heat-0); overflow: hidden; } .fillbar span { display: block; height: 100%; background: var(--accent); transition: width .3s var(--ease-out); }
    .timer { display: inline-flex; gap: 4px; align-items: center; font-size: 12.5px; color: var(--text-muted); padding: 3px 8px; border: 1px solid var(--border); border-radius: 99px; }
    .crumb { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qbody { padding: 20px 24px 24px; }
    .question { display: block; font-size: 1.2rem; font-weight: 500; line-height: 1.55; }
    .sep { display: flex; align-items: center; gap: 10px; margin: 22px 0 14px; font: 600 10.5px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); }
    .sep::before, .sep::after { content: ""; flex: 1; height: 1px; background: var(--border); }
    .answer { line-height: 1.75; animation: if-rise-in var(--dur-2) var(--ease-out); }
    .controls { position: sticky; bottom: 0; background: linear-gradient(to top, var(--bg) 70%, transparent); padding: 16px 0 calc(8px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 10px; }
    .show { min-height: 50px; justify-content: center; font-size: 15px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .big { min-height: 52px; justify-content: center; font-size: 14.5px; }
    .hint { font-size: 10.5px; opacity: .8; background: transparent; color: inherit; border-color: currentColor; }
    @media (pointer: coarse) { .hint { display: none; } }
    @media (max-width: 640px) { .grid4 { grid-template-columns: 1fr 1fr; } .qbody { padding: 16px; } .timer { display: none; } }
    .done { text-align: center; } .done .panel-body { display: flex; flex-direction: column; align-items: center; padding: 28px 18px; }
    .done .tiles { width: 100%; margin-top: 8px; text-align: left; }
    .big-ico { width: 52px; height: 52px; border-radius: 14px; }
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
  /** Session clock: starts when a pool loads, stops when the queue is finished. */
  private startedAt = 0;
  private stoppedAt = 0;
  private readonly now = signal(Date.now());
  readonly elapsed = computed(() => {
    if (!this.startedAt) return '0:00';
    const s = Math.max(0, Math.floor(((this.stoppedAt || this.now()) - this.startedAt) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  readonly summary = computed(() => (Object.keys(LABELS) as RecallRating[]).map(k => ({ label: LABELS[k], count: this.counts()[k] })));

  constructor() {
    this.ref.refreshSections().subscribe({ error: () => undefined });
    const tick = setInterval(() => { if (this.startedAt && !this.stoppedAt) this.now.set(Date.now()); }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
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
    this.startedAt = Date.now(); this.stoppedAt = 0; this.now.set(this.startedAt);
    this.emptyPool.set(items.length === 0);
    this.show();
  }

  private show(): void {
    this.revealed.set(false);
    const item = this.queue()[this.index()];
    if (!item) { this.current.set(null); this.fetching.set(false); if (this.startedAt && !this.stoppedAt) { this.stoppedAt = Date.now(); this.now.set(this.stoppedAt); } return; }
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
  reset(): void { this.startedAt = 0; this.stoppedAt = 0; this.queue.set([]); this.current.set(null); this.index.set(0); this.fetching.set(false); this.cache.clear(); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.current() || this.shortcuts.ignore(e)) return;
    if (e.key === ' ' && !this.revealed()) { e.preventDefault(); this.revealed.set(true); return; }
    if (!this.revealed()) return;
    const keys: Record<string, RecallRating> = { '1': 'Easy', '2': 'Okay', '3': 'Hard', '4': 'DidNotKnow' };
    if (keys[e.key]) this.rate(keys[e.key]);
  }
}
