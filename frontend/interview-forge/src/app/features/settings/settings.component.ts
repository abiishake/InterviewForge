import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-settings',
  imports: [JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <div class="eyebrow">System</div><h1>Settings</h1>
      <div class="card mt">
        <h3>Seed data import</h3>
        <p class="muted">Re-reads the skill matrix, question bank and algorithms Markdown files and updates the database.
          The import is idempotent: nothing is duplicated, and your progress, notes and own questions are untouched.</p>
        <button class="btn primary" (click)="runImport()" [disabled]="busy()">{{ busy() ? 'Importing…' : 'Run import now' }}</button>
        @if (report(); as r) { <pre class="report mt">{{ r | json }}</pre> }
      </div>
      <div class="card mt">
        <h3>API & health</h3>
        <p class="muted">OpenAPI UI: <a href="/swagger" target="_blank" rel="noopener">/swagger</a> · Health: <a href="/health" target="_blank" rel="noopener">/health</a></p>
      </div>
      <div class="card mt">
        <h3>Keyboard shortcuts</h3>
        <ul class="muted"><li><kbd>Space</kbd> reveal answer · <kbd>h</kbd> hide · <kbd>j</kbd>/<kbd>k</kbd> next/previous question</li>
          <li>Interview mode: <kbd>1</kbd>–<kbd>4</kbd> rate Easy / Okay / Hard / Didn't know</li></ul>
      </div>
    </div>`,
  styles: [`.narrow { max-width: 820px; } .report { max-height: 360px; overflow: auto; background: var(--bg); padding: 12px; border-radius: var(--radius-sm); font-size: 12px; }`]
})
export class SettingsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly busy = signal(false);
  readonly report = signal<Record<string, unknown> | null>(null);

  runImport(): void {
    this.busy.set(true);
    this.api.runImport().subscribe({
      next: r => { this.report.set(r); this.busy.set(false); this.toast.show('Import finished', 'ok'); },
      error: () => this.busy.set(false)
    });
  }
}
