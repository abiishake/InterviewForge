import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-settings',
  imports: [JsonPipe, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <app-page-header eyebrow="System" title="Import and system" description="Seed data import, API endpoints and keyboard shortcuts." />
      <section class="panel">
        <div class="panel-head"><app-icon name="upload" [size]="16" /><h2>Seed data import</h2><span class="spacer"></span>
          <button class="btn primary sm" (click)="runImport()" [disabled]="busy()">{{ busy() ? 'Importing…' : 'Run import now' }}</button></div>
        <div class="panel-body">
          <p class="muted">Re-reads the skill matrix, question bank and algorithms Markdown files and updates the database.
            The import is idempotent: nothing is duplicated, and your progress, notes and own questions are untouched.</p>
          @if (report(); as r) { <pre class="report">{{ r | json }}</pre> }
        </div>
      </section>
      <section class="panel mt">
        <div class="panel-head"><app-icon name="code" [size]="16" /><h2>API and health</h2></div>
        <div class="panel-body"><p class="muted">OpenAPI document: <a href="/openapi/v1.json" target="_blank" rel="noopener">/openapi/v1.json</a> (Swagger UI only when <code>Api__ExposeDocs=true</code>) · Health: <a href="/health" target="_blank" rel="noopener">/health</a></p></div>
      </section>
      <section class="panel mt">
        <div class="panel-head"><app-icon name="bolt" [size]="16" /><h2>Keyboard shortcuts</h2></div>
        <dl class="keys">
          <div><dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Search and commands</dd></div>
          <div><dt><kbd>Space</kbd></dt><dd>Reveal the answer</dd></div>
          <div><dt><kbd>h</kbd></dt><dd>Hide the answer</dd></div>
          <div><dt><kbd>j</kbd> / <kbd>k</kbd></dt><dd>Next / previous question</dd></div>
          <div><dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>Interview mode: rate Easy / Okay / Hard / Didn't know</dd></div>
        </dl>
      </section>
    </div>`,
  styles: [`
    .panel-body p { margin: 0; }
    .report { max-height: 360px; overflow: auto; background: var(--bg-sunken); padding: 12px; border-radius: var(--radius-sm); font-size: 12px; margin: 12px 0 0; }
    .keys { margin: 0; padding: 4px 14px; }
    .keys > div { display: flex; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; }
    .keys > div:last-child { border-bottom: 0; }
    .keys dt { width: 120px; flex: none; } .keys dd { margin: 0; color: var(--text-muted); }
  `]
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
