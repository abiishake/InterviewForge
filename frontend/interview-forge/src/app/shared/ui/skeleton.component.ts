import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Loading placeholder. `kind` picks text lines, a card, or list rows. Shimmer is disabled for reduced motion. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" role="status" aria-live="polite" aria-busy="true"><span class="sr-only">Loading…</span>
      @for (i of rows(); track i) { <div class="bar" [class.card]="kind() === 'card'" [class.short]="kind() === 'text' && i === rows().length - 1"></div> }
    </div>`,
  styles: [`
    .sk { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
    .bar { height: 14px; border-radius: 6px; background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite linear; }
    .bar.card { height: 84px; border-radius: var(--radius); }
    .bar.short { width: 60%; }
    @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
  `]
})
export class SkeletonComponent {
  readonly count = input(3);
  readonly kind = input<'text' | 'card' | 'list'>('text');
  readonly rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
