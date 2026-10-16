import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
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
    const src = node.getAttribute('src') ?? '';
    if (!/^https:/i.test(src)) node.removeAttribute('src');
    node.setAttribute('loading', 'lazy');
    node.setAttribute('referrerpolicy', 'no-referrer');
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
  readonly source = input<string | null | undefined>('');
  readonly html = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(this.source())));
}
