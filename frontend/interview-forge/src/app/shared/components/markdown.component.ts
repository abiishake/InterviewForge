import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { Marked } from 'marked';

import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import yaml from 'highlight.js/lib/languages/yaml';
import markdownLang from 'highlight.js/lib/languages/markdown';

const LANGS: Record<string, any> = { csharp, javascript, typescript, sql, xml, css, json, bash, powershell, python, java, cpp, yaml, markdown: markdownLang };
for (const [name, def] of Object.entries(LANGS)) hljs.registerLanguage(name, def);
hljs.registerAliases(['cs', 'c#', 'dotnet'], { languageName: 'csharp' });
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'xhtml', 'cshtml', 'razor', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['ps', 'ps1'], { languageName: 'powershell' });
hljs.registerAliases(['tsql', 'mysql', 'pgsql', 'postgres'], { languageName: 'sql' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['c', 'c++', 'h', 'hpp'], { languageName: 'cpp' });
hljs.registerAliases(['md'], { languageName: 'markdown' });

const marked = new Marked({ gfm: true, breaks: false });

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Syntax-highlight fenced code. Output is still passed through DOMPurify (only <span class="hljs-*"> is added).
marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
      let body: string;
      let cls = '';
      try {
        if (language && hljs.getLanguage(language)) {
          body = hljs.highlight(text, { language, ignoreIllegals: true }).value;
          cls = ` class="hljs language-${escapeHtml(language)}"`;
        } else {
          body = hljs.highlightAuto(text).value;
          cls = ' class="hljs"';
        }
      } catch {
        body = escapeHtml(text);
      }
      return `<pre><code${cls}>${body}\n</code></pre>\n`;
    }
  }
});

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
