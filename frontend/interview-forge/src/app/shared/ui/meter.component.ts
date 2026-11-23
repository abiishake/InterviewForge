import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Readiness meter: a label row (name on the left, "value/total · pct%" on the right) over a thin bar.
 * Completed is teal; an optional "review" segment is amber. The numbers are always printed, so colour is never the only signal.
 */
@Component({
  selector: 'app-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label()) {
      <div class="head"><span class="name"><ng-content />{{ label() }}</span><span class="nums">{{ value() }}/{{ total() }} · {{ pct() }}%</span></div>
    }
    <div class="bar" role="progressbar" [attr.aria-label]="label() || 'Progress'" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="pct()"
         [attr.aria-valuetext]="value() + ' of ' + total() + ' completed'">
      <span class="fill" [style.width.%]="pct()"></span>
      @if (reviewPct() > 0) { <span class="fill review" [style.width.%]="reviewPct()"></span> }
    </div>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; font-size: 13px; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
    .nums { font: 11.5px var(--mono); color: var(--text-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .bar { display: flex; height: 6px; border-radius: 99px; background: var(--heat-0); overflow: hidden; }
    :host(.lg) .bar { height: 8px; }
    .fill { background: var(--ready); transition: width .5s var(--ease-out); }
    .fill.review { background: var(--warn); }
  `]
})
export class MeterComponent {
  readonly label = input('');
  readonly value = input(0);
  readonly total = input(0);
  readonly review = input(0);
  readonly pct = computed(() => (this.total() ? Math.round(Math.min(100, (this.value() / this.total()) * 100)) : 0));
  readonly reviewPct = computed(() => (this.total() ? Math.min(100 - this.pct(), (this.review() / this.total()) * 100) : 0));
}
