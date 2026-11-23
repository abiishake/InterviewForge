# TOPIC --- Microservices and Containers Architecture
**topic_id:** `arch-micro`
**priority:** `Core`

## arch-micro-001 --- What is data sovereignty per microservice and how do you identify microservice boundaries?

**question_id:** `arch-micro-001`\
**topic_id:** `arch-micro`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Design`

**Question**

What is data sovereignty per microservice, and how do you identify the boundaries of a microservice?

**Answer**

In a microservice architecture each service **owns its data and its schema**; no other service reads or writes its tables directly - access is only through its API or events. This decouples deployment and lets each service pick the best store, but it gives up cross-service ACID transactions and joins, so you design for **eventual consistency**, replicate read-only copies of needed data through integration events, and compose data in an API gateway/BFF or with CQRS read models. **Boundaries** come from **domain-driven design**: find the **bounded contexts** (the same word, such as *Customer*, means different things in Ordering and Marketing) and make each one a candidate service; refine with business capabilities, team ownership (Conway's law), different rates of change, scalability needs and consistency requirements - things that must change in one transaction usually belong together. Warning signs of wrong boundaries: chatty synchronous calls, distributed transactions, shared databases, and deploying services in lock-step. Start with a **modular monolith** if the domain is unclear, since splitting a good module is easier than merging bad services.

Real-world example: Ordering owns its data and keeps only a local copy of the catalog facts it needs, updated through an integration event.

```csharp
// Ordering service: local read-only copy (not the Catalog database!)
public sealed class CatalogItemSnapshot
{
    public int CatalogItemId { get; set; }
    public string Name { get; set; } = "";
    public decimal UnitPrice { get; set; }
}

public sealed class ProductPriceChangedHandler(OrderingDbContext db) : IIntegrationEventHandler<ProductPriceChangedEvent>
{
    public async Task HandleAsync(ProductPriceChangedEvent evt)
    {
        var item = await db.CatalogSnapshots.FindAsync(evt.ProductId);
        if (item is null) db.CatalogSnapshots.Add(new() { CatalogItemId = evt.ProductId, Name = evt.Name, UnitPrice = evt.NewPrice });
        else item.UnitPrice = evt.NewPrice;               // idempotent upsert
        await db.SaveChangesAsync();
    }
}
```

**Keywords:** `data sovereignty, bounded context, microservice boundaries, eventual consistency, database per service, DDD, Conway's law`

**Follow-ups:**

-   Why is a shared database an anti-pattern for microservices?
-   How do you query data that spans several services?
-   When would you start with a modular monolith instead?

## arch-micro-002 --- Direct client-to-microservice communication versus the API Gateway and BFF patterns?

**question_id:** `arch-micro-002`\
**topic_id:** `arch-micro`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Design`

**Question**

Compare direct client-to-microservice communication with the API Gateway pattern and the Backend for Frontend (BFF) variant.

**Answer**

With **direct communication** each client calls each microservice: many round trips, every service exposed publicly, cross-cutting concerns (auth, TLS, rate limiting) repeated, protocol coupling and tight client-service coupling. An **API Gateway** is a single entry point that **routes**, **aggregates** several service calls into one response, and centralises authentication, authorisation, rate limiting, caching, request shaping and observability, hiding the internal topology. Risks: a gateway can become a bottleneck, a single point of failure and a monolith of business logic - keep it thin, scale it out and do not put domain logic in it. **BFF**: a gateway **per client type** (web, mobile, partner) tailored to that client's needs and release cadence. On .NET use **YARP** (Microsoft's reverse proxy, the modern choice), **Ocelot** (used in eShopOnContainers), **Azure API Management** (managed, policies, developer portal) or Azure Application Gateway/Front Door for edge concerns. Often combine: Front Door/WAF at the edge, APIM for external APIs, YARP/BFF for composition.

Real-world example: a YARP gateway with routing, rate limiting and authorisation per route.

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization(o => o.AddPolicy("customers", p => p.RequireAuthenticatedUser()));
builder.Services.AddRateLimiter(o => o.AddFixedWindowLimiter("api", w => { w.PermitLimit = 100; w.Window = TimeSpan.FromMinutes(1); }));

var app = builder.Build();
app.UseAuthentication(); app.UseAuthorization(); app.UseRateLimiter();
app.MapReverseProxy();
app.Run();
// appsettings: Routes -> "orders": { "ClusterId": "ordering", "AuthorizationPolicy": "customers", "RateLimiterPolicy": "api", "Match": { "Path": "/orders/{**catch-all}" } }
```

**Keywords:** `API Gateway, BFF, YARP, Ocelot, Azure API Management, aggregation, rate limiting, reverse proxy`

**Follow-ups:**

-   How do you prevent the gateway from becoming a monolith?
-   When do you need a BFF per client?
-   What is the difference between YARP and API Management?

## arch-micro-003 --- How do synchronous and asynchronous communication, integration events and an event bus fit together?

**question_id:** `arch-micro-003`\
**topic_id:** `arch-micro`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Design`

**Question**

How do synchronous and asynchronous communication, integration events and an event bus fit together in a microservice system?

**Answer**

**Synchronous** request/response (HTTP/REST, gRPC) is simple and right for queries and commands that need an immediate answer, but couples availability: chains of synchronous calls multiply latency and failure probability. **Asynchronous message-based communication** decouples services in time: a service publishes a message and continues. Two kinds: **commands** (one receiver; "reserve stock") and **integration events** ("OrderPaid", past tense, many subscribers) published through an **event bus** (abstraction over RabbitMQ, Azure Service Bus, Kafka; eShopOnContainers implements `IEventBus`). Design rules: events are immutable contracts versioned like APIs; handlers are **idempotent** (at-least-once delivery); publish reliably with the **transactional outbox** (save state and event in one local transaction, a relay publishes it) to avoid dual-write loss; use correlation ids; and handle failures with retries and dead-letter queues. Use **sagas** (orchestrated or choreographed) for multi-service business transactions with compensating actions instead of distributed transactions.

Real-world example: save the aggregate and the event in one transaction (outbox), then publish asynchronously.

```csharp
public async Task<Result> PlaceOrderAsync(PlaceOrder cmd, CancellationToken ct)
{
    var order = Order.Create(cmd.CustomerId, cmd.Lines);
    db.Orders.Add(order);
    db.Outbox.Add(OutboxMessage.From(new OrderPlacedIntegrationEvent(order.Id, order.Total, DateTimeOffset.UtcNow)));
    await db.SaveChangesAsync(ct);          // state + event: one atomic local transaction
    return Result.Ok(order.Id);
}

// background relay
foreach (var msg in await db.Outbox.Where(m => m.PublishedAt == null).OrderBy(m => m.Id).Take(50).ToListAsync(ct))
{
    await eventBus.PublishAsync(msg.Type, msg.Payload, msg.Id, ct);   // MessageId enables duplicate detection
    msg.PublishedAt = DateTimeOffset.UtcNow;
}
await db.SaveChangesAsync(ct);
```

**Keywords:** `integration events, event bus, asynchronous messaging, outbox pattern, saga, idempotency, RabbitMQ, Service Bus, command vs event`

**Follow-ups:**

-   What failure does the outbox pattern prevent?
-   Orchestration versus choreography for a saga?
-   How do you version an event that already has subscribers?

## arch-micro-004 --- How do you version microservice APIs and contracts, and handle service discovery?

**question_id:** `arch-micro-004`\
**topic_id:** `arch-micro`\
**difficulty:** `Senior`\
**question_type:** `Practical / Design`

**Question**

How do you create, evolve and version microservice APIs and contracts, and how do clients find services?

**Answer**

Contracts are public APIs even between internal teams. Evolve them **backward-compatibly**: add optional fields, never remove or repurpose existing ones, tolerate unknown fields (be liberal in what you accept), and use consumer-driven contract tests (Pact) to verify compatibility in CI. When a breaking change is unavoidable, **version**: URL segment (`/v2/orders`), header or media type, with `Asp.Versioning` in ASP.NET Core; run old and new versions side by side and deprecate with a timeline and telemetry showing who still calls v1. For events, version the schema (message type + version) and keep consumers tolerant. **gRPC/Protobuf** has built-in forward/backward compatibility via field numbers. **Addressability**: avoid hard-coded URLs - use DNS/platform service discovery (Kubernetes services, Container Apps internal FQDN), `Microsoft.Extensions.ServiceDiscovery` (Aspire) or a registry; clients resolve logical names and the platform handles load balancing and health. Publish OpenAPI documents and generate clients.

Real-world example: API versioning with deprecation signalling.

```csharp
builder.Services.AddApiVersioning(o =>
{
    o.DefaultApiVersion = new ApiVersion(1, 0);
    o.AssumeDefaultVersionWhenUnspecified = true;
    o.ReportApiVersions = true;                       // adds api-supported-versions / api-deprecated-versions headers
    o.ApiVersionReader = new UrlSegmentApiVersionReader();
}).AddApiExplorer(o => o.GroupNameFormat = "'v'VVV");

var v1 = app.NewApiVersionSet().HasDeprecatedApiVersion(new ApiVersion(1, 0)).HasApiVersion(new ApiVersion(2, 0)).Build();
app.MapGet("/v{version:apiVersion}/orders/{id:guid}", (Guid id, IOrderQueries q) => q.GetAsync(id)).WithApiVersionSet(v1).MapToApiVersion(1, 0);
app.MapGet("/v{version:apiVersion}/orders/{id:guid}", (Guid id, IOrderQueries q) => q.GetV2Async(id)).WithApiVersionSet(v1).MapToApiVersion(2, 0);
```

**Keywords:** `API versioning, contract testing, Pact, backward compatibility, Protobuf, service discovery, OpenAPI, deprecation`

**Follow-ups:**

-   What makes a change breaking for JSON and for Protobuf?
-   How do you know when it is safe to remove v1?
-   How does consumer-driven contract testing catch breakage before deployment?

## arch-micro-005 --- How do you handle partial failure and resiliency in microservices (retries, circuit breaker, health checks)?

**question_id:** `arch-micro-005`\
**topic_id:** `arch-micro`\
**difficulty:** `Senior`\
**question_type:** `Scenario / Practical`

**Question**

How do you handle partial failure in a microservice system using retries, circuit breakers, timeouts and health checks?

**Answer**

In distributed systems some dependency is always slow or down (the network is not reliable). **Handling partial failure** means the system degrades instead of cascading: apply **timeouts** everywhere, **retries with exponential backoff and jitter** for transient errors on idempotent calls, a **circuit breaker** that stops calling a failing service for a cool-down period, **bulkheads** (separate pools/limits) so one slow dependency cannot exhaust all threads, **fallbacks** (cached data, default response, queue for later), and **load shedding/rate limiting**. Implement with `IHttpClientFactory` + Polly / `Microsoft.Extensions.Http.Resilience` (see the e-book's `AddPolicyHandler` examples, now superseded by resilience handlers) and resilient EF Core connections (`EnableRetryOnFailure`). **Health monitoring**: liveness (process is alive), readiness (can serve - dependencies reachable) and startup probes via ASP.NET Core Health Checks, used by Kubernetes/Container Apps to restart or stop routing traffic; surface health in dashboards (Azure Monitor, Health Checks UI). Test failure paths with chaos experiments.

Real-world example: resilient HTTP client, retrying EF Core connections and separate liveness and readiness endpoints.

```csharp
builder.Services.AddHttpClient<PricingClient>(c => c.BaseAddress = new Uri("http://pricing"))
    .AddStandardResilienceHandler();                     // rate limiter, timeout, retry, circuit breaker

builder.Services.AddDbContext<OrderingDbContext>(o => o.UseSqlServer(cs, sql => sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddSqlServer(cs, tags: ["ready"])
    .AddUrlGroup(new Uri("http://pricing/health/ready"), "pricing", tags: ["ready"]);

app.MapHealthChecks("/health/live", new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new() { Predicate = r => r.Tags.Contains("ready") });
```

**Keywords:** `partial failure, retry, exponential backoff, circuit breaker, bulkhead, health checks, liveness, readiness, Polly`

**Follow-ups:**

-   Why must a liveness probe not check downstream dependencies?
-   What goes wrong with retries when many callers retry at once?
-   How do you decide what a fallback returns?

# TOPIC --- DDD and CQRS in a Microservice
**topic_id:** `arch-ddd`
**priority:** `Core`

## arch-ddd-001 --- How do you structure a DDD-oriented microservice into layers, and when is simple CRUD enough?

**question_id:** `arch-ddd-001`\
**topic_id:** `arch-ddd`\
**difficulty:** `Senior / Lead`\
**question_type:** `Design`

**Question**

How do you structure a DDD-oriented microservice into layers, and when is a simple CRUD service enough?

**Answer**

Not every microservice needs DDD: use a plain **data-driven CRUD** service (controllers + EF Core or Dapper, perhaps generated) for simple catalog/reference data, and invest in DDD for **complex business domains** (ordering, pricing, claims). A DDD microservice (the eShopOnContainers *Ordering* service) is organised as: **Domain layer** (entities, value objects, aggregates, domain events, repository interfaces, domain services - no dependency on infrastructure), **Application layer** (commands, queries, handlers, validation, orchestration, transaction boundary, integration-event publishing; thin Web API on top) and **Infrastructure layer** (EF Core mappings, repository implementations, messaging, external clients). Dependencies point inward to the domain (Clean/Onion/hexagonal). Keep the domain **persistence-ignorant** (the model does not know EF), enforce invariants in the aggregate (no public setters, rich behaviour methods), and keep controllers free of business logic. Separate read concerns (queries) from write concerns (commands) in the application layer.

Real-world example: a solution structure and an aggregate enforcing its invariants.

```text
Ordering.Domain          (Order aggregate, Address value object, domain events, IOrderRepository)
Ordering.Application     (commands/handlers, queries, behaviours, integration events)
Ordering.Infrastructure  (OrderingContext, repositories, EF configurations, event bus adapter)
Ordering.Api             (minimal API / controllers, DI composition root)
```

```csharp
public sealed class Order : Entity, IAggregateRoot
{
    private readonly List<OrderItem> _items = [];
    public IReadOnlyCollection<OrderItem> Items => _items;
    public OrderStatus Status { get; private set; } = OrderStatus.Submitted;

    public void AddItem(int productId, string name, decimal unitPrice, int units)
    {
        if (Status != OrderStatus.Submitted) throw new OrderingDomainException("Cannot change a confirmed order.");
        if (units <= 0) throw new OrderingDomainException("Units must be positive.");
        _items.Add(new OrderItem(productId, name, unitPrice, units));
    }
}
```

**Keywords:** `DDD, layers, domain model, application layer, infrastructure, persistence ignorance, aggregate root, eShopOnContainers, CRUD`

**Follow-ups:**

-   How do you decide between a CRUD microservice and a DDD one?
-   Why should the domain layer not reference EF Core?
-   Where does transaction management live?

## arch-ddd-002 --- What are value objects, enumeration classes and seedwork in a DDD domain model?

**question_id:** `arch-ddd-002`\
**topic_id:** `arch-ddd`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What are value objects, enumeration classes and seedwork, and how do they appear in a .NET DDD domain model?

**Answer**

A **value object** has no identity - it is defined by its attributes, is immutable and compared by value (Address, Money, DateRange). In C# use a `record`/`record struct` or a class with `Equals` over components; with EF Core map it as an **owned type** (`OwnsOne`) or complex type. An **entity** has identity and a lifecycle. An **aggregate** is a consistency boundary of entities/value objects with one **aggregate root** that is the only entry point and loads/saves as a unit. **Enumeration classes** replace plain `enum`s when the value needs behaviour or data (OrderStatus with `CanCancel`, allowed transitions, display names); they are classes with static instances, support lookup by id/name and avoid scattered `switch` statements. **Seedwork** is the small reusable set of base types shared across the domain code (`Entity`, `IAggregateRoot`, `ValueObject`, `Enumeration`, `IRepository<T>`, `IUnitOfWork`) - copied per service or shared as a tiny package, deliberately not a heavy shared framework that couples services.

Real-world example: an Enumeration class with behaviour and an owned value object mapping.

```csharp
public abstract class Enumeration(int id, string name) : IComparable
{
    public int Id { get; } = id;
    public string Name { get; } = name;
    public static IEnumerable<T> GetAll<T>() where T : Enumeration =>
        typeof(T).GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly).Select(f => f.GetValue(null)).Cast<T>();
    public int CompareTo(object? other) => Id.CompareTo(((Enumeration)other!).Id);
}

public sealed class OrderStatus(int id, string name, bool canCancel) : Enumeration(id, name)
{
    public static readonly OrderStatus Submitted = new(1, nameof(Submitted), true);
    public static readonly OrderStatus Paid = new(2, nameof(Paid), true);
    public static readonly OrderStatus Shipped = new(3, nameof(Shipped), false);
    public bool CanCancel { get; } = canCancel;
}

public sealed record Address(string Street, string City, string Country, string ZipCode);

modelBuilder.Entity<Order>().OwnsOne(o => o.Address);
```

**Keywords:** `value object, entity, aggregate root, enumeration class, seedwork, owned type, immutability, DDD`

**Follow-ups:**

-   When is an enum better than an Enumeration class?
-   How does EF Core persist a value object inside an aggregate?
-   Why is a shared "domain framework" package across microservices risky?

## arch-ddd-003 --- How do you implement domain validation, domain events and the repository pattern per aggregate?

**question_id:** `arch-ddd-003`\
**topic_id:** `arch-ddd`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you implement validation, domain events and the repository pattern per aggregate in a DDD microservice?

**Answer**

**Validation** exists at two levels: client/API validation (format, required fields, via FluentValidation or data annotations in a pipeline behaviour/endpoint filter) for fast feedback, and **domain invariants** enforced inside the aggregate (a rule that must always hold, such as "cannot ship an empty order") - throw a domain exception or return a result. Never rely only on UI validation. **Domain events** (`OrderStartedDomainEvent`) represent something that happened inside the domain and are raised by aggregates, then dispatched **in-process, before or after commit** (MediatR `INotificationHandler`) so side effects within the same service stay decoupled; they differ from **integration events**, which cross service boundaries asynchronously. A common implementation collects events on the entity and dispatches them from `DbContext.SaveChangesAsync`. A **repository** exists **per aggregate root** (not per table): `Add`, `GetAsync(id)` (loading the entire aggregate) and `Update`; the unit of work is the `DbContext`. Do not expose `IQueryable` from repositories; queries for reads go through a separate query side.

Real-world example: an aggregate raising a domain event dispatched when the context saves.

```csharp
public abstract class Entity
{
    private readonly List<INotification> _domainEvents = [];
    public IReadOnlyCollection<INotification> DomainEvents => _domainEvents;
    protected void AddDomainEvent(INotification e) => _domainEvents.Add(e);
    public void ClearDomainEvents() => _domainEvents.Clear();
}

public sealed class Order : Entity
{
    public void MarkPaid() { Status = OrderStatus.Paid; AddDomainEvent(new OrderPaidDomainEvent(Id)); }
}

public sealed class OrderingContext(DbContextOptions<OrderingContext> options, IMediator mediator) : DbContext(options)
{
    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var events = ChangeTracker.Entries<Entity>().SelectMany(e => e.Entity.DomainEvents).ToList();
        ChangeTracker.Entries<Entity>().ToList().ForEach(e => e.Entity.ClearDomainEvents());
        var result = await base.SaveChangesAsync(ct);
        foreach (var e in events) await mediator.Publish(e, ct);   // post-commit; use pre-commit for same-transaction consistency
        return result;
    }
}
```

**Keywords:** `domain events, integration events, repository per aggregate, validation, invariants, MediatR, unit of work, FluentValidation`

**Follow-ups:**

-   When should domain events be dispatched before commit versus after?
-   Why is a generic repository over every table an anti-pattern in DDD?
-   How do you keep handlers of domain events idempotent?

## arch-ddd-004 --- How do you apply simplified CQRS with Dapper queries and domain-model commands?

**question_id:** `arch-ddd-004`\
**topic_id:** `arch-ddd`\
**difficulty:** `Senior`\
**question_type:** `Practical / Design`

**Question**

How do you apply simplified CQRS in one microservice using the domain model for commands and Dapper (or projections) for queries?

**Answer**

**CQRS** separates the write model (commands that change state and enforce invariants) from the read model (queries optimised for the screens). The *simplified* version used in eShopOnContainers keeps **one database** but two paths: **commands** go through handlers that load the aggregate via the repository, call domain behaviour and save (with domain events); **queries** bypass the domain model and read denormalised **view models/DTOs** with lightweight SQL (Dapper) or EF `AsNoTracking` projections - no aggregates, no repositories, no business rules, no change tracking, so reads are fast and shaped for the client. Benefits: the domain model is not distorted by reporting needs, queries are easy to optimise (indexes, views), and read/write can scale or evolve separately. The full version adds separate stores and **eventual consistency** via events (read model projections), event sourcing optionally - complexity you adopt only when needed. Keep queries side-effect free and commands returning minimal results.

Real-world example: a read-only Dapper query returning a view model.

```csharp
public interface IOrderQueries
{
    Task<IEnumerable<OrderSummary>> GetOrdersByUserAsync(Guid userId);
}

public sealed class OrderQueries(string connectionString) : IOrderQueries
{
    public async Task<IEnumerable<OrderSummary>> GetOrdersByUserAsync(Guid userId)
    {
        await using var conn = new SqlConnection(connectionString);
        return await conn.QueryAsync<OrderSummary>(
            """
            SELECT o.Id AS OrderNumber, o.OrderDate AS [Date], s.Name AS Status, SUM(i.Units * i.UnitPrice) AS Total
            FROM Orders o
            JOIN OrderStatus s ON s.Id = o.OrderStatusId
            JOIN OrderItems i ON i.OrderId = o.Id
            WHERE o.BuyerId = @userId
            GROUP BY o.Id, o.OrderDate, s.Name
            ORDER BY o.OrderDate DESC
            """, new { userId });
    }
}
public sealed record OrderSummary(int OrderNumber, DateTime Date, string Status, decimal Total);
```

**Keywords:** `CQRS, simplified CQRS, Dapper, read model, view model, command handler, eventual consistency, projections`

**Follow-ups:**

-   When does simplified CQRS become full CQRS with separate stores?
-   Why should queries bypass aggregates?
-   How do you keep a read model in sync with the write model?

## arch-ddd-005 --- How do you use NoSQL (document databases) as persistence infrastructure for a DDD microservice?

**question_id:** `arch-ddd-005`\
**topic_id:** `arch-ddd`\
**difficulty:** `Senior`\
**question_type:** `Design / Practical`

**Question**

How do you use NoSQL (document databases) as persistence infrastructure for a DDD microservice?

**Answer**

A **document database** (Cosmos DB, MongoDB) fits an **aggregate** well: the aggregate root and its owned entities/value objects are stored as one JSON document, loaded and saved atomically, so the aggregate boundary equals the transaction boundary (single-document operations are atomic, multi-document usually not). Benefits: schema flexibility, no impedance mismatch, denormalised reads, horizontal scale by **partition key**. Design rules: model documents around access patterns, pick a partition key with high cardinality that appears in most queries (for example `/customerId` or `/tenantId`), keep documents bounded (do not embed unbounded lists), use ETag/optimistic concurrency, keep the repository interface unchanged so the domain stays persistence-ignorant, and publish integration events with a transactional outbox or the **change feed** (Cosmos) to update read models and other services. Trade-offs: no joins or cross-document transactions, duplicated data to keep consistent, and cost driven by RU consumption - so use it where relational features are not needed, or combine (polyglot persistence: SQL for orders, Cosmos for catalog or sessions).

Real-world example: an aggregate repository over Cosmos DB with optimistic concurrency.

```csharp
public sealed class BasketRepository(Container container) : IBasketRepository
{
    public async Task<Basket?> GetAsync(string customerId, CancellationToken ct)
    {
        try
        {
            var r = await container.ReadItemAsync<BasketDocument>(customerId, new PartitionKey(customerId), cancellationToken: ct);
            return r.Resource.ToDomain(r.ETag);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return null; }
    }

    public Task SaveAsync(Basket basket, CancellationToken ct) =>
        container.UpsertItemAsync(BasketDocument.From(basket), new PartitionKey(basket.CustomerId),
            new ItemRequestOptions { IfMatchEtag = basket.ETag },   // optimistic concurrency: 412 if changed meanwhile
            ct);
}
```

**Keywords:** `NoSQL, document database, Cosmos DB, aggregate, partition key, change feed, optimistic concurrency, polyglot persistence`

**Follow-ups:**

-   How do you choose a partition key for an aggregate document?
-   How do you keep other services updated when an aggregate document changes?
-   When would you keep an aggregate in a relational database instead?

# TOPIC --- Cloud-Native Architecture on Azure
**topic_id:** `arch-cloud`
**priority:** `Core`

## arch-cloud-001 --- What does "cloud native" mean and which candidate apps benefit?

**question_id:** `arch-cloud-001`\
**topic_id:** `arch-cloud`\
**difficulty:** `Senior`\
**question_type:** `Conceptual`

**Question**

What does cloud native mean, what are its building blocks and which applications are good candidates?

**Answer**

The CNCF defines cloud-native technologies as enabling scalable applications in modern, dynamic environments (public/private/hybrid clouds) through **containers, service meshes, microservices, immutable infrastructure and declarative APIs**, with loosely coupled systems that are resilient, manageable and observable, backed by robust **automation**. Practical characteristics: **12-factor** style (config in environment, stateless processes, disposability, dev/prod parity, logs as streams), **backing services** (databases, caches, queues) attached as resources, **containers + orchestrators** (AKS, Container Apps), **CI/CD and infrastructure as code**, **elastic scaling**, **resilience by design** and **observability**. Candidate apps: strategic systems that must evolve quickly, scale elastically (spiky traffic), need high availability, and are developed by several teams. Poor candidates: stable systems with few changes, tightly-coupled legacy with no tests, or apps where the migration cost exceeds the benefit - **lift-and-shift to PaaS** or leave them alone. Cloud native is a spectrum, not an all-or-nothing choice; microservices are optional.

Real-world example: a 12-factor aligned container configuration.

```yaml
# Kubernetes Deployment excerpt: config from environment, stateless, probes, resource limits
containers:
  - name: orders
    image: shopacr.azurecr.io/orders:1.8.2
    env:
      - name: ConnectionStrings__Orders
        valueFrom: { secretKeyRef: { name: orders-secrets, key: sql } }
      - name: ASPNETCORE_ENVIRONMENT
        value: Production
    readinessProbe: { httpGet: { path: /health/ready, port: 8080 } }
    livenessProbe:  { httpGet: { path: /health/live, port: 8080 } }
    resources: { requests: { cpu: 250m, memory: 256Mi }, limits: { memory: 512Mi } }
```

**Keywords:** `cloud native, CNCF, twelve-factor, containers, backing services, immutable infrastructure, elasticity, observability`

**Follow-ups:**

-   Which apps should you not rewrite as cloud native?
-   How do the twelve factors map to ASP.NET Core?
-   Are microservices required for cloud native?

## arch-cloud-002 --- Containers versus serverless for scaling cloud-native .NET apps: when and how do you combine them?

**question_id:** `arch-cloud-002`\
**topic_id:** `arch-cloud`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Design`

**Question**

Containers versus serverless for scaling cloud-native .NET apps: when do you choose each and how do you combine them?

**Answer**

**Containers/orchestrators** (AKS, Container Apps): long-running services, predictable startup, full runtime control, stateful sidecars, lots of services; scaling by replicas (HPA/KEDA) on CPU, HTTP concurrency or queue length. **Serverless functions** (Azure Functions, Logic Apps, Event Grid handlers): event-driven, short-lived, spiky or infrequent workloads, scale to zero and pay per execution, minimal operations - at the cost of cold starts, execution limits, less control and potential vendor coupling. Typical hybrid: a container-hosted core of APIs and domain services plus functions for glue (timers, webhooks, file processing, queue fan-out). Scaling considerations: scale **stateless** components, protect downstream limits (database connections, third-party quotas), configure min/max replicas, autoscale on the *right* signal (queue depth, not just CPU), and use **KEDA** to scale Kubernetes/Container Apps from event sources, including to zero. Mind cost models: always-on containers vs. per-execution billing for steady vs bursty loads.

Real-world example: KEDA scaling rule for a worker based on Service Bus queue length.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: order-worker }
spec:
  scaleTargetRef: { name: order-worker }
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
    - type: azure-servicebus
      metadata:
        queueName: orders
        messageCount: "50"
        namespace: shop-prod
      authenticationRef: { name: servicebus-auth }
```

**Keywords:** `containers, serverless, Azure Functions, KEDA, scale to zero, AKS, Container Apps, autoscaling`

**Follow-ups:**

-   Which scaling signal fits a queue worker and why not CPU?
-   How do you stop a scaled-out worker overwhelming the database?
-   When does serverless become more expensive than containers?

## arch-cloud-003 --- What communication patterns suit cloud-native apps: front-end communication, service-to-service, gRPC and service mesh?

**question_id:** `arch-cloud-003`\
**topic_id:** `arch-cloud`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Design`

**Question**

Which communication patterns suit cloud-native apps: front-end client communication, service-to-service calls, gRPC and a service mesh?

**Answer**

**Front-end to backend**: REST/JSON through an API gateway/BFF, GraphQL for flexible aggregation, SignalR/WebSockets for push; terminate TLS, authenticate and rate limit at the edge. **Service-to-service**: keep calls few and coarse; use **HTTP/REST** for simplicity, **gRPC** (HTTP/2, Protobuf contracts, streaming, strong typing, small payloads, `Grpc.AspNetCore`) for internal high-throughput/low-latency APIs - not directly callable from browsers (needs gRPC-Web), and **messaging** for decoupled workflows. Add deadlines/timeouts, retries and circuit breakers. A **service mesh** (Istio, Linkerd, Open Service Mesh, the Istio add-on for AKS; Dapr as application-level building blocks) moves cross-cutting network concerns to **sidecar proxies or the platform**: mutual TLS between services, traffic splitting/canary, retries, timeouts, observability, policy - without changing application code. Cost: extra components and complexity; adopt it when you have many services and need uniform security/traffic control.

Real-world example: a gRPC contract and an ASP.NET Core gRPC service.

```protobuf
syntax = "proto3";
option csharp_namespace = "Shop.Pricing.Grpc";

service Pricing {
  rpc GetPrice (PriceRequest) returns (PriceReply);
  rpc StreamPrices (PriceRequest) returns (stream PriceReply);
}
message PriceRequest { string sku = 1; }
message PriceReply   { string sku = 1; double amount = 2; string currency = 3; }
```

```csharp
public sealed class PricingService(IPriceCatalog catalog) : Pricing.PricingBase
{
    public override async Task<PriceReply> GetPrice(PriceRequest request, ServerCallContext context)
    {
        var price = await catalog.FindAsync(request.Sku, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, "Unknown SKU"));
        return new PriceReply { Sku = request.Sku, Amount = (double)price.Amount, Currency = price.Currency };
    }
}
```

**Keywords:** `gRPC, service mesh, Istio, Linkerd, Dapr, API gateway, mTLS, Protobuf, service-to-service`

**Follow-ups:**

-   When is REST still the better choice than gRPC?
-   What does a service mesh give you that a library like Polly does not?
-   How do you call gRPC from a browser?

## arch-cloud-004 --- Cloud-native data and resiliency: relational versus NoSQL, caching, and resiliency at the infrastructure level?

**question_id:** `arch-cloud-004`\
**topic_id:** `arch-cloud`\
**difficulty:** `Senior`\
**question_type:** `Design`

**Question**

How do you choose between relational and NoSQL data, apply caching, and design infrastructure-level resiliency on Azure?

**Answer**

**Polyglot persistence**: choose a store per service by access pattern - relational (Azure SQL, PostgreSQL) for transactional integrity and ad hoc queries; **document** (Cosmos DB) for flexible schema, global distribution and predictable low-latency by partition key; **key-value/cache** (Redis) for hot data and sessions; **search** (Azure AI Search/Elasticsearch) for full-text and facets; **blob/data lake** for files and analytics; time-series/graph for specialised needs. **Caching**: cache-aside with expirations and invalidation, output/response caching, CDN for static assets, and distributed cache for shared state; beware stale data and stampedes. **Infrastructure resiliency on Azure**: **availability zones** within a region, **geo-replication / paired regions** for disaster recovery, zone-redundant services, Azure SQL failover groups, Cosmos DB multi-region writes, **Traffic Manager / Front Door** for global routing, backups and tested restores with defined **RTO/RPO**, autoscale and health probes. Application and infrastructure resiliency complement each other.

Real-world example: cache-aside with Redis and a stale-tolerant fallback.

```csharp
public async Task<ProductDto?> GetProductAsync(int id, CancellationToken ct)
{
    var key = $"product:{id}";
    var cached = await cache.GetStringAsync(key, ct);
    if (cached is not null) return JsonSerializer.Deserialize<ProductDto>(cached);

    try
    {
        var product = await db.Products.AsNoTracking().Where(p => p.Id == id).Select(p => new ProductDto(p.Id, p.Name, p.Price)).FirstOrDefaultAsync(ct);
        if (product is not null)
            await cache.SetStringAsync(key, JsonSerializer.Serialize(product),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) }, ct);
        return product;
    }
    catch (SqlException ex) when (ex.IsTransient)
    {
        logger.LogWarning(ex, "Database unavailable for product {Id}", id);
        return null;   // or serve a last-known-good copy from a secondary cache
    }
}
```

**Keywords:** `polyglot persistence, Cosmos DB, Redis, cache-aside, availability zones, geo-replication, RTO, RPO, Front Door`

**Follow-ups:**

-   How do you choose a Cosmos DB partition key?
-   What RTO and RPO would you set for an order system and why?
-   How do you invalidate a cache entry across services?

## arch-cloud-005 --- How do identity, observability and DevOps (feature flags, IaC) work in a cloud-native .NET architecture?

**question_id:** `arch-cloud-005`\
**topic_id:** `arch-cloud`\
**difficulty:** `Senior`\
**question_type:** `Design`

**Question**

How do identity, observability and DevOps practices (feature flags, infrastructure as code) fit into a cloud-native .NET architecture on Azure?

**Answer**

**Identity**: centralise authentication in an identity provider - **Microsoft Entra ID** (workforce, External ID for customers) or **Duende IdentityServer/OpenIddict** for custom needs - using OAuth 2.0/OIDC; the front end gets tokens (Authorization Code + PKCE), the gateway/APIs validate JWTs, authorisation uses scopes/roles/policies, and services use **managed identities** to access Azure resources (no secrets). **Observability**: the three pillars - **logs, metrics, traces** - emitted with OpenTelemetry, correlated by trace id, collected in **Azure Monitor/Application Insights** (AKS: Container insights, Prometheus + Grafana), with health checks, dashboards and alerts on SLOs, not just CPU. **DevOps**: everything as code - **CI/CD** pipelines (GitHub Actions/Azure Pipelines) building, scanning and deploying immutable container images; **infrastructure as code** (Bicep/Terraform) reviewed like application code; **feature flags** to decouple deploy from release (progressive delivery, kill switches); blue/green or canary releases; GitOps (Flux/Argo CD) for Kubernetes. Add security scanning (SCA, SAST, image scanning) in the pipeline.

Real-world example: a pipeline that builds, tests and deploys infrastructure and app from the same repo.

```yaml
name: ci-cd
on: { push: { branches: [main] } }
permissions: { id-token: write, contents: read }
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: 10.0.x }
      - run: dotnet test --configuration Release
      - run: docker build -t $ACR/orders:${{ github.sha }} . && docker push $ACR/orders:${{ github.sha }}
  deploy:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2          # OIDC federation: no stored secret
        with: { client-id: ${{ vars.AZURE_CLIENT_ID }}, tenant-id: ${{ vars.AZURE_TENANT_ID }}, subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }} }
      - run: az deployment group create -g rg-shop -f infra/main.bicep -p image=$ACR/orders:${{ github.sha }}
```

**Keywords:** `Entra ID, OIDC, managed identity, OpenTelemetry, Azure Monitor, feature flags, infrastructure as code, GitOps, CI/CD`

**Follow-ups:**

-   How does OIDC federation remove stored deployment secrets?
-   Which SLOs would you alert on for an order API?
-   How do feature flags help decouple deployment from release?

## arch-cloud-006 --- How do you build observability for cloud-native apps with Azure Monitor, Elastic Stack and AKS monitoring?

**question_id:** `arch-cloud-006`\
**topic_id:** `arch-cloud`\
**difficulty:** `Senior`\
**question_type:** `Design / Practical`

**Question**

How do you build observability for cloud-native apps with Azure Monitor, Elastic Stack and AKS monitoring?

**Answer**

Observability = logs, metrics and traces correlated by trace id. On Azure the default is **Azure Monitor**: **Application Insights** (OpenTelemetry-based distributed tracing, dependency maps, live metrics) and **Log Analytics** workspaces queried with KQL; for AKS enable **Container insights** (node/pod metrics, container logs), **Managed Prometheus** and **Managed Grafana** for Kubernetes and app metrics, plus alerts and workbooks. The **Elastic Stack** (Elasticsearch, Logstash/Beats/Elastic Agent, Kibana; or Serilog sinks) is a common self-managed or Elastic Cloud alternative with powerful full-text log search - the cloud-native e-book uses it for centralised logging. Principles are the same: emit **structured logs** to stdout (the platform collects them), use OpenTelemetry exporters (OTLP) so the backend is swappable, propagate W3C trace context across services and queues, define **SLOs/SLIs** and alert on symptoms (error rate, latency percentiles) rather than every cause, add health probes, control volume/cost (sampling, retention tiers) and protect PII in telemetry.

Real-world example: OpenTelemetry in a service exporting to Azure Monitor, and a KQL query for slow requests.

```csharp
builder.Services.AddOpenTelemetry()
    .UseAzureMonitor()                                  // Application Insights via OpenTelemetry (Azure.Monitor.OpenTelemetry.AspNetCore)
    .WithTracing(t => t.AddSource("Shop.Orders"))
    .WithMetrics(m => m.AddMeter("Shop.Orders"));

builder.Logging.AddJsonConsole();                       // structured logs to stdout; the platform ships them

// KQL (Log Analytics): p95 latency by operation over the last hour
// requests | where timestamp > ago(1h)
// | summarize p95=percentile(duration, 95), failures=countif(success == false) by name
// | order by p95 desc
```

**Keywords:** `observability, Azure Monitor, Application Insights, Container insights, Prometheus, Grafana, Elastic Stack, KQL, OpenTelemetry`

**Follow-ups:**

-   Why prefer OpenTelemetry exporters over a vendor SDK?
-   What would you alert on for an order API?
-   How do you control telemetry cost?

## arch-cloud-007 --- What are Helm charts and Cloud Native Application Bundles (CNAB), and how do you package and deploy a multi-service app?

**question_id:** `arch-cloud-007`\
**topic_id:** `arch-cloud`\
**difficulty:** `Intermediate`\
**question_type:** `Conceptual / Practical`

**Question**

What are Helm charts and Cloud Native Application Bundles (CNAB), and how do you package and deploy a multi-service app?

**Answer**

Deploying a distributed app means many artifacts: container images, Kubernetes manifests, config, secrets, cloud resources. **Helm** is the Kubernetes package manager: a **chart** templates manifests with values per environment (`values-prod.yaml`), supports releases, upgrades and **rollbacks** (`helm upgrade --install`, `helm rollback`), dependencies and OCI registries (store charts in ACR). **Cloud Native Application Bundles (CNAB)** is a spec for packaging an application **together with its deployment tooling and infrastructure** (images, Helm charts, ARM/Bicep, scripts) into one signed, versioned bundle with install/upgrade/uninstall actions and parameters/credentials - tools such as Porter implement it; the cloud-native e-book presents it for repeatable, portable delivery. In practice many teams now use Helm or Kustomize plus Bicep/Terraform driven by a GitOps tool (Flux, Argo CD) or `azd`; the principles remain: immutable, versioned artifacts, environment config separated from code, automated and repeatable releases with rollback.

Real-world example: installing a chart from ACR with environment-specific values.

```bash
helm registry login shopacr.azurecr.io --username $ACR_USER --password $ACR_PASSWORD
helm package charts/shop --version 1.8.2 && helm push shop-1.8.2.tgz oci://shopacr.azurecr.io/helm

helm upgrade --install shop oci://shopacr.azurecr.io/helm/shop --version 1.8.2 \
  --namespace shop --create-namespace -f values-prod.yaml \
  --set orders.image.tag=1.8.2 --atomic --timeout 5m     # roll back automatically on failure

helm history shop -n shop
helm rollback shop 7 -n shop
```

**Keywords:** `Helm, CNAB, Porter, Kubernetes packaging, GitOps, Kustomize, rollback, OCI registry`

**Follow-ups:**

-   What does --atomic do during an upgrade?
-   How does GitOps differ from running helm from a pipeline?
-   Where do secrets belong when using Helm values?

# TOPIC --- Modern Web App Architecture
**topic_id:** `arch-web`
**priority:** `Core`

## arch-web-001 --- What architectural principles guide a modern ASP.NET Core application?

**question_id:** `arch-web-001`\
**topic_id:** `arch-web`\
**difficulty:** `Senior`\
**question_type:** `Conceptual`

**Question**

Which architectural principles should guide the design of a modern ASP.NET Core web application?

**Answer**

The core principles from the Microsoft web architecture guidance: **separation of concerns** (UI, business logic, data access in distinct parts), **encapsulation**, **dependency inversion** (high-level policy depends on abstractions; implementation injected by the container - the foundation of testability), **explicit dependencies** (constructor injection, no service locator or static access), **single responsibility**, **don't repeat yourself** (but beware coupling through premature sharing), **persistence ignorance** (domain classes do not depend on EF Core or SQL), **bounded contexts** (a model per business area), and **YAGNI/keep it simple**. Practical consequences: constructor-inject interfaces, configure services in `Program.cs`, keep controllers/endpoints thin, avoid `static` state, put business rules in domain/application services, and test layers independently. Choose the simplest architecture that meets the quality attributes (maintainability, testability, scalability, deployability) - often a well-structured monolith.

Real-world example: constructor injection with an abstraction and a swappable implementation.

```csharp
public interface IBasketService { Task<Basket> AddItemAsync(string userId, int productId, int quantity, CancellationToken ct); }

public sealed class BasketService(IBasketRepository baskets, IProductCatalog catalog, TimeProvider time) : IBasketService
{
    public async Task<Basket> AddItemAsync(string userId, int productId, int quantity, CancellationToken ct)
    {
        var product = await catalog.GetAsync(productId, ct) ?? throw new NotFoundException(nameof(Product), productId);
        var basket = await baskets.GetOrCreateAsync(userId, ct);
        basket.AddItem(product.Id, product.Price, quantity, time.GetUtcNow());   // domain behaviour
        await baskets.SaveAsync(basket, ct);
        return basket;
    }
}

builder.Services.AddScoped<IBasketService, BasketService>();
app.MapPost("/basket/items", (AddItem req, IBasketService svc, ClaimsPrincipal user, CancellationToken ct)
    => svc.AddItemAsync(user.GetUserId(), req.ProductId, req.Quantity, ct));
```

**Keywords:** `separation of concerns, dependency inversion, explicit dependencies, persistence ignorance, SRP, DRY, YAGNI, testability`

**Follow-ups:**

-   Why is the service locator pattern considered harmful?
-   When does DRY cause harmful coupling?
-   How do these principles show up in your project structure?

## arch-web-002 --- Compare traditional web apps, SPAs and the common architecture styles (monolith, layered, Clean Architecture).

**question_id:** `arch-web-002`\
**topic_id:** `arch-web`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Design`

**Question**

Compare traditional server-rendered web apps with SPAs, and the common application architecture styles (monolithic, layered, Clean Architecture).

**Answer**

**Traditional web apps** (MVC/Razor Pages) render HTML on the server: good SEO and first paint, simple deployment, less client complexity, works with little JavaScript; interactivity needs progressive enhancement (HTMX/Blazor Server). **SPAs** (Angular, React, Blazor WebAssembly) run in the browser over APIs: rich interactivity and offline capability, a clean API boundary and reuse for mobile, at the cost of bundle size, SEO/SSR work, client-side security and two codebases. Hybrids (SSR + hydration, Blazor Auto, Next/Angular SSR) mix both. **Architecture styles**: a **monolithic** single deployable unit is simplest to build, test and operate; the issue is not "monolith" but **big ball of mud** - structure it. **Layered** (UI -> business -> data access) is familiar but tends to make everything depend on the database layer. **Clean/Onion/Hexagonal** architecture puts the **domain and application core in the centre** with no outward dependencies; UI and infrastructure depend on the core, which improves testability and lets you swap EF Core, message brokers or UI. A modular monolith applies the same ideas per module. Pick by team size, complexity and rate of change.

Real-world example: a Clean Architecture solution layout and dependency rule.

```text
src/
  Shop.Domain/          // entities, value objects, domain events        -> no references
  Shop.Application/     // use cases, interfaces (IRepository, IClock)    -> Domain
  Shop.Infrastructure/  // EF Core, email, blob, external APIs            -> Application, Domain
  Shop.Web/             // ASP.NET Core UI/API, DI composition root       -> Application, Infrastructure
tests/
  Shop.UnitTests/       // Domain + Application (no infrastructure)
  Shop.IntegrationTests // Infrastructure + Web (Testcontainers, WebApplicationFactory)
```

**Keywords:** `SPA, server-side rendering, monolith, layered architecture, Clean Architecture, onion, modular monolith, dependency rule`

**Follow-ups:**

-   When is a server-rendered app better than an SPA?
-   What problem does the dependency rule solve compared with classic layering?
-   How do you stop a monolith turning into a ball of mud?

## arch-web-003 --- How do you design ASP.NET Core MVC/API code: feature folders, view models, filters and thin controllers?

**question_id:** `arch-web-003`\
**topic_id:** `arch-web`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you organise ASP.NET Core MVC/API code with feature folders, view models/DTOs, filters and thin controllers?

**Answer**

**Feature folders** group everything for a feature (controller/endpoint, view models, validators, views, tests) rather than spreading it across `Controllers/`, `Models/`, `Views/` - changes touch one folder and features are easy to find and remove (a vertical-slice flavour). Use **view models/DTOs** - never expose EF entities to the UI/API: they leak internals, over-post (mass assignment) and tie the contract to the database. Validate with data annotations or FluentValidation (`[ApiController]` returns automatic 400 ProblemDetails), and map with explicit mapping code or a mapper. **Filters** (authorization, resource, action, exception, result) and **middleware** hold cross-cutting concerns (logging, exception handling, caching, validation) so controllers stay thin: bind -> call an application service/handler -> map result to HTTP. Use model binding sources (`[FromBody]`, `[FromRoute]`), return `ProblemDetails` for errors, `ActionResult<T>`/`TypedResults`, versioning and OpenAPI.

Real-world example: a thin feature endpoint with a DTO, validation and an exception filter.

```csharp
// Features/Baskets/AddItem.cs
public sealed record AddItemRequest(int ProductId, [property: Range(1, 100)] int Quantity);
public sealed record BasketDto(string UserId, IReadOnlyList<BasketItemDto> Items, decimal Total);

[ApiController, Route("api/basket"), Authorize]
public sealed class BasketController(IBasketService basket) : ControllerBase
{
    [HttpPost("items")]
    public async Task<ActionResult<BasketDto>> AddItem(AddItemRequest request, CancellationToken ct)
        => Ok((await basket.AddItemAsync(User.GetUserId(), request.ProductId, request.Quantity, ct)).ToDto());
}

public sealed class DomainExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext c)
    {
        if (c.Exception is not DomainException ex) return;
        c.Result = new ObjectResult(new ProblemDetails { Title = "Business rule violated", Detail = ex.Message, Status = 422 }) { StatusCode = 422 };
        c.ExceptionHandled = true;
    }
}
```

**Keywords:** `feature folders, vertical slice, view models, DTO, filters, ProblemDetails, thin controllers, over-posting`

**Follow-ups:**

-   Why should EF entities not be returned from controllers?
-   Middleware versus filters: where does each cross-cutting concern belong?
-   How do feature folders help when removing a feature?

## arch-web-004 --- How do you structure data access and testing in ASP.NET Core: EF Core, specification pattern and the test pyramid?

**question_id:** `arch-web-004`\
**topic_id:** `arch-web`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you structure data access and testing: EF Core, the specification pattern, and the test pyramid for an ASP.NET Core app?

**Answer**

EF Core is already a unit of work + repository; add your own repository abstraction only when it gives value (domain-aligned aggregate repositories, hiding persistence from the core, testing). The **specification pattern** encapsulates a query's criteria, includes and ordering in a reusable object (`BasketWithItemsSpec`), so repositories stay small and queries are testable and composable - libraries such as Ardalis.Specification implement it. Performance practices: `AsNoTracking` for reads, projections (`Select`), avoid N+1 with `Include`/split queries, indexes, pagination, compiled queries when hot. **Testing pyramid**: many fast **unit tests** (domain and application logic, no I/O), fewer **integration tests** (EF Core against a real database - SQLite in-memory is not the same as SQL Server, so prefer Testcontainers - and the HTTP pipeline via `WebApplicationFactory<T>`), and few **end-to-end/UI tests** (Playwright). Add contract tests for external APIs and load tests for hot paths. The in-memory EF provider is discouraged for behavioural tests.

Real-world example: a specification and an integration test with WebApplicationFactory and Testcontainers.

```csharp
public sealed class ActiveOrdersForCustomer : Specification<Order>
{
    public ActiveOrdersForCustomer(Guid customerId)
    {
        Query.Where(o => o.CustomerId == customerId && o.Status != OrderStatus.Cancelled)
             .Include(o => o.Items)
             .OrderByDescending(o => o.CreatedAt)
             .AsNoTracking();
    }
}

public sealed class ApiTests(SqlServerFixture sql) : IClassFixture<SqlServerFixture>
{
    [Fact]
    public async Task Returns_only_active_orders()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.ReplaceDbContext<ShopContext>(sql.ConnectionString)));
        var client = factory.CreateClient();

        var orders = await client.GetFromJsonAsync<List<OrderDto>>($"/api/customers/{TestData.CustomerId}/orders");

        Assert.All(orders!, o => Assert.NotEqual("Cancelled", o.Status));
    }
}
```

**Keywords:** `EF Core, specification pattern, repository, test pyramid, WebApplicationFactory, Testcontainers, AsNoTracking, integration tests`

**Follow-ups:**

-   Why is the EF Core in-memory provider a poor basis for tests?
-   When is a repository abstraction on top of EF Core worth it?
-   What belongs in each layer of the test pyramid?

## arch-web-005 --- What are the Azure hosting recommendations for ASP.NET Core web apps and how do you design for scale and cost?

**question_id:** `arch-web-005`\
**topic_id:** `arch-web`\
**difficulty:** `Senior`\
**question_type:** `Design`

**Question**

What are the Azure hosting recommendations for an ASP.NET Core web application, and how do you design for scale and cost?

**Answer**

A typical reference architecture: **Azure App Service** (or Container Apps) hosting the web/API with autoscale and deployment slots; **Azure SQL Database** (or PostgreSQL/Cosmos DB) for data with geo-replication/failover groups; **Azure Cache for Redis** for sessions/cache; **Blob Storage** for files behind a **CDN/Front Door**; **Key Vault** and managed identity for secrets; **Application Insights/Azure Monitor** for telemetry; **Service Bus/Queue** and **Functions** for background work; **Entra ID** for identity; private endpoints and a WAF for security. Design for **scale**: stateless web tier (no in-memory session; use Redis/cookies), scale out rather than up, cache aggressively, async work off the request path, and database tuning/read replicas. For **cost**: right-size SKUs, autoscale with schedules, reserved instances/savings plans for steady load, dev/test pricing, scale-to-zero for non-prod, lifecycle policies on storage, budgets and alerts, and review with the Azure Well-Architected Framework (reliability, security, cost optimisation, operational excellence, performance efficiency).

Real-world example: autoscale rules for an App Service plan via Bicep.

```bicep
resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: 'shop-web-autoscale'
  location: location
  properties: {
    targetResourceUri: plan.id
    enabled: true
    profiles: [{
      name: 'default'
      capacity: { minimum: '2', maximum: '10', default: '2' }
      rules: [{
        metricTrigger: { metricName: 'CpuPercentage', metricResourceUri: plan.id, timeGrain: 'PT1M', statistic: 'Average',
                         timeWindow: 'PT10M', timeAggregation: 'Average', operator: 'GreaterThan', threshold: 70 }
        scaleAction: { direction: 'Increase', type: 'ChangeCount', value: '1', cooldown: 'PT5M' }
      }]
    }]
  }
}
```

**Keywords:** `Azure App Service, autoscale, Redis, Front Door, Well-Architected Framework, stateless, cost optimisation, reference architecture`

**Follow-ups:**

-   Why must the web tier be stateless to scale out?
-   Which Well-Architected pillar trades off against cost most often?
-   How do you reduce non-production cost?

# TOPIC --- Client App Architecture: Blazor and MAUI
**topic_id:** `arch-client`
**priority:** `Strong`

## arch-client-001 --- Compare Blazor Server, Blazor WebAssembly and Blazor Auto render modes.

**question_id:** `arch-client-001`\
**topic_id:** `arch-client`\
**difficulty:** `Senior`\
**question_type:** `Comparison`

**Question**

Compare Blazor Server, Blazor WebAssembly and Blazor Auto (interactive render modes) and explain how to choose.

**Answer**

Blazor builds interactive web UIs in C# with components (`.razor`). Render modes (.NET 8+ unified "Blazor Web App"): **Static SSR** (server-rendered HTML, no interactivity - best for content), **Interactive Server** (components run on the server; UI events and DOM diffs flow over a **SignalR** connection - fast start, small download, full server access, but needs a persistent connection per user, latency-sensitive interactions and server memory per circuit), **Interactive WebAssembly** (.NET runtime and app run in the browser - offline/PWA capable, scales with client CPU, no server connection per user, but a larger initial download and code is visible to the client so secrets stay on the server), and **Interactive Auto** (starts on Server, then switches to WebAssembly once downloaded). Choose per component/page with `@rendermode`. Consider: scale (circuits cost memory), network quality, offline needs, startup time, SEO (SSR/prerendering), security (WASM code is public) and team skills. Shared components can run in either mode if they only depend on abstractions that have server and client implementations.

Real-world example: a page mixing static SSR with one interactive component.

```razor
@page "/products"
@inject IProductService Products

<h1>Products</h1>

@* Static, SEO friendly, rendered on the server *@
<ul>
@foreach (var p in products) { <li>@p.Name - @p.Price.ToString("C")</li> }
</ul>

@* Only this component is interactive and moves to WebAssembly after download *@
<AddToBasket @rendermode="InteractiveAuto" ProductId="42" />

@code {
    private List<ProductDto> products = [];
    protected override async Task OnInitializedAsync() => products = await Products.GetAllAsync();
}
```

**Keywords:** `Blazor, render modes, Blazor Server, WebAssembly, Interactive Auto, static SSR, SignalR circuit, prerendering`

**Follow-ups:**

-   What happens to a Blazor Server app when the SignalR connection drops?
-   How do you share services between the server and WebAssembly sides?
-   Why must secrets never be placed in a WebAssembly app?

## arch-client-002 --- How do you migrate an ASP.NET Web Forms application to Blazor?

**question_id:** `arch-client-002`\
**topic_id:** `arch-client`\
**difficulty:** `Senior`\
**question_type:** `Scenario`

**Question**

How do you approach migrating an ASP.NET Web Forms application to Blazor?

**Answer**

Web Forms and Blazor are both component-based and event-driven, but the models differ: Web Forms has a **page lifecycle with ViewState, postbacks and server controls**; Blazor has **components with parameters, state held in the component/DI, render trees and explicit data flow**. Approach: (1) **Assess**: inventory pages, user controls, third-party control suites, HttpModules/Handlers, session usage, Windows auth, WCF/ASMX dependencies; (2) separate **business logic and data access** into class libraries (target .NET Standard/modern .NET) before touching UI; (3) migrate **incrementally** with a reverse proxy (YARP) or the **System.Web Adapters** library so legacy and new pages coexist, sharing authentication and session; (4) translate controls: `GridView`/`Repeater` -> `QuickGrid`/loops or a component library; user controls -> Razor components; master pages -> layouts; `Page_Load` -> `OnInitializedAsync`; ViewState -> component state; postback events -> `@onclick`/`EventCallback`; validation -> `EditForm` + data annotations; (5) replace HttpContext/session with DI services, and `web.config` with `IConfiguration`; (6) pick a render mode and host on App Service/Container Apps. Do not translate line-by-line - redesign data flow.

Real-world example: a Web Forms button postback and data bind translated to a Blazor component.

```razor
@* Web Forms: <asp:Button OnClick="Save_Click" /> + ViewState-bound GridView -> Blazor component *@
@inject ICustomerService Customers

<EditForm Model="customer" OnValidSubmit="SaveAsync">
    <DataAnnotationsValidator />
    <InputText @bind-Value="customer.Name" class="form-control" />
    <ValidationMessage For="() => customer.Name" />
    <button type="submit" disabled="@saving">Save</button>
</EditForm>

@code {
    [Parameter] public int Id { get; set; }
    private CustomerDto customer = new();
    private bool saving;

    protected override async Task OnInitializedAsync() => customer = await Customers.GetAsync(Id) ?? new();   // was Page_Load

    private async Task SaveAsync()
    {
        saving = true;
        await Customers.SaveAsync(customer);
        saving = false;
    }
}
```

**Keywords:** `Web Forms, Blazor, migration, ViewState, System.Web Adapters, YARP, EditForm, incremental migration`

**Follow-ups:**

-   What replaces ViewState in Blazor?
-   How do you share authentication between Web Forms and Blazor during migration?
-   How would you handle a third-party control suite with no Blazor version?

## arch-client-003 --- Which architectural patterns does .NET MAUI use for enterprise apps (MVVM, DI, navigation, validation, offline)?

**question_id:** `arch-client-003`\
**topic_id:** `arch-client`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

Which architectural patterns do .NET MAUI enterprise apps use: MVVM, dependency injection, navigation, validation and offline data?

**Answer**

**MVVM** separates the **View** (XAML), **ViewModel** (state and commands, testable, no UI types) and **Model** (domain/data), connected by **data binding** and `INotifyPropertyChanged`; the **CommunityToolkit.Mvvm** source generators (`[ObservableProperty]`, `[RelayCommand]`) remove boilerplate. **Dependency injection** is built in (`MauiProgram` + `IServiceCollection`) for view models, services and `HttpClient`; resolve pages through DI and inject `INavigationService`/Shell abstractions so view models stay testable. **Navigation**: Shell routes with typed parameters, deep links. **Validation**: rules on the view model (data annotations/FluentValidation) surfaced through binding and behaviours, and always re-validated on the server. **Communication**: REST via a typed `HttpClient` with auth (OIDC with the system browser, token storage in `SecureStorage`), resilience (Polly retries, timeouts) and cancellation. **Offline-first**: local **SQLite** cache, a sync queue (outbox) with conflict resolution, connectivity monitoring, background sync, and optimistic UI. Also: **Messaging** (`WeakReferenceMessenger`) for decoupled notifications, accessibility, localisation and platform abstractions.

Real-world example: a view model using CommunityToolkit.Mvvm with an injected service.

```csharp
public partial class OrdersViewModel(IOrderApi api, IConnectivity connectivity, ILocalStore store) : ObservableObject
{
    [ObservableProperty] private bool isBusy;
    [ObservableProperty] private ObservableCollection<OrderSummary> orders = [];

    [RelayCommand]
    private async Task LoadAsync(CancellationToken ct)
    {
        IsBusy = true;
        try
        {
            var items = connectivity.NetworkAccess == NetworkAccess.Internet
                ? await api.GetOrdersAsync(ct)           // online: refresh and cache
                : await store.GetOrdersAsync(ct);        // offline: local SQLite copy
            Orders = new(items);
        }
        finally { IsBusy = false; }
    }
}

// MauiProgram.cs
builder.Services.AddSingleton<IConnectivity>(Connectivity.Current);
builder.Services.AddTransient<OrdersViewModel>().AddTransient<OrdersPage>();
builder.Services.AddHttpClient<IOrderApi, OrderApi>().AddStandardResilienceHandler();
```

**Keywords:** `.NET MAUI, MVVM, CommunityToolkit.Mvvm, dependency injection, Shell navigation, offline-first, SQLite, SecureStorage`

**Follow-ups:**

-   How does MVVM make view logic unit-testable?
-   How would you synchronise offline changes and resolve conflicts?
-   Where do you store tokens on a mobile device?

## arch-client-004 --- How do you design offline sync and conflict resolution for a .NET MAUI app?

**question_id:** `arch-client-004`\
**topic_id:** `arch-client`\
**difficulty:** `Senior`\
**question_type:** `Design / Scenario`

**Question**

How do you design offline sync and conflict resolution for a .NET MAUI app?

**Answer**

Offline-first means the app works against a **local SQLite store** and syncs when connectivity returns. Design: every write goes to the local DB and an **outbox/operation queue** (operation type, entity id, payload, client timestamp, idempotency key); a sync service (triggered by connectivity changes, app resume and background tasks) **pushes** the queue in order with retries and backoff, then **pulls** changes since the last **sync token/delta link** (server returns changes and tombstones for deletes). Give entities stable client-generated ids (GUIDs), server version/ETag and a `rowVersion`. **Conflict resolution** options: last-write-wins (simple, loses data), server-wins, field-level merge, or surface the conflict to the user; choose per entity - for example last-write-wins for preferences, merge or prompt for orders. Make server endpoints **idempotent** (dedupe by key), handle partial failure per operation, keep payloads small (paging, compression), encrypt the local DB for sensitive data and show sync state in the UI. Libraries (Azure Mobile Apps/Datasync Community Toolkit, Couchbase Lite, Realm) provide much of this.

Real-world example: an outbox entry written with the local change and a push loop that treats 409 as a conflict.

```csharp
public async Task SaveOrderLocallyAsync(Order order)
{
    await using var tx = await db.BeginTransactionAsync();
    await db.UpsertAsync(order);
    await db.InsertAsync(new OutboxOp { Id = Guid.NewGuid(), Entity = "order", EntityId = order.Id, Payload = JsonSerializer.Serialize(order), CreatedAt = DateTimeOffset.UtcNow });
    await tx.CommitAsync();
    syncSignal.Release();                           // wake the sync loop
}

public async Task PushAsync(CancellationToken ct)
{
    foreach (var op in await db.PendingOpsAsync())
    {
        var res = await api.PutAsync($"/orders/{op.EntityId}", op, idempotencyKey: op.Id, ifMatch: op.ETag, ct);
        if (res.StatusCode == HttpStatusCode.Conflict) await conflicts.ResolveAsync(op, await res.ReadServerCopyAsync(ct));
        else if (res.IsSuccessStatusCode) await db.MarkDoneAsync(op);
        else break;                                // keep order; retry later with backoff
    }
}
```

**Keywords:** `offline-first, MAUI, SQLite, sync, outbox, conflict resolution, idempotency, delta sync, tombstones`

**Follow-ups:**

-   When is last-write-wins acceptable and when is it dangerous?
-   How do you sync deletes?
-   How do you keep the outbox from sending the same operation twice?

# TOPIC --- Design Guidelines for Frameworks and Libraries
**topic_id:** `arch-guidelines`
**priority:** `Useful`

## arch-guidelines-001 --- What are the key .NET Framework Design Guidelines for naming, types and members?

**question_id:** `arch-guidelines-001`\
**topic_id:** `arch-guidelines`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are the key .NET Framework Design Guidelines for naming, type design and member design that apply to your own libraries?

**Answer**

The guidelines (Cwalina/Abrams, maintained by Microsoft) make APIs consistent, discoverable and hard to misuse. **Naming**: PascalCase for types/members, camelCase for parameters, `I` prefix for interfaces, `Async` suffix for task-returning methods, no abbreviations or Hungarian notation, plural names for collections, verbs for methods, and `Is/Has/Can` for booleans. **Type design**: prefer classes unless the value-type criteria hold (small, immutable, short-lived), seal classes by default unless designed for inheritance, prefer composition and interfaces for extension points, use abstract base classes for versionable contracts, and avoid public nested types. **Member design**: properties should be cheap and side-effect-free, methods for expensive or mutating work; avoid output parameters and long parameter lists (use options objects); provide overloads consistently (shorter overloads delegate to the fullest); accept the most general parameter type (`IEnumerable<T>`) and return the most useful; return empty collections instead of null; make failures explicit (throw specific exceptions, offer `TryXxx` patterns); support `CancellationToken` and `IDisposable`/`IAsyncDisposable` correctly. Design **pit of success** APIs: the easy path is the correct path.

Real-world example: a small API applying the guidelines (options object, Try pattern, cancellation, sealed).

```csharp
public sealed class PriceClientOptions
{
    public Uri BaseAddress { get; set; } = new("https://prices.example.com");
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(10);
}

public sealed class PriceClient(HttpClient http, IOptions<PriceClientOptions> options)
{
    /// <summary>Gets the current price, or throws <see cref="PriceNotFoundException"/>.</summary>
    public async Task<Price> GetPriceAsync(string sku, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sku);
        return await TryGetPriceAsync(sku, cancellationToken) ?? throw new PriceNotFoundException(sku);
    }

    public async Task<Price?> TryGetPriceAsync(string sku, CancellationToken cancellationToken = default)
    {
        using var response = await http.GetAsync($"prices/{Uri.EscapeDataString(sku)}", cancellationToken);
        return response.StatusCode == HttpStatusCode.NotFound ? null : await response.Content.ReadFromJsonAsync<Price>(cancellationToken);
    }
}
```

**Keywords:** `Framework Design Guidelines, naming conventions, API design, TryParse pattern, sealed classes, options object, pit of success`

**Follow-ups:**

-   Why seal classes by default?
-   When do you offer both X and TryX methods?
-   Why return empty collections instead of null?

## arch-guidelines-002 --- How do you version and ship a NuGet library: SemVer, binary compatibility and multi-targeting?

**question_id:** `arch-guidelines-002`\
**topic_id:** `arch-guidelines`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you version and ship a NuGet library: semantic versioning, binary and source compatibility, multi-targeting and package hygiene?

**Answer**

Use **semantic versioning**: MAJOR for breaking changes, MINOR for backward-compatible features, PATCH for fixes, with pre-release suffixes (`-preview.1`). Distinguish **source-breaking** (recompile fails: renamed member, added overload causing ambiguity) from **binary-breaking** (existing compiled callers fail at runtime: removed/changed signature, changed return type, moved type) - and **behavioural** breaks (same signature, different semantics) which are the hardest to detect. Guard the public API with **PublicApiAnalyzers** and API-compat checks (`EnablePackageValidation`, `Microsoft.CodeAnalysis.PublicApiAnalyzers`), and mark obsolete first (`[Obsolete]` with a message) before removing in the next major. **Multi-target** (`netstandard2.0;net8.0;net10.0`) to support old consumers and use new APIs via conditional compilation; **library guidance**: do not depend on a specific logging/DI framework (use `Microsoft.Extensions.*` abstractions), avoid static state, keep dependencies minimal and ranges permissive, enable SourceLink, deterministic builds, XML docs, README and icon, sign packages, and publish symbols. Ship via CI with automated pack/validate/push.

Real-world example: package metadata and API compatibility validation in the project file.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>netstandard2.0;net8.0;net10.0</TargetFrameworks>
    <Version>2.1.0</Version>
    <PackageId>Shop.Pricing.Client</PackageId>
    <PackageReadmeFile>README.md</PackageReadmeFile>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <PublishRepositoryUrl>true</PublishRepositoryUrl>
    <EmbedUntrackedSources>true</EmbedUntrackedSources>
    <ContinuousIntegrationBuild Condition="'$(CI)' == 'true'">true</ContinuousIntegrationBuild>
    <EnablePackageValidation>true</EnablePackageValidation>
    <PackageValidationBaselineVersion>2.0.0</PackageValidationBaselineVersion>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.PublicApiAnalyzers" Version="3.3.4" PrivateAssets="all" />
    <PackageReference Include="Microsoft.SourceLink.GitHub" Version="8.0.0" PrivateAssets="all" />
  </ItemGroup>
</Project>
```

**Keywords:** `NuGet, semantic versioning, binary compatibility, multi-targeting, PublicApiAnalyzers, package validation, SourceLink, library guidance`

**Follow-ups:**

-   Give an example of a change that is source-compatible but binary-breaking.
-   Why avoid taking a dependency on a specific DI or logging library in a library?
-   How do you deprecate a public API responsibly?

## arch-guidelines-003 --- How do you design extensibility, async APIs and disposal correctly in a reusable library?

**question_id:** `arch-guidelines-003`\
**topic_id:** `arch-guidelines`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you design extensibility, async APIs and disposal correctly in a reusable .NET library?

**Answer**

**Extensibility**: favour **interfaces and delegates/options** over inheritance; if you offer virtual members, document the contract, keep the surface small and prefer protected `virtual` hooks on abstract bases; accept dependencies via constructors; expose `Add*` extension methods for `IServiceCollection` that register defaults and accept `Action<TOptions>`; use the **options pattern** (`IOptions<T>` with validation) for configuration. **Async**: expose truly async I/O (`Task`/`ValueTask`) with a `CancellationToken` as the last optional parameter; do not provide sync-over-async or async-over-sync wrappers (leave that choice to the caller); use `ConfigureAwait(false)` in library code to avoid capturing a context; return `IAsyncEnumerable<T>` for streams. **Disposal**: implement `IDisposable`/`IAsyncDisposable` for types that own unmanaged or disposable resources, use the standard dispose pattern, do not dispose objects you do not own (an injected `HttpClient`), make `Dispose` idempotent and document thread safety. Do not throw from `Dispose`, avoid finalizers unless you own native handles (use `SafeHandle`), and log via `ILogger<T>` (optional) rather than writing to the console.

Real-world example: a service-collection extension with options and an async-disposable client.

```csharp
public static class PricingServiceCollectionExtensions
{
    public static IServiceCollection AddPricingClient(this IServiceCollection services, Action<PriceClientOptions>? configure = null)
    {
        var builder = services.AddOptions<PriceClientOptions>().ValidateDataAnnotations().ValidateOnStart();
        if (configure is not null) builder.Configure(configure);
        services.AddHttpClient<PriceClient>();
        return services;
    }
}

public sealed class PriceStream(HttpClient http) : IAsyncDisposable
{
    private Stream? _stream;

    public async IAsyncEnumerable<Price> ReadAsync([EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _stream = await http.GetStreamAsync("prices/stream", cancellationToken).ConfigureAwait(false);
        await foreach (var p in JsonSerializer.DeserializeAsyncEnumerable<Price>(_stream, cancellationToken: cancellationToken).ConfigureAwait(false))
            if (p is not null) yield return p;
    }

    public ValueTask DisposeAsync() => _stream is null ? ValueTask.CompletedTask : _stream.DisposeAsync();   // http is not owned
}
```

**Keywords:** `library design, extensibility, IServiceCollection extension, options pattern, IAsyncDisposable, ConfigureAwait, CancellationToken, dispose pattern`

**Follow-ups:**

-   Why should a library avoid sync-over-async wrappers?
-   Why use ConfigureAwait(false) in libraries but not necessarily in ASP.NET Core apps?
-   Who disposes an injected HttpClient?
