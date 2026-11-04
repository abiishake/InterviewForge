using System.Security.Claims;
using InterviewForge.Application.Admin;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Api;

public sealed record RegisterRequest(string Username, string Name, string Email, string Password, string? TimeZone);
public sealed record LoginRequest(string Username, string Password, string? TimeZone);

public static class Usernames
{
    private static readonly System.Text.RegularExpressions.Regex Pattern = new("^[a-z0-9._-]{3,32}$");
    public static string Normalize(string? value) => (value ?? "").Trim().ToLowerInvariant();
    public static bool IsValid(string normalized) => Pattern.IsMatch(normalized);
}

public static class TimeZones
{
    /// <summary>Returns a valid IANA id, or null when the value is empty or unknown.</summary>
    public static string? Validate(string? id)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Length > 64) return null;
        try { return TimeZoneInfo.FindSystemTimeZoneById(id.Trim()).Id; }
        catch (Exception) { return null; }
    }
}

[ApiController, Route("api/auth")]
public sealed class AccountsController(AppDbContext db, PasswordHasher<Account> hasher, AccountSnapshotCache sessions, LoginThrottle throttle) : ControllerBase
{
    [HttpGet("config")]
    public async Task<IActionResult> Config(CancellationToken ct)
    {
        var value = await db.AppSettings.AsNoTracking().Where(s => s.Key == "Registration").Select(s => s.Value).FirstOrDefaultAsync(ct);
        return Ok(new { registrationOpen = value != "Closed" });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated != true) return Ok(new { user = (object?)null });
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var a = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a is null || a.IsDisabled)
        {
            await HttpContext.SignOutAsync();
            return Unauthorized(new { error = new { code = "UNAUTHENTICATED", message = "Sign in to continue." } });
        }
        return Ok(new { user = Shape(a, User.IsInRole("Admin")) });
    }

    [HttpPost("register"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest req, CancellationToken ct)
    {
        var registration = await db.AppSettings.AsNoTracking().Where(s => s.Key == "Registration").Select(s => s.Value).FirstOrDefaultAsync(ct);
        if (registration == "Closed")
            return StatusCode(403, new { error = new { code = "REGISTRATION_CLOSED", message = "Public sign-up is closed. Ask an administrator for an account." } });

        var username = Usernames.Normalize(req.Username);
        var emailRaw = (req.Email ?? "").Trim();
        var v = new Validator()
            .Required("username", username)
            .Must(Usernames.IsValid(username), "username", "Username must be 3-32 characters: letters, digits, dot, dash or underscore.")
            .Required("name", req.Name).MaxLength("name", req.Name, 80)
            .Required("email", emailRaw).MaxLength("email", emailRaw, 254)
            .Must(System.Net.Mail.MailAddress.TryCreate(emailRaw, out var mail) && mail.Address == emailRaw, "email", "A valid email is required.");
        PasswordPolicy.Validate(v, "password", req.Password, username, emailRaw, req.Name);
        v.ThrowIfInvalid();

        var email = emailRaw.ToLowerInvariant();
        if (await db.Accounts.AnyAsync(a => a.Username == username, ct)) throw new ConflictException("USERNAME_TAKEN", "This username is already taken.");
        if (await db.Accounts.AnyAsync(a => a.Email == email, ct)) throw new ConflictException("EMAIL_TAKEN", "This email is already registered.");

        var now = DateTime.UtcNow;
        var a = new Account
        {
            Username = username, Email = email, DisplayName = req.Name.Trim(),
            TimeZone = TimeZones.Validate(req.TimeZone) ?? "UTC", LastLoginAt = now, PasswordChangedAt = now
        };
        a.PasswordHash = hasher.HashPassword(a, req.Password);
        db.Accounts.Add(a);
        // Public sign-up always creates a Member; payloads never choose roles.
        db.AccountRoles.Add(new AccountRole { AccountId = a.Id, Role = "Member" });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ConflictException("ACCOUNT_EXISTS", "This username or email is already registered."); }
        await SignInAsync(a, ["Member"]);
        return Ok(new { user = Shape(a, false) });
    }

    [HttpPost("login"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
    {
        var username = Usernames.Normalize(req.Username);
        if (throttle.IsLocked(username))
            return StatusCode(429, new { error = new { code = "LOGIN_FAILED", message = "Too many attempts. Try again in a few minutes." } });

        var a = username.Length == 0 ? null : await db.Accounts.FirstOrDefaultAsync(x => x.Username == username, ct);
        // A dummy hash verification also runs for unknown accounts so timing does not reveal them.
        var dummy = new Account();
        var result = hasher.VerifyHashedPassword(a ?? dummy, a?.PasswordHash ?? hasher.HashPassword(dummy, "not-a-user-password"), req.Password ?? "");
        if (a is null || result == PasswordVerificationResult.Failed)
        {
            throttle.Failure(username);
            return Unauthorized(new { error = new { code = "LOGIN_FAILED", message = "Username or password is incorrect." } });
        }
        if (a.IsDisabled)
            return StatusCode(403, new { error = new { code = "ACCOUNT_DISABLED", message = "This account is disabled. Contact an administrator." } });

        throttle.Success(username);
        if (result == PasswordVerificationResult.SuccessRehashNeeded) a.PasswordHash = hasher.HashPassword(a, req.Password!);
        a.LastLoginAt = DateTime.UtcNow;
        if (TimeZones.Validate(req.TimeZone) is { } tz && !a.MustChangePassword) a.TimeZone = tz;
        await db.SaveChangesAsync(ct);
        sessions.Invalidate(a.Id);
        var roles = await db.AccountRoles.Where(r => r.AccountId == a.Id).Select(r => r.Role).ToListAsync(ct);
        await SignInAsync(a, roles);
        return Ok(new { user = Shape(a, roles.Contains("Admin")) });
    }

    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync();
        return NoContent();
    }

    private async Task SignInAsync(Account a, IEnumerable<string> roles)
    {
        var principal = SessionPrincipal.Build(a, roles);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
        HttpContext.User = principal;
    }

    internal static object Shape(Account a, bool isAdmin) => new
    {
        a.Id, a.Username, a.Email, a.DisplayName, isAdmin, a.TimeZone, a.MustChangePassword, a.CreatedAt
    };
}
