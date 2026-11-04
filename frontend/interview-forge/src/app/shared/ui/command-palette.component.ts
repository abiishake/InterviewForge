import { ChangeDetectionStrategy, Component, ElementRef, Injectable, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from './icon.component';

export interface PaletteItem { label: string; hint: string; icon: string; run: () => void; }

@Injectable({ providedIn: 'root' })
export class PaletteService {
  readonly isOpen = signal(false);
  open(): void { this.isOpen.set(true); }
  close(): void { this.isOpen.set(false); }
}

const RECENT_KEY = 'if-recent-searches';

/** Ctrl/Cmd+K palette: live search of questions, topics, sections and algorithms, plus quick actions. */
@Component({
  selector: 'app-command-palette',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="pal" (cancel)="close($event)" (click)="backdrop($event)" aria-label="Search and commands">
      <div class="box">
        <div class="field"><app-icon name="search" />
          <input #inp type="search" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list"
            [attr.aria-activedescendant]="items().length ? 'pal-' + active() : null"
            name="q" [ngModel]="text()" (ngModelChange)="typed($event)" (keydown)="onKey($event)" placeholder="Search questions, topics, algorithms, or type a command…" autocomplete="off">
        </div>
        <ul id="pal-list" role="listbox" class="list">
          @for (it of items(); track $index) {
            <li role="option" [id]="'pal-' + $index" [class.active]="$index === active()" [attr.aria-selected]="$index === active()" (mouseenter)="active.set($index)" (click)="choose(it)">
              <app-icon [name]="it.icon" [size]="18" /><span class="lbl">{{ it.label }}</span><span class="hint">{{ it.hint }}</span>
            </li>
          } @empty { <li class="none">{{ loading() ? 'Searching…' : 'No matches' }}</li> }
        </ul>
        <div class="foot muted"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</div>
      </div>
    </dialog>`,
  styles: [`
    .pal { border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-card); color: var(--text); padding: 0; width: min(94vw, 640px); margin-top: 10vh; box-shadow: var(--shadow); }
    .pal::backdrop { background: rgb(0 0 0 / .5); }
    .field { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
    .field input { border: none; background: transparent; padding: 6px 0; font-size: 16px; }
    .field input:focus { outline: none; }
    .list { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow-y: auto; }
    li { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--radius-sm); cursor: pointer; }
    li.active { background: var(--accent-soft); }
    li.none { color: var(--text-muted); cursor: default; }
    .lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hint { color: var(--text-dim); font-size: 12px; white-space: nowrap; }
    .foot { padding: 8px 14px; border-top: 1px solid var(--border); font-size: 12px; }
    kbd { border: 1px solid var(--border-strong); border-radius: 4px; padding: 0 5px; margin-right: 3px; }
    @media (max-width: 600px) { .pal { margin-top: 0; width: 100vw; max-width: 100vw; } .foot { display: none; } }
  `]
})
export class CommandPaletteComponent {
  private palette = inject(PaletteService);
  private api = inject(ApiService);
  private router = inject(Router);
  private theme = inject(ThemeService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private inp = viewChild<ElementRef<HTMLInputElement>>('inp');
  readonly text = signal('');
  readonly items = signal<PaletteItem[]>([]);
  readonly active = signal(0);
  readonly loading = signal(false);
  private readonly query$ = new Subject<string>();

  constructor() {
    effect(() => {
      const open = this.palette.isOpen();
      const d = this.dlg().nativeElement;
      if (open && !d.open) {
        this.text.set('');
        this.items.set(this.defaults());
        this.active.set(0);
        d.showModal();
        queueMicrotask(() => this.inp()?.nativeElement.focus());
      } else if (!open && d.open) d.close();
    });
    this.query$.pipe(debounceTime(200), distinctUntilChanged(), switchMap(q => {
      if (q.trim().length < 2) { this.loading.set(false); return of(null); }
      this.loading.set(true);
      return this.api.search(q.trim());
    })).subscribe({
      next: r => {
        this.loading.set(false);
        if (r === null) { this.items.set(this.text().trim() ? [] : this.defaults()); return; }
        const out: PaletteItem[] = [
          ...r.questions.items.slice(0, 6).map(q => this.item(q.text, q.topicName, 'book', ['/questions', q.id])),
          ...r.topics.slice(0, 3).map(t => this.item(t.name, t.sectionName, 'folder', ['/topics', t.id])),
          ...r.sections.slice(0, 2).map(s => this.item(s.name, 'Section', 'folder', ['/sections', s.id])),
          ...r.algorithms.slice(0, 3).map(a => this.item(a.name, a.category, 'code', ['/algorithms', a.slug]))
        ];
        out.push({ label: `Search all for "${r.query}"`, hint: 'Full results', icon: 'search', run: () => { this.remember(r.query); this.router.navigate(['/search'], { queryParams: { q: r.query } }); } });
        this.items.set(out); this.active.set(0);
      },
      error: () => { this.loading.set(false); this.items.set([]); }
    });
  }

  typed(v: string): void { this.text.set(v); if (!v.trim()) { this.items.set(this.defaults()); this.active.set(0); } this.query$.next(v); }

  onKey(e: KeyboardEvent): void {
    const n = this.items().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.set(n ? (this.active() + 1) % n : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set(n ? (this.active() - 1 + n) % n : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = this.items()[this.active()]; if (it) this.choose(it); }
  }

  choose(it: PaletteItem): void { this.palette.close(); it.run(); }
  close(e: Event): void { e.preventDefault(); this.palette.close(); }
  backdrop(e: MouseEvent): void { if (e.target === this.dlg().nativeElement) this.palette.close(); }

  private item(label: string, hint: string, icon: string, link: (string | number)[]): PaletteItem {
    return { label: label.length > 90 ? label.slice(0, 90) + '…' : label, hint, icon, run: () => { this.remember(this.text()); this.router.navigate(link); } };
  }

  private defaults(): PaletteItem[] {
    const nav = (label: string, icon: string, path: string): PaletteItem => ({ label, hint: 'Go to', icon, run: () => { this.router.navigateByUrl(path); } });
    const recent = this.recent().map(r => ({ label: r, hint: 'Recent', icon: 'search', run: () => { this.router.navigate(['/search'], { queryParams: { q: r } }); } }));
    return [
      { label: 'Start interview mode', hint: 'Action', icon: 'play', run: () => { this.router.navigateByUrl('/interview'); } },
      { label: 'New question', hint: 'Action', icon: 'plus', run: () => { this.router.navigateByUrl('/questions/new'); } },
      nav("Today's plan", 'calendar', '/plan'), nav('Review queue', 'refresh', '/review'), nav('Library', 'book', '/sections'),
      { label: 'Toggle theme', hint: 'Action', icon: this.theme.effective() === 'dark' ? 'sun' : 'moon', run: () => this.theme.toggle() },
      ...recent
    ];
  }

  private recent(): string[] {
    try { return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]).slice(0, 5); } catch { return []; }
  }

  private remember(q: string): void {
    const v = q.trim();
    if (v.length < 2) return;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([v, ...this.recent().filter(x => x !== v)].slice(0, 8))); } catch { /* storage unavailable */ }
  }
}
