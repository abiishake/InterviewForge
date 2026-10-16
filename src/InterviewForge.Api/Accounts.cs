using System.Security.Claims;
using InterviewForge.Application;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
namespace InterviewForge.Api;
public sealed class ClaimsUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string UserId => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
    public string DisplayName => accessor.HttpContext?.User.Identity?.Name ?? "";
    public bool IsAdmin => accessor.HttpContext?.User.IsInRole("Admin") == true;
}
public sealed record RegisterRequest(string Username, string Name, string Email, string Password);
public sealed record LoginRequest(string Username, string Password);
public static class Usernames
{
    private static readonly System.Text.RegularExpressions.Regex Pattern = new("^[a-z0-9._-]{3,32}$");
    public static string Normalize(string? value) => (value ?? "").Trim().ToLowerInvariant();
    public static bool IsValid(string normalized) => Pattern.IsMatch(normalized);
}
[ApiController, Route("api/auth")]
public sealed class AccountsController(AppDbContext db, PasswordHasher<Account> hasher) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated != true) return Ok(new { user = (object?)null });
        var a = await db.Accounts.FindAsync(new object[] { User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "" }, ct);
        return a is null ? Unauthorized() : Ok(new { user = new { a.Id, a.Username, a.Email, a.DisplayName, isAdmin = User.IsInRole("Admin") } });
    }
    [HttpPost("register"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest req, CancellationToken ct)
    {
        var username = Usernames.Normalize(req.Username);
        var emailRaw = (req.Email ?? "").Trim();
        new Validator().Required("username", username)
            .Must(Usernames.IsValid(username), "username", "Username must be 3-32 characters: letters, digits, dot, dash or underscore.")
            .Required("name", req.Name).MaxLength("name", req.Name, 80)
            .Required("email", emailRaw).MaxLength("email", emailRaw, 254)
            .Must(System.Net.Mail.MailAddress.TryCreate(emailRaw, out var mail) && mail.Address == emailRaw, "email", "A valid email is required.")
            .Required("password", req.Password).MinLength("password", req.Password, 12).MaxLength("password", req.Password, 128).ThrowIfInvalid();
        var email = emailRaw.ToLowerInvariant();
        if (await db.Accounts.AnyAsync(a => a.Username == username, ct)) throw new ConflictException("USERNAME_TAKEN", "This username is already taken.");
        if (await db.Accounts.AnyAsync(a => a.Email == email, ct)) throw new ConflictException("EMAIL_TAKEN", "This email is already registered.");
        var a = new Account { Username = username, Email = email, DisplayName = req.Name.Trim() };
        a.PasswordHash = hasher.HashPassword(a, req.Password); db.Accounts.Add(a);
        // Public signup always creates a Member; admin exists only via appsettings bootstrap.
        db.AccountRoles.Add(new AccountRole { AccountId = a.Id, Role = "Member" });
        try { await db.SaveChangesAsync(ct); } catch (DbUpdateException) { throw new ConflictException("ACCOUNT_EXISTS", "This username or email is already registered."); }
        await SignIn(a, ct); return await Me(ct);
    }
    [HttpPost("login"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
    {
        var username = Usernames.Normalize(req.Username);
        var a = username.Length == 0 ? null : await db.Accounts.FirstOrDefaultAsync(a => a.Username == username, ct);
        // A dummy hash verification also runs for unknown accounts.
        var dummy = new Account();
        var result = hasher.VerifyHashedPassword(a ?? dummy, a?.PasswordHash ?? hasher.HashPassword(dummy, "not-a-user-password"), req.Password ?? "");
        if (a is null || result == PasswordVerificationResult.Failed) return Unauthorized(new { error = new { code="LOGIN_FAILED", message="Username or password is incorrect." } });
        if (result == PasswordVerificationResult.SuccessRehashNeeded) { a.PasswordHash=hasher.HashPassword(a, req.Password!); await db.SaveChangesAsync(ct); }
        await SignIn(a, ct); return await Me(ct);
    }
    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout() { await HttpContext.SignOutAsync(); return NoContent(); }
    private async Task SignIn(Account a, CancellationToken ct)
    {
        var claims=new List<Claim> {new(ClaimTypes.NameIdentifier,a.Id), new(ClaimTypes.Name,a.DisplayName)};
        claims.AddRange((await db.AccountRoles.Where(r => r.AccountId == a.Id).Select(r => r.Role).ToListAsync(ct)).Select(r => new Claim(ClaimTypes.Role,r)));
        var principal=new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
        HttpContext.User=principal;
    }
}
public static class AccountBootstrap
{
    public static async Task Run(AppDbContext db, IConfiguration config)
    {
        var username = Usernames.Normalize(config["Admin:Username"] ?? "admin");
        if (!Usernames.IsValid(username)) throw new InvalidOperationException("Admin:Username must be 3-32 characters: letters, digits, dot, dash or underscore.");
        var existingAdminId = await db.AccountRoles.Where(r => r.Role == "Admin").Select(r => r.AccountId).FirstOrDefaultAsync();
        if (existingAdminId is not null)
        {
            // Keep the admin login id in sync with appsettings when it is free.
            var admin = await db.Accounts.FindAsync(existingAdminId);
            if (admin is not null && admin.Username != username && !await db.Accounts.AnyAsync(x => x.Username == username))
            { admin.Username = username; await db.SaveChangesAsync(); }
            return;
        }
        var password = config["Admin:Password"];
        var email = (config["Admin:Email"] ?? $"{username}@localhost").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(password) || password.Length < 12) throw new InvalidOperationException("Set Admin:Password (at least 12 characters) in appsettings or Admin__Password. Public signup never grants admin access.");
        if (await db.Accounts.AnyAsync(a => a.Username == username || a.Email == email)) throw new InvalidOperationException("Admin username or email already belongs to a member. Choose different values.");
        await using var tx=await db.Database.BeginTransactionAsync();
        var a=new Account {Id="local",Username=username,Email=email,DisplayName=config["Admin:DisplayName"] ?? "Administrator"};
        a.PasswordHash=new PasswordHasher<Account>().HashPassword(a,password); db.Accounts.Add(a); db.AccountRoles.Add(new AccountRole {AccountId=a.Id,Role="Admin"});
        await db.SaveChangesAsync();
        // Existing single-user data belongs to the bootstrap administrator; never to the first public signup.
        await db.Database.ExecuteSqlRawAsync("UPDATE Sections SET CreatedByUserId='local', AddedBy={0} WHERE IsUserCreated=1 AND CreatedByUserId IS NULL",a.DisplayName);
        await db.Database.ExecuteSqlRawAsync("UPDATE Topics SET CreatedByUserId='local', AddedBy={0} WHERE IsUserCreated=1 AND CreatedByUserId IS NULL",a.DisplayName);
        await db.Database.ExecuteSqlRawAsync("UPDATE Questions SET CreatedByUserId='local', AddedBy={0} WHERE IsUserCreated=1 AND CreatedByUserId IS NULL",a.DisplayName);
        await tx.CommitAsync();
    }
}
