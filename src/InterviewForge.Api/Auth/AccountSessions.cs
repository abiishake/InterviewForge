using System.Security.Claims;
using InterviewForge.Application;
using InterviewForge.Application.Admin;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace InterviewForge.Api;

public sealed class ClaimsUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;
    public string UserId => Principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
    public string DisplayName => Principal?.Identity?.Name ?? "";
    public bool IsAdmin => Principal?.IsInRole("Admin") == true;
    public string TimeZone => Principal?.FindFirstValue(SessionClaims.TimeZone) ?? "UTC";
}

public static class SessionClaims
{
    public const string Stamp = "sec";
    public const string MustChangePassword = "mcp";
    public const string TimeZone = "tz";
}

/// <summary>What the cookie validator needs to know about an account; refreshed at most every 30 seconds.</summary>
public sealed record AccountSnapshot(string Id, bool IsDisabled, string SecurityStamp, bool MustChangePassword, string DisplayName,
    string TimeZone, IReadOnlySet<string> Roles);

public sealed class AccountSnapshotCache(IServiceScopeFactory scopes, IMemoryCache cache) : IAccountSessionCache
{
    public static readonly TimeSpan Ttl = TimeSpan.FromSeconds(30);

    public void Invalidate(string accountId) => cache.Remove(Key(accountId));

    public async Task<AccountSnapshot?> GetAsync(string accountId, CancellationToken ct)
    {
        if (cache.TryGetValue(Key(accountId), out AccountSnapshot? hit)) return hit;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var a = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == accountId, ct);
        AccountSnapshot? snap = null;
        if (a is not null)
        {
            var roles = await db.AccountRoles.AsNoTracking().Where(r => r.AccountId == accountId).Select(r => r.Role).ToListAsync(ct);
            snap = new AccountSnapshot(a.Id, a.IsDisabled, a.SecurityStamp, a.MustChangePassword, a.DisplayName, a.TimeZone, roles.ToHashSet());
        }
        cache.Set(Key(accountId), snap, Ttl);
        return snap;
    }

    private static string Key(string id) => "account-snapshot:" + id;
}

public sealed class PasswordService(PasswordHasher<Account> hasher) : IPasswordService
{
    public string Hash(string password) => hasher.HashPassword(new Account(), password);
}

public static class SessionPrincipal
{
    public static ClaimsPrincipal Build(Account a, IEnumerable<string> roles, string scheme = CookieAuthenticationDefaults.AuthenticationScheme) =>
        Build(new AccountSnapshot(a.Id, a.IsDisabled, a.SecurityStamp, a.MustChangePassword, a.DisplayName, a.TimeZone, roles.ToHashSet()), scheme);

    public static ClaimsPrincipal Build(AccountSnapshot s, string scheme = CookieAuthenticationDefaults.AuthenticationScheme)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, s.Id),
            new(ClaimTypes.Name, s.DisplayName),
            new(SessionClaims.Stamp, s.SecurityStamp),
            new(SessionClaims.MustChangePassword, s.MustChangePassword ? "1" : "0"),
            new(SessionClaims.TimeZone, s.TimeZone)
        };
        claims.AddRange(s.Roles.Select(r => new Claim(ClaimTypes.Role, r)));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, scheme));
    }

    /// <summary>Rejects the cookie when the account is gone/disabled or its stamp changed; refreshes stale claims.</summary>
    public static async Task ValidateAsync(CookieValidatePrincipalContext ctx)
    {
        var id = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null) { await Reject(ctx); return; }
        var cache = ctx.HttpContext.RequestServices.GetRequiredService<AccountSnapshotCache>();
        var snap = await cache.GetAsync(id, ctx.HttpContext.RequestAborted);
        if (snap is null || snap.IsDisabled || snap.SecurityStamp != ctx.Principal!.FindFirstValue(SessionClaims.Stamp))
        {
            await Reject(ctx);
            return;
        }
        var roles = ctx.Principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToHashSet();
        var stale = !snap.Roles.SetEquals(roles)
                    || snap.DisplayName != ctx.Principal.Identity?.Name
                    || snap.TimeZone != ctx.Principal.FindFirstValue(SessionClaims.TimeZone)
                    || (snap.MustChangePassword ? "1" : "0") != ctx.Principal.FindFirstValue(SessionClaims.MustChangePassword);
        if (stale)
        {
            ctx.ReplacePrincipal(Build(snap));
            ctx.ShouldRenew = true;
        }
    }

    private static async Task Reject(CookieValidatePrincipalContext ctx)
    {
        ctx.RejectPrincipal();
        await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}

/// <summary>While a temporary password is active only sign-out, profile read and password change are allowed.</summary>
public sealed class PasswordChangeRequiredMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext ctx)
    {
        if (ctx.User.Identity?.IsAuthenticated == true
            && ctx.User.FindFirstValue(SessionClaims.MustChangePassword) == "1"
            && ctx.Request.Path.StartsWithSegments("/api")
            && !Allowed(ctx.Request))
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return ctx.Response.WriteAsJsonAsync(new { error = new { code = "PASSWORD_CHANGE_REQUIRED", message = "You must change your temporary password before continuing." } });
        }
        return next(ctx);
    }

    private static bool Allowed(HttpRequest r)
    {
        var path = r.Path;
        if (path.StartsWithSegments("/api/auth")) return true;
        if (path.StartsWithSegments("/api/account/password")) return true;
        return path.Equals("/api/account") && HttpMethods.IsGet(r.Method);
    }
}
