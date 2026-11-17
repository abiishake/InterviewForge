import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Keyboard support for role="tablist": Left/Right/Home/End move to and select a tab (automatic activation).
 * Pair with [attr.tabindex]="selected ? 0 : -1" on each tab so only the active tab is in the tab order.
 */
@Directive({
  selector: '[appTabList]',
  host: { role: 'tablist', '(keydown)': 'onKey($event)' }
})
export class TabListDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  onKey(e: KeyboardEvent): void {
    const tabs = Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]'));
    const i = tabs.indexOf(document.activeElement as HTMLElement);
    if (i < 0 || !tabs.length) return;
    const last = tabs.length - 1;
    const target = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (target < 0) return;
    e.preventDefault();
    tabs[target].focus();
    tabs[target].click();
  }
}
