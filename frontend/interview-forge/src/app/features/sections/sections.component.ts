import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Section } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-sections',
  imports: [RouterLink, ProgressBarComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Knowledge base</div><h1>Sections</h1>
        <p>Derived from the technology skill matrix, plus your own sections.</p></div>
        <a class="btn" routerLink="/mine">+ New section</a></div>
      <div class="grid grid-3">
        @for (s of sections(); track s.id) {
          <a class="card link" [routerLink]="['/sections', s.id]">
            <div class="row"><span class="badge" [class.accent]="s.priority === 'Core'">{{ s.priority }}</span>
              @if (s.isUserCreated) { <span class="badge info">Added by {{ s.addedBy }}</span> }<span class="spacer"></span>
              <span class="dim mono">{{ s.progress.percent | number:'1.0-0' }}%</span></div>
            <h3 class="mt">{{ s.name }}</h3>
            <p class="muted small">{{ s.topicCount }} topics · {{ s.progress.total }} questions</p>
            <app-progress-bar [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" [thin]="true" />
          </a>
        } @empty { <div class="loading">Loading…</div> }
      </div>
    </div>`,
  styles: [`.small { font-size: 13px; margin: 0 0 12px; } .mono { font-family: var(--mono); font-size: 12px; }`]
})
export class SectionsComponent {
  private api = inject(ApiService);
  readonly sections = signal<Section[]>([]);
  constructor() { this.api.sections().subscribe(s => this.sections.set(s)); }
}
