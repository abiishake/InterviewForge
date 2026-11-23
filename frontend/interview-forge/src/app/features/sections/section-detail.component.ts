import { DialogService } from '../../core/services/dialog.service';
import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SectionDetail } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { createLatest } from '../../core/util/latest';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { ErrorStateComponent } from '../../shared/ui/error-state.component';

@Component({
  selector: 'app-section-detail',
  imports: [FeedbackFormComponent, RouterLink, DecimalPipe, SkeletonComponent, ErrorStateComponent, IconComponent, MeterComponent, PageHeaderComponent, StatTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (data(); as d) {
        <app-page-header [title]="d.section.name" [description]="d.section.description ?? ''">
          <div crumbs class="breadcrumb"><a routerLink="/sections">Sections</a> / {{ d.section.name }}</div>
          <div class="badges"><span class="badge" [class.accent]="d.section.priority === 'Core'">{{ d.section.priority }}</span>
            @if (d.section.addedBy) { <span class="badge info">Added by {{ d.section.addedBy }}</span> }</div>
          <div actions>
            @if (d.section.canEdit) { <button class="btn" (click)="rename()"><app-icon name="edit" [size]="14" /> Rename</button><button class="btn danger" (click)="remove()"><app-icon name="trash" [size]="14" /> Delete</button> }
            <a class="btn primary" routerLink="/questions/new" [queryParams]="{ section: d.section.id }"><app-icon name="plus" [size]="14" /> Add question</a>
          </div>
        </app-page-header>

        <div class="tiles">
          <app-stat-tile label="Readiness" tone="ready" [value]="(d.section.progress.percent | number:'1.0-0') + '%'" [sub]="d.section.progress.completed + ' of ' + d.section.progress.total + ' questions'" />
          <app-stat-tile label="Topics" [value]="d.topics.length" [sub]="topicsDone(d) + ' fully done'" />
          <app-stat-tile label="In progress" [value]="d.section.progress.inProgress" sub="started, not finished" />
          <app-stat-tile label="Needs review" [tone]="d.section.progress.needsReview ? 'warn' : ''" [value]="d.section.progress.needsReview" sub="marked for another pass" />
        </div>
        <section class="panel mt"><div class="panel-body"><app-meter class="lg" label="Section progress" [value]="d.section.progress.completed" [total]="d.section.progress.total" [review]="d.section.progress.needsReview" /></div></section>

        <section class="panel mt" aria-labelledby="topics-h">
          <div class="panel-head"><h2 id="topics-h">Topics</h2><span class="spacer"></span><span class="dim small">{{ d.topics.length }}</span></div>
          <div class="table-wrap">
            <table class="data stack-sm">
              <thead><tr><th>Topic</th><th>Priority</th><th class="meter-col">Readiness</th><th class="num">Questions</th></tr></thead>
              <tbody>
                @for (t of d.topics; track t.id) {
                  <tr>
                    <td data-label="Topic"><a [routerLink]="['/topics', t.id]" class="name">{{ t.name }}</a>
                      @if (t.isUserCreated) { <span class="badge info">by {{ t.addedBy }}</span> }
                      @if (t.description) { <div class="desc dim">{{ t.description }}</div> }</td>
                    <td data-label="Priority"><span class="badge" [class.accent]="t.priority === 'Core'">{{ t.priority }}</span></td>
                    <td data-label="Readiness" class="meter-col">@if (t.progress.total > 0) { <app-meter [value]="t.progress.completed" [total]="t.progress.total" [review]="t.progress.needsReview" /> } @else { <span class="dim small">scope only</span> }</td>
                    <td data-label="Questions" class="num">{{ t.progress.completed }}/{{ t.progress.total }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
        <app-feedback-form class="mt" kind="Section" [contentId]="d.section.id" />
      } @else if (failed()) { <app-error-state title="Section not available" hint="It may have been deleted, or the request failed." (retry)="load()" /> }
      @else { <app-skeleton kind="list" [count]="6" /> }
    </div>`,
  styles: [`
    :host { display: block; }
    .badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .name { color: var(--text); font-weight: 500; margin-right: 6px; }
    .desc { font-size: 12.5px; margin-top: 2px; max-width: 70ch; }
    .meter-col { width: 32%; }
    app-feedback-form { display: block; }
    @media (max-width: 760px) { .meter-col { width: auto; } }
  `]
})
export class SectionDetailComponent {
  private api = inject(ApiService);private router=inject(Router);private dialogs=inject(DialogService);
  async rename(){const s=this.data()?.section;if(!s)return;const name=await this.dialogs.prompt({title:'Rename section',inputLabel:'Section name',value:s.name});if(name)this.api.updateSection(s.id,name,s.description).subscribe(()=>this.api.section(s.id).subscribe(d=>this.data.set(d)));}
  async remove(){const s=this.data()?.section;if(s&&await this.dialogs.confirm({title:'Delete section?',message:'All its topics and questions are deleted for every member.',confirmLabel:'Delete',danger:true}))this.api.deleteSection(s.id).subscribe(()=>this.router.navigate(['/sections']));}
  readonly id = input.required<string>();
  topicsDone(d: SectionDetail): number { return d.topics.filter(t => t.progress.total > 0 && t.progress.completed === t.progress.total).length; }
  readonly data = signal<SectionDetail | null>(null);
  readonly failed = signal(false);
  private latestSection = createLatest();
  constructor() { effect(() => { this.id(); this.load(); }); }
  load(): void {
    this.failed.set(false); this.data.set(null);
    this.latestSection(this.api.section(Number(this.id())), { next: d => this.data.set(d), error: () => this.failed.set(true) });
  }
}
