import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Circular progress. The percentage is always printed too, so colour is never the only signal. */
@Component({
  selector: 'app-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 44 44" role="img" [attr.aria-label]="label() || pct() + ' percent'">
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" stroke-width="4" />
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--ok)" stroke-width="4" stroke-linecap="round"
        [attr.stroke-dasharray]="dash()" transform="rotate(-90 22 22)" />
      <text x="22" y="26" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">{{ pct() }}%</text>
    </svg>`,
  styles: [`:host { display: inline-flex; color: var(--text); flex: none; }`]
})
export class RingComponent {
  readonly value = input(0);
  readonly total = input(0);
  readonly size = input(56);
  readonly label = input('');
  readonly pct = computed(() => (this.total() ? Math.round(Math.min(100, (this.value() / this.total()) * 100)) : 0));
  readonly dash = computed(() => { const c = 2 * Math.PI * 18; return `${(c * this.pct()) / 100} ${c}`; });
}
