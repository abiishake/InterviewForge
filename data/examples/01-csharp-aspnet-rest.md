# Real-world code examples: C#, ASP.NET Core and REST

## csharp-001
Insurance claims: entity as a class, commands and responses as records, and a small value type for money.

```csharp
public sealed class Claim                      // identity + lifecycle tracked by EF Core
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public ClaimStatus Status { get; private set; } = ClaimStatus.Draft;
    public void Submit() => Status = ClaimStatus.Submitted;
}

public sealed record CreateClaimCommand(Guid PolicyId, Money Amount, string Description);
public sealed record ClaimResponse(Guid Id, string Status, Money Amount);

public readonly record struct Money(decimal Amount, string Currency)   // no heap allocation, value equality
{
    public static Money operator +(Money a, Money b) =>
        a.Currency == b.Currency ? new(a.Amount + b.Amount, a.Currency) : throw new InvalidOperationException("Currency mismatch");
}
```

## csharp-002
Search endpoint: filtering must run in SQL (`IQueryable`), not after loading everything (`IEnumerable`).

```csharp
// BAD: AsEnumerable() pulls ALL rows into memory, then filters in the app
var bad = db.Claims.AsEnumerable().Where(c => c.Status == status).Take(50).ToList();

// GOOD: stays IQueryable, so Where/OrderBy/Take are translated to one SQL statement
IQueryable<Claim> query = db.Claims.AsNoTracking();
if (status is not null) query = query.Where(c => c.Status == status);
var page = await query.OrderByDescending(c => c.SubmittedAt).Take(50)
    .Select(c => new ClaimListItem(c.Id, c.Status, c.Amount))
    .ToListAsync(ct);
```

## csharp-003
Calling three downstream services in parallel with `async/await` instead of blocking threads.

```csharp
public async Task<DashboardDto> GetDashboardAsync(Guid userId, CancellationToken ct)
{
    var profile = _profiles.GetAsync(userId, ct);        // start all three, do not await yet
    var claims  = _claims.ListOpenAsync(userId, ct);
    var alerts  = _alerts.GetAsync(userId, ct);

    await Task.WhenAll(profile, claims, alerts);          // total latency = slowest call, not the sum
    return new DashboardDto(profile.Result, claims.Result, alerts.Result);
}

// Never: var p = GetProfileAsync().Result;   // blocks a thread-pool thread and can deadlock under a sync context
```

## csharp-004
Rethrowing correctly preserves the stack trace; wrapping adds context without losing the cause.

```csharp
try
{
    await _payments.ChargeAsync(order, ct);
}
catch (PaymentGatewayException ex) when (ex.IsTransient)
{
    _logger.LogWarning(ex, "Transient gateway failure for order {OrderId}", order.Id);
    throw;                                    // keeps the original stack trace (NOT 'throw ex')
}
catch (SqlException ex)
{
    throw new OrderProcessingException($"Could not persist order {order.Id}", ex);   // wrap, keep InnerException
}
```

## csharp-005
A generic repository constraint plus covariance for read-only sequences.

```csharp
public interface IReadRepository<out T> where T : class, IAggregateRoot   // 'out' = covariant (read-only)
{
    Task<T?> FindAsync(Guid id, CancellationToken ct);
    IAsyncEnumerable<T> StreamAsync(CancellationToken ct);
}

public static class Validation
{
    public static T Require<T>(T? value, string name) where T : class
        => value ?? throw new ArgumentNullException(name);
}

IReadRepository<Claim> claims = GetRepo();
IReadRepository<IAggregateRoot> asAggregates = claims;   // allowed thanks to covariance
```

## csharp-006
Event subscription leak: a long-lived publisher keeps a short-lived subscriber alive until you unsubscribe.

```csharp
public sealed class PriceFeed                       // singleton, lives for the whole process
{
    public event EventHandler<PriceChanged>? Changed;
    public void Publish(PriceChanged e) => Changed?.Invoke(this, e);
}

public sealed class PriceWidget : IDisposable        // short-lived (per user session)
{
    private readonly PriceFeed _feed;
    public PriceWidget(PriceFeed feed) { _feed = feed; _feed.Changed += OnChanged; }
    private void OnChanged(object? s, PriceChanged e) { /* update UI */ }
    public void Dispose() => _feed.Changed -= OnChanged;   // without this, the feed roots every widget forever
}
```

## csharp-007
LINQ deferred execution: the query runs at enumeration, not at definition, so enumerating twice hits the database twice.

```csharp
var query = db.Orders.Where(o => o.Total > 1000);   // nothing executed yet
db.Orders.Add(new Order { Total = 5000 });
await db.SaveChangesAsync();
var count = await query.CountAsync();               // runs NOW and includes the new order

IEnumerable<Order> lazy = GetOrdersFromApi();       // each foreach re-invokes the source
var snapshot = lazy.ToList();                       // materialise once when you iterate more than once
foreach (var o in snapshot) Process(o);
var total = snapshot.Sum(o => o.Total);
```

## csharp-008
Parsing a CSV line without allocating substrings using `Span<char>` on a hot path.

```csharp
public static bool TryParseLine(ReadOnlySpan<char> line, out int id, out decimal amount)
{
    id = 0; amount = 0;
    int comma = line.IndexOf(',');
    if (comma < 0) return false;
    return int.TryParse(line[..comma], out id) &&
           decimal.TryParse(line[(comma + 1)..], NumberStyles.Number, CultureInfo.InvariantCulture, out amount);
}

Span<byte> buffer = stackalloc byte[256];           // no heap allocation for small temporary buffers
```

## csharp-009
Pattern matching plus nullable reference types make state handling explicit and null-safe.

```csharp
#nullable enable
public static decimal Fee(Payment p) => p switch
{
    { Method: PaymentMethod.Card, Amount: > 1000 } => p.Amount * 0.019m,
    { Method: PaymentMethod.Card }                 => p.Amount * 0.029m,
    { Method: PaymentMethod.Ach }                  => 0.25m,
    null                                           => throw new ArgumentNullException(nameof(p)),
    _                                              => 0m,
};

string? middleName = user.MiddleName;               // the compiler warns if you dereference without a check
var length = middleName?.Length ?? 0;
if (customer is { Address: { Country: "IN" } addr }) Apply(addr);
```

## csharp-010
Deterministic cleanup of unmanaged resources with `await using` and the dispose pattern.

```csharp
public sealed class ReportExporter : IAsyncDisposable
{
    private readonly Stream _file = File.Create(Path.GetTempFileName());
    public async Task WriteAsync(string line, CancellationToken ct) =>
        await _file.WriteAsync(Encoding.UTF8.GetBytes(line + "\n"), ct);
    public ValueTask DisposeAsync() => _file.DisposeAsync();
}

await using (var exporter = new ReportExporter())
{
    await exporter.WriteAsync("id,amount", ct);
}   // DisposeAsync runs even if an exception is thrown; finalizers are only a safety net
```

## csharp-011
Building a large export string: `StringBuilder` instead of repeated concatenation, and ordinal comparison for identifiers.

```csharp
var sb = new StringBuilder(capacity: 64 * 1024);
foreach (var row in rows)
    sb.Append(row.Id).Append(',').Append(row.Amount.ToString(CultureInfo.InvariantCulture)).AppendLine();
string csv = sb.ToString();                          // s += ... in a loop would copy the string every iteration

bool same = string.Equals(headerKey, "X-Api-Key", StringComparison.OrdinalIgnoreCase);  // culture-independent, faster
var turkish = new CultureInfo("tr-TR");
bool risky = "FILE".ToLower(turkish) == "file";      // false! 'I' lowers to a dotless i in Turkish
```

## csharp-012
Value-based equality for a dictionary key: override `Equals` and `GetHashCode` together (a record does it for you).

```csharp
public sealed class PolicyKey : IEquatable<PolicyKey>
{
    public string Region { get; }
    public int Number { get; }
    public PolicyKey(string region, int number) => (Region, Number) = (region, number);

    public bool Equals(PolicyKey? other) => other is not null && Region == other.Region && Number == other.Number;
    public override bool Equals(object? obj) => Equals(obj as PolicyKey);
    public override int GetHashCode() => HashCode.Combine(Region, Number);   // must agree with Equals
}

// Simplest and least error-prone:
public readonly record struct PolicyId(string Region, int Number);
var cache = new Dictionary<PolicyId, Policy>();
```

## aspnet-core-001
A custom middleware that adds a correlation id to the log scope and the response, placed early in the pipeline.

```csharp
public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var id = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault() ?? Guid.NewGuid().ToString("N");
        ctx.Response.Headers["X-Correlation-Id"] = id;
        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
            await next(ctx);
    }
}

app.UseExceptionHandler();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseAuthentication();     // order matters: authentication before authorization
app.UseAuthorization();
app.MapControllers();
```

## aspnet-core-002
The classic captive-dependency bug: a singleton that holds a scoped `DbContext`.

```csharp
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cs));   // Scoped
builder.Services.AddScoped<IClaimService, ClaimService>();
builder.Services.AddSingleton<IClock, SystemClock>();                    // stateless: fine as singleton

// BUG: singleton captures a scoped service -> one DbContext shared by every request (not thread-safe)
builder.Services.AddSingleton<ReportCache>();
public sealed class ReportCache(AppDbContext db) { }

// FIX: create a scope for each unit of work
public sealed class ReportCacheFixed(IServiceScopeFactory scopes)
{
    public async Task RefreshAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Reports.CountAsync(ct);
    }
}
// builder.Host.UseDefaultServiceProvider(o => { o.ValidateScopes = true; o.ValidateOnBuild = true; });
```

## aspnet-core-003
Production defaults in one `Program.cs`: ProblemDetails, health checks, rate limiting, auth and versioned routes.

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization(o => o.AddPolicy("claims.write", p => p.RequireClaim("scope", "claims.write")));
builder.Services.AddHealthChecks().AddSqlServer(builder.Configuration.GetConnectionString("Default")!);
builder.Services.AddRateLimiter(o => o.AddFixedWindowLimiter("api", w => { w.PermitLimit = 100; w.Window = TimeSpan.FromMinutes(1); }));
builder.Services.AddOpenTelemetry().WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation());

var app = builder.Build();
app.UseExceptionHandler(); app.UseStatusCodePages();
app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();
app.MapHealthChecks("/health/ready");
app.MapGroup("/api/v1/claims").RequireAuthorization("claims.write").RequireRateLimiting("api").MapClaimEndpoints();
app.Run();
```

## aspnet-core-004
Typed `HttpClient` with `IHttpClientFactory`: pooled handlers, DNS refresh and resilience in one registration.

```csharp
builder.Services.AddHttpClient<IPaymentGateway, PaymentGateway>(c =>
{
    c.BaseAddress = new Uri("https://payments.example.com/");
    c.Timeout = TimeSpan.FromSeconds(10);
}).AddStandardResilienceHandler();            // retry + circuit breaker + timeout (Microsoft.Extensions.Http.Resilience)

public sealed class PaymentGateway(HttpClient http) : IPaymentGateway
{
    public async Task<ChargeResult> ChargeAsync(ChargeRequest req, CancellationToken ct)
    {
        using var res = await http.PostAsJsonAsync("v1/charges", req, ct);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<ChargeResult>(ct))!;
    }
}
// Anti-pattern: new HttpClient() per call leaks sockets (TIME_WAIT) and never picks up DNS changes.
```

## aspnet-core-005
Options pattern with validation on start-up; secrets come from Key Vault / user-secrets, not from `appsettings.json`.

```csharp
public sealed class PaymentOptions
{
    public const string Section = "Payments";
    [Required, Url] public string BaseUrl { get; init; } = "";
    [Range(1, 60)] public int TimeoutSeconds { get; init; } = 10;
    [Required] public string ApiKey { get; init; } = "";          // supplied by Key Vault / env var
}

builder.Configuration.AddAzureKeyVault(new Uri(vaultUri), new DefaultAzureCredential());
builder.Services.AddOptions<PaymentOptions>()
    .Bind(builder.Configuration.GetSection(PaymentOptions.Section))
    .ValidateDataAnnotations()
    .ValidateOnStart();                                            // fail fast instead of failing on first request

public sealed class PaymentGateway(IOptionsMonitor<PaymentOptions> options) { /* options.CurrentValue hot-reloads */ }
```

## aspnet-core-006
Validation errors returned as RFC 7807 `ValidationProblemDetails` from a minimal API endpoint.

```csharp
public sealed record CreateClaimRequest(
    [property: Required, StringLength(40)] string PolicyNumber,
    [property: Range(1, 1_000_000)] decimal Amount);

app.MapPost("/api/claims", async (CreateClaimRequest req, IClaimService svc, CancellationToken ct) =>
{
    var errors = new Dictionary<string, string[]>();
    if (!await svc.PolicyExistsAsync(req.PolicyNumber, ct)) errors["policyNumber"] = ["Unknown policy"];
    if (errors.Count > 0) return Results.ValidationProblem(errors);          // 400 + application/problem+json

    var claim = await svc.CreateAsync(req, ct);
    return Results.Created($"/api/claims/{claim.Id}", claim);
});
// Controllers with [ApiController] do model validation and ProblemDetails automatically.
```

## aspnet-core-007
Filter for a cross-cutting concern (audit) versus the endpoint handler that owns business logic.

```csharp
public sealed class AuditAttribute(string action) : ActionFilterAttribute
{
    public override async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        var result = await next();                                   // run the action
        var audit = ctx.HttpContext.RequestServices.GetRequiredService<IAuditWriter>();
        await audit.WriteAsync(action, ctx.HttpContext.User.Identity?.Name, result.Exception is null);
    }
}

[HttpPost("{id}/approve"), Audit("claim.approve"), Authorize(Policy = "claims.approve")]
public async Task<IActionResult> Approve(Guid id, CancellationToken ct) =>
    await _claims.ApproveAsync(id, ct) ? NoContent() : NotFound();
// Middleware = whole pipeline (headers, correlation); filters = MVC-aware (model state, action result).
```

## rest-001
Resource-oriented design with proper verbs, status codes and a stable error shape.

```http
GET    /api/v1/claims?status=open&page=2&pageSize=25     200 OK  + Link/X-Total-Count headers
GET    /api/v1/claims/c-1001                              200 OK  | 404 Not Found
POST   /api/v1/claims                                     201 Created + Location: /api/v1/claims/c-1002
PUT    /api/v1/claims/c-1001                              200 OK  | 409 Conflict (If-Match ETag mismatch)
PATCH  /api/v1/claims/c-1001                              200 OK  (partial update)
DELETE /api/v1/claims/c-1001                              204 No Content
POST   /api/v1/claims/c-1001/approve                      202 Accepted | 422 Unprocessable (business rule)

HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
{ "type": "https://errors.example.com/validation", "title": "One or more validation errors occurred.",
  "status": 400, "errors": { "amount": ["Must be greater than 0"] }, "traceId": "00-4bf92f35..." }
```

## rest-002
Keyset (cursor) pagination: stable and fast on huge tables, unlike `OFFSET` which scans and skips rows.

```csharp
app.MapGet("/api/claims", async (string? cursor, int pageSize, AppDbContext db, CancellationToken ct) =>
{
    pageSize = Math.Clamp(pageSize, 1, 100);
    var after = Cursor.Decode(cursor);                               // (SubmittedAt, Id) of the last item seen
    var items = await db.Claims.AsNoTracking()
        .Where(c => after == null || c.SubmittedAt < after.At || (c.SubmittedAt == after.At && c.Id.CompareTo(after.Id) < 0))
        .OrderByDescending(c => c.SubmittedAt).ThenByDescending(c => c.Id)
        .Take(pageSize + 1).ToListAsync(ct);

    var hasMore = items.Count > pageSize;
    var page = items.Take(pageSize).ToList();
    return new { items = page, next = hasMore ? Cursor.Encode(page[^1].SubmittedAt, page[^1].Id) : null };
});
// supporting index: CREATE INDEX IX_Claims_SubmittedAt_Id ON Claims (SubmittedAt DESC, Id DESC);
```

## rest-003
Idempotent payment POST: the client sends an `Idempotency-Key`, the server stores the first result and replays it.

```csharp
app.MapPost("/api/payments", async (HttpContext http, PaymentRequest req, AppDbContext db, IPaymentGateway gw, CancellationToken ct) =>
{
    var key = http.Request.Headers["Idempotency-Key"].ToString();
    if (string.IsNullOrWhiteSpace(key)) return Results.BadRequest("Idempotency-Key header is required");

    var existing = await db.IdempotencyRecords.FindAsync([key], ct);
    if (existing is not null) return Results.Json(existing.Response, statusCode: existing.StatusCode);   // replay

    try
    {
        var result = await gw.ChargeAsync(req, ct);
        db.IdempotencyRecords.Add(new IdempotencyRecord(key, 201, result));   // PK = key: duplicate inserts fail
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/payments/{result.Id}", result);
    }
    catch (DbUpdateException)   // a concurrent request with the same key won the race
    {
        return Results.Conflict("Request with this Idempotency-Key is already being processed");
    }
});
```

## rest-004
URL-segment API versioning with a deprecation signal, keeping v1 contracts frozen.

```csharp
builder.Services.AddApiVersioning(o =>
{
    o.DefaultApiVersion = new ApiVersion(1, 0);
    o.AssumeDefaultVersionWhenUnspecified = true;
    o.ReportApiVersions = true;                       // api-supported-versions / api-deprecated-versions headers
}).AddApiExplorer(o => o.GroupNameFormat = "'v'VVV");

[ApiController, ApiVersion("1.0", Deprecated = true), ApiVersion("2.0")]
[Route("api/v{version:apiVersion}/claims")]
public class ClaimsController : ControllerBase
{
    [HttpGet("{id}"), MapToApiVersion("1.0")] public ClaimV1 GetV1(Guid id) => ...;   // legacy shape
    [HttpGet("{id}"), MapToApiVersion("2.0")] public ClaimV2 GetV2(Guid id) => ...;   // adds fields, never removes
}
// Rules: additive changes are non-breaking; removing/renaming fields or changing semantics requires a new version.
```

## rest-005
Long-running report generation: `202 Accepted` with a status resource the client polls (or a webhook).

```csharp
app.MapPost("/api/reports", async (ReportRequest req, IJobQueue queue, AppDbContext db) =>
{
    var job = new ReportJob { Id = Guid.NewGuid(), Status = "Queued", RequestedBy = req.UserId };
    db.ReportJobs.Add(job); await db.SaveChangesAsync();
    await queue.EnqueueAsync(new GenerateReport(job.Id, req));
    return Results.Accepted($"/api/reports/{job.Id}", new { job.Id, job.Status });
});

app.MapGet("/api/reports/{id:guid}", async (Guid id, AppDbContext db) =>
{
    var job = await db.ReportJobs.FindAsync(id);
    return job switch
    {
        null => Results.NotFound(),
        { Status: "Completed" } => Results.Redirect(job.DownloadUrl!),                 // pre-signed blob URL
        { Status: "Failed" } => Results.Problem(job.Error, statusCode: 500),
        _ => Results.Json(new { job.Status, job.Progress }, statusCode: 200),          // client polls with Retry-After
    };
});
```
