# Real-world code examples: identity, application security, observability and testing

## security-001
Authentication establishes who the caller is; authorization decides what they may do. Two separate steps in the pipeline.

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();      // WHO: validate the token, build ClaimsPrincipal
builder.Services.AddAuthorizationBuilder().AddPolicy("claims.approve", p => p.RequireRole("Adjuster").RequireClaim("scope", "claims.approve"));   // WHAT

app.UseAuthentication();     // 401 when no/invalid credentials
app.UseAuthorization();      // 403 when authenticated but not allowed

app.MapPost("/claims/{id}/approve", (Guid id) => Results.NoContent()).RequireAuthorization("claims.approve");
```

## security-002
OAuth2 delegates access to an API; OpenID Connect adds an ID token that identifies the user. A BFF-style OIDC sign-in with ASP.NET Core.

```csharp
builder.Services.AddAuthentication(o => { o.DefaultScheme = "cookie"; o.DefaultChallengeScheme = "oidc"; })
    .AddCookie("cookie", o => { o.Cookie.HttpOnly = true; o.Cookie.SecurePolicy = CookieSecurePolicy.Always; o.Cookie.SameSite = SameSiteMode.Lax; })
    .AddOpenIdConnect("oidc", o =>
    {
        o.Authority = "https://login.example.com/";
        o.ClientId = "claims-web"; o.ClientSecret = builder.Configuration["Oidc:Secret"];
        o.ResponseType = "code"; o.UsePkce = true;                       // authorization code + PKCE
        o.Scope.Add("openid"); o.Scope.Add("profile"); o.Scope.Add("claims.api");   // openid = OIDC, claims.api = OAuth2 API scope
        o.SaveTokens = true; o.GetClaimsFromUserInfoEndpoint = true;
    });
```

## security-003
Three different tokens with different audiences: never send the ID token to an API, and keep refresh tokens server-side.

```csharp
var idToken      = await ctx.GetTokenAsync("id_token");        // for the CLIENT: who signed in (do not send to APIs)
var accessToken  = await ctx.GetTokenAsync("access_token");    // for the API: short-lived (5-15 min), audience = the API
var refreshToken = await ctx.GetTokenAsync("refresh_token");   // for the AUTH SERVER only: long-lived, rotate on use, store server-side

// Calling an API with the access token
var req = new HttpRequestMessage(HttpMethod.Get, "https://api.example.com/claims");
req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

// API-side validation
.AddJwtBearer(o => { o.Authority = "https://login.example.com/"; o.Audience = "claims.api"; o.TokenValidationParameters.ClockSkew = TimeSpan.FromSeconds(30); });
```

## security-004
Policy-based and resource-based authorization: roles are not enough when a rule depends on the specific claim being edited.

```csharp
public sealed class ClaimOwnerRequirement : IAuthorizationRequirement { }

public sealed class ClaimOwnerHandler : AuthorizationHandler<ClaimOwnerRequirement, Claim>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext ctx, ClaimOwnerRequirement req, Claim claim)
    {
        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (claim.AssignedAdjusterId == userId || ctx.User.IsInRole("Supervisor")) ctx.Succeed(req);
        return Task.CompletedTask;
    }
}

builder.Services.AddSingleton<IAuthorizationHandler, ClaimOwnerHandler>();
builder.Services.AddAuthorizationBuilder().AddPolicy("ClaimOwner", p => p.AddRequirements(new ClaimOwnerRequirement()));

var claim = await db.Claims.FindAsync(id);
var result = await authz.AuthorizeAsync(User, claim, "ClaimOwner");      // checked against the loaded resource
if (!result.Succeeded) return Forbid();
```

## security-005
Correct JWT validation settings, plus revocation through short lifetimes and a denylist check.

```csharp
.AddJwtBearer(o =>
{
    o.Authority = "https://login.example.com/";
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true, ValidAudience = "claims.api",
        ValidateLifetime = true, RequireExpirationTime = true, ClockSkew = TimeSpan.FromSeconds(30),
        ValidateIssuerSigningKey = true, ValidAlgorithms = [SecurityAlgorithms.RsaSha256],      // never accept "none" or HS256 with a public key
    };
    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var jti = ctx.Principal!.FindFirstValue("jti");
            if (await ctx.HttpContext.RequestServices.GetRequiredService<IRevocationList>().IsRevokedAsync(jti!))
                ctx.Fail("Token revoked");                                                       // logout / compromised session
        }
    };
});
```

## security-006
Multi-tenant SaaS: tenant resolved from the token, enforced in every query by a global filter, and isolated per tenant in the data layer.

```csharp
public interface ITenantContext { Guid TenantId { get; } }
public sealed class HttpTenantContext(IHttpContextAccessor accessor) : ITenantContext
{
    public Guid TenantId => Guid.Parse(accessor.HttpContext!.User.FindFirstValue("tid")!);   // from the validated token, never from a request header/body
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> o, ITenantContext tenant) : DbContext(o)
{
    protected override void OnModelCreating(ModelBuilder b) =>
        b.Entity<Invoice>().HasQueryFilter(i => i.TenantId == tenant.TenantId);
    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var e in ChangeTracker.Entries<ITenantOwned>().Where(e => e.State == EntityState.Added)) e.Entity.TenantId = tenant.TenantId;
        return base.SaveChangesAsync(ct);
    }
}
// Add: tests proving tenant A cannot read tenant B, row-level security in SQL as a second layer, tenant id in logs.
```

## security-007
Integrating an external identity provider: authority, audience and claim mapping, with roles from the IdP.

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));      // Entra ID

builder.Services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, o =>
{
    o.TokenValidationParameters.RoleClaimType = "roles";          // map IdP claim -> ClaimsPrincipal roles
    o.TokenValidationParameters.NameClaimType = "name";
});
```

```json
{ "AzureAd": { "Instance": "https://login.microsoftonline.com/", "TenantId": "<tenant-guid>", "ClientId": "<api-app-id>", "Audience": "api://claims-api" } }
```

```csharp
// Keycloak / Duende: same shape with Authority = "https://id.example.com/realms/claims" and options.MapInboundClaims = false
```

## security-008
Service-to-service auth: client credentials for a background worker, on-behalf-of for user context, managed identity for Azure resources.

```csharp
// 1. Client credentials (no user): machine token for a nightly job
var app = ConfidentialClientApplicationBuilder.Create(clientId).WithClientSecret(secret).WithAuthority(authority).Build();
var result = await app.AcquireTokenForClient(["api://billing/.default"]).ExecuteAsync();

// 2. On-behalf-of: API A calls API B as the signed-in user, preserving their identity and permissions
var obo = await app.AcquireTokenOnBehalfOf(["api://billing/invoices.read"], new UserAssertion(incomingAccessToken)).ExecuteAsync();

// 3. Managed identity: no secret at all when calling Azure resources
var token = await new DefaultAzureCredential().GetTokenAsync(new TokenRequestContext(["https://storage.azure.com/.default"]));

http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", obo.AccessToken);
```

## security-009
Password storage with a slow salted hash (ASP.NET Core Identity), lockout, and MFA enrolment.

```csharp
builder.Services.AddIdentity<AppUser, IdentityRole>(o =>
{
    o.Password.RequiredLength = 12; o.Password.RequireNonAlphanumeric = false;      // length beats complexity rules
    o.Lockout.MaxFailedAccessAttempts = 5; o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    o.SignIn.RequireConfirmedEmail = true;
}).AddEntityFrameworkStores<AppDbContext>().AddDefaultTokenProviders();             // PBKDF2 with per-user salt by default

builder.Services.Configure<PasswordHasherOptions>(o => o.IterationCount = 600_000);

// Never: MD5/SHA256(password), reversible encryption, or emailing passwords.
var key = await userManager.GetAuthenticatorKeyAsync(user);                          // TOTP secret for authenticator apps
var valid = await userManager.VerifyTwoFactorTokenAsync(user, userManager.Options.Tokens.AuthenticatorTokenProvider, code);
// Passkeys (WebAuthn) remove the shared secret: prefer them where the platform supports them.
```

## appsec-001
CORS, CSRF and XSS defences in one ASP.NET Core setup.

```csharp
builder.Services.AddCors(o => o.AddPolicy("spa", p => p.WithOrigins("https://app.example.com").AllowCredentials().WithHeaders("Content-Type", "X-CSRF-TOKEN").WithMethods("GET", "POST", "PUT", "DELETE")));
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.SameSite = SameSiteMode.Strict; });   // CSRF for cookie-auth APIs
builder.Services.ConfigureApplicationCookie(o => { o.Cookie.HttpOnly = true; o.Cookie.SecurePolicy = CookieSecurePolicy.Always; });

app.Use(async (ctx, next) =>                                                                                          // XSS: CSP + hardening headers
{
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'";
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});
app.UseCors("spa");
// Razor and Angular/React escape output by default. Never concatenate user input into HTML.
```

## appsec-002
SQL injection: concatenation versus parameters, in ADO.NET, Dapper and EF Core.

```csharp
// VULNERABLE: name = "x' OR 1=1; DROP TABLE Customers; --"
var bad = $"SELECT * FROM Customers WHERE Name = '{name}'";
await db.Database.ExecuteSqlRawAsync(bad);

// SAFE: parameterised
await using var cmd = new SqlCommand("SELECT Id, Name FROM Customers WHERE Name = @name", conn);
cmd.Parameters.Add("@name", SqlDbType.NVarChar, 100).Value = name;

var rows = await conn.QueryAsync<Customer>("SELECT * FROM Customers WHERE Name = @name", new { name });          // Dapper
var customers = await db.Customers.FromSqlInterpolated($"SELECT * FROM Customers WHERE Name = {name}").ToListAsync();   // EF Core turns interpolation into parameters

// Dynamic ORDER BY cannot be parameterised: allow-list the column
var sortable = new HashSet<string> { "Name", "CreatedAt" };
var column = sortable.Contains(sort) ? sort : "Name";
```

## appsec-003
SSRF: a "fetch this URL" feature must validate the destination so it cannot reach the metadata service or internal network.

```csharp
public async Task<byte[]> FetchImageAsync(string url, CancellationToken ct)
{
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) throw new ArgumentException("Only https URLs");
    if (!AllowedHosts.Contains(uri.Host)) throw new ArgumentException("Host not allowed");                   // allow-list beats deny-list

    foreach (var ip in await Dns.GetHostAddressesAsync(uri.Host, ct))                                       // resolve and check the actual address
        if (IPAddress.IsLoopback(ip) || IsPrivate(ip) || ip.Equals(IPAddress.Parse("169.254.169.254")))     // cloud metadata endpoint
            throw new ArgumentException("Blocked address");

    using var client = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false });                 // redirects can bypass checks
    return await client.GetByteArrayAsync(uri, ct);
}
// Defence in depth: egress firewall rules, IMDSv2 / managed identity, no credentials in the process environment.
```

## appsec-004
IDOR and mass assignment: authorise by ownership, and bind to a dedicated request DTO instead of the entity.

```csharp
// VULNERABLE: any authenticated user can read any invoice by guessing ids, and can set IsPaid/TenantId through binding
app.MapGet("/invoices/{id}", (int id, AppDbContext db) => db.Invoices.Find(id));
app.MapPut("/invoices/{id}", async (int id, Invoice body, AppDbContext db) => { db.Update(body); await db.SaveChangesAsync(); });

// SAFE: scope by the caller's identity, expose only editable fields
app.MapGet("/invoices/{id}", async (int id, ClaimsPrincipal user, AppDbContext db) =>
    await db.Invoices.Where(i => i.Id == id && i.CustomerId == user.GetCustomerId())
        .Select(i => new InvoiceDto(i.Id, i.Total)).SingleOrDefaultAsync() is { } dto ? Results.Ok(dto) : Results.NotFound());   // 404, not 403: do not reveal existence

public sealed record UpdateInvoiceRequest(string? PurchaseOrderNumber);       // IsPaid, TenantId are not bindable
```

## observability-001
Logs, metrics and traces answer different questions: one structured log, one counter/histogram, one span for the same operation.

```csharp
private static readonly Meter Meter = new("Claims.Api");
private static readonly Counter<long> Submitted = Meter.CreateCounter<long>("claims_submitted_total");
private static readonly Histogram<double> Duration = Meter.CreateHistogram<double>("claim_submit_duration_ms");
private static readonly ActivitySource Source = new("Claims.Api");

public async Task SubmitAsync(Claim claim, CancellationToken ct)
{
    using var activity = Source.StartActivity("SubmitClaim");                      // TRACE: where did the time go across services?
    activity?.SetTag("claim.type", claim.Type);
    var sw = Stopwatch.StartNew();
    await _repo.SaveAsync(claim, ct);
    Submitted.Add(1, new KeyValuePair<string, object?>("type", claim.Type));        // METRIC: how many / how slow, cheap to aggregate
    Duration.Record(sw.Elapsed.TotalMilliseconds);
    _logger.LogInformation("Claim {ClaimId} submitted by {UserId} for {Amount}", claim.Id, claim.UserId, claim.Amount);   // LOG: what exactly happened
}
```

## observability-002
Investigating a latency spike: query the trace and metric data, narrow by dependency, then confirm in logs.

```kusto
// Application Insights / Log Analytics (KQL): which operation and dependency regressed after 14:00?
requests
| where timestamp > ago(2h)
| summarize p95 = percentile(duration, 95), failed = countif(success == false) by operation_Name, bin(timestamp, 5m)
| render timechart

dependencies
| where timestamp > ago(2h)
| summarize p95 = percentile(duration, 95), calls = count() by target, type
| order by p95 desc

traces | where operation_Id == "4bf92f3577b34da6a3ce929d0e0e4736" | order by timestamp asc   // one slow request, end to end
```

## observability-003
SLI/SLO/error budget expressed as queries and an alert on burn rate.

```yaml
# SLO: 99.9% of API requests succeed in under 500 ms over 30 days -> error budget = 0.1% = ~43 minutes of badness
groups:
  - name: claims-api-slo
    rules:
      - record: sli:claims_api:good_ratio_5m
        expr: sum(rate(http_requests_total{job="claims-api",code!~"5..",le="0.5"}[5m])) / sum(rate(http_requests_total{job="claims-api"}[5m]))
      - alert: ErrorBudgetFastBurn
        expr: (1 - sli:claims_api:good_ratio_5m) > (14.4 * 0.001)      # budget burning 14x faster than allowed
        for: 5m
        labels: { severity: page }
        annotations: { summary: "Claims API is burning its monthly error budget too fast" }
```

## observability-004
Structured logging with Serilog and distributed tracing with OpenTelemetry, propagating context through messages too.

```csharp
builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).Enrich.FromLogContext().Enrich.WithProperty("Service", "claims-api").WriteTo.Console(new JsonFormatter()));

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("claims-api"))
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddEntityFrameworkCoreInstrumentation().AddSource("MassTransit").AddOtlpExporter())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddRuntimeInstrumentation().AddMeter("Claims.Api").AddOtlpExporter());

// Message headers carry traceparent (MassTransit/Service Bus instrumentation does this), so a trace spans API -> queue -> worker.
_logger.LogInformation("Order {OrderId} placed for tenant {TenantId}", order.Id, tenantId);   // message template, NOT string interpolation
```

## observability-005
Alert on symptoms users feel, with severity routing and runbooks; avoid alerting on every CPU blip.

```yaml
groups:
  - name: claims-api
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{job="claims-api",code=~"5.."}[5m])) / sum(rate(http_requests_total{job="claims-api"}[5m])) > 0.02
        for: 10m                                           # must persist: avoids flapping on a single bad minute
        labels: { severity: page }
        annotations: { runbook: "https://wiki.example.com/runbooks/claims-api-errors", summary: "More than 2% 5xx for 10 minutes" }
      - alert: QueueBacklogGrowing
        expr: deriv(rabbitmq_queue_messages{queue="payments"}[15m]) > 0 and rabbitmq_queue_messages{queue="payments"} > 1000
        labels: { severity: ticket }                       # non-urgent: a ticket, not a 3 a.m. page
```

## testing-001
The pyramid in practice: many fast unit tests, fewer integration tests against real infrastructure, a handful of end-to-end journeys.

```csharp
// UNIT (milliseconds, no I/O): pure domain rule
[Fact] public void Claim_over_limit_requires_review() =>
    Assert.True(new Claim(amount: 12_000m).RequiresManualReview(limit: 10_000m));

// INTEGRATION (seconds, real DB via Testcontainers): query + mapping + constraints
[Fact] public async Task Repository_returns_only_open_claims() { /* arrange rows in SQL Server container, act, assert */ }

// END-TO-END (slowest, few): the critical journey through the real deployed UI + API
// await page.GetByRole(AriaRole.Button, new() { Name = "Submit claim" }).ClickAsync(); await Expect(page.GetByText("Claim submitted")).ToBeVisibleAsync();
```

## testing-002
ASP.NET Core integration tests with `WebApplicationFactory`, replacing only the external dependency.

```csharp
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MsSqlContainer _sql = new MsSqlBuilder().Build();
    public Task InitializeAsync() => _sql.StartAsync();
    public new Task DisposeAsync() => _sql.DisposeAsync().AsTask();

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.ConfigureServices(s =>
    {
        s.RemoveAll<DbContextOptions<AppDbContext>>();
        s.AddDbContext<AppDbContext>(o => o.UseSqlServer(_sql.GetConnectionString()));     // real SQL Server, not the in-memory provider
        s.RemoveAll<IPaymentGateway>(); s.AddSingleton<IPaymentGateway, FakePaymentGateway>();   // fake only the third party
    });
}

public sealed class ClaimsApiTests(ApiFactory f) : IClassFixture<ApiFactory>
{
    [Fact] public async Task Post_claim_returns_201_and_location()
    {
        var res = await f.CreateClient().PostAsJsonAsync("/api/claims", new { policyNumber = "P-100", amount = 250 });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        Assert.NotNull(res.Headers.Location);
    }
}
```

## testing-003
A good unit test: arrange-act-assert, one behaviour, readable name, no hidden dependencies.

```csharp
public class DiscountCalculatorTests
{
    [Theory]
    [InlineData(99.99, 0)]
    [InlineData(100.00, 10)]
    [InlineData(500.00, 50)]
    public void Orders_of_100_or_more_get_ten_percent_off(decimal total, decimal expectedDiscount)
    {
        var calculator = new DiscountCalculator(new FixedClock(new DateOnly(2026, 11, 12)));     // deterministic time

        var discount = calculator.For(new Order(total, CustomerTier.Standard));

        Assert.Equal(expectedDiscount, discount);                                               // asserts behaviour, not implementation
    }
}
```

## testing-004
Consumer-driven contract test with Pact: the consumer defines expectations, the provider verifies them in CI.

```csharp
// Consumer (Orders service) test: generates a pact file
var pact = Pact.V4("orders-web", "customers-api", new PactConfig());
var http = pact.WithHttpInteractions();
http.UponReceiving("a request for customer 77").Given("customer 77 exists")
    .WithRequest(HttpMethod.Get, "/customers/77")
    .WillRespond().WithStatus(HttpStatusCode.OK).WithJsonBody(new { id = 77, name = Match.Type("Ada"), tier = Match.Type("Gold") });
await http.VerifyAsync(async ctx => { var c = await new CustomersClient(ctx.MockServerUri).GetAsync(77); Assert.Equal(77, c.Id); });

// Provider (Customers API) CI job: replay the pact against the real service; a breaking change fails the build before deployment
// pact-verifier --provider-base-url http://localhost:5000 --pact-url ./pacts/orders-web-customers-api.json
```

## testing-005
Load test with k6: ramp up, thresholds that fail the build, realistic think time.

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [{ duration: "2m", target: 100 }, { duration: "5m", target: 100 }, { duration: "1m", target: 0 }],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500", "p(99)<1200"] },   // fail the pipeline when violated
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/claims?status=open&pageSize=25`, { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } });
  check(res, { "status 200": r => r.status === 200, "has items": r => r.json("items").length > 0 });
  sleep(Math.random() * 2 + 1);                                                                      // think time
}
```

## testing-006
Test doubles: stub returns canned data, fake has a working lightweight implementation, mock verifies an interaction. Mock only at architecture boundaries.

```csharp
// STUB: fixed answer
var rates = Substitute.For<IExchangeRates>(); rates.GetRate("USD", "EUR").Returns(0.92m);

// FAKE: in-memory working implementation (great for repositories and clocks)
public sealed class FakeClaimRepository : IClaimRepository
{
    private readonly Dictionary<Guid, Claim> _store = new();
    public Task AddAsync(Claim c) { _store[c.Id] = c; return Task.CompletedTask; }
    public Task<Claim?> FindAsync(Guid id) => Task.FromResult(_store.GetValueOrDefault(id));
}

// MOCK: verify an outgoing interaction that IS the behaviour
var mailer = Substitute.For<IEmailSender>();
await new ClaimService(repo, mailer).ApproveAsync(claim.Id);
await mailer.Received(1).SendAsync(Arg.Is<Email>(e => e.To == claim.CustomerEmail));
// Harmful mocking: mocking DbContext/EF queries or asserting call order of private collaborators makes tests brittle and meaningless.
```
