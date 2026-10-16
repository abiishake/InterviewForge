import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Difficulty, ProgressStatus, QuestionSummary } from '../../core/models';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb" [class.thin]="thin()" role="progressbar" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
      <div class="fill" [style.width.%]="pct()"></div>
      @if (review() > 0) { <div class="fill review" [style.width.%]="reviewPct()"></div> }
    </div>`,
  styles: [`
    .pb { display: flex; height: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 99px; overflow: hidden; }
    .pb.thin { height: 5px; }
    .fill { background: var(--ok); transition: width .3s; }
    .fill.review { background: var(--warn); }
  `]
})
export class ProgressBarComponent {
  readonly value = input(0);
  readonly total = input(0);
  readonly review = input(0);
  readonly thin = input(false);
  readonly pct = computed(() => this.total() ? Math.min(100, (this.value() / this.total()) * 100) : 0);
  readonly reviewPct = computed(() => this.total() ? (this.review() / this.total()) * 100 : 0);
}

@Component({
  selector: 'app-difficulty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class.info]="value()==='Beginner'||value()==='Intermediate'" [class.accent]="value()==='Advanced'" [class.danger]="value()==='Expert'">{{ value() }}</span>`
})
export class DifficultyBadgeComponent { readonly value = input.required<Difficulty>(); }

const STATUS_LABEL: Record<ProgressStatus, string> = { NotStarted: 'Not started', InProgress: 'In progress', Completed: 'Completed', NeedsReview: 'Needs review' };

@Component({
  selector: 'app-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class.ok]="value()==='Completed'" [class.warn]="value()==='NeedsReview'" [class.info]="value()==='InProgress'">{{ label() }}</span>`
})
export class StatusBadgeComponent {
  readonly value = input.required<ProgressStatus>();
  readonly label = computed(() => STATUS_LABEL[this.value()]);
}

@Component({
  selector: 'app-question-list',
  imports: [RouterLink, DifficultyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <div class="empty">{{ emptyText() }}</div>
    } @else {
      <ol class="qlist">
        @for (q of items(); track q.id; let i = $index) {
          <li>
            <a [routerLink]="['/questions', q.id]" [queryParams]="contextTopicId() ? { topic: contextTopicId() } : {}">
              <span class="status-dot" [class]="'status-dot ' + q.status" [attr.title]="q.status"></span>
              <span class="num">{{ offset() + i + 1 }}</span>
              <span class="qtext">
                {{ q.text }}
                <div class="meta">
                  @if (showTopic()) { {{ q.sectionName }} → {{ q.topicName }} · }
                  @if (q.isUserCreated) { <span class="badge accent">Added by {{ q.addedBy }}</span> }
                  @if (q.isFavorite) { <span title="Favorite">★</span> }
                  @for (t of q.tags.slice(0, 4); track t) { <span class="tag">#{{ t }}</span>&nbsp; }
                </div>
              </span>
              <app-difficulty [value]="q.difficulty" />
            </a>
          </li>
        }
      </ol>
    }`
})
export class QuestionListComponent {
  readonly items = input.required<QuestionSummary[]>();
  readonly showTopic = input(true);
  readonly offset = input(0);
  readonly contextTopicId = input<number | null>(null);
  readonly emptyText = input('No questions here yet.');
}
