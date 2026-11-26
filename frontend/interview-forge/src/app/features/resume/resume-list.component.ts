import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError, ResumeListItem } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { DialogService } from '../../core/services/dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload resumes and pick one to see its questions. Resumes are private to the signed-in account. */
@Component({
  selector: 'app-resume-list',
  imports: [RouterLink, DatePipe, EmptyStateComponent, IconComponent, PageHeaderComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header eyebrow="Resume" title="Resume questions"
        description="Upload a resume (PDF or LaTeX .tex) to get interview questions for the skills it lists. Only you can see your resumes. They are separate from your study plan." />

      <label class="drop" [class.over]="dragOver()" [class.busy]="uploading()"
             (dragover)="$event.preventDefault(); dragOver.set(true)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
        <input type="file" accept=".pdf,.tex,application/pdf" (change)="onPick($event)" [disabled]="uploading()" class="sr-only">
        <app-icon name="upload" [size]="22" />
        @if (uploading()) { <b>Reading your resume…</b> }
        @else { <b>Choose a resume or drop it here</b><span class="dim small">PDF or .tex, up to 5 MB. Scanned (image-only) PDFs can't be read.</span> }
      </label>
      @if (error()) { <div class="field-error mt" role="alert">{{ error() }}</div> }

      <div class="stack mt">
        @if (loading()) { <app-skeleton kind="card" [count]="2" /> }
        @else {
          @for (r of items(); track r.id) {
            <article class="panel">
              <div class="panel-head">
                <app-icon name="file" [size]="16" />
                <a class="ttl" [routerLink]="['/resume', r.id]">{{ r.title }}</a>
                <span class="badge">{{ r.fileKind.toUpperCase() }}</span>
                <span class="spacer"></span>
                <button type="button" class="btn sm" (click)="rename(r)">Rename</button>
                <button type="button" class="btn sm danger" (click)="remove(r)">Delete</button>
              </div>
              <div class="panel-body row">
                <span class="dim small">{{ r.fileName }} · uploaded {{ r.uploadedAt | date:'MMM d, y' }}</span>
                <span class="spacer"></span>
                <span class="small"><b>{{ r.matchedSkillCount }}</b> of {{ r.skillCount }} skills have questions</span>
                <a class="btn sm primary" [routerLink]="['/resume', r.id]">Open</a>
              </div>
            </article>
          } @empty { <app-empty-state icon="file" title="No resumes yet" hint="Upload a resume above to get questions tailored to it." /> }
        }
      </div>
    </div>`,
  styles: [`
    .drop { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 28px 16px; border: 2px dashed var(--border); border-radius: 12px;
      text-align: center; cursor: pointer; color: var(--text-muted); transition: border-color .15s, background .15s; }
    .drop:hover, .drop.over, .drop:focus-within { border-color: var(--accent); background: var(--surface-2, transparent); }
    .drop.busy { cursor: progress; opacity: .7; }
    .ttl { color: var(--text); font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .small { font-size: 12.5px; }
    .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  `]
})
export class ResumeListComponent {
  private api = inject(ApiService);
  private dialog = inject(DialogService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly items = signal<ResumeListItem[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly dragOver = signal(false);
  readonly error = signal('');

  constructor() { this.load(); }

  load(): void {
    this.api.resumes().subscribe({ next: r => { this.items.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.upload(file);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  private upload(file: File): void {
    this.error.set('');
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.tex')) { this.error.set('Upload a PDF (.pdf) or LaTeX (.tex) file.'); return; }
    if (file.size > MAX_BYTES) { this.error.set('The file is larger than 5 MB.'); return; }
    this.uploading.set(true);
    this.api.uploadResume(file).subscribe({
      next: r => {
        this.uploading.set(false);
        this.toast.show(`Found ${r.skills.length} skills and ${r.totalQuestions} questions.`, 'ok');
        void this.router.navigate(['/resume', r.id]);
      },
      error: (err: ApiError) => {
        this.uploading.set(false);
        this.error.set(err.details?.['file']?.[0] ?? err.message ?? 'The upload failed.');
      }
    });
  }

  async rename(r: ResumeListItem): Promise<void> {
    const title = await this.dialog.prompt({ title: 'Rename resume', value: r.title, inputLabel: 'Title' });
    if (title === null || !title.trim()) return;
    this.api.renameResume(r.id, title.trim()).subscribe(updated => this.items.update(list => list.map(x => x.id === r.id ? updated : x)));
  }

  async remove(r: ResumeListItem): Promise<void> {
    const ok = await this.dialog.confirm({ title: 'Delete resume?', message: `“${r.title}” and its question list will be removed. Your progress and notes on the questions are kept.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    this.api.deleteResume(r.id).subscribe(() => { this.items.update(list => list.filter(x => x.id !== r.id)); this.toast.show('Resume deleted.', 'ok'); });
  }
}
