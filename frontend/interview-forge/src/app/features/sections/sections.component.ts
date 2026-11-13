import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Section } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';
import { RingComponent } from '../../shared/ui/ring.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-sections',
  imports: [RouterLink, ProgressBarComponent, RingComponent, SkeletonComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Knowledge base</div><h1>Sections</h1>
        <p>Derived from the technology skill matrix, plus your own sections.</p></div>
        <a class="btn" routerLink="/mine">+ New section</a></div>
      @if (state() === 'error') { <app-error-state (retry)="load()" /> }
      @else if (state() === 'loading') { <app-skeleton kind="card" [count]="3" /> }
      @else {
      <div class="grid grid-3">
        @for (s of sections(); track s.id) {
          <a class="card link" [routerLink]="['/sections', s.id]">
            <div class="row"><app-ring [value]="s.progress.completed" [total]="s.progress.total" [size]="52" [label]="s.name + ' progress'" />
              <div class="grow"><h3>{{ s.name }}</h3>
                <p class="muted small">{{ s.topicCount }} topics · {{ s.progress.total }} questions</p></div></div>
            <div class="row mt"><span class="badge" [class.accent]="s.priority === 'Core'">{{ s.priority }}</span>
              @if (s.isUserCreated) { <span class="badge info">Added by {{ s.addedBy }}</span> }</div>
            <app-progress-bar class="mt" [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" [thin]="true" />
          </a>
        } @empty { <app-empty-state icon="folder" title="No sections yet" hint="Create your own section to get started." /> }
      </div>
      }
    </div>`,
  styles: [`.grow { flex: 1; min-width: 0; } .small { font-size: 13px; margin: 0; } .mono { font-family: var(--mono); font-size: 12px; }`]
})
export class SectionsComponent {
  private api = inject(ApiService);
  readonly sections = signal<Section[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  constructor() { this.load(); }
  load(): void {
    this.state.set('loading');
    this.api.sections().subscribe({ next: s => { this.sections.set(s); this.state.set('ready'); }, error: () => this.state.set('error') });
  }
}
