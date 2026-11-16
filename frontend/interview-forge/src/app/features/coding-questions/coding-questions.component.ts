import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { CODING_QUESTIONS, CodingQuestion } from './coding-questions.data';

/** Read-only catalogue of IBM coding questions with reconstructed statements and C# solutions. */
@Component({
  selector: 'app-coding-questions',
  imports: [FormsModule, MarkdownComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <div class="page-header"><div><div class="eyebrow">IBM online assessment · {{ all.length }} questions</div><h1>Coding Questions</h1>
        <p>Each question comes with its approach, complexity and a C# solution.</p></div></div>

      <p class="notice" role="note"><strong>About the statements.</strong> The source tracker only captured question <em>titles</em> (the full prompts are member-only), so each problem text is
        reconstructed from its title and pattern. Questions tagged <span class="badge warn">Verify statement</span> are best guesses — confirm the real prompt before relying on the answer.</p>

      <input type="search" name="q" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Filter by title or pattern…" aria-label="Filter coding questions">
      <div class="chips mt" role="group" aria-label="Pattern">
        <button type="button" [class.active]="pattern() === ''" [attr.aria-pressed]="pattern() === ''" (click)="pattern.set('')">All ({{ all.length }})</button>
        @for (p of patterns; track p) { <button type="button" [class.active]="pattern() === p" [attr.aria-pressed]="pattern() === p" (click)="pattern.set(p)">{{ p }}</button> }
      </div>

      <p class="muted mt" aria-live="polite">{{ shown().length }} of {{ all.length }} shown</p>
      @for (q of shown(); track q.no) {
        <details class="card mt cq" [open]="opened() === q.no" (toggle)="onToggle(q.no, $event)">
          <summary>
            <span class="num">{{ q.no }}</span>
            <span class="ttl">{{ q.title }}</span>
            <span class="meta"><span class="badge accent">{{ q.pattern }}</span>@if (q.confidence === 'tentative') { <span class="badge warn">Verify statement</span> }</span>
          </summary>
          <h3>Problem</h3><app-markdown [source]="q.problem" />
          <h3 class="mt">Approach</h3><app-markdown [source]="q.approach" />
          <div class="row mt"><span class="badge accent">time {{ q.time }}</span><span class="badge info">space {{ q.space }}</span></div>
          <div class="row mt"><h3>C# solution</h3><span class="spacer"></span>
            <button type="button" class="btn sm ghost" (click)="copy(q)">{{ copiedNo() === q.no ? 'Copied' : 'Copy' }}</button></div>
          <app-markdown [source]="fence(q)" />
          <h3 class="mt">Example</h3><app-markdown [source]="q.example" />
        </details>
      } @empty { <app-empty-state class="mt" icon="code" title="No questions match" hint="Try a different pattern or fewer words." /> }
    </div>`,
  styles: [`.narrow { max-width: 920px; }
    .notice { padding: 10px 14px; border-radius: 10px; background: var(--info-soft); color: var(--text); font-size: 14px; }
    .cq summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; cursor: pointer; list-style: none; }
    .cq summary::-webkit-details-marker { display: none; }
    .num { font: 600 13px var(--mono); color: var(--text-muted); min-width: 2ch; }
    .ttl { flex: 1 1 260px; font-weight: 600; }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .cq[open] summary { margin-bottom: 12px; }`]
})
export class CodingQuestionsComponent {
  readonly all = CODING_QUESTIONS;
  readonly patterns = [...new Set(CODING_QUESTIONS.map(q => q.pattern.replace(/ \(tentative\)/, '').split(' / ')[0]))];
  readonly query = signal('');
  readonly pattern = signal('');
  readonly opened = signal<number | null>(null);
  readonly copiedNo = signal<number | null>(null);

  readonly shown = computed<CodingQuestion[]>(() => {
    const q = this.query().trim().toLowerCase();
    const p = this.pattern();
    return this.all.filter(x => (!p || x.pattern.startsWith(p)) && (!q || (x.title + ' ' + x.pattern).toLowerCase().includes(q)));
  });

  fence(q: CodingQuestion): string { return '```csharp\n' + q.code + '\n```'; }

  onToggle(no: number, e: Event): void {
    const open = (e.target as HTMLDetailsElement).open;
    if (open) this.opened.set(no); else if (this.opened() === no) this.opened.set(null);
  }

  copy(q: CodingQuestion): void {
    navigator.clipboard?.writeText(q.code).then(() => { this.copiedNo.set(q.no); setTimeout(() => this.copiedNo.set(null), 1500); });
  }
}
