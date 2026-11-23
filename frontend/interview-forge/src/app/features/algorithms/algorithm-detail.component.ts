import { DialogService } from '../../core/services/dialog.service';
import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlgorithmDetail } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { TabListDirective } from '../../shared/ui/tab-list.directive';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';

@Component({
  selector: 'app-algorithm-detail',
  imports: [FeedbackFormComponent, RouterLink, MarkdownComponent, TabListDirective, SkeletonComponent, IconComponent, PageHeaderComponent, StatTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow">
      @if (a(); as a) {
        <app-page-header [title]="a.name" [eyebrow]="a.category">
          <div crumbs class="breadcrumb"><a routerLink="/algorithms">Algorithms</a> / {{ a.category }}</div>
          @if (a.addedBy) { <span class="badge info mt-s">Added by {{ a.addedBy }}</span> }
          <div actions>
            @if (a.canEdit) { <a class="btn" [routerLink]="['/algorithms', a.slug, 'edit']"><app-icon name="edit" [size]="14" /> Edit</a><button class="btn danger" (click)="remove()"><app-icon name="trash" [size]="14" /> Delete</button> }
          </div>
        </app-page-header>
        <div class="tiles cx">
          <app-stat-tile label="Time" icon="clock" [value]="a.timeComplexity || '—'" />
          <app-stat-tile label="Space" icon="layers" [value]="a.spaceComplexity || '—'" />
        </div>
        <div class="chips mt phone-only" appTabList aria-label="Sections">
          @for (t of tabs; track t.id) { <button type="button" role="tab" [attr.aria-selected]="tab() === t.id" [attr.tabindex]="tab() === t.id ? 0 : -1" [class.active]="tab() === t.id" (click)="tab.set(t.id)">{{ t.label }}</button> }
        </div>
        <section class="panel mt" [class.off]="tab() !== 'problem'"><div class="panel-head"><h2>Problem statement</h2></div><div class="panel-body"><app-markdown [source]="a.problemStatement" /></div></section>
        <section class="panel mt" [class.off]="tab() !== 'approach'"><div class="panel-head"><h2>Explanation and approach</h2></div><div class="panel-body"><app-markdown [source]="a.explanation" />
          <h3 class="mt">Approach</h3><app-markdown [source]="a.approach" /></div></section>
        <section class="panel mt" [class.off]="tab() !== 'code'">
          <div class="panel-head"><app-icon name="code" [size]="16" /><h2>C# implementation</h2><span class="spacer"></span>
            <button class="btn sm ghost" (click)="copy()"><app-icon name="copy" [size]="14" /> {{ copied() ? 'Copied' : 'Copy' }}</button>
            <button class="btn sm" (click)="showCode.set(!showCode())">{{ showCode() ? 'Hide code' : 'Show code' }}</button></div>
          <div class="panel-body">
            @if (showCode()) { <app-markdown [source]="a.implementation" /> } @else { <button type="button" class="reveal" (click)="showCode.set(true)"><app-icon name="lock" [size]="18" /> Try writing it yourself first, then show the code.</button> }
          </div>
        </section>
        <section class="panel mt" [class.off]="tab() !== 'examples'"><div class="panel-head"><h2>Example</h2></div><div class="panel-body"><app-markdown [source]="a.example" /></div></section>
        <div class="grid grid-2 mt">
          <section class="panel" [class.off]="tab() !== 'examples'"><div class="panel-head"><h2>Common interview questions</h2></div><div class="panel-body"><app-markdown [source]="a.interviewQuestions" /></div></section>
          <section class="panel" [class.off]="tab() !== 'mistakes'"><div class="panel-head"><app-icon name="alert" [size]="16" /><h2>Common mistakes</h2></div><div class="panel-body"><app-markdown [source]="a.commonMistakes" /></div></section>
        </div>
        <app-feedback-form class="mt" kind="Algorithm" [contentId]="a.id" />
        <div class="row mt">
          @if (a.previousSlug) { <a class="btn" [routerLink]="['/algorithms', a.previousSlug]"><app-icon name="chevron-left" [size]="16" /> Previous</a> }
          <span class="spacer"></span>
          @if (a.nextSlug) { <a class="btn primary" [routerLink]="['/algorithms', a.nextSlug]">Next <app-icon name="chevron-right" [size]="16" /></a> }
        </div>
      } @else { <app-skeleton kind="detail" /> }
    </div>`,
  styles: [`.phone-only { display: none; }
    .mt-s { margin-top: 8px; }
    .tiles.cx { grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); }
    app-feedback-form { display: block; }
    .reveal { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 28px 16px; border: 1px dashed var(--border-strong); border-radius: var(--radius); background: var(--bg-sunken); color: var(--text-muted); font: 14px var(--font); cursor: pointer; }
    .reveal:hover { border-color: var(--accent); color: var(--text); }
    @media (max-width: 767px) { .phone-only { display: flex; } .off { display: none; } }`]
})
export class AlgorithmDetailComponent {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private router=inject(Router);
  async remove(){const a=this.a();if(a&&await this.dialogs.confirm({title:'Delete this algorithm?',message:'Other members lose access to it too. Imported algorithms are not re-imported once deleted.',confirmLabel:'Delete',danger:true}))this.api.deleteAlgorithm(a.slug).subscribe(()=>this.router.navigate(['/algorithms']));}
  readonly slug = input.required<string>();
  readonly a = signal<AlgorithmDetail | null>(null);
  readonly showCode = signal(true);
  readonly tab = signal<'problem' | 'approach' | 'code' | 'examples' | 'mistakes'>('problem');
  readonly tabs = [{ id: 'problem', label: 'Problem' }, { id: 'approach', label: 'Approach' }, { id: 'code', label: 'Code' }, { id: 'examples', label: 'Examples' }, { id: 'mistakes', label: 'Mistakes' }] as const;
  readonly copied = signal(false);
  private readonly code = computed(() => (this.a()?.implementation ?? '').replace(/^```\w*\n?|```$/gm, '').trim());

  constructor() { effect(() => { const s = this.slug(); this.api.algorithm(s).subscribe(a => { this.a.set(a); this.copied.set(false); }); }); }

  copy(): void { navigator.clipboard?.writeText(this.code()).then(() => this.copied.set(true)); }
}
