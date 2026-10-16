import { FeedbackFormComponent } from '../../shared/components/feedback-form.component';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SectionDetail } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-section-detail',
  imports: [FeedbackFormComponent, RouterLink, ProgressBarComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (data(); as d) {
        <div class="breadcrumb"><a routerLink="/sections">Sections</a> / {{ d.section.name }}</div>
        <div class="page-header"><div><h1>{{ d.section.name }}</h1>@if (d.section.description) { <p>{{ d.section.description }}</p> }</div>
          <a class="btn" routerLink="/questions/new" [queryParams]="{ section: d.section.id }">+ Add question</a></div>
        <div class="row mt">@if(d.section.addedBy){<span class="badge info">Added by {{d.section.addedBy}}</span>}@if(d.section.canEdit){<button class="btn" (click)="rename()">Edit section</button><button class="btn danger" (click)="remove()">Delete section</button>}</div>
        <app-feedback-form kind="Section" [contentId]="d.section.id" />
        <div class="card mt"><div class="row"><b>{{ d.section.progress.completed }} / {{ d.section.progress.total }}</b><span class="muted">questions completed</span>
          <span class="spacer"></span><span class="mono">{{ d.section.progress.percent | number:'1.0-0' }}%</span></div>
          <div class="mt"><app-progress-bar [value]="d.section.progress.completed" [total]="d.section.progress.total" [review]="d.section.progress.needsReview" /></div></div>

        <div class="topics mt">
          @for (t of d.topics; track t.id) {
            <a class="card link topic" [routerLink]="['/topics', t.id]">
              <div class="row"><h3>{{ t.name }}</h3>
                <span class="badge" [class.accent]="t.priority === 'Core'">{{ t.priority }}</span>
                @if (t.isUserCreated) { <span class="badge info">Added by {{ t.addedBy }}</span> }
                <span class="spacer"></span>
                @if (t.progress.total > 0) { <span class="mono dim">{{ t.progress.completed }}/{{ t.progress.total }}</span> } @else { <span class="dim small">scope only</span> }
              </div>
              @if (t.description) { <p class="muted small">{{ t.description }}</p> }
              @if (t.progress.total > 0) { <app-progress-bar [value]="t.progress.completed" [total]="t.progress.total" [review]="t.progress.needsReview" [thin]="true" /> }
            </a>
          }
        </div>
      } @else { <div class="loading">Loading…</div> }
    </div>`,
  styles: [`.topics { display: grid; gap: 10px; } .topic h3 { margin: 0; } .small { font-size: 13px; margin: 6px 0 10px; } .mono { font-family: var(--mono); font-size: 13px; }`]
})
export class SectionDetailComponent {
  private api = inject(ApiService);private router=inject(Router);
  rename(){const s=this.data()?.section;if(!s)return;const name=prompt('Section name',s.name);if(name)this.api.updateSection(s.id,name,s.description).subscribe(()=>this.api.section(s.id).subscribe(d=>this.data.set(d)));}
  remove(){const s=this.data()?.section;if(s&&confirm('Delete section and all its contents?'))this.api.deleteSection(s.id).subscribe(()=>this.router.navigate(['/sections']));}
  readonly id = input.required<string>();
  readonly data = signal<SectionDetail | null>(null);
  constructor() { effect(() => { const id = Number(this.id()); this.api.section(id).subscribe(d => this.data.set(d)); }); }
}
