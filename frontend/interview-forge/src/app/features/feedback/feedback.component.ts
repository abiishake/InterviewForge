import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Feedback } from '../../core/models';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-feedback',
  imports: [RouterLink, DatePipe, EmptyStateComponent, SkeletonComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <app-page-header eyebrow="Me" title="My feedback" description="Suggestions you sent about questions, topics and algorithms, and what administrators replied." />
      @if (loading()) { <app-skeleton kind="card" [count]="2" /> }
      @else {
        <div class="stack">
          @for (f of items(); track f.id) {
            <article class="panel">
              <div class="panel-head"><span class="badge">{{ f.kind }}</span><b class="title">{{ f.contentTitle ?? '(deleted)' }}</b><span class="spacer"></span>
                <span class="badge" [class.ok]="f.status === 'Accepted'" [class.warn]="f.status === 'Pending'" [class.danger]="f.status === 'Rejected'">{{ f.status }}</span>
                @if (f.contentExists && f.contentUrl) { <a class="btn sm" [routerLink]="f.contentUrl">Open</a> }</div>
              <div class="panel-body">
                <p class="pre">{{ f.message }}</p>
                @if (f.adminResponse) { <div class="reply"><app-icon name="shield" [size]="14" /><div><b>Administrator</b><p class="pre">{{ f.adminResponse }}</p></div></div> }
                <div class="dim small">{{ f.createdAt | date:'MMM d, y, HH:mm' }}</div>
              </div>
            </article>
          } @empty { <app-empty-state icon="flag" title="No feedback yet" hint="Use “Suggest a change” on any question, topic or algorithm." /> }
        </div>
      }
    </div>`,
  styles: [`
    .title { font-size: 13.5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pre { white-space: pre-wrap; margin: 0 0 10px; }
    .reply { display: flex; gap: 10px; padding: 10px 12px; margin-bottom: 10px; border-radius: var(--radius-sm); background: var(--info-soft); }
    .reply app-icon { color: var(--info); margin-top: 3px; } .reply b { font-size: 12.5px; } .reply .pre { margin: 2px 0 0; }
  `]
})
export class FeedbackComponent {
  readonly items = signal<Feedback[]>([]);
  readonly loading = signal(true);
  constructor() { inject(ApiService).feedback().subscribe({ next: f => { this.items.set(f); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}
