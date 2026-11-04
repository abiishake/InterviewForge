import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditEntry } from '../../core/models';
import { ApiService } from '../../core/services/api.service';

const ACTIONS = ['user.create', 'user.update', 'user.role_change', 'user.disable', 'user.enable', 'user.password_reset', 'user.sessions_revoked', 'user.delete',
  'settings.registration_change', 'bootstrap.recovery', 'content.force_delete', 'seed.restore'];

@Component({
  selector: 'app-admin-audit',
  imports: [FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row"><h1>Audit log</h1><span class="spacer"></span><button class="btn sm" (click)="exportCsv()" [disabled]="!items().length">Export loaded rows (CSV)</button></div>
    <div class="row mt">
      <select name="action" [(ngModel)]="action" (ngModelChange)="reload()" aria-label="Action">
        <option value="">All actions</option>@for (a of actions; track a) { <option [value]="a">{{ a }}</option> }
      </select>
    </div>
    <div class="table-wrap mt">
      <table class="data stack-sm">
        <thead><tr><th>When</th><th>Action</th><th>By</th><th>Target</th><th>Detail</th></tr></thead>
        <tbody>
          @for (a of items(); track a.id) {
            <tr><td data-label="When">{{ a.at | date:'medium' }}</td><td data-label="Action"><code>{{ a.action }}</code></td><td data-label="By">{{ a.actorName }}</td>
              <td data-label="Target">{{ a.targetName ?? '' }}</td><td data-label="Detail"><code class="small">{{ a.detail ?? '' }}</code></td></tr>
          } @empty { <tr><td colspan="5" class="muted">No entries.</td></tr> }
        </tbody>
      </table>
    </div>
    <div class="row mt"><span class="muted" role="status">{{ items().length }} of {{ total() }} entries</span><span class="spacer"></span>
      @if (items().length < total()) { <button class="btn sm" (click)="more()">Load more</button> }</div>`,
  styles: [`select { width: auto; } .small { font-size: 12px; }`]
})
export class AdminAuditComponent implements OnInit {
  private api = inject(ApiService);
  readonly actions = ACTIONS;
  readonly items = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  private page = 1;
  action = '';

  ngOnInit(): void { this.load(); }
  reload(): void { this.page = 1; this.items.set([]); this.load(); }
  more(): void { this.page++; this.load(); }

  private load(): void {
    this.api.audit({ action: this.action, page: this.page, pageSize: 50 }).subscribe(r => { this.items.update(x => [...x, ...r.items]); this.total.set(r.totalCount); });
  }

  exportCsv(): void {
    const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = ['when,action,by,target,detail', ...this.items().map(a => [a.at, a.action, a.actorName, a.targetName, a.detail].map(v => esc(v)).join(','))];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'audit-log.csv'; link.click();
    URL.revokeObjectURL(url);
  }
}
