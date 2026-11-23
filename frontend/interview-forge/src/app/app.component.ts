import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ToastService } from './core/services/toast.service';
import { DialogHostComponent } from './shared/components/dialog-host.component';
import { IconComponent } from './shared/ui/icon.component';
import { MenuComponent, MenuItem } from './shared/ui/menu.component';
import { CommandPaletteComponent, PaletteService } from './shared/ui/command-palette.component';

interface NavLink { label: string; path: string; icon: string; exact?: boolean; }
interface NavGroup { title: string; icon: string; links: NavLink[]; }

/** Information architecture: Home, Plan, Practice, Library and Me (plus Admin for administrators). */
const GROUPS: NavGroup[] = [
  { title: 'Home', icon: 'grid', links: [{ label: 'Dashboard', path: '/', icon: 'grid', exact: true }] },
  { title: 'Plan', icon: 'calendar', links: [{ label: 'Current plan', path: '/plan', icon: 'calendar' }, { label: 'Progress', path: '/progress', icon: 'chart' }] },
  { title: 'Practice', icon: 'play', links: [{ label: 'Interview mode', path: '/interview', icon: 'play' }, { label: 'Review queue', path: '/review', icon: 'refresh' }] },
  { title: 'Library', icon: 'book', links: [
    { label: 'Sections', path: '/sections', icon: 'layers' }, { label: 'Topics', path: '/topics', icon: 'hash' }, { label: 'Search', path: '/search', icon: 'search' },
    { label: 'Algorithms', path: '/algorithms', icon: 'code' }, { label: 'My content', path: '/mine', icon: 'folder' }, { label: 'Add question', path: '/questions/new', icon: 'plus-square' }] },
  { title: 'Me', icon: 'user', links: [{ label: 'Notes', path: '/notes', icon: 'note' }, { label: 'My feedback', path: '/feedback', icon: 'inbox' }, { label: 'Account', path: '/account', icon: 'user' }] }
];
const ADMIN: NavLink[] = [
  { label: 'Users', path: '/admin/users', icon: 'users' }, { label: 'Feedback', path: '/admin/feedback', icon: 'inbox' },
  { label: 'Import', path: '/admin/import', icon: 'upload' }, { label: 'Settings', path: '/admin/settings', icon: 'settings' },
  { label: 'Audit log', path: '/admin/audit', icon: 'history' }
];
const COLLAPSE_KEY = 'if-nav-collapsed';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DialogHostComponent, IconComponent, MenuComponent, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="focusMain($event)">Skip to content</a>
    <div class="navbar-progress" [class.active]="navigating()" [class.done]="navDone()" aria-hidden="true"><span></span></div>
    @if (showShell()) {
    <div class="shell" [class.nav-open]="navOpen()" [class.mini]="mini()" [class.immersive]="immersive()" [class.notabs]="immersive() || questionPage()">
      <aside class="sidebar" id="primary-nav" [class.mini]="mini()" aria-label="Primary navigation">
        <div class="side-top">
          <a routerLink="/" class="brand" aria-label="InterviewForge home"><span class="mark" aria-hidden="true">F</span><span class="lbl">Interview<b>Forge</b></span></a>
          <button type="button" class="iconbtn collapse" (click)="toggleCollapsed()" [attr.aria-label]="mini() ? 'Expand sidebar' : 'Collapse sidebar'" [attr.aria-pressed]="collapsed()"><app-icon name="sidebar" [size]="18" /></button>
        </div>
        <nav class="side-nav" aria-label="Primary">
          @for (g of groups; track g.title) {
            @if (g.title !== 'Home') { <div class="group-title"><span class="lbl">{{ g.title }}</span></div> }
            @for (l of g.links; track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: l.exact ?? false }" [attr.title]="mini() ? l.label : null">
                <app-icon [name]="l.icon" [size]="18" /><span class="lbl">{{ l.label }}</span>
                @if (l.path === '/review' && reviewDue() > 0) { <span class="count" [attr.aria-label]="reviewDue() + ' due'">{{ reviewDue() }}</span> }
              </a>
            }
          }
          @if (auth.user()?.isAdmin) {
            <div class="group-title"><span class="lbl">Admin</span></div>
            @for (l of admin; track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" ariaCurrentWhenActive="page" [attr.title]="mini() ? l.label : null"><app-icon [name]="l.icon" [size]="18" /><span class="lbl">{{ l.label }}</span></a>
            }
          }
        </nav>
        @if (auth.user(); as account) {
          <a routerLink="/account" class="side-foot" [attr.title]="mini() ? account.displayName : null">
            <span class="avatar" aria-hidden="true">{{ initials(account.displayName) }}</span>
            <span class="lbl who"><b>{{ account.displayName }}</b><small>{{ account.isAdmin ? 'Administrator' : 'Member' }}</small></span>
          </a>
        }
      </aside>
      <div class="backdrop" (click)="navOpen.set(false)" aria-hidden="true"></div>

      <div class="body">
        <header class="topbar">
          @if (phone() && canGoBack()) { <button type="button" class="iconbtn" (click)="back()" aria-label="Back"><app-icon name="chevron-left" /></button> }
          @else { <button type="button" class="iconbtn menu-btn" (click)="navOpen.set(!navOpen())" [attr.aria-expanded]="navOpen()" aria-controls="primary-nav" aria-label="Open menu"><app-icon name="menu" /></button> }
          <div class="crumb" aria-hidden="true">
            @if (section()) { <span class="sec">{{ section() }}</span><span class="sep">/</span> }
            <span class="cur">{{ pageTitle() }}</span>
          </div>
          <span class="spacer"></span>
          <button type="button" class="searchbtn" (click)="palette.open()" aria-label="Search and commands"><app-icon name="search" [size]="16" /><span class="lbl">Search…</span><kbd>Ctrl K</kbd></button>
          <button type="button" class="iconbtn" (click)="theme.toggle()" [attr.aria-label]="'Switch to ' + (theme.effective() === 'dark' ? 'light' : 'dark') + ' theme'"><app-icon [name]="theme.effective() === 'dark' ? 'sun' : 'moon'" [size]="18" /></button>
          @if (auth.user(); as account) { <app-menu class="acct" [label]="initials(account.displayName)" [items]="accountMenu" /> }
        </header>
        <main id="main" tabindex="-1"><router-outlet /></main>
      </div>

      <nav class="tabbar" aria-label="Primary (mobile)">
        @for (g of tabs; track g.title) {
          <a [routerLink]="g.links[0].path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: g.links[0].exact ?? false }" [attr.aria-label]="g.title">
            <span class="ti"><app-icon [name]="g.icon" />@if (g.title === 'Practice' && reviewDue() > 0) { <span class="dot" aria-hidden="true"></span> }</span><span>{{ g.title }}</span></a>
        }
        <button type="button" (click)="navOpen.set(!navOpen())" [attr.aria-expanded]="navOpen()" aria-controls="primary-nav"><span class="ti"><app-icon name="more" /></span><span>More</span></button>
      </nav>
    </div>
    } @else {
      <main id="main" tabindex="-1"><router-outlet /></main>
    }
    <app-command-palette />
    <app-dialog-host />
    <div class="toasts" aria-live="polite" [class.above-tabs]="showShell() && !immersive() && !questionPage()">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.kind" [attr.role]="t.kind === 'error' ? 'alert' : 'status'"
             (keydown.escape)="toast.dismiss(t.id)" (mouseenter)="toast.pause(t.id)" (mouseleave)="toast.resume(t.id)" (focusin)="toast.pause(t.id)" (focusout)="toast.resume(t.id)">
          <span class="toast-text">{{ t.text }}</span>
          @if (t.action; as act) { <button type="button" class="toast-btn" (click)="toast.runAction(t.id)">{{ act.label }}</button> }
          <button type="button" class="toast-close" aria-label="Dismiss notification" (click)="toast.dismiss(t.id)">×</button>
        </div>
      }
    </div>`,
  styles: [`
    :host { --side-w: 236px; --mini-w: 64px; --top-h: 56px; --tab-h: 62px; }
    .shell { display: grid; grid-template-columns: var(--side-w) minmax(0, 1fr); min-height: 100dvh; }
    .shell.mini { grid-template-columns: var(--mini-w) minmax(0, 1fr); }
    .body { grid-column: 2; min-width: 0; display: flex; flex-direction: column; }
    main { min-width: 0; flex: 1; view-transition-name: if-main; }
    main:focus { outline: none; }

    /* ---- sidebar ---- */
    .sidebar { grid-column: 1; grid-row: 1; position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column; background: var(--bg-elev); border-right: 1px solid var(--border);
      overflow: hidden; overscroll-behavior: contain; width: var(--side-w); transition: width .22s var(--ease-out); }
    .sidebar.mini { width: var(--mini-w); }
    .side-top { display: flex; align-items: center; gap: 4px; height: var(--top-h); padding: 0 10px 0 14px; border-bottom: 1px solid var(--border); flex: none; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--text); font: 600 14px/1 var(--font); letter-spacing: -.01em; flex: 1; min-width: 0; }
    .brand:hover { text-decoration: none; }
    .brand b { color: var(--accent-text); font-weight: 700; }
    .mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: var(--accent); color: var(--accent-ink); font: 800 14px/1 var(--font); flex: none; }
    .side-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px 10px 12px; scrollbar-width: thin; }
    .group-title { font: 600 10px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--text-dim); padding: 16px 10px 6px; height: 34px; white-space: nowrap; }
    .side-nav a { position: relative; display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 10px; margin: 1px 0; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 13.5px; white-space: nowrap;
      transition: background var(--dur-1), color var(--dur-1); }
    .side-nav a:hover { color: var(--text); background: var(--bg-hover); text-decoration: none; }
    .side-nav a.active { color: var(--text); background: var(--bg-active); font-weight: 500; }
    .side-nav a.active::before { content: ""; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent); }
    .side-nav a.active app-icon { color: var(--accent-text); }
    .side-nav .count { margin-left: auto; }
    .side-foot { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--border); color: var(--text); flex: none; min-height: 58px; }
    .side-foot:hover { background: var(--bg-hover); text-decoration: none; }
    .who { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
    .who b { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
    .who small { color: var(--text-dim); font-size: 11.5px; }
    .lbl { transition: opacity .15s; }
    /* collapsed rail: labels hide, icons centre */
    .sidebar.mini .lbl { opacity: 0; pointer-events: none; width: 0; overflow: hidden; }
    .sidebar.mini .side-top { flex-direction: column; justify-content: center; height: auto; padding: 10px 0; gap: 8px; }
    .sidebar.mini .brand { flex: none; }
    .sidebar.mini .group-title { padding: 10px 0 4px; height: 20px; }
    .sidebar.mini .group-title::after { content: ""; display: block; height: 1px; background: var(--border); margin: 0 8px; }
    .sidebar.mini .side-nav a { justify-content: center; padding: 0; gap: 0; height: 40px; }
    .sidebar.mini .side-nav .count { position: absolute; top: 3px; right: 6px; min-width: 16px; height: 16px; font-size: 9.5px; padding: 0 4px; }
    .sidebar.mini .side-foot { justify-content: center; padding: 10px 0; gap: 0; }

    /* ---- top bar ---- */
    .topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 6px; height: calc(var(--top-h) + var(--safe-top)); padding: var(--safe-top) var(--gutter) 0;
      background: color-mix(in srgb, var(--bg) 85%, transparent); border-bottom: 1px solid var(--border); backdrop-filter: saturate(1.5) blur(12px); -webkit-backdrop-filter: saturate(1.5) blur(12px); }
    .menu-btn { display: none; margin-left: -8px; }
    .crumb { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13.5px; white-space: nowrap; }
    .crumb .sec { color: var(--text-dim); }
    .crumb .sep { color: var(--border-strong); }
    .crumb .cur { color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
    .spacer { flex: 1; }
    .searchbtn { display: flex; align-items: center; gap: 8px; width: 260px; height: 34px; padding: 0 8px 0 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-elev); color: var(--text-dim); font: 13px var(--font); cursor: pointer; transition: border-color var(--dur-1); }
    .searchbtn:hover { border-color: var(--text-dim); color: var(--text-muted); }
    .searchbtn kbd { margin-left: auto; }
    .iconbtn { display: inline-grid; place-items: center; min-width: 36px; min-height: 36px; background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; transition: background var(--dur-1), color var(--dur-1); }
    .iconbtn:hover { background: var(--bg-hover); color: var(--text); }
    .acct { margin-left: 2px; }
    .backdrop, .tabbar { display: none; }

    /* md (tablet): the sidebar is a rail; the menu button opens it full width as an overlay drawer */
    @media (max-width: 1023px) {
      .shell, .shell.mini { grid-template-columns: var(--mini-w) minmax(0, 1fr); }
      .collapse { display: none; }
      .menu-btn { display: inline-grid; }
      .shell.nav-open .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 41; width: min(84vw, 280px); box-shadow: var(--shadow); }
      .backdrop { display: block; position: fixed; inset: 0; z-index: 40; background: rgb(0 0 0 / .45); opacity: 0; pointer-events: none; transition: opacity .28s var(--ease-out); }
      .nav-open .backdrop { opacity: 1; pointer-events: auto; }
      .searchbtn { width: 200px; }
    }
    /* xs/sm (phone): top bar + bottom tab bar; the sidebar is an off-canvas drawer */
    @media (max-width: 767px) {
      .shell, .shell.mini { grid-template-columns: minmax(0, 1fr); padding-bottom: calc(var(--tab-h) + var(--safe-bottom)); }
      .shell.notabs { padding-bottom: 0; }
      .body { grid-column: 1; }
      .sidebar, .shell.nav-open .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 41; width: min(84vw, 300px); transform: translateX(-100%); visibility: hidden;
        transition: transform .28s var(--ease-out), visibility 0s .28s; }
      .shell.nav-open .sidebar { transform: none; visibility: visible; transition: transform .28s var(--ease-out), visibility 0s; }
      .topbar { padding: var(--safe-top) 6px 0 6px; height: calc(52px + var(--safe-top)); background: color-mix(in srgb, var(--bg-elev) 85%, transparent); }
      .menu-btn { margin-left: 0; }
      .menu-btn, .topbar > .iconbtn { min-width: 44px; min-height: 44px; }
      .crumb .sec, .crumb .sep { display: none; }
      .crumb .cur { font-size: 15px; }
      .searchbtn { width: 44px; height: 44px; padding: 0; justify-content: center; border-color: transparent; background: transparent; color: var(--text-muted); }
      .searchbtn .lbl, .searchbtn kbd { display: none; }
      .shell.immersive .topbar { display: none; }
      .tabbar { display: flex; position: fixed; inset: auto 0 0 0; z-index: 35; height: calc(var(--tab-h) + var(--safe-bottom)); padding-bottom: var(--safe-bottom);
        background: color-mix(in srgb, var(--bg-elev) 85%, transparent); border-top: 1px solid var(--border); backdrop-filter: saturate(1.6) blur(14px); -webkit-backdrop-filter: saturate(1.6) blur(14px); }
      .shell.notabs .tabbar { display: none; }
      .tabbar a, .tabbar button { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px 0; border: 0; background: transparent; color: var(--text-dim); font: 500 11px var(--font); cursor: pointer; }
      .tabbar a:hover { text-decoration: none; }
      .tabbar .ti { position: relative; display: grid; place-items: center; width: 52px; height: 28px; border-radius: 14px; transition: background var(--dur-2) var(--ease-out), transform var(--dur-1) var(--ease-out); }
      .tabbar a:active .ti, .tabbar button:active .ti { transform: scale(.9); }
      .tabbar a.active { color: var(--text); }
      .tabbar a.active .ti { background: var(--accent-soft); color: var(--accent-text); }
      .tabbar .dot { position: absolute; top: 3px; right: 12px; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--bg-elev); }
    }
    @media (prefers-reduced-motion: reduce) { .sidebar, .lbl { transition: none; } }
  `]
})
export class AppComponent {
  readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly palette = inject(PaletteService);
  private api = inject(ApiService);
  private router = inject(Router);
  private location = inject(Location);
  private title = inject(Title);
  readonly navOpen = signal(false);
  private readonly url = signal(this.router.url);
  readonly groups = GROUPS;
  readonly admin = ADMIN;
  readonly tabs = GROUPS.filter(g => g.title !== 'Me');

  /** User preference: keep the desktop sidebar collapsed to an icon rail. */
  readonly collapsed = signal(readCollapsed());
  /** Viewport classes, kept in sync with matchMedia so the template can switch behaviour, not just styles. */
  readonly tablet = signal(false);
  readonly phone = signal(false);
  /** The sidebar renders as an icon rail: by preference on desktop, always on tablets unless the drawer is open. */
  readonly mini = computed(() => !this.phone() && !this.navOpen() && (this.collapsed() || this.tablet()));

  readonly pageTitle = signal('');
  /** Top-bar breadcrumb: the navigation group that owns the current page. */
  readonly section = computed(() => {
    const path = this.url().split('?')[0];
    if (path.startsWith('/admin')) return 'Admin';
    let best: { g: string; len: number } | null = null;
    for (const g of GROUPS) for (const l of g.links) {
      if (l.path === '/' ? path === '/' : path === l.path || path.startsWith(l.path + '/')) {
        if (!best || l.path.length > best.len) best = { g: g.title, len: l.path.length };
      }
    }
    if (!best && /^\/questions\//.test(path)) return 'Library';
    return best && best.g !== 'Home' ? best.g : '';
  });

  /** Due-now review count shown as a badge on the Review link; refreshed at most once a minute on navigation. */
  readonly reviewDue = signal(0);
  private reviewFetchedAt = 0;

  /** Sign-in and first-run password change pages render without the application shell. */
  readonly showShell = computed(() => !this.url().startsWith('/auth') && !!this.auth.user());
  /** Full-screen focus views hide the tab bar (interview) or replace it with their own action bar (question). */
  readonly immersive = computed(() => /^\/interview(\?|$)/.test(this.url()));
  readonly questionPage = computed(() => /^\/questions\/\d+(\?|$)/.test(this.url()));
  readonly canGoBack = computed(() => {
    const path = this.url().split('?')[0];
    if (/^\/admin\/[^/]+$/.test(path)) return false;
    return path.split('/').filter(Boolean).length >= 2;
  });

  readonly accountMenu: MenuItem[] = [
    { label: 'Account', run: () => this.router.navigate(['/account']) },
    { label: 'My feedback', run: () => this.router.navigate(['/feedback']) },
    { label: 'Notes', run: () => this.router.navigate(['/notes']) },
    { label: 'Sign out', danger: true, run: () => void this.signOut() }
  ];

  /** True while a navigation is in flight; drives the top progress bar. */
  readonly navigating = signal(false);
  /** Briefly true after a navigation settles so the bar can finish its sweep before fading. */
  readonly navDone = signal(false);
  private doneTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroy = inject(DestroyRef);
    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        clearTimeout(this.doneTimer);
        this.navDone.set(false);
        this.navigating.set(true);
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        this.navigating.set(false);
        this.navDone.set(true);
        this.doneTimer = setTimeout(() => this.navDone.set(false), 350);
      }
      if (e instanceof NavigationEnd) {
        this.navOpen.set(false);
        this.url.set(e.urlAfterRedirects);
        // the router's TitleStrategy runs during this tick; read it afterwards
        setTimeout(() => this.pageTitle.set(this.title.getTitle().replace(/\s*·\s*InterviewForge$/, '').replace(/^InterviewForge.*$/, 'Dashboard')));
        queueMicrotask(() => document.getElementById('main')?.focus({ preventScroll: true }));
        this.refreshReviewDue();
      }
    });
    // Lock page scroll behind the open navigation drawer so swipes don't scroll the content underneath.
    effect(() => document.documentElement.classList.toggle('nav-locked', this.navOpen()));

    if (typeof matchMedia === 'function') {
      const tq = matchMedia('(max-width: 1023px) and (min-width: 768px)');
      const pq = matchMedia('(max-width: 767px)');
      const sync = () => { this.tablet.set(tq.matches); this.phone.set(pq.matches); };
      sync();
      tq.addEventListener('change', sync); pq.addEventListener('change', sync);
      destroy.onDestroy(() => { tq.removeEventListener('change', sync); pq.removeEventListener('change', sync); });
    }
  }

  private refreshReviewDue(): void {
    if (!this.auth.user() || Date.now() - this.reviewFetchedAt < 60_000) return;
    this.reviewFetchedAt = Date.now();
    this.api.reviewOverview(true).subscribe({ next: r => this.reviewDue.set(r.dueNow), error: () => { this.reviewFetchedAt = 0; } });
  }

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
    try { localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? '1' : '0'); } catch { /* storage unavailable: lasts for this page only */ }
  }

  @HostListener('document:keydown.escape')
  closeNav(): void { this.navOpen.set(false); }

  @HostListener('document:keydown', ['$event'])
  paletteKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && this.auth.user()) { e.preventDefault(); this.palette.open(); }
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';
  }

  back(): void { this.location.back(); }

  focusMain(e: Event): void {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }

  async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/auth'], { replaceUrl: true });
  }
}

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}
