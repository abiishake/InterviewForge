import { DialogService } from '../../core/services/dialog.service';
import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { QuestionFilter, QuestionSummary, Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { MarkdownComponent } from '../../shared/components/markdown.component';
import { ProgressBarComponent, QuestionListComponent } from '../../shared/components/ui.components';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';


@Component({
  selector: 'app-topic-detail',
  imports: [FeedbackFormComponent, RouterLink, ProgressBarComponent, QuestionListComponent, MarkdownComponent, DecimalPipe, PaginationComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (topic(); as t) {
        <div class="breadcrumb"><a routerLink="/sections">Sections</a> / <a [routerLink]="['/sections', t.sectionId]">{{ t.sectionName }}</a> → {{ t.name }}</div>
        <div class="page-header">
          <div><h1>{{ t.name }}</h1>@if (t.description) { <p>{{ t.description }}</p> }</div>
          <div class="row">
            @if (questions().length) { <a class="btn primary" routerLink="/interview" [queryParams]="{ topic: t.id }">Practise in interview mode</a> }
            <a class="btn" routerLink="/questions/new" [queryParams]="{ topic: t.id }">+ Add question</a>
          </div>
        </div>
        <div class="row mt">@if(t.addedBy){<span class="badge info">Added by {{t.addedBy}}</span>}@if(t.canEdit){<button class="btn" (click)="rename()">Edit topic</button><button class="btn danger" (click)="remove()">Delete topic</button>}</div>
        <app-feedback-form kind="Topic" [contentId]="t.id" />
        <div class="card mt">
          <div class="row"><b>Progress</b><span class="muted">{{ t.progress.completed }} / {{ t.progress.total }} questions completed</span><span class="spacer"></span>
            <span class="mono">{{ t.progress.percent | number:'1.0-0' }}%</span></div>
          <div class="mt"><app-progress-bar [value]="t.progress.completed" [total]="t.progress.total" [review]="t.progress.needsReview" /></div>
        </div>
        @if (t.scope) {
          <details class="card mt"><summary><b>Expected scope (skill matrix)</b></summary><div class="mt"><app-markdown [source]="t.scope" /></div></details>
        }
        <div class="chips mt-lg" role="group" aria-label="Filter questions">
          @for (f of filters; track f.value) { <button type="button" [class.active]="filter() === f.value" [attr.aria-pressed]="filter() === f.value" (click)="setFilter(f.value)">{{ f.label }}</button> }
        </div>
        <div class="mt">
          @if (loadingQs()) { <app-skeleton kind="card" [count]="4" /> }
          @else { <app-question-list [items]="questions()" [showTopic]="false" [contextTopicId]="t.id" [offset]="(page() - 1) * pageSize" emptyText="No questions match this filter." /> }
        </div>
        <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
        <a class="fab" routerLink="/questions/new" [queryParams]="{ topic: t.id }" aria-label="Add question">+</a>
      } @else { <app-skeleton [count]="5" /> }
    </div>`,
  styles: [`.mono { font-family: var(--mono); } summary { cursor: pointer; }`]
})
export class TopicDetailComponent {
  private api = inject(ApiService);private router=inject(Router);private dialogs=inject(DialogService);
  async rename(){const t=this.topic();if(!t)return;const name=await this.dialogs.prompt({title:'Rename topic',inputLabel:'Topic name',value:t.name});if(name)this.api.updateTopic(t.id,t.sectionId,name,t.description).subscribe(()=>this.api.topic(t.id).subscribe(d=>this.topic.set(d)));}
  async remove(){const t=this.topic();if(t&&await this.dialogs.confirm({title:'Delete topic?',message:'All its questions are deleted for every member.',confirmLabel:'Delete',danger:true}))this.api.deleteTopic(t.id).subscribe(()=>this.router.navigate(['/topics']));}
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
      this.api.topic(id).subscribe(t => this.topic.set(t));
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
    this.api.topicQuestions(id, f, this.page(), this.pageSize).subscribe({ next: p => { this.questions.set(p.items); this.total.set(p.totalCount); this.loadingQs.set(false); }, error: () => this.loadingQs.set(false) });
  }
}
