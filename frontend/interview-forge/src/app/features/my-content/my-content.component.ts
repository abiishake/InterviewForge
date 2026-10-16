import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionSummary, Section, Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { QuestionListComponent } from '../../shared/components/ui.components';

@Component({
  selector: 'app-my-content',
  imports: [FormsModule, RouterLink, QuestionListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header"><div><div class="eyebrow">My content</div><h1>My sections, topics & questions</h1>
        <p>Your content behaves exactly like imported content: search, plans, review and progress.</p></div>
        <a class="btn primary" routerLink="/questions/new">+ New question</a></div>

      <div class="grid grid-2">
        <div class="card">
          <h3>New section</h3>
          <div class="row"><input type="text" [(ngModel)]="sectionName" placeholder="e.g. Project Experience" style="flex:1" />
            <button class="btn" (click)="addSection()" [disabled]="!sectionName.trim()">Add</button></div>
        </div>
        <div class="card">
          <h3>New topic</h3>
          <div class="row">
            <select [(ngModel)]="topicSectionId" style="flex:1"><option [ngValue]="0">Section…</option>
              @for (s of sections(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }</select>
            <input type="text" [(ngModel)]="topicName" placeholder="Topic name" style="flex:1" />
            <button class="btn" (click)="addTopic()" [disabled]="!topicName.trim() || !topicSectionId">Add</button></div>
        </div>
      </div>

      @if (mySections().length || myTopics().length) {
        <h2 class="mt-lg">My sections & topics</h2>
        <div class="stack">
          @for (s of mySections(); track s.id) {
            <div class="row card"><a [routerLink]="['/sections', s.id]"><b>{{ s.name }}</b></a><span class="dim">{{ s.topicCount }} topics</span><span class="spacer"></span>
              <button class="btn sm" (click)="renameSection(s)">Rename</button><button class="btn sm danger" (click)="deleteSection(s)">Delete</button></div>
          }
          @for (t of myTopics(); track t.id) {
            <div class="row card"><span class="dim">{{ t.sectionName }} →</span><a [routerLink]="['/topics', t.id]"><b>{{ t.name }}</b></a>
              <span class="dim">{{ t.progress.total }} questions</span><span class="spacer"></span>
              <button class="btn sm" (click)="renameTopic(t)">Rename</button><button class="btn sm danger" (click)="deleteTopic(t)">Delete</button></div>
          }
        </div>
      }

      <h2 class="mt-lg">My questions</h2>
      <app-question-list [items]="questions()" emptyText="You haven't added any questions yet." />
    </div>`
})
export class MyContentComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly sections = signal<Section[]>([]);
  readonly topics = signal<Topic[]>([]);
  readonly questions = signal<QuestionSummary[]>([]);
  private auth=inject(AuthService);
  readonly mySections = computed(() => this.sections().filter(s => s.createdByUserId===this.auth.user()?.id));
  readonly myTopics = computed(() => this.topics().filter(t => t.createdByUserId===this.auth.user()?.id));
  sectionName = ''; topicName = ''; topicSectionId = 0;

  constructor() { this.load(); }

  load(): void {
    this.api.sections().subscribe(s => this.sections.set(s));
    this.api.topics().subscribe(t => this.topics.set(t));
    this.api.questions({ filter: 'Mine', pageSize: 200 }).subscribe(p => this.questions.set(p.items));
  }

  addSection(): void { this.api.createSection(this.sectionName.trim()).subscribe(() => { this.sectionName = ''; this.toast.show('Section created', 'ok'); this.load(); }); }
  addTopic(): void { this.api.createTopic(this.topicSectionId, this.topicName.trim()).subscribe(() => { this.topicName = ''; this.toast.show('Topic created', 'ok'); this.load(); }); }

  renameSection(s: Section): void {
    const name = prompt('Section name', s.name)?.trim(); if (!name) return;
    this.api.updateSection(s.id, name, s.description).subscribe(() => this.load());
  }
  deleteSection(s: Section): void {
    if (!confirm(`Delete section "${s.name}" with all its topics and your questions?`)) return;
    this.api.deleteSection(s.id).subscribe(() => this.load());
  }
  renameTopic(t: Topic): void {
    const name = prompt('Topic name', t.name)?.trim(); if (!name) return;
    this.api.updateTopic(t.id, t.sectionId, name, t.description).subscribe(() => this.load());
  }
  deleteTopic(t: Topic): void {
    if (!confirm(`Delete topic "${t.name}" and its questions?`)) return;
    this.api.deleteTopic(t.id).subscribe(() => this.load());
  }
}
