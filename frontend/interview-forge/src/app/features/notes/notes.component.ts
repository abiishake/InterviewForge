import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Note } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-notes',
  imports: [RouterLink, MarkdownComponent, DatePipe, FormsModule, PaginationComponent, SkeletonComponent, EmptyStateComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Me" title="My notes" [description]="'Private notes attached to questions (' + total() + ' in total). Only you can see them.'" />
      <div class="toolbar sticky">
        <input type="search" class="search" name="filter" [ngModel]="filter()" (ngModelChange)="filter.set($event)" placeholder="Filter the notes on this page" aria-label="Filter notes on this page">
        <span class="spacer"></span><span class="dim small mono">{{ visible().length }} shown</span>
      </div>
      <div class="stack">
        @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
        @else {
          @for (n of visible(); track n.id) {
            <article class="panel">
              <div class="panel-head"><app-icon name="note" [size]="16" /><a class="qt" [routerLink]="['/questions', n.questionId]">{{ n.questionText }}</a><span class="spacer"></span>
                <span class="dim small nowrap">{{ n.updatedAt | date:'MMM d, y, HH:mm' }}</span></div>
              <div class="panel-body"><app-markdown [source]="n.body" /></div>
            </article>
          } @empty { <app-empty-state icon="note" title="No notes here" hint="Add a note from any question page; it is saved automatically."><a class="btn" routerLink="/sections">Browse questions</a></app-empty-state> }
        }
      </div>
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    </div>`,
  styles: [`
    .qt { color: var(--text); font-weight: 600; font-size: 13.5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .nowrap { white-space: nowrap; }
    @media (max-width: 600px) { .qt { white-space: normal; } .nowrap { display: none; } }
  `]
})
export class NotesComponent {
  private api = inject(ApiService);
  readonly notes = signal<Note[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly filter = signal('');
  readonly pageSize = 25;
  readonly visible = computed(() => {
    const f = this.filter().trim().toLowerCase();
    return f ? this.notes().filter(n => n.body.toLowerCase().includes(f) || n.questionText.toLowerCase().includes(f)) : this.notes();
  });

  constructor() { this.load(); }
  go(p: number): void { this.page.set(p); this.load(); }

  private load(): void {
    this.loading.set(true);
    this.api.notes(this.page(), this.pageSize).subscribe({
      next: p => { this.notes.set(p.items); this.total.set(p.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
