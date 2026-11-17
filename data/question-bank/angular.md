# TOPIC --- Angular Components and Templates
**topic_id:** `ng-components`
**priority:** `Core`

## ng-components-001 --- What are standalone components, and how do signal inputs and outputs replace decorators?

**question_id:** `ng-components-001`\
**topic_id:** `ng-components`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

What are standalone components, and how do signal-based `input()`, `output()` and `model()` work?

**Answer**

Standalone components declare their own `imports` (other components, directives, pipes) and no longer need an `NgModule`, which simplifies lazy loading and tree shaking and is the default in current Angular. `input()` and `input.required()` expose inputs as read-only **signals**, `output()` replaces `@Output` with an `OutputEmitterRef`, and `model()` creates a two-way bindable signal (`[(value)]`). Signal inputs compose naturally with `computed()` and remove the need for `ngOnChanges` in most cases. Keep components presentational where possible (data in through inputs, events out), and keep orchestration in a container.

Real-world example: a reusable claim status badge and a rating control.

```ts
import { ChangeDetectionStrategy, Component, computed, input, model, output } from "@angular/core";

type Status = "Draft" | "Submitted" | "Approved" | "Rejected";

@Component({
  selector: "app-claim-badge",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="cssClass()">{{ label() }}</span>`,
})
export class ClaimBadgeComponent {
  status = input.required<Status>();
  compact = input(false);
  label = computed(() => (this.compact() ? this.status()[0] : this.status()));
  cssClass = computed(() => `badge--${this.status().toLowerCase()}`);
}

@Component({
  selector: "app-rating",
  standalone: true,
  template: `@for (n of [1,2,3,4,5]; track n) {
    <button type="button" (click)="select(n)" [attr.aria-pressed]="n <= value()">★</button>
  }`,
})
export class RatingComponent {
  value = model(0);               // usage: <app-rating [(value)]="score" />
  picked = output<number>();
  select(n: number) { this.value.set(n); this.picked.emit(n); }
}
```

**Keywords:**
`standalone component, signal input, input.required, output, model, two-way binding, OnPush`

**Follow-ups:**

-   How do you transform or alias an input with the new API?
-   How do you migrate a module-based app to standalone incrementally?

## ng-components-002 --- How does the built-in control flow (@if, @for, @switch) differ from *ngIf and *ngFor, and why does track matter?

**question_id:** `ng-components-002`\
**topic_id:** `ng-components`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How does the built-in control flow (`@if`, `@for`, `@switch`) differ from `*ngIf` and `*ngFor`, and why does `track` matter?

**Answer**

The built-in blocks are part of the template compiler, need no imports, support `@else`/`@empty` and are faster and smaller than the structural directives. `@for` **requires** a `track` expression, so Angular can reuse DOM nodes when the collection changes; tracking by a stable id (not by index or object identity of freshly created objects) prevents re-creating rows, losing focus and re-running animations. Contextual variables (`$index`, `$first`, `$last`, `$count`) are available. Use `@let` for template-local values.

Real-world example: a claims table with empty state and error state.

```ts
@Component({
  standalone: true,
  imports: [ClaimBadgeComponent, DatePipe],
  template: `
    @if (vm.loading()) {
      <app-skeleton rows="5" />
    } @else if (vm.error(); as error) {
      <p role="alert">{{ error }}</p>
    } @else {
      <table>
        @for (claim of vm.claims(); track claim.id; let i = $index) {
          <tr>
            <td>{{ i + 1 }}</td>
            <td>{{ claim.submittedAt | date: 'mediumDate' }}</td>
            <td><app-claim-badge [status]="claim.status" /></td>
          </tr>
        } @empty {
          <tr><td colspan="3">No claims yet.</td></tr>
        }
      </table>
    }
    @switch (vm.role()) {
      @case ('admin') { <app-admin-toolbar /> }
      @default { <app-readonly-hint /> }
    }`,
})
export class ClaimsTableComponent { vm = inject(ClaimsViewModel); }
```

**Keywords:**
`control flow, @if, @for, track, @empty, @switch, structural directive, DOM reuse`

**Follow-ups:**

-   What happens to the DOM if you `track $index` and the list is re-sorted?
-   How do you migrate existing `*ngIf`/`*ngFor` automatically?

## ng-components-003 --- How do content projection, template references and ViewChild/ContentChild work?

**question_id:** `ng-components-003`\
**topic_id:** `ng-components`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do content projection (`ng-content`), template references and `viewChild`/`contentChild` work?

**Answer**

Content projection lets a component render markup supplied by its parent, using `<ng-content>` with optional `select` slots, which keeps layout components (card, dialog, table shell) reusable. `ng-template` with `ngTemplateOutlet` lets the parent supply a **template** that the child renders with a context (a render-prop equivalent). Signal queries `viewChild()`, `viewChildren()`, `contentChild()` and `contentChildren()` return signals that resolve after view initialisation; use them sparingly and prefer inputs/outputs for communication.

Real-world example: a reusable card with header/footer slots and a customizable list row.

```ts
@Component({
  selector: "app-card",
  standalone: true,
  template: `
    <header><ng-content select="[card-title]" /></header>
    <section><ng-content /></section>
    <footer><ng-content select="[card-actions]" /></footer>`,
})
export class CardComponent {}

// usage
// <app-card>
//   <h3 card-title>Open claims</h3>
//   <app-claims-table />
//   <button card-actions (click)="export()">Export</button>
// </app-card>

@Component({
  selector: "app-list",
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `@for (item of items(); track item.id) {
    <ng-container *ngTemplateOutlet="rowTpl() ?? defaultRow; context: { $implicit: item }" />
  }
  <ng-template #defaultRow let-item>{{ item.id }}</ng-template>`,
})
export class ListComponent<T extends { id: string }> {
  items = input.required<T[]>();
  rowTpl = contentChild<TemplateRef<{ $implicit: T }>>("row");
}

@Component({ standalone: true, template: `<input #search />` })
export class SearchBoxComponent {
  private search = viewChild.required<ElementRef<HTMLInputElement>>("search");
  focus() { this.search().nativeElement.focus(); }
}
```

**Keywords:**
`ng-content, content projection, ngTemplateOutlet, viewChild, contentChild, template reference, slot`

**Follow-ups:**

-   What is the difference between `ViewChild` and `ContentChild` timing?
-   When is projection better than passing data through inputs?

## ng-components-004 --- Explain the Angular component lifecycle hooks and which ones you actually use.

**question_id:** `ng-components-004`\
**topic_id:** `ng-components`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Explain the Angular component lifecycle hooks and which ones you actually use.

**Answer**

Order: constructor, `ngOnChanges`, `ngOnInit`, `ngDoCheck`, `ngAfterContentInit`/`Checked`, `ngAfterViewInit`/`Checked`, `ngOnDestroy`. In current code: use the constructor (or field initialisers) for dependency injection and wiring signals/effects, `ngOnInit` for initial work that needs resolved inputs, `ngAfterViewInit` for DOM measurements and third-party widget setup, and `ngOnDestroy` (or `DestroyRef.onDestroy`) for cleanup. `afterNextRender` and `afterRender` run only in the browser, so they are the safe place for DOM code in SSR apps. Avoid heavy logic in `ngDoCheck`/`ngAfterViewChecked`, which run on every change detection pass.

Real-world example: initialising and destroying a third-party chart.

```ts
@Component({
  selector: "app-revenue-chart",
  standalone: true,
  template: `<canvas #canvas></canvas>`,
})
export class RevenueChartComponent {
  data = input.required<number[]>();
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private chart?: Chart;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {                                   // browser only, after the first render
      this.chart = new Chart(this.canvas().nativeElement, { type: "line", data: { datasets: [{ data: this.data() }] } });
    });
    effect(() => {                                            // react to input changes
      const d = this.data();
      if (this.chart) { this.chart.data.datasets[0].data = d; this.chart.update(); }
    });
    destroyRef.onDestroy(() => this.chart?.destroy());        // cleanup without implementing OnDestroy
  }
}
```

**Keywords:**
`lifecycle hooks, ngOnInit, ngOnChanges, ngAfterViewInit, ngOnDestroy, afterNextRender, DestroyRef, SSR`

**Follow-ups:**

-   Why shouldn't you access the DOM in the constructor or `ngOnInit` in an SSR app?
-   When does `ngOnChanges` fire and why is it rarely needed with signal inputs?

# TOPIC --- Angular Change Detection and Signals
**topic_id:** `ng-signals`
**priority:** `Core`

## ng-signals-001 --- How does Angular change detection work, and how do OnPush and signals improve performance?

**question_id:** `ng-signals-001`\
**topic_id:** `ng-signals`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How does Angular change detection work, and how do `OnPush` and signals improve performance?

**Answer**

By default Zone.js patches async APIs and triggers change detection from the root after each event, timer or XHR, checking every component's bindings (top-down, once per tick). With `ChangeDetectionStrategy.OnPush`, a component is checked only when an input reference changes, an event originates in it, an `async` pipe/observable emits through `markForCheck`, or a **signal read in its template** changes. Signals give fine-grained reactivity (the framework knows exactly which views depend on which values) and are the basis of zoneless change detection. Use immutable updates, OnPush everywhere and avoid calling functions that do real work from templates.

Real-world example: a rows list that was re-evaluating an expensive method on every tick, fixed with `computed`.

```ts
@Component({
  selector: "app-claims-summary",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Total: {{ total() | currency }}</p>
    <p>Approved: {{ approvedCount() }}</p>`,
})
export class ClaimsSummaryComponent {
  claims = input.required<Claim[]>();

  // BAD (default CD): getTotal() runs on every change detection pass
  // getTotal() { return this.claims().reduce((s, c) => s + c.amount, 0); }

  // GOOD: memoized, recomputed only when `claims` changes
  total = computed(() => this.claims().reduce((s, c) => s + c.amount, 0));
  approvedCount = computed(() => this.claims().filter(c => c.status === "Approved").length);
}

// main.ts: opt into zoneless change detection (no Zone.js)
// bootstrapApplication(AppComponent, { providers: [provideZonelessChangeDetection()] });
```

**Keywords:**
`change detection, OnPush, signals, computed, Zone.js, zoneless, immutability, markForCheck`

**Follow-ups:**

-   What triggers a check of an OnPush component?
-   Why is mutating an array passed to an OnPush child a bug?

## ng-signals-002 --- What are signal, computed, effect and linkedSignal, and when should you avoid effect?

**question_id:** `ng-signals-002`\
**topic_id:** `ng-signals`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What are `signal`, `computed`, `effect` and `linkedSignal`, and when should you avoid `effect`?

**Answer**

`signal()` holds writable state; `computed()` derives read-only, lazily evaluated and memoized values whose dependencies are tracked automatically; `effect()` runs side effects (logging, DOM, localStorage) when dependencies change. `linkedSignal()` is a writable signal that **resets** when a source signal changes (selected item that resets when the list changes). Prefer `computed` over `effect` for derived state; effects that set other signals cause cascades and are discouraged. Signals compare with `Object.is` by default, so mutate immutably (`update(v => [...v, x])`), and `untracked()` reads a signal without creating a dependency.

Real-world example: pagination state where changing the filter resets the page, plus persisting the filter.

```ts
@Injectable({ providedIn: "root" })
export class ClaimsFilterStore {
  readonly status = signal<Status | "all">("all");
  readonly search = signal("");

  // resets to page 1 whenever the filter changes, but the user can still change it freely
  readonly page = linkedSignal({ source: () => ({ s: this.status(), q: this.search() }), computation: () => 1 });

  readonly query = computed(() => ({ status: this.status(), q: this.search().trim(), page: this.page() }));

  constructor() {
    effect(() => {                                   // legitimate effect: side effect outside Angular state
      localStorage.setItem("claims.filter", JSON.stringify({ status: this.status(), q: this.search() }));
    });
  }
  nextPage() { this.page.update(p => p + 1); }
}
```

**Keywords:**
`signal, computed, effect, linkedSignal, untracked, derived state, reactivity`

**Follow-ups:**

-   Why is setting a signal inside an `effect` discouraged?
-   How do you convert between signals and observables (`toSignal`, `toObservable`)?

## ng-signals-003 --- How do you interoperate between RxJS and signals?

**question_id:** `ng-signals-003`\
**topic_id:** `ng-signals`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you interoperate between RxJS and signals using `toSignal`, `toObservable` and `rxResource`?

**Answer**

`toSignal(obs$, { initialValue })` subscribes (and unsubscribes on destroy) and exposes the latest value as a signal, ideal for templates. `toObservable(signal)` emits when a signal changes (asynchronously through an effect), so you can apply debounce and `switchMap`. Keep **streams for events over time** (debounce, cancellation, websockets) and **signals for current state**. `resource()`/`rxResource()` (experimental in some versions) model async data keyed by signal parameters with loading and error state.

Real-world example: debounced typeahead search driven by a signal and rendered as a signal.

```ts
@Component({
  selector: "app-claim-search",
  standalone: true,
  imports: [FormsModule],
  template: `
    <input [ngModel]="term()" (ngModelChange)="term.set($event)" placeholder="Search claims" />
    @if (loading()) { <span>Searching...</span> }
    <ul>@for (c of results(); track c.id) { <li>{{ c.id }} - {{ c.title }}</li> }</ul>`,
})
export class ClaimSearchComponent {
  private http = inject(HttpClient);
  term = signal("");
  loading = signal(false);

  results = toSignal(
    toObservable(this.term).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.loading.set(true)),
      switchMap(q => q.length < 2 ? of([]) :
        this.http.get<Claim[]>("/api/claims/search", { params: { q } }).pipe(catchError(() => of([])))),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as Claim[] },
  );
}
```

**Keywords:**
`toSignal, toObservable, rxjs interop, debounceTime, switchMap, resource, typeahead`

**Follow-ups:**

-   Why does `toSignal` need an injection context or an explicit injector?
-   When is a signal not a replacement for an observable?

## ng-signals-004 --- What is ExpressionChangedAfterItHasBeenChecked and how do you fix it?

**question_id:** `ng-signals-004`\
**topic_id:** `ng-signals`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Scenario`

**Question**

What is `ExpressionChangedAfterItHasBeenCheckedError` and how do you fix it?

**Answer**

In development mode Angular runs a second pass after each change detection and throws if a bound value is different from what it rendered. It means data flowed **backwards** during a pass: a child changed state that a parent already rendered (e.g. in `ngAfterViewInit`, a setter or a service updated while the parent template was evaluated). Fix by restructuring so data flows one way (compute the value in the parent, use signals/computed, move the change into `ngOnInit`, or schedule it for the next tick as a last resort with `queueMicrotask`/`afterNextRender`). Do not suppress it with `setTimeout` everywhere or `detectChanges` in loops.

Real-world example: a page title bar that displays a count set by a child after the parent rendered.

```ts
// BUG: child updates a plain field the parent already rendered
@Component({ template: `<h1>Claims ({{ count }})</h1><app-claims-list (loaded)="count = $event" />` })
export class ParentComponent { count = 0; }

// FIX 1: signals make the update part of a reactive graph
@Component({
  template: `<h1>Claims ({{ count() }})</h1><app-claims-list (loaded)="count.set($event)" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentFixedComponent { count = signal(0); }

// FIX 2: derive the value from shared state instead of pushing it up
@Injectable({ providedIn: "root" })
export class ClaimsStore {
  readonly claims = signal<Claim[]>([]);
  readonly count = computed(() => this.claims().length);
}
```

**Keywords:**
`ExpressionChangedAfterItHasBeenChecked, change detection, unidirectional data flow, signals, ngAfterViewInit, dev mode`

**Follow-ups:**

-   Why does this error not appear in production builds?
-   Why is `setTimeout` a weak fix?

# TOPIC --- Angular Dependency Injection and Services
**topic_id:** `ng-di`
**priority:** `Strong`

## ng-di-001 --- How does Angular dependency injection and its injector hierarchy work?

**question_id:** `ng-di-001`\
**topic_id:** `ng-di`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How does Angular dependency injection and its injector hierarchy work?

**Answer**

Angular resolves dependencies through a hierarchy: **element injectors** (component `providers`/`viewProviders`, directives) are searched first, walking up the DOM tree, then **environment injectors** (lazy-route injectors, then root, then platform). `providedIn: "root"` makes a tree-shakable singleton; providing a service in a component creates one instance per component instance, which is the right choice for per-screen state. `inject()` works in constructors, field initialisers and factory functions (an injection context). Modifiers `optional`, `self`, `skipSelf` and `host` change resolution.

Real-world example: a per-form state service provided at component level, and a root-level API service.

```ts
@Injectable({ providedIn: "root" })
export class ClaimsApi {
  private http = inject(HttpClient);
  get(id: string) { return this.http.get<Claim>(`/api/claims/${id}`); }
}

@Injectable()                                        // note: not providedIn root
export class ClaimEditorState {
  readonly draft = signal<Claim | null>(null);
  readonly dirty = signal(false);
}

@Component({
  selector: "app-claim-editor",
  standalone: true,
  providers: [ClaimEditorState],                     // one instance per editor, destroyed with it
  template: `...`,
})
export class ClaimEditorComponent {
  private state = inject(ClaimEditorState);
  private api = inject(ClaimsApi);
  private parentForm = inject(ControlContainer, { optional: true, host: true });
}
```

**Keywords:**
`dependency injection, injector hierarchy, providedIn root, component providers, inject function, injection context`

**Follow-ups:**

-   What is the difference between `providers` and `viewProviders`?
-   Why can two lazy-loaded routes end up with different service instances?

## ng-di-002 --- What are InjectionToken, multi providers and factory providers used for?

**question_id:** `ng-di-002`\
**topic_id:** `ng-di`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What are `InjectionToken`, multi providers and factory providers used for?

**Answer**

Tokens identify non-class dependencies (config objects, interfaces, functions). `useValue`, `useClass`, `useFactory` and `useExisting` choose how the instance is created. `multi: true` collects several providers into an array (plug-in style: validators, HTTP interceptors in the old API, initialisers). Use tokens to depend on **abstractions** so tests and environments can swap implementations, and `provideAppInitializer` to run start-up work before the app renders.

Real-world example: environment-based configuration and a pluggable logging sink.

```ts
export interface AppConfig { apiBaseUrl: string; featureFlags: Record<string, boolean> }
export const APP_CONFIG = new InjectionToken<AppConfig>("APP_CONFIG");

export interface LogSink { write(level: string, message: string): void }
export const LOG_SINKS = new InjectionToken<LogSink[]>("LOG_SINKS");

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([apiBaseUrlInterceptor])),
    { provide: APP_CONFIG, useValue: { apiBaseUrl: "/api", featureFlags: {} } },
    { provide: LOG_SINKS, useClass: ConsoleSink, multi: true },
    { provide: LOG_SINKS, useFactory: () => new RemoteSink(inject(HttpClient)), multi: true },
    provideAppInitializer(async () => {
      const cfg = await fetch("/config.json").then(r => r.json());   // runtime config, not baked into the build
      inject(ConfigStore).set(cfg);
    }),
  ],
};

@Injectable({ providedIn: "root" })
export class Logger {
  private sinks = inject(LOG_SINKS);
  info(msg: string) { this.sinks.forEach(s => s.write("info", msg)); }
}
```

**Keywords:**
`InjectionToken, multi provider, useFactory, useClass, useValue, app initializer, configuration`

**Follow-ups:**

-   Why load `config.json` at runtime instead of using `environment.ts`?
-   How would you mock `APP_CONFIG` in a unit test?

## ng-di-003 --- How do you structure services, and what belongs in a component versus a service?

**question_id:** `ng-di-003`\
**topic_id:** `ng-di`\
**difficulty:** `Senior`\
**question_type:** `Scenario / Design`

**Question**

How do you structure services, and what belongs in a component versus a service?

**Answer**

Components own presentation and user interaction; services own data access, business rules, caching and cross-component state. A common layering: **API services** (thin HTTP wrappers returning typed observables), **facade/store services** (state plus actions exposed as signals), and **utility services** (logging, notifications). Avoid components that call `HttpClient` directly, avoid giant "god" services, and keep services free of DOM and template concerns. Services should be easy to test with fake implementations.

Real-world example: a facade that hides HTTP details and exposes signals to the component.

```ts
@Injectable({ providedIn: "root" })
export class ClaimsFacade {
  private api = inject(ClaimsApi);
  private toast = inject(ToastService);

  private readonly _claims = signal<Claim[]>([]);
  private readonly _loading = signal(false);
  readonly claims = this._claims.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly openCount = computed(() => this._claims().filter(c => c.status !== "Approved").length);

  load() {
    this._loading.set(true);
    this.api.list().pipe(finalize(() => this._loading.set(false))).subscribe({
      next: claims => this._claims.set(claims),
      error: () => this.toast.error("Could not load claims"),
    });
  }
  approve(id: string) {
    return this.api.approve(id).pipe(
      tap(() => this._claims.update(list => list.map(c => (c.id === id ? { ...c, status: "Approved" } : c)))),
    );
  }
}

@Component({ standalone: true, template: `@for (c of facade.claims(); track c.id) { ... }` })
export class ClaimsPageComponent { facade = inject(ClaimsFacade); constructor() { this.facade.load(); } }
```

**Keywords:**
`services, facade, store, separation of concerns, signals, HttpClient, testability`

**Follow-ups:**

-   Why expose `asReadonly()` signals instead of the writable ones?
-   When would you move from a facade to NgRx?

# TOPIC --- RxJS and Reactive Programming in Angular
**topic_id:** `ng-rxjs`
**priority:** `Core`

## ng-rxjs-001 --- Compare switchMap, mergeMap, concatMap and exhaustMap, and when to use each.

**question_id:** `ng-rxjs-001`\
**topic_id:** `ng-rxjs`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

Compare `switchMap`, `mergeMap`, `concatMap` and `exhaustMap`, and when to use each.

**Answer**

All map each outer value to an inner observable and flatten the result; they differ in how they treat overlapping inner observables. `switchMap` cancels the previous inner (typeahead, route-param loading). `mergeMap` runs all concurrently, unordered (independent parallel calls, optionally with a concurrency limit). `concatMap` queues them and preserves order (saves where order matters). `exhaustMap` ignores new triggers while one is active (submit buttons, login, preventing double posts). Choosing the wrong one produces race conditions, lost updates or duplicate requests.

Real-world example: the four operators in a claims screen.

```ts
// typeahead: only the latest query matters
search$ = this.term$.pipe(debounceTime(300), distinctUntilChanged(),
  switchMap(q => this.api.search(q)));

// route param change cancels the stale request
claim$ = this.route.paramMap.pipe(map(p => p.get("id")!), switchMap(id => this.api.get(id)));

// submit: ignore double-clicks while the POST is in flight
submit$ = this.submitClicks$.pipe(exhaustMap(() => this.api.submit(this.form.getRawValue())));

// autosave: each save must finish, in order
save$ = this.changes$.pipe(concatMap(patch => this.api.patch(this.id, patch)));

// upload N files, at most 3 at a time
uploads$ = from(files).pipe(mergeMap(f => this.api.upload(f), 3));
```

**Keywords:**
`switchMap, mergeMap, concatMap, exhaustMap, flattening operators, race condition, cancellation`

**Follow-ups:**

-   Which operator would you choose for "delete" buttons in a list and why?
-   What does the concurrency argument to `mergeMap` do?

## ng-rxjs-002 --- What is the difference between hot and cold observables, and how do shareReplay and Subjects fit in?

**question_id:** `ng-rxjs-002`\
**topic_id:** `ng-rxjs`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What is the difference between hot and cold observables, and how do `shareReplay` and Subjects fit in?

**Answer**

A **cold** observable creates its producer per subscriber (each `http.get` subscription sends a request). A **hot** observable shares one producer across subscribers (DOM events, WebSocket, Subjects). `share()` and `shareReplay({ bufferSize: 1, refCount: true })` turn cold into hot to avoid duplicate requests; without `refCount: true` a `shareReplay` can keep the source alive forever. `BehaviorSubject` holds the current value (state), `ReplaySubject` replays history, `Subject` is an event bus. Expose subjects as read-only observables (`asObservable()`).

Real-world example: a lookup list requested by many components and a refreshable cache.

```ts
@Injectable({ providedIn: "root" })
export class LookupService {
  private http = inject(HttpClient);
  private refresh$ = new BehaviorSubject<void>(undefined);

  // one HTTP call no matter how many components subscribe; refetch on demand
  readonly countries$ = this.refresh$.pipe(
    switchMap(() => this.http.get<Country[]>("/api/lookups/countries")),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  refresh() { this.refresh$.next(); }
}

// Without sharing: two async pipes = two HTTP requests
// countries$ = this.http.get<Country[]>("/api/lookups/countries");
// <li *ngFor="let c of countries$ | async"> and <p>{{ (countries$ | async)?.length }}</p>
```

**Keywords:**
`hot observable, cold observable, shareReplay, refCount, BehaviorSubject, Subject, multicasting`

**Follow-ups:**

-   Why can `shareReplay(1)` without `refCount` leak?
-   What is the difference between `Subject` and `BehaviorSubject`?

## ng-rxjs-003 --- How do you manage subscriptions and avoid memory leaks in Angular?

**question_id:** `ng-rxjs-003`\
**topic_id:** `ng-rxjs`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you manage subscriptions and avoid memory leaks in Angular?

**Answer**

Prefer not subscribing manually: use the `async` pipe or `toSignal`, which unsubscribe automatically. When you must subscribe, use `takeUntilDestroyed()` (called in an injection context or with a `DestroyRef`), which completes the stream when the component is destroyed. HTTP observables complete by themselves, but long-lived sources (route params, store selects, intervals, WebSockets, `fromEvent`) do not. Never nest subscribes; compose with operators instead.

Real-world example: a live-updating component using SignalR and a polling fallback.

```ts
@Component({ selector: "app-live-claims", standalone: true, template: `...` })
export class LiveClaimsComponent {
  private hub = inject(ClaimsHub);
  private destroyRef = inject(DestroyRef);
  updates = signal<ClaimUpdate[]>([]);

  constructor() {
    this.hub.updates$.pipe(takeUntilDestroyed()).subscribe(u =>       // injection context in constructor
      this.updates.update(list => [u, ...list].slice(0, 50)));

    timer(0, 30_000).pipe(
      switchMap(() => this.hub.fetchSnapshot()),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(s => this.updates.set(s));
  }

  // template alternative: no subscription code at all
  total = toSignal(this.hub.total$, { initialValue: 0 });
}

// Anti-pattern: nested subscribe, never unsubscribed
// this.route.params.subscribe(p => this.api.get(p.id).subscribe(c => (this.claim = c)));
```

**Keywords:**
`takeUntilDestroyed, async pipe, unsubscribe, memory leak, toSignal, DestroyRef, nested subscribe`

**Follow-ups:**

-   Which observables do not need to be unsubscribed?
-   Why is nested `subscribe` considered an anti-pattern?

## ng-rxjs-004 --- How do you handle errors and retries in RxJS pipelines without killing the stream?

**question_id:** `ng-rxjs-004`\
**topic_id:** `ng-rxjs`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you handle errors and retries in RxJS pipelines without killing the stream?

**Answer**

An error terminates an observable, and an error in the **outer** stream of a `switchMap` ends everything, so catch errors **inside** the inner observable and return a fallback (`of(...)`, `EMPTY`) to keep the outer stream alive. Use `retry({ count, delay })` with backoff for transient failures on idempotent requests only, and convert errors into state (an `error` signal or a result type) so the UI can show messages. Use `finalize` for cleanup, and `timeout` for deadlines.

Real-world example: a search stream that survives a failing request and retries once with backoff.

```ts
type Result<T> = { ok: true; value: T } | { ok: false; message: string };

search$ = this.term$.pipe(
  debounceTime(300),
  switchMap(term =>
    this.http.get<Claim[]>("/api/claims/search", { params: { q: term } }).pipe(
      timeout(8000),
      retry({
        count: 2,
        delay: (err, attempt) => (err.status && err.status < 500 ? throwError(() => err) : timer(2 ** attempt * 300)),
      }),
      map((value): Result<Claim[]> => ({ ok: true, value })),
      catchError((e: HttpErrorResponse) => of<Result<Claim[]>>({ ok: false, message: e.error?.title ?? "Search failed" })),
    ),                                   // error handled INSIDE switchMap: the outer stream stays alive
  ),
);
```

**Keywords:**
`catchError, retry, backoff, switchMap, error handling, timeout, finalize, inner observable`

**Follow-ups:**

-   What happens to a stream when `catchError` is placed after the `switchMap` instead of inside?
-   Which HTTP methods are safe to retry?

# TOPIC --- Angular Routing, Guards and Lazy Loading
**topic_id:** `ng-routing`
**priority:** `Strong`

## ng-routing-001 --- How do lazy loading, preloading strategies and @defer reduce the initial bundle?

**question_id:** `ng-routing-001`\
**topic_id:** `ng-routing`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do lazy loading, preloading strategies and `@defer` reduce the initial bundle?

**Answer**

`loadComponent` and `loadChildren` split routes into separate chunks that download on navigation. A **preloading strategy** (`PreloadAllModules`, or a custom one that preloads only routes marked `data: { preload: true }`) fetches likely-next chunks during idle time. `@defer` lazy-loads **parts of a template** (heavy charts, below-the-fold widgets) with triggers (`on viewport`, `on interaction`, `on idle`, `when expr`), with `@placeholder`, `@loading` and `@error` blocks. Combine with route-level guards and measure with the bundle analyzer and budgets in `angular.json`.

Real-world example: lazy admin area and a deferred analytics widget.

```ts
export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "claims" },
  { path: "claims", loadComponent: () => import("./claims/claims.page").then(m => m.ClaimsPage), data: { preload: true } },
  { path: "admin", canMatch: [roleGuard("admin")], loadChildren: () => import("./admin/admin.routes").then(m => m.ADMIN_ROUTES) },
  { path: "**", loadComponent: () => import("./not-found.page").then(m => m.NotFoundPage) },
];

// app.config.ts
provideRouter(routes, withPreloading(SelectivePreloadStrategy), withComponentInputBinding());

@Injectable({ providedIn: "root" })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) { return route.data?.["preload"] ? load() : of(null); }
}

// template: heavy chart loads only when it scrolls into view
// @defer (on viewport; prefetch on idle) {
//   <app-revenue-chart [data]="data()" />
// } @placeholder { <div class="chart-skeleton"></div> }
//   @loading (minimum 300ms) { <app-spinner /> }
//   @error { <p>Chart unavailable</p> }
```

**Keywords:**
`lazy loading, loadComponent, preloading strategy, @defer, code splitting, canMatch, bundle budget`

**Follow-ups:**

-   What is the difference between `canActivate` and `canMatch` for lazy routes?
-   How do `@defer` triggers behave during SSR?

## ng-routing-002 --- How do functional guards, resolvers and route-input binding work?

**question_id:** `ng-routing-002`\
**topic_id:** `ng-routing`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do functional guards, resolvers and route-input binding (`withComponentInputBinding`) work?

**Answer**

Guards are plain functions (`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`) that run in an injection context, so they can `inject()` services and return a boolean, a `UrlTree` (redirect) or an observable/promise of those. A resolver (`ResolveFn`) loads data before activation. With `withComponentInputBinding()`, route params, query params, data and resolved data are bound to component `input()`s, removing `ActivatedRoute` boilerplate. **Guards are UX, not security**: the API must still authorize every request.

Real-world example: role guard, unsaved-changes guard and a resolver with input binding.

```ts
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() || inject(Router).createUrlTree(["/login"], { queryParams: { returnUrl: state.url } });
};

export const roleGuard = (role: string): CanMatchFn => () =>
  inject(AuthService).hasRole(role) || inject(Router).createUrlTree(["/forbidden"]);

export const unsavedChangesGuard: CanDeactivateFn<{ dirty(): boolean }> = (component) =>
  !component.dirty() || confirm("Discard unsaved changes?");

export const claimResolver: ResolveFn<Claim> = (route) => inject(ClaimsApi).get(route.paramMap.get("id")!);

export const routes: Routes = [{
  path: "claims/:id",
  canActivate: [authGuard],
  canDeactivate: [unsavedChangesGuard],
  resolve: { claim: claimResolver },
  loadComponent: () => import("./claim-detail.page").then(m => m.ClaimDetailPage),
}];

@Component({ standalone: true, template: `<h1>{{ claim().id }}</h1>` })
export class ClaimDetailPage {
  claim = input.required<Claim>();          // bound from resolve data
  id = input<string>();                     // bound from :id
  dirty = signal(false);
}
```

**Keywords:**
`functional guard, CanActivateFn, CanMatch, resolver, withComponentInputBinding, UrlTree, route data`

**Follow-ups:**

-   Why can't a route guard replace server-side authorization?
-   How do you redirect back to the original URL after login?

## ng-routing-003 --- How do you handle route parameters, query parameters and navigation state robustly?

**question_id:** `ng-routing-003`\
**topic_id:** `ng-routing`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you handle route parameters, query parameters and navigation state robustly?

**Answer**

Put shareable view state (filters, sort, page) in **query params** so URLs are bookmarkable and the back button works, and identity in **path params**. React to changes with `paramMap`/`queryParamMap` observables (the component instance is reused when only parameters change) or with bound inputs. Update the URL with `router.navigate([], { queryParams, queryParamsHandling: "merge", replaceUrl: true })`. Validate and parse parameters defensively (they are strings from untrusted input), and use `router.navigateByUrl`/`UrlTree` for redirects.

Real-world example: a filter bar whose state lives in the URL.

```ts
@Component({ standalone: true, template: `...` })
export class ClaimsPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ClaimsApi);

  private params$ = this.route.queryParamMap.pipe(
    map(p => ({
      status: (p.get("status") ?? "all") as Status | "all",
      page: Math.max(1, Number.parseInt(p.get("page") ?? "1", 10) || 1),
    })),
  );
  vm = toSignal(this.params$.pipe(switchMap(q => this.api.list(q).pipe(map(items => ({ q, items }))))));

  setStatus(status: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status, page: 1 },
      queryParamsHandling: "merge",
      replaceUrl: true,                 // do not pollute history on every filter tweak
    });
  }
}
```

**Keywords:**
`route params, query params, queryParamsHandling, paramMap, router.navigate, deep link, replaceUrl`

**Follow-ups:**

-   Why is the component not re-created when `:id` changes?
-   When is `router.navigate` with `state` preferable to query params?

# TOPIC --- Angular Forms
**topic_id:** `ng-forms`
**priority:** `Strong`

## ng-forms-001 --- Template-driven versus reactive forms, and how do typed reactive forms work?

**question_id:** `ng-forms-001`\
**topic_id:** `ng-forms`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

Template-driven versus reactive forms, and how do typed reactive forms work?

**Answer**

Template-driven forms (`ngModel`) are quick for trivial forms; **reactive forms** define the model in code (`FormGroup`, `FormControl`, `FormArray`), which makes validation, dynamic fields, testing and conditional logic explicit and scalable. Since Angular 14 forms are **typed**: `FormControl<string>` and `form.getRawValue()` return real types; use `nonNullable` controls (or `NonNullableFormBuilder`) so `reset()` returns to the initial value rather than `null`. Render errors only after interaction (`touched`) and disable submit while pending.

Real-world example: a typed claim submission form.

```ts
@Component({
  selector: "app-claim-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="policyId" aria-label="Policy" />
      @if (form.controls.policyId.touched && form.controls.policyId.hasError('required')) {
        <small role="alert">Policy is required</small>
      }
      <input type="number" formControlName="amount" aria-label="Amount" />
      <button [disabled]="form.invalid || saving()">Submit</button>
    </form>`,
})
export class ClaimFormComponent {
  private fb = inject(NonNullableFormBuilder);
  private api = inject(ClaimsApi);
  saving = signal(false);

  form = this.fb.group({
    policyId: ["", [Validators.required, Validators.pattern(/^P-\d{6}$/)]],
    amount: [0, [Validators.required, Validators.min(1), Validators.max(1_000_000)]],
    notes: this.fb.control(""),
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.api.create(this.form.getRawValue())              // typed: { policyId: string; amount: number; notes: string }
      .pipe(finalize(() => this.saving.set(false))).subscribe();
  }
}
```

**Keywords:**
`reactive forms, template-driven forms, typed forms, FormGroup, NonNullableFormBuilder, validators, getRawValue`

**Follow-ups:**

-   What is the difference between `value` and `getRawValue()`?
-   How do you reflect server-side validation errors on a form?

## ng-forms-002 --- How do you write custom, cross-field and async validators?

**question_id:** `ng-forms-002`\
**topic_id:** `ng-forms`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you write custom, cross-field and async validators?

**Answer**

A validator is a function `(control) => ValidationErrors | null`. **Cross-field** validators go on the parent `FormGroup`. **Async** validators return an observable/promise and run only after sync validators pass; debounce them and use `updateOn: "blur"` to avoid a request per keystroke, and map failures to `null` rather than blocking the user on network errors. Server remains the source of truth for uniqueness checks.

Real-world example: date-range validation and a username-availability check.

```ts
export const dateRange: ValidatorFn = (group) => {
  const from = group.get("from")?.value, to = group.get("to")?.value;
  return from && to && new Date(from) > new Date(to) ? { dateRange: true } : null;
};

export function uniquePolicyNumber(api: PoliciesApi): AsyncValidatorFn {
  return (control) =>
    timer(400).pipe(                                           // debounce
      switchMap(() => api.exists(control.value)),
      map(exists => (exists ? { taken: true } : null)),
      catchError(() => of(null)),                              // do not block users when the API is down
    );
}

form = this.fb.group({
  policyNumber: this.fb.control("", { validators: [Validators.required], asyncValidators: [uniquePolicyNumber(this.api)], updateOn: "blur" }),
  from: [""], to: [""],
}, { validators: [dateRange] });

// show error: form.hasError('dateRange') (group) vs form.controls.policyNumber.hasError('taken')
```

**Keywords:**
`custom validator, cross-field validation, async validator, ValidatorFn, updateOn blur, debounce, FormGroup`

**Follow-ups:**

-   What is the `pending` status and how do you use it?
-   Why does an async validator not run while a sync validator fails?

## ng-forms-003 --- How do you build dynamic forms with FormArray and a reusable ControlValueAccessor?

**question_id:** `ng-forms-003`\
**topic_id:** `ng-forms`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you build dynamic forms with `FormArray` and a reusable `ControlValueAccessor`?

**Answer**

`FormArray` models repeating rows (line items, attachments); add and remove controls with `push`/`removeAt`, and track rows to keep DOM stable. A **ControlValueAccessor** (CVA) connects a custom component (date picker, rating, rich text) to Angular forms so it works with `formControlName`, validation, `disabled` and `touched`. Implement `writeValue`, `registerOnChange`, `registerOnTouched` and `setDisabledState`, and provide `NG_VALUE_ACCESSOR`.

Real-world example: invoice line items and a reusable currency input.

```ts
@Component({
  selector: "app-money-input",
  standalone: true,
  template: `<input inputmode="decimal" [value]="display" [disabled]="disabled" (input)="onInput($any($event.target).value)" (blur)="onTouched()" />`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoneyInputComponent), multi: true }],
})
export class MoneyInputComponent implements ControlValueAccessor {
  display = ""; disabled = false;
  private onChange: (v: number | null) => void = () => {};
  onTouched: () => void = () => {};
  writeValue(v: number | null) { this.display = v == null ? "" : v.toFixed(2); }
  registerOnChange(fn: (v: number | null) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
  onInput(raw: string) { const n = Number.parseFloat(raw); this.onChange(Number.isNaN(n) ? null : n); }
}

// Dynamic rows
export class InvoiceFormComponent {
  private fb = inject(NonNullableFormBuilder);
  form = this.fb.group({ lines: this.fb.array([this.newLine()]) });
  get lines() { return this.form.controls.lines; }
  newLine() { return this.fb.group({ description: ["", Validators.required], amount: [0, Validators.min(0.01)] }); }
  addLine() { this.lines.push(this.newLine()); }
  removeLine(i: number) { this.lines.removeAt(i); }
}
// template: @for (line of lines.controls; track line; let i = $index) { <app-money-input [formControl]="line.controls.amount" /> }
```

**Keywords:**
`FormArray, ControlValueAccessor, NG_VALUE_ACCESSOR, dynamic forms, custom form control, setDisabledState`

**Follow-ups:**

-   How does a CVA propagate validation state to the parent form?
-   What changes with signal-based forms proposals?

# TOPIC --- Angular HTTP, Interceptors and Authentication
**topic_id:** `ng-http`
**priority:** `Core`

## ng-http-001 --- How do you use HttpClient and functional interceptors for cross-cutting concerns?

**question_id:** `ng-http-001`\
**topic_id:** `ng-http`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you use `HttpClient` and functional interceptors for cross-cutting concerns?

**Answer**

Register `provideHttpClient(withInterceptors([...]))`. An interceptor is a function `(req, next) => Observable` that can clone the request (requests are immutable) and transform the response stream. Typical uses: base URL, correlation id, credentials, global error mapping, loading indicator, retry. Keep each interceptor single-purpose and order matters (first in the array is outermost). Read errors as `HttpErrorResponse` and map ASP.NET Core `ProblemDetails` bodies into friendly messages.

Real-world example: base URL, correlation id and error normalization.

```ts
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith("/api")) return next(req);
  const cfg = inject(APP_CONFIG);
  const cloned = req.clone({
    url: cfg.apiBaseUrl + req.url.slice(4),
    withCredentials: true,                                   // HttpOnly session cookie
    setHeaders: { "X-Correlation-Id": crypto.randomUUID() },
  });
  return next(cloned);
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const problem = err.error as { title?: string; errors?: Record<string, string[]> } | null;   // RFC 7807
      if (err.status === 0) toast.error("Network problem. Check your connection.");
      else if (err.status >= 500) toast.error(problem?.title ?? "Server error");
      return throwError(() => err);                          // let callers still handle 400/404/409
    }),
  );
};

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([apiInterceptor, errorInterceptor]), withFetch())],
};
```

**Keywords:**
`HttpClient, HttpInterceptorFn, withInterceptors, ProblemDetails, correlation id, error handling, withCredentials`

**Follow-ups:**

-   Why are `HttpRequest` objects immutable and how do you modify them?
-   How would you add a global loading bar using an interceptor?

## ng-http-002 --- How do you implement authentication in an Angular SPA with an ASP.NET Core API (cookies, CSRF, token refresh)?

**question_id:** `ng-http-002`\
**topic_id:** `ng-http`\
**difficulty:** `Senior / Lead`\
**question_type:** `Scenario / Design`

**Question**

How do you implement authentication in an Angular SPA with an ASP.NET Core API, covering cookies, CSRF and token refresh?

**Answer**

The most robust approach is the **backend-for-frontend (BFF)** pattern: the ASP.NET Core host performs the OIDC flow and issues an `HttpOnly; Secure; SameSite` session cookie, so the SPA never touches tokens (no XSS token theft). Because cookies are sent automatically, protect state-changing calls from CSRF with antiforgery tokens (Angular reads the `XSRF-TOKEN` cookie and sends `X-XSRF-TOKEN` automatically) and `SameSite`. If you must use bearer tokens, keep access tokens in memory with short lifetimes and rotate refresh tokens through the BFF, and serialize refresh so concurrent 401s trigger one refresh. The Angular side keeps only a **session-state signal** and guards for UX; authorization is enforced by the API.

Real-world example: 401 handling that triggers re-login, and bootstrapping the user from `/api/me`.

```ts
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  readonly user = signal<{ id: string; name: string; roles: string[] } | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  hasRole = (r: string) => this.user()?.roles.includes(r) ?? false;

  load() {                                            // run via provideAppInitializer
    return this.http.get<{ id: string; name: string; roles: string[] }>("/api/me").pipe(
      tap(u => this.user.set(u)), catchError(() => { this.user.set(null); return of(null); }));
  }
  login(returnUrl = "/") { window.location.href = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`; }
  logout() { return this.http.post("/auth/logout", {}).pipe(tap(() => this.user.set(null))); }
}

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((err: HttpErrorResponse) => {
    if (err.status === 401 && !req.url.endsWith("/api/me")) inject(AuthService).login(location.pathname);
    return throwError(() => err);
  }));

// app.config.ts
// provideHttpClient(withXsrfConfiguration({ cookieName: "XSRF-TOKEN", headerName: "X-XSRF-TOKEN" }), withInterceptors([unauthorizedInterceptor]))
```

**Keywords:**
`authentication, BFF, HttpOnly cookie, CSRF, XSRF-TOKEN, refresh token, OIDC, 401 handling`

**Follow-ups:**

-   Why is `localStorage` a poor place for JWTs?
-   How do you avoid several parallel 401 responses causing several refreshes?

## ng-http-003 --- How do you cache HTTP calls, retry safely and de-duplicate requests in Angular?

**question_id:** `ng-http-003`\
**topic_id:** `ng-http`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you cache HTTP calls, retry safely and de-duplicate requests in Angular?

**Answer**

Cache **reference data** (countries, lookups) in a service with `shareReplay` and an expiry, or in an interceptor keyed by URL for GETs, and invalidate on mutation. De-duplicate concurrent identical GETs by sharing the in-flight observable. Retry only idempotent methods (GET, PUT, DELETE with idempotency keys) with backoff, and send an `Idempotency-Key` header on POSTs that can be retried. Respect server cache headers (`ETag`, `If-None-Match`) for large payloads and consider `HttpTransferCache` to avoid duplicate requests during SSR hydration.

Real-world example: a small GET cache interceptor with TTL and opt-out context token.

```ts
export const SKIP_CACHE = new HttpContextToken<boolean>(() => false);

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== "GET" || req.context.get(SKIP_CACHE)) return next(req);
  const cache = inject(HttpCacheStore);                                   // Map<url, { expires, response$ }>
  const hit = cache.get(req.urlWithParams);
  if (hit && hit.expires > Date.now()) return hit.response$;

  const response$ = next(req).pipe(
    filter((e): e is HttpResponse<unknown> => e instanceof HttpResponse),
    shareReplay({ bufferSize: 1, refCount: false }),                      // concurrent callers share one request
  );
  cache.set(req.urlWithParams, { expires: Date.now() + 60_000, response$ });
  return response$;
};

// bypass for fresh data
this.http.get("/api/lookups/countries", { context: new HttpContext().set(SKIP_CACHE, true) });

// idempotent POST retry
this.http.post("/api/payments", body, { headers: { "Idempotency-Key": crypto.randomUUID() } })
  .pipe(retry({ count: 2, delay: () => timer(500) }));
```

**Keywords:**
`HTTP caching, shareReplay, interceptor, idempotency key, retry, ETag, HttpContext, transfer cache`

**Follow-ups:**

-   How do you invalidate cached entries after a successful POST or PUT?
-   Why is blindly retrying a POST dangerous?

# TOPIC --- Angular State Management
**topic_id:** `ng-state`
**priority:** `Strong`

## ng-state-001 --- When do you need NgRx, and how do actions, reducers, selectors and effects fit together?

**question_id:** `ng-state-001`\
**topic_id:** `ng-state`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Design`

**Question**

When do you need NgRx, and how do actions, reducers, selectors and effects fit together?

**Answer**

NgRx implements a unidirectional Redux-style store: components dispatch **actions**, pure **reducers** compute the next immutable state, **selectors** derive memoized slices, and **effects** perform side effects (HTTP, navigation) and dispatch result actions. It pays off for large apps with shared, long-lived state, complex async flows, time-travel debugging and strict team conventions. For local or modest shared state, a signal-based service is simpler. Do not put server cache concerns (loading, stale data) in NgRx if you could use a data-fetching layer instead.

Real-world example: loading and approving claims with `createFeature`.

```ts
export const ClaimsActions = createActionGroup({
  source: "Claims",
  events: {
    "Load": emptyProps(),
    "Load Success": props<{ claims: Claim[] }>(),
    "Load Failure": props<{ error: string }>(),
    "Approve": props<{ id: string }>(),
  },
});

export const claimsFeature = createFeature({
  name: "claims",
  reducer: createReducer(
    { claims: [] as Claim[], loading: false, error: null as string | null },
    on(ClaimsActions.load, s => ({ ...s, loading: true, error: null })),
    on(ClaimsActions.loadSuccess, (s, { claims }) => ({ ...s, claims, loading: false })),
    on(ClaimsActions.loadFailure, (s, { error }) => ({ ...s, error, loading: false })),
  ),
  extraSelectors: ({ selectClaims }) => ({
    selectApproved: createSelector(selectClaims, c => c.filter(x => x.status === "Approved")),
  }),
});

export const loadClaims = createEffect((actions$ = inject(Actions), api = inject(ClaimsApi)) =>
  actions$.pipe(
    ofType(ClaimsActions.load),
    exhaustMap(() => api.list().pipe(
      map(claims => ClaimsActions.loadSuccess({ claims })),
      catchError(e => of(ClaimsActions.loadFailure({ error: e.message }))))),
  ), { functional: true });

// component: claims = this.store.selectSignal(claimsFeature.selectClaims); this.store.dispatch(ClaimsActions.load());
```

**Keywords:**
`NgRx, actions, reducers, selectors, effects, store, immutability, createFeature`

**Follow-ups:**

-   Why must reducers be pure?
-   What problems does NgRx solve that a signal service does not, and what does it cost?

## ng-state-002 --- When is a signal-based service or NgRx Signal Store enough?

**question_id:** `ng-state-002`\
**topic_id:** `ng-state`\
**difficulty:** `Senior`\
**question_type:** `Design / Practical`

**Question**

When is a signal-based service or the NgRx Signal Store enough, and how do you structure one?

**Answer**

For most feature state a service that holds `signal`s and exposes `computed` selectors plus methods for updates is enough: it has no boilerplate, is easy to test and scales to a feature module. The **NgRx Signal Store** (`signalStore`, `withState`, `withComputed`, `withMethods`, `withEntities`, `rxMethod`) standardises that structure, provides entity helpers and hooks, and integrates with RxJS for async. Keep state minimal and normalised, derive everything else, update immutably and keep side effects in methods, not in components.

Real-world example: a feature store with entities and an async method.

```ts
export const ClaimsStore = signalStore(
  { providedIn: "root" },
  withEntities<Claim>(),
  withState({ loading: false, filter: "all" as Status | "all" }),
  withComputed(({ entities, filter }) => ({
    visible: computed(() => filter() === "all" ? entities() : entities().filter(c => c.status === filter())),
    total: computed(() => entities().reduce((s, c) => s + c.amount, 0)),
  })),
  withMethods((store, api = inject(ClaimsApi)) => ({
    setFilter(filter: Status | "all") { patchState(store, { filter }); },
    load: rxMethod<void>(pipe(
      tap(() => patchState(store, { loading: true })),
      switchMap(() => api.list().pipe(
        tapResponse({
          next: claims => patchState(store, setAllEntities(claims), { loading: false }),
          error: () => patchState(store, { loading: false }),
        }))),
    )),
    async approve(id: string) {
      patchState(store, updateEntity({ id, changes: { status: "Approved" } }));       // optimistic update
      try { await firstValueFrom(api.approve(id)); }
      catch { patchState(store, updateEntity({ id, changes: { status: "Submitted" } })); }   // roll back
    },
  })),
  withHooks({ onInit: store => store.load() }),
);
```

**Keywords:**
`signal store, signalStore, withState, withEntities, rxMethod, optimistic update, state management`

**Follow-ups:**

-   How do you implement an optimistic update and roll it back on failure?
-   How do you keep state normalised for lists with many relations?

# TOPIC --- Angular Performance, SSR and Testing
**topic_id:** `ng-perf-test`
**priority:** `Strong`

## ng-perf-test-001 --- How do you optimize rendering of large lists and data tables in Angular?

**question_id:** `ng-perf-test-001`\
**topic_id:** `ng-perf-test`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

How do you optimize rendering of large lists and data tables in Angular?

**Answer**

Render less: **server-side pagination or filtering**, **virtual scrolling** (`cdk-virtual-scroll-viewport`) so only visible rows exist in the DOM, `track` by a stable id, OnPush components for rows, `computed` for derived values and no function calls in templates. Debounce user input, use `@defer` for heavy off-screen widgets, avoid layout thrash in cell renderers and measure with Angular DevTools profiler and the Chrome Performance panel. For huge datasets use server-driven sorting and cursor pagination rather than loading everything.

Real-world example: virtual scrolling of 100k audit rows with infinite loading.

```ts
@Component({
  selector: "app-audit-log",
  standalone: true,
  imports: [ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cdk-virtual-scroll-viewport itemSize="40" class="viewport" (scrolledIndexChange)="onScroll($event)">
      <div *cdkVirtualFor="let row of rows(); trackBy: trackById" class="row">
        {{ row.at | date: 'short' }} {{ row.actor }} {{ row.action }}
      </div>
    </cdk-virtual-scroll-viewport>`,
})
export class AuditLogComponent {
  private api = inject(AuditApi);
  rows = signal<AuditRow[]>([]);
  private cursor: string | null = null;
  private loading = false;
  trackById = (_: number, r: AuditRow) => r.id;

  constructor() { this.loadMore(); }

  onScroll(index: number) {
    if (index + 40 >= this.rows().length) this.loadMore();       // prefetch before the end
  }
  private loadMore() {
    if (this.loading) return;
    this.loading = true;
    this.api.page(this.cursor, 200).subscribe(({ items, next }) => {
      this.rows.update(r => [...r, ...items]);
      this.cursor = next; this.loading = false;
    });
  }
}
```

**Keywords:**
`virtual scrolling, cdk, trackBy, OnPush, pagination, performance profiling, large lists`

**Follow-ups:**

-   Why is cursor (keyset) pagination better than offset for deep pages?
-   How do you profile change detection cycles?

## ng-perf-test-002 --- How do SSR, hydration and incremental hydration work in Angular, and what are the pitfalls?

**question_id:** `ng-perf-test-002`\
**topic_id:** `ng-perf-test`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do SSR, hydration and incremental hydration work in Angular, and what are the pitfalls?

**Answer**

SSR renders HTML on the server so users and crawlers see content immediately (better LCP and SEO). **Hydration** then attaches the client app to the existing DOM instead of re-rendering it; **incremental hydration** (with `@defer (hydrate on ...)`) hydrates parts lazily. Pitfalls: direct access to `window`, `document` or `localStorage` breaks on the server (use `isPlatformBrowser`, `afterNextRender` or injected tokens), DOM manipulation outside Angular causes hydration mismatches, duplicate HTTP calls (solved by the built-in HTTP transfer cache), and per-request state leaks if you store user data in singletons. Prerender static pages (SSG) where content does not depend on the user.

Real-world example: platform-safe code and hydration-friendly setup.

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay(), withIncrementalHydration(), withHttpTransferCacheOptions({ includePostRequests: false })),
    provideHttpClient(withFetch()),
  ],
};

@Injectable({ providedIn: "root" })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private doc = inject(DOCUMENT);
  apply(theme: "light" | "dark") {
    if (!isPlatformBrowser(this.platformId)) return;          // no localStorage/window on the server
    localStorage.setItem("theme", theme);
    this.doc.documentElement.dataset["theme"] = theme;
  }
}

// template: hydrate the heavy widget only when visible
// @defer (hydrate on viewport) { <app-recommendations /> } @placeholder { <div class="skeleton"></div> }

// Never: per-user data in a root singleton on the server (shared across requests)
```

**Keywords:**
`SSR, hydration, incremental hydration, transfer cache, isPlatformBrowser, prerender, LCP, hydration mismatch`

**Follow-ups:**

-   What causes a hydration mismatch and how do you debug it?
-   Why is a root-level singleton dangerous with SSR?

## ng-perf-test-003 --- How do you unit test components, services and HTTP calls with TestBed, harnesses and HttpTestingController?

**question_id:** `ng-perf-test-003`\
**topic_id:** `ng-perf-test`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you unit test components, services and HTTP calls with `TestBed`, component harnesses and `HttpTestingController`?

**Answer**

Test **behaviour**, not implementation. For services use `TestBed` with `provideHttpClient()` and `provideHttpClientTesting()` and assert requests with `HttpTestingController`. For components, render with `TestBed.createComponent`, set signal inputs via `fixture.componentRef.setInput`, query by role/text and interact through **component harnesses** (Angular Material or your own) so tests survive DOM refactors. Fake dependencies with providers, flush `fixture.whenStable()` for async work, avoid `fakeAsync` overuse and keep unit tests fast; cover full flows with Playwright or Cypress.

Real-world example: service HTTP test and component test with a fake facade.

```ts
describe("ClaimsApi", () => {
  let api: ClaimsApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ClaimsApi); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());                                   // fail on unexpected/unmatched requests

  it("approves a claim", () => {
    let result: Claim | undefined;
    api.approve("c1").subscribe(c => (result = c));
    const req = http.expectOne("/api/claims/c1/approve");
    expect(req.request.method).toBe("POST");
    req.flush({ id: "c1", status: "Approved" });
    expect(result?.status).toBe("Approved");
  });
});

describe("ClaimBadgeComponent", () => {
  it("renders the status", async () => {
    const fixture = TestBed.createComponent(ClaimBadgeComponent);
    fixture.componentRef.setInput("status", "Approved");
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain("Approved");
  });
});
```

**Keywords:**
`TestBed, HttpTestingController, component harness, setInput, fakeAsync, Jest, Playwright, unit testing`

**Follow-ups:**

-   Why call `http.verify()` in `afterEach`?
-   What are the advantages of harnesses over querying the DOM directly?

## ng-perf-test-004 --- How do you analyze and control Angular bundle size, and what should a performance budget look like?

**question_id:** `ng-perf-test-004`\
**topic_id:** `ng-perf-test`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you analyze and control Angular bundle size, and what should a performance budget look like?

**Answer**

Build with the production configuration and inspect output with `ng build --stats-json` and `source-map-explorer` or the esbuild analyzer. The usual wins: lazy-load routes, `@defer` heavy features, import only what you use (`date-fns/format` not the whole library, Material modules per component), avoid barrel files that defeat tree shaking, replace large libraries, enable `optimization`, and serve Brotli with long-lived cache headers for hashed files. Enforce **budgets** in `angular.json` so CI fails when the initial bundle grows.

Real-world example: budgets and an analysis workflow.

```json
{
  "budgets": [
    { "type": "initial",           "maximumWarning": "500kB", "maximumError": "800kB" },
    { "type": "anyComponentStyle", "maximumWarning": "4kB",   "maximumError": "8kB" },
    { "type": "bundle", "name": "admin", "maximumWarning": "250kB", "maximumError": "400kB" }
  ]
}
```

```bash
ng build --configuration production --stats-json
npx esbuild-visualizer --metadata dist/app/browser/stats.json --open
# CI: fail the pipeline when a budget is exceeded (ng build returns a non-zero exit code on budget errors)
```

```ts
// Prefer targeted imports and lazy features
import { format } from "date-fns/format";               // not: import * as dateFns from "date-fns"
const pdf = await import("./pdf/export-pdf");             // loaded only when the user clicks "Export PDF"
```

**Keywords:**
`bundle size, budgets, angular.json, tree shaking, source map explorer, lazy loading, Brotli`

**Follow-ups:**

-   Why do barrel files hurt tree shaking?
-   How do you decide what belongs in the initial bundle?
