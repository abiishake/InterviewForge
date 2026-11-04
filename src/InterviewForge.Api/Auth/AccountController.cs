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

public sealed record UpdateProfileRequest(string DisplayName, string Email, string? TimeZone);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

/// <summary>Self-service profile and credentials. Identity always comes from the cookie, never the payload.</summary>
[Authorize, ApiController, Route("api/account")]
public sealed class AccountController(AppDbContext db, PasswordHasher<Account> hasher, AccountSnapshotCache sessions) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var a = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == UserId, ct) ?? throw NotFoundException.For("Account", UserId);
        return Ok(AccountsController.Shape(a, User.IsInRole("Admin")));
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateProfileRequest req, CancellationToken ct)
    {
        var name = (req.DisplayName ?? "").Trim();
        var email = (req.Email ?? "").Trim();
        new Validator()
            .Required("displayName", name).MaxLength("displayName", name, 80)
            .Required("email", email).MaxLength("email", email, 254)
            .Must(System.Net.Mail.MailAddress.TryCreate(email, out var mail) && mail.Address == email, "email", "A valid email is required.")
            .Must(string.IsNullOrWhiteSpace(req.TimeZone) || TimeZones.Validate(req.TimeZone) is not null, "timeZone", "Unknown time zone.")
            .ThrowIfInvalid();
        email = email.ToLowerInvariant();

        var a = await db.Accounts.FirstOrDefaultAsync(x => x.Id == UserId, ct) ?? throw NotFoundException.For("Account", UserId);
        if (await db.Accounts.AnyAsync(x => x.Email == email && x.Id != a.Id, ct)) throw new ConflictException("EMAIL_TAKEN", "This email is already registered.");

        var nameChanged = a.DisplayName != name;
        a.DisplayName = name;
        a.Email = email;
        if (TimeZones.Validate(req.TimeZone) is { } tz) a.TimeZone = tz;
        a.UpdatedAt = DateTime.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ConflictException("EMAIL_TAKEN", "This email is already registered."); }
        if (nameChanged)
        {
            await db.Sections.Where(x => x.CreatedByUserId == a.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
            await db.Topics.Where(x => x.CreatedByUserId == a.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
            await db.Questions.Where(x => x.CreatedByUserId == a.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
            await db.Algorithms.Where(x => x.CreatedByUserId == a.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
            await db.Feedback.Where(x => x.UserId == a.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
        }
        await tx.CommitAsync(ct);
        sessions.Invalidate(a.Id);
        await ResignInAsync(a);
        return Ok(AccountsController.Shape(a, User.IsInRole("Admin")));
    }

    [HttpPost("password"), EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        var a = await db.Accounts.FirstOrDefaultAsync(x => x.Id == UserId, ct) ?? throw NotFoundException.For("Account", UserId);
        if (hasher.VerifyHashedPassword(a, a.PasswordHash, req.CurrentPassword ?? "") == PasswordVerificationResult.Failed)
            throw new ValidationException("currentPassword", "Current password is incorrect.");
        var v = new Validator();
        PasswordPolicy.Validate(v, "newPassword", req.NewPassword, a.Username, a.Email, a.DisplayName);
        v.Must(req.NewPassword != req.CurrentPassword, "newPassword", "Choose a password you have not used just now.");
        v.ThrowIfInvalid();

        a.PasswordHash = hasher.HashPassword(a, req.NewPassword);
        a.MustChangePassword = false;
        a.PasswordChangedAt = DateTime.UtcNow;
        a.UpdatedAt = DateTime.UtcNow;
        a.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync(ct);
        sessions.Invalidate(a.Id);
        await ResignInAsync(a); // only this session survives the new stamp
        return NoContent();
    }

    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOthers(CancellationToken ct)
    {
        var a = await db.Accounts.FirstOrDefaultAsync(x => x.Id == UserId, ct) ?? throw NotFoundException.For("Account", UserId);
        a.SecurityStamp = Guid.NewGuid().ToString("N");
        a.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        sessions.Invalidate(a.Id);
        await ResignInAsync(a);
        return NoContent();
    }

    private async Task ResignInAsync(Account a)
    {
        var roles = await db.AccountRoles.Where(r => r.AccountId == a.Id).Select(r => r.Role).ToListAsync();
        var principal = SessionPrincipal.Build(a, roles);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
        HttpContext.User = principal;
    }
}
