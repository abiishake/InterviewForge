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

@Component({
  selector: 'app-notes',
  imports: [RouterLink, MarkdownComponent, DatePipe, FormsModule, PaginationComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Me</div><h1>My notes</h1><p>Private notes attached to questions ({{ total() }} in total).</p></div></div>
      <input type="search" name="filter" [ngModel]="filter()" (ngModelChange)="filter.set($event)" placeholder="Filter the notes on this page" aria-label="Filter notes on this page">
      <div class="stack mt">
        @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
        @else {
          @for (n of visible(); track n.id) {
            <div class="card"><div class="row"><a [routerLink]="['/questions', n.questionId]"><b>{{ n.questionText }}</b></a><span class="spacer"></span>
              <span class="dim small">{{ n.updatedAt | date:'medium' }}</span></div><div class="mt"><app-markdown [source]="n.body" /></div></div>
          } @empty { <app-empty-state icon="note" title="No notes here" hint="Add a note from any question page; it is saved automatically."><a class="btn" routerLink="/sections">Browse questions</a></app-empty-state> }
        }
      </div>
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="go($event)" />
    </div>`,
  styles: [`.small { font-size: 12px; }`]
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
