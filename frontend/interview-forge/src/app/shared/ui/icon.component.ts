import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Single-colour inline icons (24x24, stroke = currentColor). Decorative unless a label is supplied. */
const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  play: 'M7 4l13 8-13 8z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  check: 'M5 12l5 5 9-10',
  refresh: 'M20 11a8 8 0 00-14-4M4 4v4h4M4 13a8 8 0 0014 4M20 20v-4h-4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 4a3.5 3.5 0 010 7M18 14a7 7 0 013 6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.3-1.3L14 3h-4l-.3 2.5a7 7 0 00-2.3 1.3l-2.3-1-2 3.4 2 1.5a7 7 0 000 2.6l-2 1.5 2 3.4 2.3-1a7 7 0 002.3 1.3L10 21h4l.3-2.5a7 7 0 002.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  key: 'M14 10a4 4 0 11-3.5 6L3 16v-3l3-1v-2l2-1 2.5 2.5A4 4 0 0114 10z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5',
  chart: 'M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9',
  code: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  more: 'M5 12h.5M12 12h.5M19 12h.5',
  note: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  folder: 'M3 6h6l2 2h10v11H3z',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  grid: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  hash: 'M5 9h15M4 15h15M10 4L8 20M16 4l-2 16',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  history: 'M3 12a9 9 0 103-6.7M3 4v5h5M12 8v4l3 2',
  upload: 'M12 16V4M7 9l5-5 5 5M4 17v3h16v-3',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  sidebar: 'M4 4h16v16H4zM9 4v16',
  'plus-square': 'M4 4h16v16H4zM12 8v8M8 12h8',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'external': 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      [attr.width]="size()" [attr.height]="size()" [attr.aria-hidden]="label() ? null : 'true'" [attr.role]="label() ? 'img' : null" [attr.aria-label]="label() || null" focusable="false">
      <path [attr.d]="path()" /></svg>`,
  styles: [`:host { display: inline-flex; vertical-align: middle; flex: none; }`]
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly label = input('');
  readonly path = computed(() => PATHS[this.name()] ?? PATHS['more']);
}
