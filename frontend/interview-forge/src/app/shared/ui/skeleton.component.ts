import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Loading placeholder shaped like the content it stands in for, so the page does not jump when data arrives.
 *  - text:   plain lines
 *  - card:   full-width blocks
 *  - list:   question-list rows (status dot, two lines, badge)
 *  - grid:   a responsive grid of cards with a ring and a progress bar (sections, algorithms)
 *  - detail: breadcrumb, badges, a heading and body text (question and similar pages)
 *  - stats:  a row of stat tiles followed by cards (dashboard)
 * Shimmer is disabled for reduced motion. Screen readers hear a single "Loading…".
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" [class]="'sk ' + kind()" role="status" aria-live="polite" aria-busy="true"><span class="sr-only">Loading…</span>
      @switch (kind()) {
        @case ('list') {
          <div class="rowlist">
            @for (i of rows(); track i) {
              <div class="srow"><span class="b dot"></span><div class="lines"><div class="b bar" [style.width.%]="70 + (i * 7) % 25"></div><div class="b bar sm w40"></div></div><span class="b pill"></span></div>
            }
          </div>
        }
        @case ('grid') {
          <div class="sgrid">
            @for (i of rows(); track i) {
              <div class="scard"><div class="top"><span class="b ring"></span><div class="lines"><div class="b bar w70"></div><div class="b bar sm w50"></div></div></div><div class="b bar thin"></div></div>
            }
          </div>
        }
        @case ('detail') {
          <div class="b bar sm w40"></div>
          <div class="sdetail">
            <div class="chips-row"><span class="b pill"></span><span class="b pill"></span><span class="b pill wide"></span></div>
            <div class="b bar lg"></div><div class="b bar lg w70"></div>
            <div class="b block"></div>
          </div>
        }
        @case ('stats') {
          <div class="stat-row">@for (i of [0, 1, 2, 3]; track i) { <div class="stile"><div class="b bar sm w50"></div><div class="b bar lg w40"></div></div> }</div>
          @for (i of rows(); track i) { <div class="b bar block"></div> }
        }
        @default {
          @for (i of rows(); track i) { <div class="b bar" [class.card]="kind() === 'card'" [class.short]="kind() === 'text' && i === rows().length - 1"></div> }
        }
      }
    </div>`,
  styles: [`
    .sk { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
    .b { display: block; background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite linear; }
    .bar { height: 14px; border-radius: 6px; }
    .bar.sm { height: 11px; } .bar.lg { height: 22px; } .bar.thin { height: 5px; border-radius: 99px; }
    .bar.card { height: 84px; border-radius: var(--radius); }
    .bar.block { height: 84px; border-radius: var(--radius); }
    .bar.short { width: 60%; }
    .w40 { width: 40%; } .w50 { width: 50%; } .w70 { width: 70%; }
    .block { height: 220px; border-radius: var(--radius); }
    .pill { height: 22px; width: 64px; border-radius: 99px; flex: none; } .pill.wide { width: 96px; }
    .dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 7px; flex: none; }
    .ring { width: 52px; height: 52px; border-radius: 50%; flex: none; }
    .lines { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }

    /* same container, row padding and dividers as .qlist */
    .rowlist { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .srow { display: flex; gap: 12px; align-items: flex-start; padding: 12px 16px; }
    .srow + .srow { border-top: 1px solid var(--border); }

    /* same columns as .grid-3 and the same card padding as .card */
    .sgrid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }
    .scard { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .scard .top { display: flex; gap: 12px; align-items: center; }

    .sdetail { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
    .chips-row { display: flex; gap: 8px; }

    .stat-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (min-width: 900px) { .stat-row { grid-template-columns: repeat(4, 1fr); } }
    .stile { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; display: flex; flex-direction: column; gap: 12px; }

    @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { .b { animation: none; } }
  `]
})
export class SkeletonComponent {
  readonly count = input(3);
  readonly kind = input<'text' | 'card' | 'list' | 'grid' | 'detail' | 'stats'>('text');
  readonly rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
