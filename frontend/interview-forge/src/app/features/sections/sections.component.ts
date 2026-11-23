import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReferenceDataService } from '../../core/services/reference-data.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

@Component({
  selector: 'app-sections',
  imports: [RouterLink, SkeletonComponent, ErrorStateComponent, EmptyStateComponent, IconComponent, MeterComponent, PageHeaderComponent, StatTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Knowledge base" title="Sections" description="Derived from the technology skill matrix, plus your own sections.">
        <div actions><a class="btn" routerLink="/mine"><app-icon name="plus" [size]="14" /> New section</a></div>
      </app-page-header>
      @if (state() === 'error') { <app-error-state (retry)="load()" /> }
      @else if (state() === 'loading') { <app-skeleton kind="list" [count]="8" /> }
      @else {
        <div class="tiles">
          <app-stat-tile label="Sections" [value]="sections().length" [sub]="totals().topics + ' topics'" />
          <app-stat-tile label="Questions" [value]="totals().questions" sub="across all sections" />
          <app-stat-tile label="Completed" tone="ready" [value]="totals().done" [total]="totals().questions" sub="answered and marked done" />
          <app-stat-tile label="Core sections" [value]="totals().core" sub="highest interview priority" />
        </div>
        <section class="panel mt" aria-label="Sections">
          <div class="table-wrap">
            <table class="data stack-sm">
              <thead><tr><th>Section</th><th>Priority</th><th class="meter-col">Readiness</th><th class="num">Topics</th><th class="num">Questions</th></tr></thead>
              <tbody>
                @for (s of sections(); track s.id) {
                  <tr class="clickable" (click)="open(s.id, $event)">
                    <td data-label="Section"><a [routerLink]="['/sections', s.id]" class="name">{{ s.name }}</a>
                      @if (s.isUserCreated) { <span class="badge info">by {{ s.addedBy }}</span> }</td>
                    <td data-label="Priority"><span class="badge" [class.accent]="s.priority === 'Core'">{{ s.priority }}</span></td>
                    <td data-label="Readiness" class="meter-col"><app-meter [value]="s.progress.completed" [total]="s.progress.total" [review]="s.progress.needsReview" />
                      <span class="pct dim">{{ s.progress.completed }}/{{ s.progress.total }}</span></td>
                    <td data-label="Topics" class="num">{{ s.topicCount }}</td>
                    <td data-label="Questions" class="num">{{ s.progress.total }}</td>
                  </tr>
                } @empty { <tr><td colspan="5"><app-empty-state icon="folder" title="No sections yet" hint="Create your own section to get started." /></td></tr> }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>`,
  styles: [`
    .name { color: var(--text); font-weight: 500; margin-right: 6px; }
    .meter-col { width: 34%; }
    .meter-col app-meter { display: inline-block; width: calc(100% - 64px); vertical-align: middle; }
    .pct { display: inline-block; width: 58px; text-align: right; font: 11.5px var(--mono); vertical-align: middle; }
    tr.clickable { cursor: pointer; }
    @media (max-width: 760px) { .meter-col { width: auto; } }
  `]
})
export class SectionsComponent {
  private ref = inject(ReferenceDataService);
  private router = inject(Router);
  readonly sections = computed(() => this.ref.sections() ?? []);
  readonly totals = computed(() => this.sections().reduce((t, s) => ({
    topics: t.topics + s.topicCount, questions: t.questions + s.progress.total, done: t.done + s.progress.completed, core: t.core + (s.priority === 'Core' ? 1 : 0)
  }), { topics: 0, questions: 0, done: 0, core: 0 }));
  /** The whole row is a click target for pointer users; the name link stays the keyboard/screen-reader target. */
  open(id: number, e: MouseEvent): void { if (!(e.target as HTMLElement).closest('a')) this.router.navigate(['/sections', id]); }
  /** A cached list shows immediately and is refreshed in the background; the skeleton only appears on a cold start. */
  readonly state = signal<'loading' | 'ready' | 'error'>(this.ref.sections() ? 'ready' : 'loading');
  constructor() { this.load(); }
  load(): void {
    if (!this.ref.sections()) this.state.set('loading');
    this.ref.refreshSections().subscribe({ next: () => this.state.set('ready'), error: () => { if (!this.ref.sections()) this.state.set('error'); } });
  }
}
