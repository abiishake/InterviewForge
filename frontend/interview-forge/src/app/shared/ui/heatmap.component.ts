import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Cell { date: string; count: number; level: number; future: boolean; }

/**
 * Activity heatmap: one column per week (Mon..Sun rows) ending at `today`, coloured by how many questions were worked on.
 * Each cell has a title for pointer users; screen readers get a one-sentence summary instead of 84 cells.
 */
@Component({
  selector: 'app-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" role="img" [attr.aria-label]="summary()">
      <div class="grid" [style.grid-template-columns]="'repeat(' + weeks() + ', minmax(0, ' + cell() + 'px))'" aria-hidden="true">
        @for (c of cells(); track c.date) {
          <span class="c" [class]="'c l' + c.level" [class.future]="c.future" [attr.title]="c.future ? null : c.date + ': ' + c.count + (c.count === 1 ? ' action' : ' actions')"></span>
        }
      </div>
      <div class="legend" aria-hidden="true">
        <span>{{ total() }} actions · {{ activeDays() }} active days</span><span class="spacer"></span>
        <span>Less</span><span class="c l0"></span><span class="c l1"></span><span class="c l2"></span><span class="c l3"></span><span>More</span>
      </div>
    </div>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, auto); gap: 3px; }
    .c { display: block; aspect-ratio: 1; border-radius: 2px; background: var(--heat-0); min-width: 6px; }
    .c.l1 { background: var(--heat-1); } .c.l2 { background: var(--heat-2); } .c.l3 { background: var(--heat-3); }
    .c.future { opacity: .35; }
    .legend { display: flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 11.5px; color: var(--text-dim); }
    .legend .c { width: 10px; min-width: 10px; }
    .spacer { flex: 1; }
  `]
})
export class HeatmapComponent {
  readonly activity = input<{ date: string; count: number }[]>([]);
  /** yyyy-MM-dd in the user's time zone; defaults to the browser date. */
  readonly today = input<string | undefined>(undefined);
  readonly weeks = input(5);
  /** Maximum cell size in px; cells shrink to fit narrow containers. */
  readonly cell = input(20);
  readonly activeDays = computed(() => this.activity().filter(a => a.count > 0).length);

  readonly total = computed(() => this.activity().reduce((s, a) => s + a.count, 0));

  readonly cells = computed<Cell[]>(() => {
    const byDate = new Map(this.activity().map(a => [a.date.slice(0, 10), a.count]));
    const end = parse(this.today() ?? localIso(new Date()));
    // last column ends on the Sunday of the current week; start on a Monday
    const dow = (end.getUTCDay() + 6) % 7; // Mon=0
    const last = addDays(end, 6 - dow);
    const start = addDays(last, -(this.weeks() * 7 - 1));
    const max = Math.max(1, ...byDate.values());
    const out: Cell[] = [];
    for (let d = start; d <= last; d = addDays(d, 1)) {
      const key = iso(d);
      const count = byDate.get(key) ?? 0;
      const level = count === 0 ? 0 : count >= max * .66 ? 3 : count >= max * .33 ? 2 : 1;
      out.push({ date: key, count, level, future: d > end });
    }
    return out;
  });

  readonly summary = computed(() => {
    const active = this.cells().filter(c => c.count > 0).length;
    return `Activity: ${this.total()} study actions across ${active} days in the last ${this.weeks()} weeks.`;
  });
}

function parse(s: string): Date { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function iso(d: Date): string { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; }
function localIso(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
