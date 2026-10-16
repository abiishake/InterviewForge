import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Note } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';

@Component({
  selector: 'app-notes',
  imports: [RouterLink, MarkdownComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">Review</div><h1>My notes</h1><p>Personal notes attached to questions. Searchable from the search page.</p></div></div>
      <div class="stack">
        @for (n of notes(); track n.id) {
          <div class="card"><div class="row"><a [routerLink]="['/questions', n.questionId]"><b>{{ n.questionText }}</b></a><span class="spacer"></span>
            <span class="dim small">{{ n.updatedAt | date:'medium' }}</span></div><div class="mt"><app-markdown [source]="n.body" /></div></div>
        } @empty { <div class="empty">No notes yet. Add one from any question page.</div> }
      </div>
    </div>`,
  styles: [`.small { font-size: 12px; }`]
})
export class NotesComponent {
  private api = inject(ApiService);
  readonly notes = signal<Note[]>([]);
  constructor() { this.api.notes().subscribe(p => this.notes.set(p.items)); }
}
