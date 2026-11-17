import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Shown when a request fails, so a page never looks like it is loading forever. */
@Component({
  selector: 'app-error-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-state" role="alert">
      <app-icon name="alert" [size]="32" />
      <h3>{{ title() }}</h3>
      <p class="muted">{{ hint() }}</p>
      <button type="button" class="btn" (click)="retry.emit()">Try again</button>
    </div>`,
  styles: [`
    .error-state { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 40px 20px; border: 1px dashed var(--danger); border-radius: var(--radius); color: var(--text-muted); }
    h3 { margin: 4px 0 0; color: var(--text); } p { margin: 0 0 8px; max-width: 46ch; }
  `]
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly hint = input('We could not load this. Check your connection and try again.');
  readonly retry = output<void>();
}
