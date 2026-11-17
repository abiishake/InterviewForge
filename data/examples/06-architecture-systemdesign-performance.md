# Real-world code examples: architecture, system design, performance and modern .NET

## architecture-001
SOLID in a payment feature: depend on abstractions (D), extend by adding classes (O), small interfaces (I), substitutable implementations (L), one reason to change (S).

```csharp
public interface IPaymentMethod { bool Supports(string type); Task<PaymentResult> PayAsync(PaymentRequest r, CancellationToken ct); }

public sealed class CardPayment(ICardGateway gateway) : IPaymentMethod
{
    public bool Supports(string type) => type == "card";
    public Task<PaymentResult> PayAsync(PaymentRequest r, CancellationToken ct) => gateway.ChargeAsync(r, ct);
}
public sealed class UpiPayment(IUpiGateway gateway) : IPaymentMethod { /* new method = new class, no edits to existing code (Open/Closed) */ 
    public bool Supports(string type) => type == "upi";
    public Task<PaymentResult> PayAsync(PaymentRequest r, CancellationToken ct) => gateway.CollectAsync(r, ct);
}

public sealed class CheckoutService(IEnumerable<IPaymentMethod> methods)            // depends on the abstraction (DIP)
{
    public Task<PaymentResult> PayAsync(PaymentRequest r, CancellationToken ct) =>
        (methods.FirstOrDefault(m => m.Supports(r.Type)) ?? throw new NotSupportedException(r.Type)).PayAsync(r, ct);
}
```

## architecture-002
Factory, Strategy, Decorator and Adapter in one small notification module.

```csharp
// Strategy + Factory: choose the channel at runtime
public interface INotifier { Task SendAsync(Message m); }
public sealed class NotifierFactory(IServiceProvider sp)
{
    public INotifier For(Channel c) => c switch { Channel.Email => sp.GetRequiredService<EmailNotifier>(), Channel.Sms => sp.GetRequiredService<SmsNotifier>(), _ => throw new ArgumentOutOfRangeException(nameof(c)) };
}

// Decorator: add logging/retry without touching the notifier
public sealed class RetryingNotifier(INotifier inner, ILogger<RetryingNotifier> log) : INotifier
{
    public async Task SendAsync(Message m) { for (var i = 1; ; i++) { try { await inner.SendAsync(m); return; } catch when (i < 3) { log.LogWarning("Retry {Attempt}", i); await Task.Delay(200 * i); } } }
}

// Adapter: make a vendor SDK fit our interface
public sealed class TwilioSmsNotifier(TwilioRestClient client) : INotifier
{
    public Task SendAsync(Message m) => MessageResource.CreateAsync(to: m.To, from: "+15550100", body: m.Text, client: client);
}
```

## architecture-003
Clean Architecture: dependencies point inward. The domain has no framework references; infrastructure implements interfaces owned by the application layer.

```text
src/
  Claims.Domain/          Entities, value objects, domain events        (no dependencies)
  Claims.Application/     Use cases, DTOs, interfaces (IClaimRepository) -> depends on Domain
  Claims.Infrastructure/  EF Core, HTTP clients, queue adapters         -> implements Application interfaces
  Claims.Api/             Controllers/endpoints, DI composition root    -> depends on all (wires them together)
```

```csharp
// Application layer owns the abstraction
namespace Claims.Application { public interface IClaimRepository { Task<Claim?> FindAsync(Guid id, CancellationToken ct); } }
// Infrastructure implements it
namespace Claims.Infrastructure { internal sealed class EfClaimRepository(ClaimsDb db) : IClaimRepository { public Task<Claim?> FindAsync(Guid id, CancellationToken ct) => db.Claims.FirstOrDefaultAsync(c => c.Id == id, ct); } }
// Api composition root
builder.Services.AddScoped<IClaimRepository, EfClaimRepository>();
```

## architecture-004
Repository/Unit of Work over EF Core versus using `DbContext` directly: a thin query service is often enough.

```csharp
// EF Core's DbContext already is a unit of work and DbSet<T> a repository. Wrapping CRUD adds little:
public sealed class ApproveClaimHandler(ClaimsDb db)                      // inject the DbContext into the use case
{
    public async Task HandleAsync(Guid id, CancellationToken ct)
    {
        var claim = await db.Claims.SingleAsync(c => c.Id == id, ct);
        claim.Approve();
        await db.SaveChangesAsync(ct);                                    // one transaction
    }
}

// A repository earns its place for aggregate-specific rules or to keep persistence out of the domain tests:
public interface IClaimRepository { Task<Claim> GetAggregateAsync(Guid id, CancellationToken ct); void Add(Claim claim); }

// MediatR: useful for pipeline behaviours (validation, logging, transactions), overkill if it only forwards calls.
```

## architecture-005
Twelve-factor in practice: config from the environment, stateless processes, logs to stdout, disposable and port-bound.

```csharp
var builder = WebApplication.CreateBuilder(args);                          // config: appsettings < environment variables < Key Vault
builder.Configuration.AddEnvironmentVariables().AddAzureKeyVault(new Uri(builder.Configuration["KeyVault:Uri"]!), new DefaultAzureCredential());

builder.Logging.ClearProviders().AddJsonConsole();                          // XI. logs as an event stream to stdout, not files
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = builder.Configuration["Redis"]);   // VI. stateless: sessions/caches live in backing services
builder.Services.AddDataProtection().PersistKeysToStackExchangeRedis(redis);                          // so any instance can decrypt cookies
// Anti-patterns: local disk state, sticky sessions, config in code, environment-specific builds, 'it works on my machine'.
```

## system-design-001
A high-traffic read API: stateless instances behind a load balancer, cache, read replica, rate limit and async writes.

```csharp
app.MapGet("/api/products/{id:int}", async (int id, HybridCache cache, ReadDbContext db, CancellationToken ct) =>
{
    var product = await cache.GetOrCreateAsync($"product:{id}", async t =>
        await db.Products.AsNoTracking().Where(p => p.Id == id).Select(p => new ProductDto(p.Id, p.Name, p.Price)).SingleOrDefaultAsync(t),
        new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5) }, cancellationToken: ct);          // L1 memory + L2 Redis, stampede-safe
    return product is null ? Results.NotFound() : Results.Ok(product);
}).RequireRateLimiting("api").CacheOutput(p => p.Expire(TimeSpan.FromSeconds(30)).Tag("products"));                // + CDN / output caching

app.MapPost("/api/orders", async (PlaceOrder cmd, IPublishEndpoint bus) => { await bus.Publish(cmd); return Results.Accepted(); });   // writes go to a queue, workers scale independently
```

## system-design-002
Scale out the stateless tier horizontally; scale up the stateful database until you must shard. Autoscaling configuration.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: claims-api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: claims-api }
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 65 } }
  behavior:
    scaleDown: { stabilizationWindowSeconds: 300 }          # avoid flapping
```

```csharp
// Horizontal scaling requires statelessness: no in-memory sessions, shared data-protection keys, idempotent handlers
```

## system-design-003
CAP in a real decision: during a network partition, a payments ledger chooses consistency (reject), a product feed chooses availability (serve stale).

```csharp
// CP choice: refuse the write if a quorum cannot confirm it (correctness over availability)
public async Task<TransferResult> TransferAsync(Transfer t, CancellationToken ct)
{
    try { return await ledger.CommitAsync(t, new WriteOptions { Consistency = Consistency.Quorum, Timeout = TimeSpan.FromSeconds(2) }, ct); }
    catch (QuorumUnavailableException) { return TransferResult.Rejected("Please retry shortly"); }
}

// AP choice: serve the last known data when the primary is unreachable
public async Task<Product[]> GetCatalogAsync(CancellationToken ct) =>
    await TryGetFromPrimaryAsync(ct) ?? await cache.GetStaleAsync<Product[]>("catalog") ?? [];
// CAP says: when a Partition happens you pick Consistency or Availability. With no partition you can have both (latency trade-offs: PACELC).
```

## system-design-004
URL shortener core: collision-free short codes from a counter encoded in base62, with a cached redirect path.

```csharp
public static class Base62
{
    private const string Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    public static string Encode(long n) { var sb = new StringBuilder(); do { sb.Insert(0, Alphabet[(int)(n % 62)]); n /= 62; } while (n > 0); return sb.ToString(); }
}

app.MapPost("/shorten", async (ShortenRequest req, AppDbContext db) =>
{
    var link = new Link { LongUrl = req.Url };                  // BIGINT IDENTITY / sequence gives a unique id; 62^7 = 3.5 trillion codes
    db.Links.Add(link); await db.SaveChangesAsync();
    link.Code = Base62.Encode(link.Id + 1_000_000);              // offset avoids very short, guessable codes
    await db.SaveChangesAsync();
    return Results.Created($"/{link.Code}", new { shortUrl = $"https://sho.rt/{link.Code}" });
});

app.MapGet("/{code}", async (string code, IDistributedCache cache, AppDbContext db) =>
{
    var url = await cache.GetStringAsync(code) ?? (await db.Links.Where(l => l.Code == code).Select(l => l.LongUrl).SingleOrDefaultAsync());
    return url is null ? Results.NotFound() : Results.Redirect(url, permanent: false);      // 302 so analytics still counts clicks
});
```

## system-design-005
Notification system: one request, per-channel queues, user preferences, idempotency and retries with a dead-letter queue.

```csharp
public sealed class NotificationOrchestrator(IPublishEndpoint bus, IPreferenceStore prefs)
{
    public async Task SendAsync(Notification n, CancellationToken ct)
    {
        var p = await prefs.GetAsync(n.UserId, ct);
        foreach (var channel in n.Channels.Where(c => p.Allows(c, n.Category)))              // respect opt-outs/quiet hours
            await bus.Publish(new SendOnChannel(n.Id, n.UserId, channel, n.TemplateId, n.Data), x => x.MessageId = Guid.NewGuid(), ct);   // queue per channel
    }
}

public sealed class SmsConsumer(IDedupStore dedup, ISmsProvider sms) : IConsumer<SendOnChannel>
{
    public async Task Consume(ConsumeContext<SendOnChannel> ctx)
    {
        if (!await dedup.TryClaimAsync($"{ctx.Message.NotificationId}:sms")) return;       // idempotent: never send twice
        await sms.SendAsync(ctx.Message);                                                   // provider failure => retry, then DLQ
    }
}
// Add: rate limits per provider, templates + localisation, delivery receipts, priority queues for OTP vs marketing.
```

## system-design-006
Flash sale / ticket booking: an atomic reservation with expiry prevents overselling under extreme concurrency.

```csharp
// 1. Reserve atomically in Redis (fast), with a TTL so abandoned carts release stock
private const string ReserveScript = @"
local stock = tonumber(redis.call('GET', KEYS[1]) or '0')
if stock < tonumber(ARGV[1]) then return 0 end
redis.call('DECRBY', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
return 1";

public async Task<bool> ReserveAsync(string sku, string userId, int qty) =>
    (int)await _db.ScriptEvaluateAsync(ReserveScript, [$"stock:{sku}", $"hold:{sku}:{userId}"], [qty, 600]) == 1;

// 2. Confirm payment, then persist the order in SQL with a unique (UserId, SaleId) constraint; release the hold if payment fails.
// 3. Put a virtual waiting room / queue in front of the sale so the database never sees the full spike.
```

## system-design-007
Back-of-the-envelope capacity estimate, written as code so the assumptions are explicit and checkable.

```csharp
const double dailyActiveUsers = 5_000_000;
const double requestsPerUserPerDay = 20;
double avgRps  = dailyActiveUsers * requestsPerUserPerDay / 86_400;      // ~1,157 req/s
double peakRps = avgRps * 3;                                              // peak factor ~3  => ~3,500 req/s
double instances = Math.Ceiling(peakRps / 400 / 0.6);                     // 400 rps/instance at 60% target utilisation => ~15

double writesPerDay = dailyActiveUsers * 2;                               // 2 writes per user
double storagePerYearGb = writesPerDay * 365 * 1.0 / 1_000_000;           // 1 KB per record => ~3.6 TB/yr (before indexes/replication x3)
double egressMbps = peakRps * 20 * 8 / 1_000;                             // 20 KB average response => ~560 Mbit/s
// State assumptions out loud, round aggressively, and identify the bottleneck (usually the database or the network).
```

## performance-001
A systematic optimisation loop: measure with BenchmarkDotNet, change one thing, re-measure.

```csharp
[MemoryDiagnoser]
public class SlugBenchmarks
{
    private readonly string[] _titles = Enumerable.Range(0, 1000).Select(i => $"Claim Number {i} Approved").ToArray();

    [Benchmark(Baseline = true)]
    public int Linq() => _titles.Select(t => t.ToLowerInvariant().Replace(' ', '-')).Sum(s => s.Length);

    [Benchmark]
    public int Span()
    {
        var total = 0;
        foreach (var t in _titles)
            total += string.Create(t.Length, t, (dst, src) => { for (var i = 0; i < src.Length; i++) dst[i] = src[i] == ' ' ? '-' : char.ToLowerInvariant(src[i]); }).Length;
        return total;
    }
}
// BenchmarkRunner.Run<SlugBenchmarks>();  then profile production with dotnet-trace / Application Insights Profiler before optimising anything.
```

## performance-002
Thread-pool starvation caused by sync-over-async, and the fix.

```csharp
// BAD: blocks a pool thread per request while waiting on I/O. Under load the pool is exhausted and latency explodes.
app.MapGet("/price/{sku}", (string sku, IPriceClient client) => client.GetPriceAsync(sku).Result);

// GOOD: async all the way, threads are released during the await
app.MapGet("/price/{sku}", async (string sku, IPriceClient client, CancellationToken ct) => await client.GetPriceAsync(sku, ct));
```

```bash
dotnet-counters monitor -p $PID System.Runtime[threadpool-queue-length,threadpool-thread-count]     # queue length climbing = starvation
dotnet-stack report -p $PID | grep -c "Task.Wait\|GetResult"                                         # blocked threads
```

## performance-003
CPU-heavy API: move work off the request path, parallelise CPU-bound loops, and cache deterministic results.

```csharp
// Offload: accept the request, compute in a worker, let the client poll
app.MapPost("/risk-scores", async (ScoreRequest r, IJobQueue q) => Results.Accepted($"/risk-scores/{await q.EnqueueAsync(r)}"));

// CPU-bound parallelism (not for I/O): partition the data across cores
var results = new ConcurrentBag<Score>();
Parallel.ForEach(Partitioner.Create(portfolios, loadBalance: true), new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount }, p => results.Add(Score(p)));

// Memoise deterministic work keyed by its inputs
var score = await cache.GetOrCreateAsync($"score:{Hash(portfolio)}", _ => ValueTask.FromResult(Score(portfolio)));
```

## performance-004
Diagnosing a memory leak with dotnet-gcdump, and the usual culprit: an unbounded static cache.

```bash
dotnet-counters monitor -p $PID System.Runtime[gc-heap-size,gen-2-gc-count,loh-size]   # steadily rising gen2/LOH = leak or fragmentation
dotnet-gcdump collect -p $PID -o before.gcdump
# ... apply load for 10 minutes ...
dotnet-gcdump collect -p $PID -o after.gcdump                                         # diff in Visual Studio / PerfView: which type's count grew, and who roots it?
```

```csharp
// Typical leak: static dictionary that never evicts
private static readonly Dictionary<string, Report> Cache = new();              // BAD: grows forever
// FIX: bounded cache with expiry and size accounting
private readonly MemoryCache _cache = new(new MemoryCacheOptions { SizeLimit = 1_000 });
_cache.Set(key, report, new MemoryCacheEntryOptions { Size = 1, SlidingExpiration = TimeSpan.FromMinutes(10) });
```

## performance-005
Reducing allocations on a hot path with pooling, `Span<T>` and `ValueTask`.

```csharp
// ArrayPool instead of allocating a new buffer per request
var buffer = ArrayPool<byte>.Shared.Rent(8192);
try { var read = await stream.ReadAsync(buffer.AsMemory(0, 8192), ct); Process(buffer.AsSpan(0, read)); }
finally { ArrayPool<byte>.Shared.Return(buffer); }

// Avoid string allocations while parsing
ReadOnlySpan<char> header = request.Headers.Authorization.ToString();
if (header.StartsWith("Bearer ", StringComparison.Ordinal)) token = header[7..].ToString();

// ValueTask: no allocation when the result is already available (cache hit)
public ValueTask<Price> GetAsync(string sku) => _cache.TryGetValue(sku, out Price p) ? new ValueTask<Price>(p) : new ValueTask<Price>(LoadAsync(sku));

// Server GC + concurrent collection for throughput services: <ServerGarbageCollector>true</ServerGarbageCollector>
```

## modern-dotnet-001
Minimal APIs for small focused services; controllers when you want filters, conventions and large teams. The same endpoint twice.

```csharp
// Minimal API
var claims = app.MapGroup("/api/claims").RequireAuthorization().WithTags("Claims");
claims.MapGet("/{id:guid}", async (Guid id, IClaimService svc, CancellationToken ct) =>
    await svc.GetAsync(id, ct) is { } claim ? TypedResults.Ok(claim) : Results.NotFound());

// Controller equivalent
[ApiController, Route("api/claims"), Authorize]
public class ClaimsController(IClaimService svc) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClaimDto>> Get(Guid id, CancellationToken ct) => await svc.GetAsync(id, ct) is { } c ? c : NotFound();
}
```

## modern-dotnet-002
Native AOT and trimming: fast startup and small footprint, but you must avoid reflection and use source generators.

```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization>
</PropertyGroup>
```

```csharp
var builder = WebApplication.CreateSlimBuilder(args);                           // AOT-friendly host
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

[JsonSerializable(typeof(ClaimDto))] [JsonSerializable(typeof(ClaimDto[]))]
internal partial class AppJsonContext : JsonSerializerContext;                  // compile-time serializer, no runtime reflection

// Good fit: serverless functions, CLI tools, sidecars. Poor fit: heavy reflection libraries, EF Core with dynamic models, runtime plugin loading.
```

## modern-dotnet-003
.NET Aspire: describe the distributed app (API, worker, SQL, Redis) once and get wiring, service discovery and telemetry for local dev.

```csharp
// AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var sql   = builder.AddSqlServer("sql").AddDatabase("claimsdb");
var redis = builder.AddRedis("cache");
var api   = builder.AddProject<Projects.Claims_Api>("api").WithReference(sql).WithReference(redis).WithExternalHttpEndpoints();
builder.AddProject<Projects.Claims_Worker>("worker").WithReference(sql).WithReference(api);
builder.AddNpmApp("web", "../claims-web").WithReference(api).WithHttpEndpoint(env: "PORT");

builder.Build().Run();

// In the API: builder.AddServiceDefaults();  builder.AddSqlServerDbContext<AppDbContext>("claimsdb");  builder.AddRedisDistributedCache("cache");
// One F5 starts every service + containers + a dashboard with logs, traces and metrics (OpenTelemetry out of the box).
```

## modern-dotnet-004
Planning upgrades: target an LTS, keep the SDK pinned, and let CI warn about the next version early.

```json
{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature" } }
```

```xml
<!-- Directory.Build.props: one place for the target framework and analyzers -->
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisMode>Recommended</AnalysisMode>
  </PropertyGroup>
</Project>
```

```bash
dotnet tool install -g upgrade-assistant   # analyse breaking changes first
dotnet list package --outdated --include-transitive
# Strategy: stay on LTS (3 years support), upgrade within 6 months of release, canary the next version in a branch pipeline.
```

## modern-dotnet-005
GC settings and what to measure: Server vs Workstation GC, container limits, and LOH awareness.

```json
// runtimeconfig.template.json
{ "configProperties": { "System.GC.Server": true, "System.GC.Concurrent": true, "System.GC.RetainVM": true, "System.GC.HeapHardLimitPercent": 75 } }
```

```csharp
var info = GC.GetGCMemoryInfo();
logger.LogInformation("Gen2 collections: {G2}, heap: {Heap} MB, pause: {Pause:P1}", GC.CollectionCount(2), info.HeapSizeBytes / 1_048_576, info.PauseTimePercentage / 100);

// Large objects (>= 85,000 bytes) go to the LOH and are collected only in gen2: pool big buffers instead of allocating them repeatedly.
var large = ArrayPool<byte>.Shared.Rent(1 << 20);
```

## modern-dotnet-006
Choosing the right synchronisation primitive for each job.

```csharp
private readonly object _gate = new();
lock (_gate) { _total += amount; }                                                 // short, synchronous critical section

private readonly SemaphoreSlim _throttle = new(initialCount: 4);
await _throttle.WaitAsync(ct); try { await CallLegacyApiAsync(ct); } finally { _throttle.Release(); }   // async-friendly concurrency limit

Interlocked.Increment(ref _requestCount);                                          // lock-free counter

var cache = new ConcurrentDictionary<int, Lazy<Task<Product>>>();                  // GetOrAdd + Lazy<Task> = compute once per key
var product = await cache.GetOrAdd(id, i => new Lazy<Task<Product>>(() => LoadAsync(i))).Value;

var channel = Channel.CreateBounded<Job>(100);                                     // producer/consumer pipeline with backpressure
// Never lock on 'this', a string or a Type, and never await inside a lock { } (use SemaphoreSlim).
```

## modern-dotnet-007
`ConfigureAwait` and the classic ASP.NET deadlock from blocking on async code.

```csharp
// Classic ASP.NET (System.Web) with a SynchronizationContext: DEADLOCK
public ActionResult Index()
{
    var data = _service.GetDataAsync().Result;      // blocks the request thread; the awaited continuation needs that same thread
    return View(data);
}

// Library code: don't capture the context unnecessarily
public async Task<Data> GetDataAsync()
{
    var json = await _http.GetStringAsync(_url).ConfigureAwait(false);     // resume on any pool thread
    return JsonSerializer.Deserialize<Data>(json)!;
}

// ASP.NET Core has NO SynchronizationContext, so .Result does not deadlock there (it still wastes threads and starves the pool).
// Rule: async all the way; ConfigureAwait(false) in reusable libraries; not needed in ASP.NET Core application code.
```
