import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { IconComponent } from './icon.component';

export interface MenuItem { label: string; run: () => void; danger?: boolean; disabled?: boolean; title?: string; }

/** Dropdown action menu with keyboard support (Arrow keys, Home/End, Esc). */
@Component({
  selector: 'app-menu',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn sm trigger" aria-haspopup="menu" [attr.aria-expanded]="open()" (click)="toggle()" (keydown.arrowdown)="openFirst($event)">
      {{ label() }} <app-icon name="chevron-down" [size]="14" />
    </button>
    @if (open()) {
      <div class="menu" role="menu" (keydown)="onKey($event)">
        @for (it of items(); track it.label) {
          <button type="button" role="menuitem" class="item" [class.danger]="it.danger" [disabled]="it.disabled" [attr.title]="it.title ?? null" (click)="choose(it)">{{ it.label }}</button>
        }
      </div>
    }`,
  styles: [`
    :host { position: relative; display: inline-block; }
    .menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 60; min-width: 200px; display: flex; flex-direction: column; padding: 4px; background: var(--bg-card); border: 1px solid var(--border-strong); border-radius: var(--radius); box-shadow: var(--shadow); }
    .item { text-align: left; padding: 10px 12px; min-height: 40px; border: 0; background: transparent; color: var(--text); border-radius: var(--radius-sm); font: 14px var(--font); cursor: pointer; }
    .item:hover:not(:disabled), .item:focus-visible { background: var(--bg-hover); }
    .item.danger { color: var(--danger); } .item:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class MenuComponent {
  readonly label = input('Actions');
  readonly items = input.required<MenuItem[]>();
  readonly open = signal(false);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  toggle(): void { this.open.update(v => !v); if (this.open()) queueMicrotask(() => this.focusAt(0)); }
  openFirst(e: Event): void { e.preventDefault(); this.open.set(true); queueMicrotask(() => this.focusAt(0)); }
  choose(it: MenuItem): void { this.open.set(false); it.run(); (this.host.nativeElement.querySelector('.trigger') as HTMLElement | null)?.focus(); }

  onKey(e: KeyboardEvent): void {
    const items = this.buttons();
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.stopPropagation(); this.open.set(false); (this.host.nativeElement.querySelector('.trigger') as HTMLElement | null)?.focus(); }
    else if (e.key === 'Tab') this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  outside(e: MouseEvent): void { if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false); }

  private buttons(): HTMLElement[] { return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')); }
  private focusAt(i: number): void { this.buttons()[i]?.focus(); }
}
