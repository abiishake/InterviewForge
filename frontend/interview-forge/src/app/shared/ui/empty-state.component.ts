import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <app-icon [name]="icon()" [size]="32" />
      <h3>{{ title() }}</h3>
      @if (hint()) { <p class="muted">{{ hint() }}</p> }
      <div class="actions"><ng-content /></div>
    </div>`,
  styles: [`
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 40px 20px; border: 1px dashed var(--border-strong); border-radius: var(--radius); color: var(--text-muted); }
    h3 { margin: 4px 0 0; color: var(--text); } p { margin: 0; max-width: 46ch; } .actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  `]
})
export class EmptyStateComponent {
  readonly icon = input('list');
  readonly title = input.required<string>();
  readonly hint = input('');
}
