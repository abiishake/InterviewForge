import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';

interface NavGroup { title: string; links: { label: string; path: string; exact?: boolean; query?: Record<string, string> }[]; }

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="sidebar">
        <a routerLink="/" class="brand"><span class="mark">F</span><span>INTERVIEW<b>FORGE</b></span></a>
        @if(auth.user(); as account) {
        <div class="group"><b>{{account.displayName}}</b><button class="btn sm ghost" (click)="signOut()">Sign out</button></div>
        <form class="quick-search" (ngSubmit)="search()">
          <input type="search" name="q" [(ngModel)]="query" placeholder="Search topics & questions…" aria-label="Search" />
        </form>
        <nav>
          @for (g of nav; track g.title) {
            <div class="group">
              <div class="group-title">{{ g.title }}</div>
              @for (l of g.links; track l.label) {
                @if(l.path !== '/settings' || account.isAdmin) {
                <a [routerLink]="l.path" [queryParams]="l.query ?? {}" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: l.exact ?? false }">{{ l.label }}</a>
                }
              }
            </div>
          }
        <a routerLink="/feedback">My feedback</a>
          @if(account.isAdmin){<a routerLink="/admin">Administration</a>}
        </nav>
        }
      </aside>
      <button class="menu" (click)="navOpen.set(!navOpen())" aria-label="Toggle navigation">☰</button>
      <main><router-outlet /></main>
    </div>
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.kind" (click)="toast.dismiss(t.id)">{{ t.text }}</div>
      }
    </div>`,
  styles: [`
    .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
    .sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: var(--bg-elev); border-right: 1px solid var(--border); padding: 18px 14px 32px; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--text); font: 600 13px/1 var(--mono); letter-spacing: .14em; margin: 4px 6px 18px; }
    .brand:hover { text-decoration: none; }
    .brand b { color: var(--accent); font-weight: 700; }
    .mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; background: var(--accent); color: var(--accent-ink); font-weight: 800; letter-spacing: 0; }
    .quick-search { margin: 0 4px 16px; }
    .quick-search input { font-size: 13px; padding: 7px 10px; }
    .group { margin-bottom: 14px; }
    .group-title { font: 600 10.5px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--text-dim); padding: 8px 10px 6px; }
    nav a { display: block; padding: 5px 10px; border-radius: var(--radius-sm); color: var(--text-muted); font-size: 14px; }
    nav a:hover { color: var(--text); background: var(--bg-hover); text-decoration: none; }
    nav a.active { color: var(--text); background: var(--accent-soft); box-shadow: inset 2px 0 0 var(--accent); }
    main { min-width: 0; }
    .menu { display: none; }
    .toasts { position: fixed; right: 18px; bottom: 18px; display: flex; flex-direction: column; gap: 8px; z-index: 50; }
    .toast { background: var(--bg-card); border: 1px solid var(--border-strong); border-left: 3px solid var(--info); padding: 10px 14px; border-radius: var(--radius-sm); box-shadow: var(--shadow); max-width: 360px; cursor: pointer; font-size: 14px; }
    .toast.error { border-left-color: var(--danger); } .toast.ok { border-left-color: var(--ok); }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { position: fixed; z-index: 40; width: 260px; transform: translateX(-100%); transition: transform .2s; }
      .nav-open .sidebar { transform: none; box-shadow: var(--shadow); }
      .menu { display: block; position: fixed; top: 10px; right: 10px; z-index: 45; background: var(--bg-card); color: var(--text); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 6px 10px; font-size: 18px; }
    }
  `]
})
export class AppComponent {
  readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  async signOut(){await this.auth.logout();await this.router.navigate(['/auth'],{replaceUrl:true});}
  private router = inject(Router);
  readonly navOpen = signal(false);
  query = '';

  readonly nav: NavGroup[] = [
    { title: 'Overview', links: [{ label: 'Dashboard', path: '/', exact: true }] },
    { title: 'Preparation', links: [
      { label: 'Current plan', path: '/plan', exact: true }, { label: 'Interview mode', path: '/interview' }, { label: 'Progress', path: '/progress' }] },
    { title: 'Knowledge base', links: [
      { label: 'Sections', path: '/sections' }, { label: 'Topics', path: '/topics' }, { label: 'Search', path: '/search' }] },
    { title: 'Algorithms', links: [{ label: 'Algorithms & data structures', path: '/algorithms' }] },
    { title: 'Review', links: [
      { label: 'Review queue', path: '/review', exact: true }, { label: 'Notes', path: '/notes' }] },
    { title: 'My content', links: [
      { label: 'My questions & sections', path: '/mine' }, { label: 'Add question', path: '/questions/new' }] },
    { title: 'System', links: [{ label: 'Settings', path: '/settings' }] }
  ];

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.navOpen.set(false));
  }

  search(): void {
    const q = this.query.trim();
    if (q) this.router.navigate(['/search'], { queryParams: { q } });
  }
}
