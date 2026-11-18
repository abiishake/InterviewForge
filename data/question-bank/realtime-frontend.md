# TOPIC --- Real-Time Communication: SignalR, WebSockets and Server-Sent Events
**topic_id:** `realtime`
**priority:** `Strong`

## realtime-001 --- How do WebSockets, Server-Sent Events and long polling differ, and how does SignalR choose between them?

**question_id:** `realtime-001`\
**topic_id:** `realtime`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do WebSockets, Server-Sent Events and long polling differ, and how does SignalR choose between them?

**Answer**

**WebSockets** give a persistent full-duplex channel (binary or text) over one TCP connection: lowest latency, needs sticky-aware infrastructure. **Server-Sent Events (SSE)** are one-way server-to-client streams over plain HTTP with automatic reconnect and `Last-Event-ID`; simple and proxy-friendly, text only. **Long polling** repeatedly holds an HTTP request open and works everywhere but costs more. **SignalR** abstracts these: it negotiates WebSockets, falls back to SSE, then long polling, and adds hubs, groups, users, typed clients, reconnect and streaming. Use SSE for simple notifications and feeds, WebSockets/SignalR for chat, collaboration and dashboards with client-to-server traffic.

Real-world example: the three transports side by side: SSE endpoint in ASP.NET Core and a SignalR client that forces WebSockets.

```csharp
// Server-Sent Events (.NET 10 minimal API)
app.MapGet("/events", (CancellationToken ct) =>
    TypedResults.ServerSentEvents(Ticker(ct), eventType: "price"));

static async IAsyncEnumerable<decimal> Ticker([EnumeratorCancellation] CancellationToken ct)
{
    while (!ct.IsCancellationRequested) { yield return Random.Shared.Next(90, 110); await Task.Delay(1000, ct); }
}

// SignalR client: skip negotiation, WebSockets only (no sticky sessions needed)
var conn = new HubConnectionBuilder()
    .WithUrl("https://api.example.com/hubs/prices", o => { o.SkipNegotiation = true; o.Transports = HttpTransportType.WebSockets; })
    .WithAutomaticReconnect().Build();
```

**Keywords:** `WebSockets, SSE, long polling, SignalR, full duplex, fallback, Last-Event-ID`

**Follow-ups:**

-   Why can a corporate proxy break WebSockets?
-   How does SSE reconnect?
-   When is polling still acceptable?

## realtime-002 --- How do you scale SignalR across multiple servers and secure it?

**question_id:** `realtime-002`\
**topic_id:** `realtime`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you scale SignalR across multiple servers and secure it?

**Answer**

Each client connection lives on one server, so a message sent from server A cannot reach a client on server B without a **backplane**: Redis backplane or the managed **Azure SignalR Service**, which also offloads the connections (thousands per unit). Without WebSockets-only negotiation you need sticky sessions; with `SkipNegotiation` and WebSockets (or Azure SignalR) you do not. Security: authenticate via cookie or JWT (browsers cannot set headers on WebSockets, so the token travels in the `access_token` query string and is read in `OnMessageReceived`), authorize hubs and methods with policies, validate input, limit message size and connections, and use groups for tenant isolation.
```csharp
builder.Services.AddSignalR().AddAzureSignalR();
app.MapHub<NotificationsHub>("/hubs/notifications").RequireAuthorization();
```

**Keywords:** `SignalR, backplane, Azure SignalR Service, sticky sessions, access_token, hub, groups`

**Follow-ups:**

-   What happens to in-flight messages on reconnect?
-   How do you send to one user from a background service?
-   What are the limits per connection?

## realtime-003 --- How would you design real-time order status updates for 100,000 users with SignalR or alternatives?

**question_id:** `realtime-003`\
**topic_id:** `realtime`\
**difficulty:** `Senior / Lead`\
**question_type:** `Scenario`

**Question**

How would you design real-time order status updates for 100,000 users with SignalR or alternatives?

**Answer**

Publish status changes as events (Service Bus/Kafka) and have a notification service consume them and push to clients through Azure SignalR Service, using the user id (`Clients.User(id)`) or a group per order. Treat real-time as a *hint*: the database remains the source of truth, clients fetch current state on connect and reconnect so missed messages do not matter. Keep payloads small (id and version), debounce bursts, use heartbeats and automatic reconnect with backoff, and monitor connection counts and message rates. If only one-way updates are needed, SSE is simpler and cheaper; if the audience is huge and updates are coarse, polling with caching can beat sockets.

Real-world example: pushing order updates to one user from a background consumer through IHubContext.

```csharp
public sealed class OrderStatusConsumer(IHubContext<NotificationsHub> hub) : IConsumer<OrderStatusChanged>
{
    public Task Consume(ConsumeContext<OrderStatusChanged> ctx) =>
        hub.Clients.User(ctx.Message.CustomerId)                      // uses the authenticated user id claim
           .SendAsync("orderStatus", new { ctx.Message.OrderId, ctx.Message.Status, ctx.Message.Version }, ctx.CancellationToken);
}
// Client on (re)connect: GET /api/orders/{id} to load current state, then apply pushed updates whose Version is newer.
```

**Keywords:** `real-time, Azure SignalR, event-driven, reconnect, source of truth, SSE, backpressure`

**Follow-ups:**

-   How do you handle a client offline for an hour?
-   How do you load-test connections?
-   How would you ensure ordering of updates?

# TOPIC --- Modern Frontend Architecture: Code Splitting, SSR, Microfrontends and PWA
**topic_id:** `frontend-modern`
**priority:** `Strong`

## frontend-modern-001 --- What are lazy loading, code splitting and tree shaking, and how do they reduce bundle size?

**question_id:** `frontend-modern-001`\
**topic_id:** `frontend-modern`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are lazy loading, code splitting and tree shaking, and how do they reduce bundle size?

**Answer**

**Code splitting** breaks the bundle into chunks loaded on demand, usually per route or heavy feature (`import()` dynamic imports, Angular `loadChildren`/`@defer`, React `lazy` + `Suspense`). **Lazy loading** is loading those chunks only when needed or when idle/visible. **Tree shaking** removes unused exports at build time, which relies on ES modules, side-effect-free packages (`sideEffects: false`) and avoiding barrel files and CommonJS. Combine with compression (Brotli), HTTP caching with hashed file names, preloading likely next routes, and a bundle analyzer (`source-map-explorer`, `webpack-bundle-analyzer`) to find heavy dependencies such as full lodash or moment locales. Track Core Web Vitals (LCP, INP) as the success metric.

Real-world example: route-level lazy loading in Angular and React, plus @defer for a heavy widget.

```typescript
// Angular
export const routes: Routes = [
  { path: 'reports', loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent) },
];
// template: load the chart only when it scrolls into view
// @defer (on viewport) { <app-sales-chart /> } @placeholder { <div class="skeleton"></div> }

// React
const Reports = lazy(() => import('./Reports'));
<Suspense fallback={<Spinner />}><Reports /></Suspense>
```

**Keywords:** `lazy loading, code splitting, tree shaking, dynamic import, bundle size, preload, Brotli`

**Follow-ups:**

-   Why can barrel files defeat tree shaking?
-   How do you prefetch the next route?
-   How do you measure the gain?

## frontend-modern-002 --- Explain SSR, hydration and static generation, and when each is worth the complexity.

**question_id:** `frontend-modern-002`\
**topic_id:** `frontend-modern`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

Explain SSR, hydration and static generation, and when each is worth the complexity.

**Answer**

**CSR** ships an empty shell and renders in the browser: simple hosting, slow first paint and weak SEO. **SSR** renders HTML on the server per request for fast first content and SEO, then **hydration** attaches event handlers and state in the browser; costs are server compute, double rendering and hydration mismatches. **SSG** pre-renders at build time (best for stable content, CDN-cached), and **ISR/incremental** revalidates pages. Newer approaches (partial hydration, islands, React Server Components, Angular `@defer` with incremental hydration) ship less JavaScript. Choose SSR/SSG for public, SEO-sensitive pages, and plain CSR for authenticated internal dashboards where first paint matters less.

Real-world example: opting a page into static prerendering versus per-request SSR in Angular.

```typescript
// angular.json: build with SSR + prerender static routes
//   "outputMode": "server", "ssr": { "entry": "src/server.ts" }
// app.routes.server.ts
export const serverRoutes: ServerRoute[] = [
  { path: 'pricing', renderMode: RenderMode.Prerender },   // SSG: built once, CDN-cacheable
  { path: 'products/:id', renderMode: RenderMode.Server }, // SSR per request, SEO + fresh data
  { path: 'account/**', renderMode: RenderMode.Client },   // authenticated area: plain CSR
];
```

**Keywords:** `SSR, hydration, SSG, CSR, SEO, LCP, islands, server components`

**Follow-ups:**

-   What causes hydration mismatch errors?
-   When does SSR hurt TTFB?
-   How do you cache SSR output?

## frontend-modern-003 --- What are microfrontends and Module Federation, and what are the trade-offs?

**question_id:** `frontend-modern-003`\
**topic_id:** `frontend-modern`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What are microfrontends and Module Federation, and what are the trade-offs?

**Answer**

**Microfrontends** split a large UI into independently built and deployed pieces owned by different teams, composed in a shell at build time, run time (Module Federation, import maps, single-spa) or server/edge. **Module Federation** lets one build expose modules that another loads at runtime, with shared singleton dependencies (React, Angular). Benefits: independent deployment and team autonomy for big organisations. Costs: duplicated bundles, version skew of shared libraries, inconsistent UX, harder routing/state sharing, heavier testing and observability. Mitigate with a design system, contract tests, shared auth and strict versioning. For a small team a modular monolith with lazy-loaded feature modules is usually better.

Real-world example: a Module Federation host and remote with shared singletons (webpack).

```javascript
// remote (checkout team)
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',
  exposes: { './CheckoutApp': './src/CheckoutApp' },
  shared: { react: { singleton: true, requiredVersion: '^18.3.0' }, 'react-dom': { singleton: true } },
});
// host (shell)
new ModuleFederationPlugin({
  name: 'shell',
  remotes: { checkout: 'checkout@https://cdn.example.com/checkout/remoteEntry.js' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});
const Checkout = React.lazy(() => import('checkout/CheckoutApp'));
```

**Keywords:** `microfrontends, Module Federation, shell, shared singleton, design system, independent deployment`

**Follow-ups:**

-   How do you share auth state between microfrontends?
-   What causes version conflicts?
-   When would you avoid them?

## frontend-modern-004 --- What is a PWA and which service-worker caching strategies would you use?

**question_id:** `frontend-modern-004`\
**topic_id:** `frontend-modern`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What is a PWA and which service-worker caching strategies would you use?

**Answer**

A **Progressive Web App** is a web app that is installable (web app manifest, HTTPS), works offline or on poor networks through a **service worker**, and can use push notifications and background sync. Caching strategies: *cache-first* for versioned static assets, *network-first* for fresh API data with cache fallback, *stale-while-revalidate* for content that tolerates short staleness. Handle updates deliberately (prompt the user to reload when a new service worker is waiting) and never cache authenticated or personal responses carelessly. Tools: Workbox, Angular `@angular/service-worker`. Verify with Lighthouse and test offline behaviour.

Real-world example: a service worker using stale-while-revalidate for API reads and cache-first for assets (Workbox).

```javascript
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

registerRoute(({ request }) => request.destination === 'image' || request.destination === 'style',
  new CacheFirst({ cacheName: 'assets', plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 })] }));

registerRoute(({ url }) => url.pathname.startsWith('/api/catalog'),
  new StaleWhileRevalidate({ cacheName: 'catalog-api' }));   // never cache /api/account or other personal data
```

**Keywords:** `PWA, service worker, manifest, cache-first, stale-while-revalidate, Workbox, offline`

**Follow-ups:**

-   How do you ship an update to a service worker?
-   What should never be cached?
-   How does background sync work?
