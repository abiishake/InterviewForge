import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

/** KPI tile: small mono label, a large number, an optional "/ total" and a one-line footnote. Optionally a link. */
@Component({
  selector: 'app-stat-tile',
  imports: [NgTemplateOutlet, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (link(); as l) {
      <a class="tile link" [routerLink]="l"><ng-container [ngTemplateOutlet]="body" /></a>
    } @else {
      <div class="tile"><ng-container [ngTemplateOutlet]="body" /></div>
    }
    <ng-template #body>
      <div class="top"><span class="lbl">{{ label() }}</span>@if (icon()) { <app-icon [name]="icon()" [size]="15" /> }</div>
      <div class="val" [class.tone-warn]="tone() === 'warn'" [class.tone-ok]="tone() === 'ok'" [class.tone-ready]="tone() === 'ready'">
        {{ value() }}@if (total() !== null) { <span class="tot">/{{ total() }}</span> }@if (unit()) { <span class="tot">{{ unit() }}</span> }
      </div>
      @if (sub()) { <div class="sub">{{ sub() }}</div> }
    </ng-template>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .tile { display: block; height: 100%; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; color: inherit; }
    .tile.link { transition: border-color var(--dur-1), background var(--dur-1); }
    .tile.link:hover { border-color: var(--border-strong); background: var(--bg-hover); text-decoration: none; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-dim); }
    .lbl { font: 600 10.5px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
    .val { font: 600 1.5rem/1.15 var(--mono); margin-top: 10px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .tot { font-size: .62em; color: var(--text-dim); font-weight: 500; margin-left: 2px; }
    .tone-warn { color: var(--warn); } .tone-ok { color: var(--ok); } .tone-ready { color: var(--ready); }
    .sub { margin-top: 4px; font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `]
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly total = input<string | number | null>(null);
  readonly unit = input('');
  readonly sub = input('');
  readonly icon = input('');
  readonly link = input<string | null>(null);
  readonly tone = input<'' | 'warn' | 'ok' | 'ready'>('');
}
