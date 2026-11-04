using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using InterviewForge.Domain;
using InterviewForge.Api;
using InterviewForge.Application;
using InterviewForge.Application.Import;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using InterviewForge.Application.Admin;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Structured JSON console logs (docker logs friendly).
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(o => { o.IncludeScopes = true; o.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ "; o.UseUtcTimestamp = true; });

var importOptions = builder.Configuration.GetSection(ImportOptions.SectionName).Get<ImportOptions>() ?? new ImportOptions();
builder.Services.AddSingleton(importOptions);
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, ClaimsUser>();
builder.Services.AddScoped<PasswordHasher<Account>>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<LoginThrottle>();
builder.Services.AddSingleton<AccountSnapshotCache>();
builder.Services.AddSingleton<IAccountSessionCache>(sp => sp.GetRequiredService<AccountSnapshotCache>());
if (builder.Configuration.GetValue<bool>("Proxy:Enabled"))
{
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.ForwardLimit = 1;
        o.KnownProxies.Clear();
        o.KnownNetworks.Clear();
        foreach (var p in builder.Configuration.GetSection("Proxy:KnownProxies").Get<string[]>() ?? [])
            if (System.Net.IPAddress.TryParse(p, out var ip)) o.KnownProxies.Add(ip);
        foreach (var n in builder.Configuration.GetSection("Proxy:KnownNetworks").Get<string[]>() ?? [])
        {
            var parts = n.Split('/');
            if (parts.Length == 2 && System.Net.IPAddress.TryParse(parts[0], out var prefix) && int.TryParse(parts[1], out var len))
                o.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, len));
        }
    });
}
var configuredKeyDirectory = builder.Configuration["Auth:KeyDirectory"];
var keyDirectory = configuredKeyDirectory ?? Path.Combine(builder.Environment.ContentRootPath, "data", "keys");
Directory.CreateDirectory(keyDirectory);
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keyDirectory)).SetApplicationName("InterviewForge");
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o => {
    o.Cookie.Name="InterviewForge.Session";o.Cookie.HttpOnly=true;o.Cookie.SameSite=SameSiteMode.Strict;
    o.Cookie.SecurePolicy=builder.Configuration.GetValue<bool>("Auth:SecureCookies") ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan=TimeSpan.FromHours(12);o.SlidingExpiration=true;
    o.Events.OnValidatePrincipal=SessionPrincipal.ValidateAsync;
    o.Events.OnRedirectToLogin=ctx=>{ctx.Response.StatusCode=401;return Task.CompletedTask;};
    o.Events.OnRedirectToAccessDenied=ctx=>{ctx.Response.StatusCode=403;return Task.CompletedTask;};
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(o => { o.RejectionStatusCode=429; o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit=builder.Environment.IsEnvironment("Testing") ? 1000 : 10,Window=TimeSpan.FromMinutes(1),QueueLimit=0 })); });

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 1_000_000);
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 1_000_000); // overly large payload protection
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks().AddCheck<SqliteHealthCheck>("sqlite");

var app = builder.Build();

if (app.Environment.IsProduction() && string.IsNullOrWhiteSpace(configuredKeyDirectory))
    app.Logger.LogWarning("Auth:KeyDirectory is not set. Cookie-signing keys are stored inside the container and everyone is signed out on rebuild. Set Auth__KeyDirectory to a persistent volume.");

if (builder.Configuration.GetValue<bool>("Proxy:Enabled")) app.UseForwardedHeaders();

app.UseExceptionHandler();
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    ctx.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'";
    await next();
});

app.UseAuthentication();
app.UseMiddleware<PasswordChangeRequiredMiddleware>();
app.UseAuthorization();
app.UseRateLimiter();
// Every API mutation requires a same-origin custom header. Cross-site forms cannot send it,
// and no CORS origins are allowed. Strict cookies provide an additional CSRF boundary.
app.Use(async (ctx,next) => {
    if (ctx.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && ctx.Request.Headers["X-InterviewForge"] != "1") {
        ctx.Response.StatusCode=403;await ctx.Response.WriteAsJsonAsync(new {error=new {code="CSRF",message="Missing request verification header."}});return;
    }
    await next();
});
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Api:ExposeDocs"))
{
    app.MapOpenApi("/openapi/{documentName}.json");
    app.UseSwaggerUI(o => { o.SwaggerEndpoint("/openapi/v1.json", "InterviewForge v1"); o.RoutePrefix = "swagger"; });
}
else
{
    // Documentation is administrator-only unless Api:ExposeDocs=true.
    app.MapOpenApi("/openapi/{documentName}.json").RequireAuthorization(new Microsoft.AspNetCore.Authorization.AuthorizeAttribute { Roles = "Admin" });
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions());
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapFallbackToFile("index.html"); // Angular client-side routes

// ---- Startup: migrate + idempotent import --------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await InterviewForge.Infrastructure.DependencyInjection.MigrateAsync(db, logger);
        await AccountBootstrap.Run(db, builder.Configuration, logger);
        await Maintenance.PruneAsync(db);
        var mode = importOptions.RunOnStartup;
        var shouldImport = mode.Equals("Always", StringComparison.OrdinalIgnoreCase) ||
                           (mode.Equals("IfEmpty", StringComparison.OrdinalIgnoreCase) && !await db.Questions.AnyAsync(q => !q.IsUserCreated));
        if (shouldImport)
        {
            var dir = Program.DataDirectory(scope.ServiceProvider);
            await scope.ServiceProvider.GetRequiredService<IImportService>().ImportAsync(dir);
        }
    }
    catch (Exception ex)
    {
        logger.LogCritical(ex, "Database initialisation failed. Check ConnectionStrings__DefaultConnection and that the data volume is writable.");
        throw;
    }
    logger.LogInformation("InterviewForge started. Listening on {Urls}", string.Join(", ", app.Urls.DefaultIfEmpty(builder.Configuration["ASPNETCORE_URLS"] ?? "default")));
}

app.Run();

public partial class Program
{
    public static string DataDirectory(IServiceProvider sp)
    {
        var env = sp.GetRequiredService<IWebHostEnvironment>();
        var opts = sp.GetRequiredService<ImportOptions>();
        string Resolve(string p) => Path.IsPathRooted(p) ? p : Path.GetFullPath(Path.Combine(env.ContentRootPath, p));
        var primary = Resolve(opts.DataDirectory);
        if (File.Exists(Path.Combine(primary, opts.QuestionBankFile))) return primary;
        var fallback = Resolve(opts.FallbackDataDirectory);
        return File.Exists(Path.Combine(fallback, opts.QuestionBankFile)) ? fallback : primary;
    }
}
