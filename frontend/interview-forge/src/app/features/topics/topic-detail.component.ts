import { DialogService } from '../../core/services/dialog.service';
import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { createLatest } from '../../core/util/latest';
import { Router, RouterLink } from '@angular/router';
import { QuestionFilter, QuestionSummary, Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { QuestionListComponent } from '../../shared/components/ui.components';
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';


@Component({
  selector: 'app-topic-detail',
  imports: [FeedbackFormComponent, RouterLink, QuestionListComponent, MarkdownComponent, PaginationComponent, SkeletonComponent, IconComponent, MeterComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (topic(); as t) {
        <app-page-header [title]="t.name" [description]="t.description ?? ''">
          <div crumbs class="breadcrumb"><a routerLink="/sections">Sections</a> / <a [routerLink]="['/sections', t.sectionId]">{{ t.sectionName }}</a> / {{ t.name }}</div>
          <div class="badges"><span class="badge" [class.accent]="t.priority === 'Core'">{{ t.priority }}</span>
            @if (t.addedBy) { <span class="badge info">Added by {{ t.addedBy }}</span> }</div>
          <div actions>
            @if (t.canEdit) { <button class="btn" (click)="rename()"><app-icon name="edit" [size]="14" /> Rename</button><button class="btn danger" (click)="remove()"><app-icon name="trash" [size]="14" /> Delete</button> }
            <a class="btn" routerLink="/questions/new" [queryParams]="{ topic: t.id }"><app-icon name="plus" [size]="14" /> Add question</a>
            @if (questions().length) { <a class="btn primary" routerLink="/interview" [queryParams]="{ topic: t.id }"><app-icon name="play" [size]="14" /> Practise</a> }
          </div>
        </app-page-header>

        <section class="panel">
          <div class="panel-body summary">
            <app-meter class="lg grow" label="Topic progress" [value]="t.progress.completed" [total]="t.progress.total" [review]="t.progress.needsReview" />
            <div class="nums"><span><b>{{ t.progress.inProgress }}</b> in progress</span><span><b [class.warnc]="t.progress.needsReview > 0">{{ t.progress.needsReview }}</b> need review</span></div>
          </div>
        </section>
        @if (t.scope) {
          <details class="panel mt scope"><summary class="panel-head"><app-icon name="target" [size]="16" /><h2>Expected scope</h2><span class="dim small">skill matrix</span><span class="spacer"></span><app-icon class="chev" name="chevron-down" [size]="16" /></summary>
            <div class="panel-body"><app-markdown [source]="t.scope" /></div></details>
        }

        <section class="panel mt" aria-labelledby="q-h">
          <div class="panel-head wrap"><h2 id="q-h">Questions</h2><span class="dim small mono">{{ total() }}</span><span class="spacer"></span>
            <div class="chips" role="group" aria-label="Filter questions">
              @for (f of filters; track f.value) { <button type="button" [class.active]="filter() === f.value" [attr.aria-pressed]="filter() === f.value" (click)="setFilter(f.value)">{{ f.label }}</button> }
            </div>
          </div>
          @if (loadingQs()) { <div class="panel-body"><app-skeleton kind="list" [count]="6" /></div> }
          @else { <app-question-list class="flush" [items]="questions()" [showTopic]="false" [contextTopicId]="t.id" [offset]="(page() - 1) * pageSize" emptyText="No questions match this filter." /> }
        </section>
        <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
        <app-feedback-form class="mt" kind="Topic" [contentId]="t.id" />
        <a class="fab" routerLink="/questions/new" [queryParams]="{ topic: t.id }" aria-label="Add question">+</a>
      } @else { <app-skeleton kind="list" [count]="8" /> }
    </div>`,
  styles: [`
    .badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .summary { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
    .grow { flex: 1 1 320px; }
    .nums { display: flex; gap: 18px; font-size: 13px; color: var(--text-muted); }
    .nums b { font-family: var(--mono); color: var(--text); }
    .warnc { color: var(--warn) !important; }
    .scope summary { cursor: pointer; list-style: none; border-bottom-color: transparent; }
    .scope summary::-webkit-details-marker { display: none; }
    .scope[open] summary { border-bottom-color: var(--border); }
    .scope[open] .chev { transform: rotate(180deg); }
    .chev { transition: transform var(--dur-2) var(--ease-out); color: var(--text-dim); }
    .panel-head.wrap { flex-wrap: wrap; row-gap: 6px; padding-top: 8px; padding-bottom: 8px; }
    .panel-head .chips { padding: 0; }
    app-question-list.flush ::ng-deep .qlist { border: 0; border-radius: 0 0 var(--radius) var(--radius); }
    app-question-list.flush ::ng-deep .empty { border: 0; }
    app-feedback-form { display: block; }
  `]
})
export class TopicDetailComponent {
  private api = inject(ApiService);private router=inject(Router);private dialogs=inject(DialogService);
  async rename(){const t=this.topic();if(!t)return;const name=await this.dialogs.prompt({title:'Rename topic',inputLabel:'Topic name',value:t.name});if(name)this.api.updateTopic(t.id,t.sectionId,name,t.description).subscribe(()=>this.api.topic(t.id).subscribe(d=>this.topic.set(d)));}
  async remove(){const t=this.topic();if(t&&await this.dialogs.confirm({title:'Delete topic?',message:'All its questions are deleted for every member.',confirmLabel:'Delete',danger:true}))this.api.deleteTopic(t.id).subscribe(()=>this.router.navigate(['/topics']));}
  private latestTopic = createLatest();
  private latestQuestions = createLatest();
  readonly id = input.required<string>();
  readonly topic = signal<Topic | null>(null);
  readonly questions = signal<QuestionSummary[]>([]);
  readonly filter = signal<QuestionFilter>('All');
  readonly filters: { label: string; value: QuestionFilter }[] = [
    { label: 'All', value: 'All' }, { label: 'Not started', value: 'NotStarted' }, { label: 'Completed', value: 'Completed' },
    { label: 'Needs review', value: 'NeedsReview' }, { label: 'Favorites', value: 'Favorites' }, { label: 'My questions', value: 'Mine' }
  ];

  constructor() {
    effect(() => {
      const id = Number(this.id());
      this.page.set(1);
      this.latestTopic(this.api.topic(id), { next: t => this.topic.set(t) });
      this.loadQuestions(id, this.filter());
    });
  }

  readonly page = signal(1);
  readonly total = signal(0);
  readonly loadingQs = signal(true);
  readonly pageSize = 25;
  setFilter(f: QuestionFilter): void { this.filter.set(f); this.page.set(1); this.loadQuestions(Number(this.id()), f); }
  goPage(p: number): void { this.page.set(p); this.loadQuestions(Number(this.id()), this.filter()); }
  private loadQuestions(id: number, f: QuestionFilter): void {
    this.loadingQs.set(true);
    this.latestQuestions(this.api.topicQuestions(id, f, this.page(), this.pageSize), { next: p => { this.questions.set(p.items); this.total.set(p.totalCount); this.loadingQs.set(false); }, error: () => this.loadingQs.set(false) });
  }
}
