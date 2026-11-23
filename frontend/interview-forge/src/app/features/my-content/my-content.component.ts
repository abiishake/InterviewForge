import { DialogService } from '../../core/services/dialog.service';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionSummary, Section, Topic } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { QuestionListComponent } from '../../shared/components/ui.components';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';


@Component({
  selector: 'app-my-content',
  imports: [FormsModule, RouterLink, QuestionListComponent, PaginationComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Library" title="My content" description="Your own sections, topics and questions. They work exactly like imported content: search, plans, review and progress.">
        <div actions><a class="btn primary" routerLink="/questions/new"><app-icon name="plus" [size]="14" /> New question</a></div>
      </app-page-header>

      <div class="grid grid-2">
        <section class="panel">
          <div class="panel-head"><app-icon name="layers" [size]="16" /><h2>New section</h2></div>
          <form class="panel-body row" (ngSubmit)="addSection()"><input type="text" name="sn" [(ngModel)]="sectionName" placeholder="Project experience" aria-label="Section name" class="f1" />
            <button class="btn" type="submit" [disabled]="!sectionName.trim()">Add</button></form>
        </section>
        <section class="panel">
          <div class="panel-head"><app-icon name="hash" [size]="16" /><h2>New topic</h2></div>
          <form class="panel-body row" (ngSubmit)="addTopic()">
            <select name="ts" [(ngModel)]="topicSectionId" class="f1" aria-label="Section"><option [ngValue]="0">Section…</option>
              @for (s of sections(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }</select>
            <input type="text" name="tn" [(ngModel)]="topicName" placeholder="Topic name" aria-label="Topic name" class="f1" />
            <button class="btn" type="submit" [disabled]="!topicName.trim() || !topicSectionId">Add</button></form>
        </section>
      </div>

      @if (mySections().length || myTopics().length) {
        <section class="panel mt" aria-labelledby="st-h">
          <div class="panel-head"><h2 id="st-h">My sections and topics</h2><span class="spacer"></span><span class="dim small mono">{{ mySections().length + myTopics().length }}</span></div>
          <div class="table-wrap">
            <table class="data stack-sm">
              <thead><tr><th>Name</th><th>Type</th><th class="num">Contains</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>
                @for (s of mySections(); track s.id) {
                  <tr><td data-label="Name"><a [routerLink]="['/sections', s.id]"><b>{{ s.name }}</b></a></td><td data-label="Type"><span class="badge">Section</span></td>
                    <td data-label="Contains" class="num">{{ s.topicCount }} topics</td>
                    <td class="acts"><button class="btn sm" (click)="renameSection(s)">Rename</button> <button class="btn sm danger" (click)="deleteSection(s)">Delete</button></td></tr>
                }
                @for (t of myTopics(); track t.id) {
                  <tr><td data-label="Name"><span class="dim">{{ t.sectionName }} /</span> <a [routerLink]="['/topics', t.id]"><b>{{ t.name }}</b></a></td><td data-label="Type"><span class="badge info">Topic</span></td>
                    <td data-label="Contains" class="num">{{ t.progress.total }} questions</td>
                    <td class="acts"><button class="btn sm" (click)="renameTopic(t)">Rename</button> <button class="btn sm danger" (click)="deleteTopic(t)">Delete</button></td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <section class="panel mt" aria-labelledby="mq-h">
        <div class="panel-head"><h2 id="mq-h">My questions</h2><span class="spacer"></span><span class="dim small mono">{{ total() }}</span></div>
        <app-question-list class="flush" [items]="questions()" [offset]="(page() - 1) * pageSize" emptyText="You haven't added any questions yet." />
      </section>
      <app-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goPage($event)" />
    </div>`,
  styles: [`
    .acts { text-align: right; white-space: nowrap; }
    .panel-body.row { flex-wrap: nowrap; }
    app-question-list.flush ::ng-deep .qlist { border: 0; border-radius: 0 0 var(--radius) var(--radius); }
    app-question-list.flush ::ng-deep .empty { border: 0; }
    @media (max-width: 600px) { .panel-body.row { flex-wrap: wrap; } .acts { text-align: left; } }
  `]
})
export class MyContentComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialogs = inject(DialogService);
  readonly sections = signal<Section[]>([]);
  readonly topics = signal<Topic[]>([]);
  readonly questions = signal<QuestionSummary[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly pageSize = 25;
  goPage(p: number): void { this.page.set(p); this.load(); }
  private auth=inject(AuthService);
  readonly mySections = computed(() => this.sections().filter(s => s.createdByUserId===this.auth.user()?.id));
  readonly myTopics = computed(() => this.topics().filter(t => t.createdByUserId===this.auth.user()?.id));
  sectionName = ''; topicName = ''; topicSectionId = 0;

  constructor() { this.load(); }

  load(): void {
    this.api.sections().subscribe(s => this.sections.set(s));
    this.api.topics().subscribe(t => this.topics.set(t));
    this.api.questions({ filter: 'Mine', page: this.page(), pageSize: this.pageSize }).subscribe(p => { this.questions.set(p.items); this.total.set(p.totalCount); });
  }

  addSection(): void { this.api.createSection(this.sectionName.trim()).subscribe(() => { this.sectionName = ''; this.toast.show('Section created', 'ok'); this.load(); }); }
  addTopic(): void { this.api.createTopic(this.topicSectionId, this.topicName.trim()).subscribe(() => { this.topicName = ''; this.toast.show('Topic created', 'ok'); this.load(); }); }

  async renameSection(s: Section): Promise<void> {
    const name = await this.dialogs.prompt({ title: 'Rename section', inputLabel: 'Section name', value: s.name }); if (!name) return;
    this.api.updateSection(s.id, name, s.description).subscribe(() => this.load());
  }
  async deleteSection(s: Section): Promise<void> {
    if (!await this.dialogs.confirm({ title: `Delete section "${s.name}"?`, message: 'Its topics and your questions are deleted. If other members added content to it, the server refuses.', confirmLabel: 'Delete', danger: true })) return;
    this.api.deleteSection(s.id).subscribe(() => this.load());
  }
  async renameTopic(t: Topic): Promise<void> {
    const name = await this.dialogs.prompt({ title: 'Rename topic', inputLabel: 'Topic name', value: t.name }); if (!name) return;
    this.api.updateTopic(t.id, t.sectionId, name, t.description).subscribe(() => this.load());
  }
  async deleteTopic(t: Topic): Promise<void> {
    if (!await this.dialogs.confirm({ title: `Delete topic "${t.name}"?`, message: 'Its questions are deleted.', confirmLabel: 'Delete', danger: true })) return;
    this.api.deleteTopic(t.id).subscribe(() => this.load());
  }
}
