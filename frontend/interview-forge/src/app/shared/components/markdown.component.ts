import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { Marked } from 'marked';

const marked = new Marked({ gfm: true, breaks: false });

// Only http(s), mailto and in-app relative/anchor links survive. javascript:, data:, vbscript: etc. are stripped.
const SAFE_URI = /^(?:https?:|mailto:|\/(?!\/)|#)/i;

DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') ?? '';
    if (!SAFE_URI.test(href)) { node.removeAttribute('href'); return; }
    if (/^https?:/i.test(href)) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  }
  if (node.tagName === 'IMG') {
    // Remote images would let any contributor log viewers' IP addresses, so only inline data: images render.
    const src = node.getAttribute('src') ?? '';
    if (!/^data:image\/(png|jpeg|gif|webp);/i.test(src)) {
      if (/^https?:/i.test(src) && node.parentNode) {
        const link = node.ownerDocument.createElement('a');
        link.setAttribute('href', src);
        link.textContent = '[image: ' + (node.getAttribute('alt') || src) + ']';
        node.parentNode.replaceChild(link, node);
        return;
      }
      node.removeAttribute('src');
    }
    node.setAttribute('loading', 'lazy');
  }
});

/**
 * Renders untrusted Markdown safely:
 *  1. marked converts Markdown → HTML (GFM: tables, fenced code, bare-URL autolinks).
 *  2. DOMPurify removes scripts, event handlers, iframes, styles and unsafe URL schemes.
 *  3. Only the purified output is marked as trusted for Angular.
 * Raw HTML inside answers is therefore never executed.
 */
export function renderMarkdown(source: string | null | undefined): string {
  const html = marked.parse(source ?? '', { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button', 'textarea', 'select', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: SAFE_URI
  });
}

@Component({
  selector: 'app-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="md" [innerHTML]="html()"></div>`
})
export class MarkdownComponent {
  private sanitizer = inject(DomSanitizer);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Runs only when the rendered HTML changes (after it is in the DOM), instead of after every change-detection pass.
    afterRenderEffect(() => { this.html(); this.addCopyButtons(); });
  }

  /** Adds a "Copy" button to every code block. */
  private addCopyButtons(): void {
    this.host.nativeElement.querySelectorAll('pre').forEach(pre => {
      if (pre.parentElement?.classList.contains('code-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'code-wrap';
      pre.replaceWith(wrap);
      wrap.appendChild(pre);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(pre.textContent ?? '').then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => (btn.textContent = 'Copy'), 1500);
        }, () => { btn.textContent = 'Failed'; });
      });
      wrap.appendChild(btn);
    });
  }
  readonly source = input<string | null | undefined>('');
  readonly html = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.source())));
}
