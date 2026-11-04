import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** "Showing 26-50 of 137" with previous/next. Every list uses it so no item is unreachable (F7). */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pager" aria-label="Pagination">
      <span class="muted" role="status">{{ label() }}</span><span class="spacer"></span>
      <button type="button" class="btn sm" (click)="pageChange.emit(page() - 1)" [disabled]="page() <= 1">Previous</button>
      <span class="muted">Page {{ page() }} of {{ pages() }}</span>
      <button type="button" class="btn sm" (click)="pageChange.emit(page() + 1)" [disabled]="page() >= pages()">Next</button>
    </nav>`,
  styles: [`.pager { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 16px; } .spacer { flex: 1; }`]
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly label = computed(() => {
    const t = this.total();
    if (t === 0) return 'No items';
    const from = (this.page() - 1) * this.pageSize() + 1;
    return `Showing ${from}-${Math.min(t, from + this.pageSize() - 1)} of ${t}`;
  });
}
