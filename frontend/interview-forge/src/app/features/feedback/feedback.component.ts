import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Feedback } from '../../core/models';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-feedback',
  imports: [RouterLink, DatePipe, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>My feedback</h1>
      @if (loading()) { <app-skeleton kind="card" [count]="2" /> }
      @else {
        @for (f of items(); track f.id) {
          <article class="card mt">
            <div class="row"><b>{{ f.kind }}: {{ f.contentTitle ?? '(deleted)' }}</b><span class="badge">{{ f.status }}</span><span class="spacer"></span>
              <span class="muted small">{{ f.createdAt | date:'medium' }}</span>
              @if (f.contentExists && f.contentUrl) { <a class="btn sm" [routerLink]="f.contentUrl">Open</a> }</div>
            <p class="pre">{{ f.message }}</p>
            @if (f.adminResponse) { <p><b>Administrator:</b> {{ f.adminResponse }}</p> }
          </article>
        } @empty { <app-empty-state class="mt" icon="flag" title="No feedback yet" hint="Use “Suggest a change” on any question, topic or algorithm." /> }
      }
    </div>`,
  styles: [`.pre { white-space: pre-wrap; } .small { font-size: 12px; }`]
})
export class FeedbackComponent {
  readonly items = signal<Feedback[]>([]);
  readonly loading = signal(true);
  constructor() { inject(ApiService).feedback().subscribe({ next: f => { this.items.set(f); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}
