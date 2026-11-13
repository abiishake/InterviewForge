import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ToastService } from './core/services/toast.service';
import { DialogHostComponent } from './shared/components/dialog-host.component';
import { IconComponent } from './shared/ui/icon.component';
import { CommandPaletteComponent, PaletteService } from './shared/ui/command-palette.component';

interface NavLink { label: string; path: string; exact?: boolean; }
interface NavGroup { title: string; icon: string; links: NavLink[]; }

/** Information architecture: Home, Plan, Practice, Library and Me (plus Admin for administrators). */
const GROUPS: NavGroup[] = [
  { title: 'Home', icon: 'home', links: [{ label: 'Dashboard', path: '/', exact: true }] },
  { title: 'Plan', icon: 'calendar', links: [{ label: 'Current plan', path: '/plan' }, { label: 'Progress', path: '/progress' }] },
  { title: 'Practice', icon: 'play', links: [{ label: 'Interview mode', path: '/interview' }, { label: 'Review queue', path: '/review' }] },
  { title: 'Library', icon: 'book', links: [
    { label: 'Sections', path: '/sections' }, { label: 'Topics', path: '/topics' }, { label: 'Search', path: '/search' },
    { label: 'Algorithms', path: '/algorithms' }, { label: 'My content', path: '/mine' }, { label: 'Add question', path: '/questions/new' }] },
  { title: 'Me', icon: 'user', links: [{ label: 'Notes', path: '/notes' }, { label: 'My feedback', path: '/feedback' }, { label: 'Account', path: '/account' }] }
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, DialogHostComponent, IconComponent, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="focusMain($event)">Skip to content</a>
    @if (showShell()) {
    <div class="shell" [class.nav-open]="navOpen()" [class.immersive]="immersive()" [class.notabs]="immersive() || questionPage()">
      <header class="topbar">
        @if (canGoBack()) { <button class="iconbtn" (click)="back()" aria-label="Back"><app-icon name="chevron-left" /></button> }
        @else { <button class="iconbtn" (click)="navOpen.set(!navOpen())" [attr.aria-expanded]="navOpen()" aria-controls="primary-nav" aria-label="Open menu"><app-icon name="menu" /></button> }
        <a routerLink="/" class="brand"><span class="mark">F</span><span>INTERVIEW<b>FORGE</b></span></a>
        <span class="spacer"></span>
        <button class="iconbtn" (click)="palette.open()" aria-label="Search"><app-icon name="search" /></button>
      </header>

      <nav class="rail" aria-label="Primary (compact)">
        <button class="iconbtn" (click)="navOpen.set(!navOpen())" [attr.aria-expanded]="navOpen()" aria-controls="primary-nav" aria-label="Expand menu"><app-icon name="menu" /></button>
        @for (g of groups; track g.title) {
          <a [routerLink]="g.links[0].path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: g.links[0].exact ?? false }" class="railink" [attr.aria-label]="g.title" [title]="g.title"><app-icon [name]="g.icon" /></a>
        }
        @if (auth.user()?.isAdmin) { <a routerLink="/admin" routerLinkActive="active" class="railink" aria-label="Administration" title="Administration"><app-icon name="shield" /></a> }
        <span class="spacer"></span>
        <button class="iconbtn" (click)="palette.open()" aria-label="Search"><app-icon name="search" /></button>
      </nav>

      @if (navOpen()) { <div class="backdrop" (click)="navOpen.set(false)" aria-hidden="true"></div> }
      <aside class="sidebar" id="primary-nav">
        <a routerLink="/" class="brand desktop-brand"><span class="mark">F</span><span>INTERVIEW<b>FORGE</b></span></a>
        @if (auth.user(); as account) {
        <div class="account-box">
          <a routerLink="/account" class="who"><span class="avatar" aria-hidden="true">{{ initials(account.displayName) }}</span><b>{{ account.displayName }}</b></a>
          <div class="row">
            <button class="btn sm" (click)="theme.toggle()" [attr.aria-label]="'Switch to ' + (theme.effective() === 'dark' ? 'light' : 'dark') + ' theme'"><app-icon [name]="theme.effective() === 'dark' ? 'sun' : 'moon'" [size]="16" /> {{ theme.effective() === 'dark' ? 'Light' : 'Dark' }}</button>
            <button class="btn sm ghost" (click)="signOut()">Sign out</button>
          </div>
        </div>
        <button class="searchbtn" (click)="palette.open()"><app-icon name="search" [size]="16" /> Search… <kbd>Ctrl K</kbd></button>
        <nav aria-label="Primary">
          @for (g of groups; track g.title) {
            <div class="group">
              @if (g.links.length > 1) { <div class="group-title">{{ g.title }}</div> }
              @for (l of g.links; track l.label) {
                <a [routerLink]="l.path" routerLinkActive="active" ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: l.exact ?? false }">{{ l.label }}</a>
              }
            </div>
          }
          @if (account.isAdmin) {
            <div class="group"><div class="group-title">Admin</div>
              <a routerLink="/admin/users" routerLinkActive="active" ariaCurrentWhenActive="page">Users</a>
              <a routerLink="/admin/feedback" routerLinkActive="active" ariaCurrentWhenActive="page">Feedback</a>
              <a routerLink="/admin/import" routerLinkActive="active" ariaCurrentWhenActive="page">Import</a>
              <a routerLink="/admin/settings" routerLinkActive="active" ariaCurrentWhenActive="page">Settings</a>
              <a routerLink="/admin/audit" routerLinkActive="active" ariaCurrentWhenActive="page">Audit log</a>
            </div>
          }
        </nav>
        }
      </aside>

      <main id="main" tabindex="-1"><router-outlet /></main>

      <nav class="tabbar" aria-label="Primary (mobile)">
        @for (g of tabs; track g.title) {
          <a [routerLink]="g.links[0].path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: g.links[0].exact ?? false }" [attr.aria-label]="g.title"><app-icon [name]="g.icon" /><span>{{ g.title }}</span></a>
        }
        <button type="button" (click)="navOpen.set(!navOpen())" [attr.aria-expanded]="navOpen()" aria-controls="primary-nav"><app-icon name="more" /><span>More</span></button>
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
    :host { --rail-w: 72px; --nav-w: 264px; --tab-h: 62px; }
    .shell { display: grid; grid-template-columns: var(--nav-w) minmax(0, 1fr); min-height: 100dvh; }
    .sidebar { position: sticky; top: 0; height: 100dvh; overflow-y: auto; background: var(--bg-elev); border-right: 1px solid var(--border); padding: 18px 14px 32px; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--text); font: 600 13px/1 var(--mono); letter-spacing: .14em; margin: 4px 6px 18px; }
    .brand:hover { text-decoration: none; }
    .brand b { color: var(--accent-text); font-weight: 700; }
    .mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; background: var(--accent); color: var(--accent-ink); font-weight: 800; letter-spacing: 0; }
    .account-box { margin: 0 4px 12px; display: flex; flex-direction: column; gap: 8px; }
    .who { display: flex; align-items: center; gap: 10px; color: var(--text); padding: 4px; border-radius: var(--radius-sm); }
    .who:hover { text-decoration: none; background: var(--bg-hover); }
    .searchbtn { display: flex; align-items: center; gap: 8px; width: calc(100% - 8px); margin: 0 4px 14px; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--bg); color: var(--text-muted); font: 14px var(--font); cursor: pointer; }
    .searchbtn kbd { margin-left: auto; font: 11px var(--mono); border: 1px solid var(--border-strong); border-radius: 4px; padding: 0 5px; }
    .group { margin-bottom: 12px; }
    .group-title { font: 600 10.5px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--text-dim); padding: 8px 10px 6px; }
    nav a { display: block; padding: 6px 10px; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 14px; }
    nav a:hover { color: var(--text); background: var(--bg-hover); text-decoration: none; }
    nav a.active { color: var(--text); background: var(--accent-soft); box-shadow: inset 2px 0 0 var(--accent); }
    main { min-width: 0; }
    main:focus { outline: none; }
    .iconbtn { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; background: transparent; color: var(--text); border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; }
    .iconbtn:hover { background: var(--bg-hover); }
    .topbar, .rail, .tabbar, .backdrop { display: none; }
    .toasts { position: fixed; right: 18px; bottom: 18px; display: flex; flex-direction: column; gap: 8px; z-index: 50; }
    .toast { background: var(--bg-card); border: 1px solid var(--border-strong); border-left: 3px solid var(--info); padding: 10px 14px; border-radius: var(--radius-sm); box-shadow: var(--shadow); max-width: 360px; font-size: 14px; display: flex; align-items: center; gap: 10px; }
    .toast-text { flex: 1; min-width: 0; }
    .toast-btn { background: none; border: 0; color: var(--accent-text); font: 600 13px var(--font); cursor: pointer; padding: 6px 4px; min-height: 32px; }
    .toast-close { background: none; border: 0; color: var(--text-muted); font: 20px/1 var(--font); cursor: pointer; padding: 4px 8px; min-width: 32px; min-height: 32px; border-radius: var(--radius-sm); }
    .toast-close:hover, .toast-btn:hover { background: var(--bg-hover); }
    .toast.error { border-left-color: var(--danger); } .toast.ok { border-left-color: var(--ok); }

    /* md: icon rail; the full sidebar becomes an overlay drawer */
    @media (max-width: 1023px) {
      .shell { grid-template-columns: var(--rail-w) minmax(0, 1fr); }
      .rail { display: flex; flex-direction: column; align-items: center; gap: 6px; position: sticky; top: 0; height: 100dvh; padding: 10px 0; background: var(--bg-elev); border-right: 1px solid var(--border); }
      .rail .spacer { flex: 1; }
      .railink { display: grid; place-items: center; width: 48px; height: 48px; border-radius: var(--radius-sm); color: var(--text-muted); }
      .railink:hover, .railink.active { background: var(--accent-soft); color: var(--text); text-decoration: none; }
      .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 41; width: min(84vw, 300px); transform: translateX(-100%); visibility: hidden; transition: transform .2s, visibility .2s; }
      .nav-open .sidebar { transform: none; visibility: visible; box-shadow: var(--shadow); }
      .backdrop { display: block; position: fixed; inset: 0; z-index: 40; background: rgb(0 0 0 / .45); }
      .desktop-brand { display: flex; }
    }
    /* xs/sm: top bar + bottom tab bar */
    @media (max-width: 767px) {
      .shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr; padding-bottom: calc(var(--tab-h) + var(--safe-bottom)); }
      .shell.notabs { padding-bottom: 0; }
      .rail { display: none; }
      .topbar { display: flex; align-items: center; gap: 4px; position: sticky; top: 0; z-index: 30; height: calc(52px + var(--safe-top)); padding: var(--safe-top) 6px 0; background: var(--bg-elev); border-bottom: 1px solid var(--border); }
      .topbar .brand { margin: 0 0 0 4px; } .topbar .spacer { flex: 1; }
      .shell.immersive .topbar { display: none; }
      .tabbar { display: flex; position: fixed; inset: auto 0 0 0; z-index: 35; height: calc(var(--tab-h) + var(--safe-bottom)); padding-bottom: var(--safe-bottom); background: var(--bg-elev); border-top: 1px solid var(--border); }
      .shell.notabs .tabbar { display: none; }
      .tabbar a, .tabbar button { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 6px 0; border: 0; background: transparent; color: var(--text-muted); font: 500 11px var(--font); cursor: pointer; border-radius: 0; }
      .tabbar a.active { color: var(--accent-text); box-shadow: inset 0 2px 0 var(--accent); background: transparent; }
      .sidebar { top: 0; bottom: 0; }
      .desktop-brand { display: none; }
      .toasts { left: 12px; right: 12px; }
      .toasts.above-tabs { bottom: calc(var(--tab-h) + var(--safe-bottom) + 10px); }
      .toast { max-width: none; }
    }
  `]
})
export class AppComponent {
  readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly palette = inject(PaletteService);
  private router = inject(Router);
  private location = inject(Location);
  readonly navOpen = signal(false);
  private readonly url = signal(this.router.url);
  readonly groups = GROUPS;
  readonly tabs = GROUPS.filter(g => g.title !== 'Me');
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

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.navOpen.set(false);
      this.url.set((e as NavigationEnd).urlAfterRedirects);
      queueMicrotask(() => document.getElementById('main')?.focus({ preventScroll: true }));
    });
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
