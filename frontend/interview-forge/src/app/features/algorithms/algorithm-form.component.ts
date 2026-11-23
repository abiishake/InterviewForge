import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SaveAlgorithm } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

type Field = { key: keyof SaveAlgorithm; label: string; hint?: string };

@Component({
  selector: 'app-algorithm-form',
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      <app-page-header [title]="slug() ? 'Edit algorithm' : 'Add algorithm or data structure'" description="Markdown is supported in every long field. Code blocks are highlighted automatically.">
        <div crumbs class="breadcrumb"><a routerLink="/algorithms">Algorithms</a> / {{ slug() ? 'Edit' : 'New' }}</div>
      </app-page-header>
      <form (ngSubmit)="save()" class="panel">
        <div class="panel-body">
          <div class="form-section">
            <header><h2>Basics</h2><p>Name, category and complexity, shown on the list and the detail page.</p></header>
            <div class="grid two">
              @for (f of basics; track f.key) {
                <div class="field"><label [for]="f.key">{{ f.label }}</label>
                  <input [id]="f.key" [name]="f.key" [(ngModel)]="body[f.key]" [required]="f.key === 'name' || f.key === 'category'" [placeholder]="f.hint ?? ''"></div>
              }
            </div>
          </div>
          <div class="form-section">
            <header><h2>Content</h2><p>Explain the idea first, then the implementation and the traps.</p></header>
            <div>
              @for (f of content; track f.key) {
                <div class="field"><label [for]="f.key">{{ f.label }}</label><textarea [id]="f.key" [name]="f.key" rows="5" [(ngModel)]="body[f.key]"></textarea></div>
              }
            </div>
          </div>
        </div>
        <div class="form-actions">
          <a class="btn ghost" routerLink="/algorithms">Cancel</a>
          <button class="btn primary" type="submit" [disabled]="busy()">Save algorithm</button>
        </div>
      </form>
    </div>`,
  styles: [`
    .grid.two { grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 0 14px; }
    form.panel .form-actions { margin: 0; border-radius: 0 0 var(--radius) var(--radius); }
  `]
})
export class AlgorithmFormComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly slug = input<string>();
  readonly busy = signal(false);
  body: SaveAlgorithm = { name: '', category: '', problemStatement: '', explanation: '', approach: '', timeComplexity: '', spaceComplexity: '', implementation: '', example: '', interviewQuestions: '', commonMistakes: '' };
  readonly basics: Field[] = [
    { key: 'name', label: 'Name', hint: 'Binary search' }, { key: 'category', label: 'Category', hint: 'Searching' },
    { key: 'timeComplexity', label: 'Time complexity', hint: 'O(log n)' }, { key: 'spaceComplexity', label: 'Space complexity', hint: 'O(1)' }];
  readonly content: Field[] = [
    { key: 'problemStatement', label: 'Problem statement' }, { key: 'explanation', label: 'Explanation' }, { key: 'approach', label: 'Approach' },
    { key: 'implementation', label: 'C# implementation (Markdown)' }, { key: 'example', label: 'Example' },
    { key: 'interviewQuestions', label: 'Interview questions' }, { key: 'commonMistakes', label: 'Common mistakes' }];
  private readonly fields = [...this.basics, ...this.content];

  constructor() {
    effect(() => {
      const s = this.slug();
      if (s) this.api.algorithm(s).subscribe(a => {
        if (!a.canEdit) { this.router.navigate(['/algorithms', s]); return; }
        for (const f of this.fields) this.body[f.key] = a[f.key];
      });
    });
  }

  save(): void {
    this.busy.set(true);
    const s = this.slug();
    (s ? this.api.updateAlgorithm(s, this.body) : this.api.createAlgorithm(this.body))
      .subscribe({ next: a => this.router.navigate(['/algorithms', a.slug]), error: () => this.busy.set(false) });
  }
}
