# Real-world code examples: comparisons, production scenarios, behavioral answers, low-level design and rapid-fire

## comparisons-001
EF Core versus Dapper on the same endpoint: EF for writes and rich models, Dapper for hot read paths and hand-tuned SQL.

```csharp
// EF Core: change tracking, migrations, LINQ, aggregate persistence
var claim = await db.Claims.Include(c => c.Notes).SingleAsync(c => c.Id == id, ct);
claim.AddNote(userId, text);
await db.SaveChangesAsync(ct);

// Dapper: one hand-written query, minimal overhead, no tracking
const string sql = """
    SELECT c.Id, c.Status, c.Amount, p.HolderName
    FROM Claims c JOIN Policies p ON p.Id = c.PolicyId
    WHERE c.Status = @status ORDER BY c.SubmittedAt DESC OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY
    """;
var rows = await conn.QueryAsync<ClaimListItem>(new CommandDefinition(sql, new { status, skip, take }, cancellationToken: ct));
// Many teams use both: EF Core for the write model/migrations, Dapper (or EF projections) for reporting-style reads.
```

## comparisons-002
RabbitMQ versus Kafka versus Azure Service Bus, shown as the consumer code you would write for each.

```csharp
// RabbitMQ: smart broker, routing (exchanges/queues), per-message ack, great for task queues and RPC-style workflows
channel.BasicConsume("payments", autoAck: false, consumer);      // consumer.Received += (_, ea) => { Handle(ea); channel.BasicAck(ea.DeliveryTag, false); };

// Kafka: distributed log, replay by offset, huge throughput, ordering per partition, consumer groups
consumer.Subscribe("orders"); var r = consumer.Consume(ct); Handle(r); consumer.Commit(r);

// Azure Service Bus: managed enterprise messaging, sessions, DLQ, scheduled delivery, duplicate detection, topics/subscriptions
processor.ProcessMessageAsync += async a => { await HandleAsync(a.Message); await a.CompleteMessageAsync(a.Message); };
// Pick: commands/work items -> RabbitMQ or Service Bus; event streams, analytics, replay -> Kafka; fully managed on Azure -> Service Bus.
```

## comparisons-003
Modular monolith: strict module boundaries inside one deployable, communicating through public contracts, ready to extract later.

```text
src/
  Host/                         (single process, composition root)
  Modules/
    Ordering/  { Ordering.PublicApi (interfaces + events), Ordering.Core (internal), Ordering.Data (own schema) }
    Billing/   { Billing.PublicApi,  Billing.Core,  Billing.Data }
    Shipping/  { Shipping.PublicApi, Shipping.Core, Shipping.Data }
```

```csharp
// Billing may call Ordering only via its public contract (and a architecture test enforces it)
public interface IOrdersModule { Task<OrderSummary?> GetAsync(Guid id, CancellationToken ct); }

[Fact] public void Modules_must_not_reference_each_others_internals() =>
    Types.InAssembly(typeof(BillingModule).Assembly).ShouldNot().HaveDependencyOn("Ordering.Core").GetResult().IsSuccessful.Should().BeTrue();   // NetArchTest
```

## comparisons-004
Abstract class versus interface (default members) and `Task` versus `ValueTask`.

```csharp
public interface IPriceRule { decimal Apply(decimal price); string Name => GetType().Name; }      // contract + optional default member

public abstract class PriceRuleBase : IPriceRule                                                   // shared state/behaviour for related implementations
{
    protected abstract decimal Compute(decimal price);
    public decimal Apply(decimal price) { var result = Compute(price); return Math.Max(0, result); }
}

public sealed class CatalogReader(IMemoryCache cache, ICatalogApi api)
{
    // ValueTask: avoids a Task allocation when the result is usually synchronous (cache hit)
    public ValueTask<Product> GetAsync(string sku) =>
        cache.TryGetValue(sku, out Product? p) ? new ValueTask<Product>(p!) : new ValueTask<Product>(LoadAsync(sku));
    private async Task<Product> LoadAsync(string sku) => cache.Set(sku, await api.GetAsync(sku));
}
// Await a ValueTask once only; use Task for anything stored, awaited multiple times or combined with WhenAll.
```

## scenarios-001
Intermittent 500s: find the failing requests with a correlation id, then group exceptions by type and dependency.

```kusto
exceptions
| where timestamp > ago(1h) and cloud_RoleName == "claims-api"
| summarize count() by type, outerMessage, operation_Name
| order by count_ desc

requests | where timestamp > ago(1h) and resultCode startswith "5"
| join kind=inner (dependencies | where success == false) on operation_Id     // which dependency failed in the same request?
| summarize failures = count() by target, name, resultCode
```

```csharp
// Make future incidents easier: global handler that logs the correlation id and returns it to the caller
app.UseExceptionHandler(a => a.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    logger.LogError(ex, "Unhandled error {TraceId}", Activity.Current?.TraceId);
    await Results.Problem(statusCode: 500, extensions: new Dictionary<string, object?> { ["traceId"] = Activity.Current?.TraceId.ToString() }).ExecuteAsync(ctx);
}));
```

## scenarios-002
RabbitMQ backlog growing: check rates, consumers and poison messages with the management API, then scale or fix the consumer.

```bash
rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers message_stats.publish_details.rate message_stats.deliver_get_details.rate
# publish rate > deliver rate  => consumers too slow (scale out or optimise)
# messages_unacknowledged high => consumers stuck or prefetch too high
# consumers = 0                => consumer crashed or not subscribed
```

```csharp
cfg.ReceiveEndpoint("payments", e =>
{
    e.PrefetchCount = 32;                     // tune: too high starves other consumers, too low wastes round trips
    e.ConcurrentMessageLimit = 8;
    e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
    e.ConfigureConsumer<PaymentConsumer>(ctx);
});
// Then: look for one poison message being retried forever, slow downstream calls inside the consumer, and add KEDA autoscaling on queue length.
```

## scenarios-003
Pods healthy but users get 503: the Service has no ready endpoints, or ingress/readiness is misconfigured.

```bash
kubectl get endpoints claims-api                         # empty ENDPOINTS => selector mismatch or no ready pods
kubectl get pods -l app=claims-api -o wide               # READY 0/1 means failing readiness although Running
kubectl describe ingress claims-api                      # backend service name/port correct? TLS secret present?
kubectl logs deploy/ingress-nginx-controller -n ingress-nginx | grep " 503 "
kubectl exec -it deploy/claims-api -- curl -s localhost:8080/health/ready   # what does readiness actually return?
```

```yaml
# Common root cause: Service targets the wrong port/labels
spec:
  selector: { app: claims-api }        # must equal the pod template labels
  ports: [{ port: 80, targetPort: 8080 }]   # must equal the container's listening port
```

## scenarios-004
Memory grows until the pod is OOMKilled: confirm with metrics, take a heap dump, fix the root cause, set safe limits.

```bash
kubectl top pod -l app=claims-api --containers
kubectl describe pod claims-api-7d9c | grep -B1 -A3 OOMKilled
kubectl exec claims-api-7d9c -- dotnet-gcdump collect -p 1 -o /tmp/leak.gcdump && kubectl cp claims-api-7d9c:/tmp/leak.gcdump ./leak.gcdump
```

```csharp
// Typical cause: unbounded in-memory cache / static list / event handlers never removed
services.AddMemoryCache(o => o.SizeLimit = 50_000);                             // bound the cache
// Mitigation: memory limit with headroom + GC cap + readiness-aware restarts
// env: DOTNET_GCHeapHardLimitPercent=75; resources.limits.memory=1Gi; add an alert on working set > 80% of the limit
```

## scenarios-005
Customers charged twice: enforce idempotency with a unique key and make the payment state machine reject duplicates.

```sql
-- Find duplicates caused by retries/double-clicks
SELECT OrderId, COUNT(*) AS charges, SUM(Amount) AS total
FROM dbo.Payments WHERE Status = 'Captured' GROUP BY OrderId HAVING COUNT(*) > 1;

-- Prevent it structurally
CREATE UNIQUE INDEX UX_Payments_OrderId_Captured ON dbo.Payments (OrderId) WHERE Status = 'Captured';
ALTER TABLE dbo.Payments ADD IdempotencyKey varchar(64) NULL;
CREATE UNIQUE INDEX UX_Payments_IdempotencyKey ON dbo.Payments (IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;
```

```csharp
await gateway.ChargeAsync(new ChargeRequest(order.Id, order.Total) { IdempotencyKey = $"order-{order.Id}" }, ct);   // the PSP also de-duplicates by key
// Plus: disable the button after click, handle webhook redelivery idempotently, and add a reconciliation job against the PSP report.
```

## scenarios-006
DB CPU at 100% after a deployment: find the regressed query in Query Store and fix it (or force the old plan) first, then roll forward.

```sql
SELECT TOP 5 qt.query_sql_text, rs.avg_cpu_time, rs.count_executions, p.plan_id, q.query_id
FROM sys.query_store_runtime_stats rs
JOIN sys.query_store_plan p ON p.plan_id = rs.plan_id
JOIN sys.query_store_query q ON q.query_id = p.query_id
JOIN sys.query_store_query_text qt ON qt.query_text_id = q.query_text_id
JOIN sys.query_store_runtime_stats_interval i ON i.runtime_stats_interval_id = rs.runtime_stats_interval_id
WHERE i.start_time > DATEADD(HOUR, -2, SYSUTCDATETIME())
ORDER BY rs.avg_cpu_time * rs.count_executions DESC;

EXEC sp_query_store_force_plan @query_id = 5821, @plan_id = 9112;      -- immediate relief by pinning the previous plan
-- Root causes: a new EF query that lost an index seek (N+1, Contains with large list), missing index, implicit conversion, parameter sniffing.
```

## scenarios-007
Migrating 500 million rows with minimal downtime: batch copy, dual-write/CDC for changes, verify, cut over.

```sql
-- 1. Backfill in small batches by key range (keeps locks and log growth small, resumable)
DECLARE @from bigint = (SELECT LastId FROM mig.Progress WHERE Name = 'Orders');
DECLARE @to bigint = @from + 50000;
INSERT INTO new.Orders (Id, CustomerId, Total, CreatedAt)
SELECT Id, CustomerId, CAST(Total AS decimal(18,2)), CreatedAt FROM old.Orders WHERE Id > @from AND Id <= @to;
UPDATE mig.Progress SET LastId = @to WHERE Name = 'Orders';
```

```csharp
// 2. While backfilling, new writes go to BOTH stores (or CDC streams changes); 3. compare checksums per range; 4. flip reads, then writes
if (flags.DualWrite) { await oldDb.SaveAsync(order, ct); await newDb.SaveAsync(order, ct); }
var oldHash = await oldDb.ChecksumAsync(range); var newHash = await newDb.ChecksumAsync(range);
if (oldHash != newHash) alert.Raise($"Mismatch in {range}");
// Rollback plan: keep the old store authoritative until the new one has run clean for N days.
```

## scenarios-008
Immigration/legal case management: auditable documents and deadline tracking with immutable history.

```csharp
public sealed class CaseDocument
{
    public Guid Id { get; init; } public Guid CaseId { get; init; }
    public string BlobPath { get; init; } = ""; public string Sha256 { get; init; } = "";     // tamper evidence
    public int Version { get; init; } public string UploadedBy { get; init; } = ""; public DateTime UploadedAt { get; init; }
}
public sealed class Deadline { public Guid CaseId { get; init; } public string Kind { get; init; } = ""; public DateOnly DueDate { get; init; } public DateOnly[] Reminders { get; init; } = []; }

// Audit trail: append-only, never updated or deleted
db.AuditEvents.Add(new AuditEvent(caseId, userId, "DocumentViewed", docId, DateTime.UtcNow, ip));

// Deadlines drive reminders through a scheduled job with escalation if unacknowledged
RecurringJob.AddOrUpdate<IDeadlineJob>("deadline-reminders", j => j.NotifyAsync(), Cron.Hourly);
// Also: virus scan on upload, per-case access control, retention rules, encryption at rest, e-discovery export.
```

## scenarios-009
Partner EDI/API feeds: validate, de-duplicate by business key and apply inventory deltas idempotently.

```csharp
public async Task ProcessAsync(InventoryFeed feed, CancellationToken ct)
{
    foreach (var line in feed.Lines)
    {
        var key = $"{feed.PartnerId}:{feed.MessageId}:{line.Sku}";                              // business key for de-duplication
        if (!await db.ProcessedLines.AddIfNewAsync(key, ct)) continue;                         // unique index; skip replays

        if (!validator.IsValid(line, out var error)) { await db.Rejects.AddAsync(new Reject(feed.MessageId, line.Sku, error), ct); continue; }

        await db.Inventory.Where(i => i.Sku == line.Sku && i.Version < line.Version)           // ignore stale/out-of-order updates
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.OnHand, line.Quantity).SetProperty(i => i.Version, line.Version), ct);
    }
    await db.SaveChangesAsync(ct);                                                              // plus nightly reconciliation against partner snapshot
}
```

## scenarios-010
IoT telemetry: ingest through a partitioned stream, batch writes into a time-series store, query by device and time window.

```csharp
// Ingest: Event Hub partitioned by device id preserves per-device order and spreads load
processor.ProcessEventAsync += async a =>
{
    var reading = JsonSerializer.Deserialize<Reading>(a.Data.EventBody)!;
    buffer.Add(reading);
    if (buffer.Count >= 5_000 || sinceFlush.Elapsed > TimeSpan.FromSeconds(2)) { await sink.BulkInsertAsync(buffer.Drain(), a.CancellationToken); await a.UpdateCheckpointAsync(); }   // batch + checkpoint
};
```

```sql
-- TimescaleDB / partitioned table: time-bucketed query that only touches recent chunks
SELECT time_bucket('5 minutes', ts) AS bucket, device_id, avg(temperature)
FROM readings WHERE device_id = 'pump-17' AND ts > now() - interval '24 hours'
GROUP BY bucket, device_id ORDER BY bucket;
-- Retention: drop chunks older than 90 days; keep downsampled hourly aggregates for years.
```

## scenarios-011
Retention versus right-to-erasure: pseudonymise personal data while keeping the legally required financial record.

```csharp
public async Task EraseCustomerAsync(Guid customerId, CancellationToken ct)
{
    await using var tx = await db.Database.BeginTransactionAsync(ct);
    await db.Customers.Where(c => c.Id == customerId).ExecuteUpdateAsync(s => s
        .SetProperty(c => c.Name, "Erased").SetProperty(c => c.Email, c => $"erased+{c.Id}@invalid").SetProperty(c => c.Phone, (string?)null).SetProperty(c => c.ErasedAt, DateTime.UtcNow), ct);
    await db.Invoices.Where(i => i.CustomerId == customerId).ExecuteUpdateAsync(s => s.SetProperty(i => i.BillingAddress, "Erased"), ct);  // invoices kept 7 years for tax law, personal fields removed
    db.AuditEvents.Add(new AuditEvent("CustomerErased", customerId, userId, DateTime.UtcNow));   // the audit entry itself contains no personal data
    await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
}
// Also purge from caches, search indexes, analytics stores and backups on their restore/expiry cycle; document the legal basis for retained data.
```

## behavioral-001
STAR answer skeleton for leading a migration: Situation, Task, Action, Result with numbers.

```text
S: Our 12-year-old claims platform (.NET Framework 4.6, Web Forms) took 6 weeks to ship small changes and failed security audits.
T: I was asked to lead the move to .NET 8 and Azure with no customer-facing downtime.
A: I (1) mapped the system and chose strangler-style slices, (2) set up YARP routing + shared auth, (3) migrated the highest-change
   module first, (4) introduced contract tests and feature flags, and (5) mentored two engineers to own later slices.
R: Lead time dropped from 6 weeks to 4 days, incidents fell 40%, we passed the audit, and the migration finished in 9 months
   with zero downtime. What I would do differently: involve operations earlier on the observability setup.
```

## behavioral-002
Incident ownership: timeline, impact, root cause, fix and the follow-up actions that changed the system (blameless).

```markdown
### Incident: duplicate payment emails (Sev 2, 38 minutes)
- **Detection:** support ticket spike at 10:12; no alert existed for queue depth.
- **Mitigation (10:20):** paused the consumer; scaled DB read replicas; communicated on the status page.
- **Root cause:** retry policy re-delivered messages after a 30 s timeout, and the handler was not idempotent.
- **Fix:** idempotency table keyed by MessageId; timeout raised above p99 handler duration.
- **Follow-ups (owner/date):** DLQ-depth alert (me, +2d), chaos test for redelivery (QA, +2w), runbook update (me, +3d).
- **What I learned:** I now ask "what happens on redelivery?" in every design review.
```

## behavioral-003
Disagreeing with an architect or stakeholder: lead with data, propose an experiment, accept the decision.

```markdown
**Situation:** The architect wanted microservices for a 4-person team's new product.
**What I did:** I wrote a one-page comparison (deployment overhead, on-call load, our team size), proposed a *modular monolith* with
module contracts so we could extract services later, and offered a two-week spike to compare delivery speed.
**Outcome:** The spike showed ~35% faster delivery; we agreed on the modular monolith, documented in ADR-009 with explicit
"extract when" triggers. Had they decided otherwise I would have committed fully: disagree, then commit.
```

## behavioral-004
Balancing technical debt against features and deadlines: make the trade-off visible and time-boxed.

```markdown
- Reserved a standing 20% capacity for debt/reliability, tracked as a visible backlog with cost-of-delay estimates.
- For a tight deadline: agreed scope cuts first (MoSCoW), then *deliberate* shortcuts recorded as debt tickets with an owner and a date
  ("hard-coded tax table, replace by Sprint 14"), never silent ones.
- Reported to stakeholders in outcomes: "This 2-week refactor cuts the 3 incidents/month that cost ~12 support hours each."
```

## behavioral-005
Explaining a technical decision to non-technical stakeholders, and handling an underperforming teammate.

```markdown
**Explaining (Kafka vs the existing queue):**
"Think of it as a delivery system. Today parcels vanish after delivery; with the new one we can re-deliver any parcel if something
goes wrong. It costs +2 weeks now and removes the manual month-end reconciliation (about 3 person-days every month)."

**Underperformance (1:1 plan):**
1. Private, specific, factual: "Last three PRs needed 4+ review rounds on error handling."
2. Ask for their view and blockers (skills? unclear expectations? personal issues?).
3. Agree 30/60/90-day goals with pairing, smaller tasks and weekly check-ins; document progress.
4. If no improvement, involve the manager early with evidence: no surprises.
```

## lld-coding-001
Thread-safe LRU cache with a dictionary plus a doubly linked list, O(1) get and put.

```csharp
public sealed class LruCache<TKey, TValue> where TKey : notnull
{
    private readonly int _capacity;
    private readonly Dictionary<TKey, LinkedListNode<(TKey Key, TValue Value)>> _map = new();
    private readonly LinkedList<(TKey Key, TValue Value)> _order = new();      // first = most recently used
    private readonly object _gate = new();

    public LruCache(int capacity) => _capacity = capacity > 0 ? capacity : throw new ArgumentOutOfRangeException(nameof(capacity));

    public bool TryGet(TKey key, out TValue value)
    {
        lock (_gate)
        {
            if (_map.TryGetValue(key, out var node)) { _order.Remove(node); _order.AddFirst(node); value = node.Value.Value; return true; }
            value = default!; return false;
        }
    }

    public void Put(TKey key, TValue value)
    {
        lock (_gate)
        {
            if (_map.TryGetValue(key, out var existing)) { _order.Remove(existing); _map.Remove(key); }
            else if (_map.Count == _capacity) { var last = _order.Last!; _order.RemoveLast(); _map.Remove(last.Value.Key); }
            _map[key] = _order.AddFirst((key, value));
        }
    }
}
```

## lld-coding-002
Token bucket rate limiter: tokens refill continuously; a request is allowed if a token is available.

```csharp
public sealed class TokenBucket
{
    private readonly double _capacity, _refillPerSecond;
    private double _tokens;
    private long _lastTicks;
    private readonly object _gate = new();
    private readonly Func<long> _now;                                     // inject time for deterministic tests

    public TokenBucket(double capacity, double refillPerSecond, Func<long>? now = null)
    {
        _capacity = _tokens = capacity; _refillPerSecond = refillPerSecond;
        _now = now ?? (() => Stopwatch.GetTimestamp()); _lastTicks = _now();
    }

    public bool TryTake(int count = 1)
    {
        lock (_gate)
        {
            var nowTicks = _now();
            _tokens = Math.Min(_capacity, _tokens + (nowTicks - _lastTicks) / (double)Stopwatch.Frequency * _refillPerSecond);
            _lastTicks = nowTicks;
            if (_tokens < count) return false;
            _tokens -= count; return true;
        }
    }
}
// var limiter = new TokenBucket(capacity: 10, refillPerSecond: 5);  if (!limiter.TryTake()) return Results.StatusCode(429);
```

## lld-coding-003
Approach to a parking-lot style design: nouns become classes, rules become strategies, concurrency is handled at the allocation point.

```csharp
public enum VehicleType { Motorcycle, Car, Truck }
public sealed record Vehicle(string Plate, VehicleType Type);
public sealed class Spot { public int Id { get; init; } public VehicleType Fits { get; init; } public Vehicle? Occupant { get; set; } }
public sealed record Ticket(Guid Id, int SpotId, string Plate, DateTime EnteredAt);

public interface ISpotAllocationStrategy { Spot? Pick(IEnumerable<Spot> free, Vehicle v); }              // Strategy: nearest, cheapest, ...
public interface IPricingPolicy { decimal Charge(TimeSpan duration, VehicleType type); }                 // Strategy: hourly, daily caps, ...

public sealed class ParkingLot(IReadOnlyList<Spot> spots, ISpotAllocationStrategy alloc, IPricingPolicy pricing)
{
    private readonly object _gate = new();
    public Ticket? Park(Vehicle v)
    {
        lock (_gate)                                                                                    // atomic pick+assign: no double booking
        {
            var spot = alloc.Pick(spots.Where(s => s.Occupant is null), v);
            if (spot is null) return null; spot.Occupant = v;
            return new Ticket(Guid.NewGuid(), spot.Id, v.Plate, DateTime.UtcNow);
        }
    }
}
// Clarify requirements first (sizes, payments, multi-level), then entities, then interfaces, then edge cases, then tests.
```

## lld-coding-004
Retry with exponential backoff plus jitter, and a producer-consumer pipeline.

```csharp
public static async Task<T> RetryAsync<T>(Func<CancellationToken, Task<T>> action, int maxAttempts, CancellationToken ct, Func<Exception, bool>? isTransient = null)
{
    for (var attempt = 1; ; attempt++)
    {
        try { return await action(ct); }
        catch (Exception ex) when (attempt < maxAttempts && (isTransient?.Invoke(ex) ?? true) && ex is not OperationCanceledException)
        {
            var delay = TimeSpan.FromMilliseconds(Math.Min(30_000, 200 * Math.Pow(2, attempt - 1)) * (0.5 + Random.Shared.NextDouble() / 2));   // backoff + jitter
            await Task.Delay(delay, ct);
        }
    }
}

var channel = Channel.CreateBounded<string>(100);
var producer = Task.Run(async () => { foreach (var line in File.ReadLines(path)) await channel.Writer.WriteAsync(line, ct); channel.Writer.Complete(); });
var consumer = Task.Run(async () => { await foreach (var line in channel.Reader.ReadAllAsync(ct)) await RetryAsync(t => SaveAsync(line, t), 4, ct); });
await Task.WhenAll(producer, consumer);
```

## rapid-fire-001
Dependency injection: classes receive their collaborators instead of creating them, which makes them testable and swappable.

```csharp
public sealed class InvoiceService(IInvoiceRepository repo, IClock clock)        // dependencies injected via the constructor
{
    public Task<Invoice> CreateAsync(Guid customerId) => repo.AddAsync(new Invoice(customerId, clock.UtcNow));
}
builder.Services.AddScoped<IInvoiceRepository, SqlInvoiceRepository>();
builder.Services.AddSingleton<IClock, SystemClock>();
// Test: new InvoiceService(new FakeRepository(), new FixedClock(...))   // no container, no database
```

## rapid-fire-002
Deferred execution: the LINQ query runs when enumerated, not when declared.

```csharp
var numbers = new List<int> { 1, 2, 3 };
var evens = numbers.Where(n => { Console.WriteLine($"check {n}"); return n % 2 == 0; });   // prints nothing yet
numbers.Add(4);
foreach (var n in evens) Console.WriteLine(n);   // now runs, sees 4 as well: prints check 1..4, then 2 and 4
var snapshot = evens.ToList();                    // force execution once
```

## rapid-fire-003
Deadlock: two transactions (or locks) wait on each other in opposite order.

```csharp
// Thread 1: lock(a) { lock(b) { } }    Thread 2: lock(b) { lock(a) { } }    -> circular wait
private static readonly object A = new(), B = new();
Task.Run(() => { lock (A) { Thread.Sleep(50); lock (B) { } } });
Task.Run(() => { lock (B) { Thread.Sleep(50); lock (A) { } } });   // both block forever
// Fix: always acquire locks in the same global order (or use one lock / timeouts / lock-free structures).
```

## rapid-fire-004
Idempotency: repeating the same request has the same effect as doing it once.

```csharp
app.MapPut("/orders/{id}/status", (Guid id, StatusRequest r, AppDbContext db) =>
    db.Orders.Where(o => o.Id == id).ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, r.Status)));   // PUT of an absolute value is naturally idempotent
// Not idempotent: POST /payments or "balance += 10". Make those safe with an Idempotency-Key header or a deduplication table.
```

## rapid-fire-005
API gateway: a single entry point for routing, auth, rate limiting and aggregation. A minimal YARP configuration.

```json
{
  "ReverseProxy": {
    "Routes": {
      "orders": { "ClusterId": "orders", "Match": { "Path": "/api/orders/{**rest}" }, "AuthorizationPolicy": "default", "RateLimiterPolicy": "api" },
      "catalog": { "ClusterId": "catalog", "Match": { "Path": "/api/catalog/{**rest}" } }
    },
    "Clusters": {
      "orders": { "Destinations": { "d1": { "Address": "http://orders:8080" } } },
      "catalog": { "Destinations": { "d1": { "Address": "http://catalog:8080" } } }
    }
  }
}
```

## rapid-fire-006
OpenTelemetry: a vendor-neutral standard for traces, metrics and logs; instrument once, export anywhere.

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter())   // OTLP -> Jaeger, Tempo, Datadog, App Insights...
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddRuntimeInstrumentation().AddOtlpExporter());
```

## rapid-fire-007
Correlation id: one id that travels with a request across services so logs and traces can be joined.

```csharp
app.Use(async (ctx, next) =>
{
    var id = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault() ?? Guid.NewGuid().ToString("N");
    ctx.Response.Headers["X-Correlation-Id"] = id;
    using (LogContext.PushProperty("CorrelationId", id)) await next();
});
builder.Services.AddHttpClient("downstream").AddHeaderPropagation();     // forward the header to outgoing calls
```

## rapid-fire-008
Health check: an endpoint orchestrators and load balancers poll to decide whether to restart or route traffic.

```csharp
builder.Services.AddHealthChecks().AddSqlServer(cs, tags: ["ready"]);
app.MapHealthChecks("/health/live", new() { Predicate = _ => false });                          // process is up
app.MapHealthChecks("/health/ready", new() { Predicate = r => r.Tags.Contains("ready") });      // dependencies reachable
```

## rapid-fire-009
HPA (Horizontal Pod Autoscaler): adds or removes pod replicas based on metrics such as CPU or custom queue length.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: worker }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: worker }
  minReplicas: 2
  maxReplicas: 20
  metrics: [{ type: Resource, resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } } }]
```

## rapid-fire-010
Circuit breaker: stop calling a failing dependency for a while so callers fail fast and the dependency can recover.

```csharp
var pipeline = new ResiliencePipelineBuilder().AddCircuitBreaker(new CircuitBreakerStrategyOptions
{
    FailureRatio = 0.5, MinimumThroughput = 10, SamplingDuration = TimeSpan.FromSeconds(30), BreakDuration = TimeSpan.FromSeconds(15)   // Closed -> Open -> Half-open
}).Build();
try { await pipeline.ExecuteAsync(async ct => await client.CallAsync(ct)); }
catch (BrokenCircuitException) { return Fallback(); }
```

## rapid-fire-011
`Task.WhenAll` runs independent operations concurrently; sequential awaits add the durations.

```csharp
// Sequential: ~ 300 + 200 + 100 = 600 ms
var a = await GetAsync(); var b = await GetBAsync(); var c = await GetCAsync();

// Concurrent: ~ max(300, 200, 100) = 300 ms
var ta = GetAsync(); var tb = GetBAsync(); var tc = GetCAsync();
await Task.WhenAll(ta, tb, tc);
var (ra, rb, rc) = (ta.Result, tb.Result, tc.Result);     // safe: already completed
```

## rapid-fire-012
N+1 in one sentence, in code: one query for the parents, one extra query per parent.

```csharp
foreach (var o in await db.Orders.ToListAsync()) Console.WriteLine(o.Customer.Name);       // 1 + N queries with lazy loading
var fixedList = await db.Orders.Select(o => new { o.Id, CustomerName = o.Customer.Name }).ToListAsync();   // 1 query (JOIN)
```

## rapid-fire-013
Outbox pattern: write the event to a table in the same transaction as the data, then publish it from there.

```csharp
await using var tx = await db.Database.BeginTransactionAsync();
db.Orders.Add(order);
db.Outbox.Add(new OutboxMessage { Type = "OrderPlaced", Payload = JsonSerializer.Serialize(order.ToEvent()) });
await db.SaveChangesAsync(); await tx.CommitAsync();       // both or neither; a relay publishes unsent rows
```

## rapid-fire-014
Authentication versus authorization in one line each, as ASP.NET Core calls.

```csharp
app.UseAuthentication();   // who are you?  -> builds the ClaimsPrincipal from the token/cookie (401 if it fails)
app.UseAuthorization();    // what may you do? -> evaluates policies/roles for the endpoint (403 if denied)
```

## rapid-fire-015
Cache stampede: many requests recompute the same expired value at once. Allow only one to rebuild.

```csharp
private readonly SemaphoreSlim _rebuild = new(1, 1);
public async Task<Report> GetAsync()
{
    if (_cache.TryGetValue("report", out Report? r)) return r!;
    await _rebuild.WaitAsync();
    try { return _cache.TryGetValue("report", out r) ? r! : _cache.Set("report", await BuildAsync(), TimeSpan.FromMinutes(5)); }   // double-check inside the lock
    finally { _rebuild.Release(); }
}
```

## rapid-fire-016
Process, thread and Task: a process owns memory, threads run inside it, a Task is a unit of async work scheduled onto threads.

```csharp
Console.WriteLine($"PID {Environment.ProcessId}, main thread {Environment.CurrentManagedThreadId}");
var t = new Thread(() => Console.WriteLine($"dedicated thread {Environment.CurrentManagedThreadId}")); t.Start();
await Task.Run(() => Console.WriteLine($"pool thread {Environment.CurrentManagedThreadId}"));   // Task: no dedicated thread guaranteed
await Task.Delay(100);                                                                           // I/O-style wait: uses no thread while waiting
```

## rapid-fire-017
CAP and partitions: when the network splits, you choose between rejecting requests (consistency) and answering with possibly stale data (availability).

```csharp
try { return await primary.GetAsync(id, requireLatest: true, ct); }                              // CP: fail if the latest value cannot be guaranteed
catch (PartitionException) { return await replica.GetAsync(id, ct) ?? throw new ServiceUnavailableException(); }   // AP: serve possibly stale data instead
```

## rapid-fire-018
Eventual consistency: replicas or read models converge after a short delay. Show "pending" instead of pretending it is instant.

```csharp
var order = await db.Orders.FindAsync(id);                      // write side: status = Placed immediately
var summary = await readModel.GetSummaryAsync(id);             // read side: updated by an event a moment later (may be null briefly)
return summary is null ? Results.Accepted($"/orders/{id}") : Results.Ok(summary);
```

## rapid-fire-019
Dead-letter queue: where messages go after repeated failure or expiry, so they can be inspected and replayed.

```csharp
await receiver.DeadLetterMessageAsync(message, deadLetterReason: "SchemaInvalid", deadLetterErrorDescription: ex.Message);
var dlq = client.CreateReceiver("payments", new ServiceBusReceiverOptions { SubQueue = SubQueue.DeadLetter });
var poison = await dlq.ReceiveMessagesAsync(10);                // inspect, fix the cause, resubmit deliberately
```

## rapid-fire-020
Strangler fig: route a slice of traffic to the new implementation and grow it until the old system can be removed.

```csharp
app.MapGet("/invoices/{id}", async (string id, IFeatureManager flags, LegacyClient legacy, NewInvoiceService modern) =>
    await flags.IsEnabledAsync("NewInvoices") ? Results.Ok(await modern.GetAsync(id)) : Results.Ok(await legacy.GetAsync(id)));
```

## rapid-fire-021
Rowversion / concurrency token: a value that changes on every update so a stale write is detected.

```sql
ALTER TABLE dbo.Claims ADD RowVer rowversion;
UPDATE dbo.Claims SET Status = 'Approved' WHERE Id = @id AND RowVer = @expectedRowVer;   -- 0 rows affected => someone else changed it
```

## rapid-fire-022
Infrastructure drift: the real environment no longer matches the code, typically after a manual change. Detect it with a plan.

```bash
terraform plan -refresh-only -detailed-exitcode   # exit code 2: differences found between state/config and reality
```

## rapid-fire-023
Liveness restarts a hung container; readiness removes an unready container from traffic: one probe each.

```yaml
livenessProbe:  { httpGet: { path: /health/live,  port: 8080 } }   # "am I stuck? restart me"
readinessProbe: { httpGet: { path: /health/ready, port: 8080 } }   # "can I take traffic right now?"
```

## rapid-fire-024
p99 latency: the value 99% of requests are faster than. It exposes the tail that averages hide.

```csharp
var samples = new[] { 80, 85, 90, 95, 100, 110, 120, 130, 140, 2500 };       // one slow outlier
var avg = samples.Average();                                                  // ~335 ms: looks fine
var p99 = samples.OrderBy(x => x).ElementAt((int)Math.Ceiling(0.99 * samples.Length) - 1);   // 2500 ms: the pain some users feel
```

## rapid-fire-025
PKCE: a one-time secret ties the authorization code to the client that requested it, protecting public clients (SPAs, mobile).

```ts
const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));                 // random secret kept by the client
const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
location.href = `${authority}/authorize?response_type=code&client_id=spa&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${cb}`;
// Token request later sends code_verifier; a stolen authorization code is useless without it.
```
