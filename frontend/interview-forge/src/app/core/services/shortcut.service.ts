import { Injectable } from '@angular/core';

/** One place deciding whether a key press may trigger an app shortcut (F5). */
@Injectable({ providedIn: 'root' })
export class ShortcutService {
  /** True when the event came from a context where shortcuts must not fire. */
  ignore(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return true;
    const el = e.target as HTMLElement | null;
    if (el) {
      if (['BUTTON', 'A', 'TEXTAREA', 'INPUT', 'SELECT', 'SUMMARY'].includes(el.tagName)) return true;
      if (el.isContentEditable || el.closest?.('[contenteditable="true"],[role="dialog"],[role="menu"]')) return true;
    }
    return typeof document !== 'undefined' && !!document.querySelector('dialog[open]');
  }
}
