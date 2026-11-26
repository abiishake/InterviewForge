import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ResumeDetail } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { QuestionListComponent } from '../../shared/components/ui.components';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

/** One resume: its detected skills and the knowledge-base questions for each. Re-matched on every visit. */
@Component({
  selector: 'app-resume-detail',
  imports: [RouterLink, DatePipe, QuestionListComponent, EmptyStateComponent, PageHeaderComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (loading()) { <app-skeleton kind="card" [count]="3" /> }
      @else if (resume(); as r) {
        <app-page-header eyebrow="Resume" [title]="r.title" [description]="r.fileName + ' · uploaded ' + (r.uploadedAt | date:'MMM d, y')">
          <div actions><a class="btn" routerLink="/resume">All resumes</a></div>
        </app-page-header>

        <div class="stats">
          <div class="panel stat"><b>{{ matched().length }}</b><span>skills with questions</span></div>
          <div class="panel stat"><b>{{ r.totalQuestions }}</b><span>questions</span></div>
          <div class="panel stat"><b>{{ r.completedQuestions }}</b><span>completed</span></div>
        </div>

        @if (missing().length) {
          <section class="panel mt">
            <div class="panel-head"><b>Not in the knowledge base yet</b></div>
            <div class="panel-body">
              <p class="dim small">Administrators have been told about these skills. Questions appear here automatically once they're added.</p>
              <div class="skill-chips">@for (s of missing(); track s.key) { <span class="badge warn">{{ s.name }}</span> }</div>
            </div>
          </section>
        }

        @for (s of matched(); track s.key) {
          <details class="panel mt skill" [open]="$first">
            <summary class="panel-head">
              <b>{{ s.name }}</b>
              @if (s.mentions > 1) { <span class="dim small">mentioned {{ s.mentions }}×</span> }
              <span class="spacer"></span>
              <span class="small">{{ s.questions.length < s.questionCount ? s.questions.length + ' of ' + s.questionCount : s.questionCount }} questions</span>
            </summary>
            <div class="panel-body">
              <div class="topics small dim">
                @for (t of s.topics.slice(0, 8); track t.id) { <a [routerLink]="['/topics', t.id]">{{ t.name }}</a> }
                @if (s.topics.length > 8) { <span>+{{ s.topics.length - 8 }} more topics</span> }
              </div>
              <app-question-list [items]="s.questions" emptyText="No questions in these topics yet." />
            </div>
          </details>
        } @empty {
          <app-empty-state class="mt" icon="file" title="No matching questions yet"
            hint="None of the skills in this resume are in the knowledge base yet. Administrators have been notified." />
        }
      }
    </div>`,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .stat { display: flex; flex-direction: column; padding: 12px 14px; }
    .stat b { font-size: 22px; } .stat span { color: var(--text-muted); font-size: 12.5px; }
    .skill-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill summary { cursor: pointer; list-style: none; display: flex; align-items: center; gap: 10px; }
    .skill summary::-webkit-details-marker { display: none; }
    .topics { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 8px; }
    .small { font-size: 12.5px; }
    @media (max-width: 480px) { .stat b { font-size: 18px; } }
  `]
})
export class ResumeDetailComponent {
  private api = inject(ApiService);
  /** Route parameter (component input binding). */
  readonly id = input.required<string>();
  readonly resume = signal<ResumeDetail | null>(null);
  readonly loading = signal(true);
  readonly matched = computed(() => this.resume()?.skills.filter(s => s.inKnowledgeBase) ?? []);
  readonly missing = computed(() => this.resume()?.skills.filter(s => !s.inKnowledgeBase) ?? []);

  constructor() {
    toObservable(this.id).pipe(
      switchMap(id => { this.loading.set(true); return this.api.resume(Number(id)); }),
      takeUntilDestroyed()
    ).subscribe({ next: r => { this.resume.set(r); this.loading.set(false); }, error: () => { this.resume.set(null); this.loading.set(false); } });
  }
}
