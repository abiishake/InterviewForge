import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Consistent page header: optional eyebrow, the page's single h1, an optional one-line description,
 * and an actions slot on the right (`<ng-content select="[actions]">`). Extra content (breadcrumbs) goes above via the default slot.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="[crumbs]" />
    <header class="ph">
      <div class="txt">
        @if (eyebrow()) { <div class="eyebrow">{{ eyebrow() }}</div> }
        <h1>{{ title() }}</h1>
        @if (description()) { <p>{{ description() }}</p> }
        <ng-content />
      </div>
      <div class="actions"><ng-content select="[actions]" /></div>
    </header>`,
  styles: [`
    :host { display: block; margin-bottom: 18px; }
    .ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px 16px; flex-wrap: wrap; }
    .txt { min-width: 0; flex: 1 1 320px; }
    h1 { margin: 0; }
    p { margin: 4px 0 0; color: var(--text-muted); font-size: 13.5px; max-width: 70ch; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .actions:empty { display: none; }
    /* pages wrap their buttons in <div actions>; flatten it so the buttons themselves get the flex gap */
    .actions ::ng-deep > [actions] { display: contents; }
  `]
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
}
