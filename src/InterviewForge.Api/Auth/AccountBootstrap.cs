using InterviewForge.Application.Admin;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Api;

/// <summary>
/// Creates the bootstrap administrator (Id "local") when no enabled administrator exists.
/// Ordinary restarts never reset an enabled administrator's password or rename another admin.
/// </summary>
public static class AccountBootstrap
{
    public static async Task Run(AppDbContext db, IConfiguration config, ILogger? logger = null)
    {
        var username = Usernames.Normalize(config["Admin:Username"] ?? "admin");
        if (!Usernames.IsValid(username))
            throw new InvalidOperationException("Admin:Username must be 3-32 characters: letters, digits, dot, dash or underscore.");

        var adminIds = await db.AccountRoles.Where(r => r.Role == "Admin").Select(r => r.AccountId).ToListAsync();
        var enabledAdmins = await db.Accounts.CountAsync(a => adminIds.Contains(a.Id) && !a.IsDisabled);
        if (enabledAdmins > 0)
        {
            // Keep only the bootstrap account's login in sync with configuration, and only while it is still an admin.
            var local = await db.Accounts.FirstOrDefaultAsync(a => a.Id == "local");
            if (local is not null && adminIds.Contains("local") && local.Username != username
                && !await db.Accounts.AnyAsync(x => x.Username == username))
            {
                local.Username = username;
                await db.SaveChangesAsync();
            }
            return;
        }

        var password = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
            throw new InvalidOperationException("No enabled administrator exists. Set Admin__Password (at least 12 characters) before starting. Public sign-up never grants admin access.");

        var email = (config["Admin:Email"] ?? $"{username}@localhost").Trim().ToLowerInvariant();
        var hasher = new PasswordHasher<Account>();
        await using var tx = await db.Database.BeginTransactionAsync();

        var existing = await db.Accounts.FirstOrDefaultAsync(a => a.Id == "local")
                       ?? (adminIds.Count > 0 ? await db.Accounts.FirstOrDefaultAsync(a => a.Id == adminIds[0]) : null);
        if (existing is not null)
        {
            // Lock-out recovery: restore the bootstrap administrator with a forced password change.
            existing.IsDisabled = false;
            existing.DisabledAt = null;
            existing.MustChangePassword = true;
            existing.PasswordHash = hasher.HashPassword(existing, password);
            existing.SecurityStamp = Guid.NewGuid().ToString("N");
            existing.UpdatedAt = DateTime.UtcNow;
            if (!await db.AccountRoles.AnyAsync(r => r.AccountId == existing.Id && r.Role == "Admin"))
                db.AccountRoles.Add(new AccountRole { AccountId = existing.Id, Role = "Admin" });
            db.AuditLogs.Add(new AuditLog { ActorId = "system", ActorName = "Bootstrap", Action = AuditActions.BootstrapRecovery, TargetId = existing.Id, TargetName = existing.DisplayName });
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            logger?.LogWarning("No enabled administrator existed; account {Username} was restored. A password change is required at next sign-in.", existing.Username);
            return;
        }

        if (await db.Accounts.AnyAsync(a => a.Username == username || a.Email == email))
            throw new InvalidOperationException("Admin username or email already belongs to a member. Choose different values.");

        var a = new Account { Id = "local", Username = username, Email = email, DisplayName = config["Admin:DisplayName"] ?? "Administrator" };
        a.PasswordHash = hasher.HashPassword(a, password);
        db.Accounts.Add(a);
        db.AccountRoles.Add(new AccountRole { AccountId = a.Id, Role = "Admin" });
        await db.SaveChangesAsync();
        // Existing single-user data belongs to the bootstrap administrator; never to the first public signup.
        await db.Database.ExecuteSqlRawAsync("UPDATE Sections SET CreatedByUserId='local', AddedBy={0} WHERE IsUserCreated=1 AND CreatedByUserId IS NULL", a.DisplayName);
        await db.Database.ExecuteSqlRawAsync("UPDATE Topics SET CreatedByUserId='local', AddedBy={0} WHERE IsUserCreated=1 AND CreatedByUserId IS NULL", a.DisplayName);
        await db.Database.ExecuteSqlRawAsync("UPDATE Questions SET CreatedByUserId='local', AddedBy={0} WHERE IsUserCreated=1 AND CreatedByUserId IS NULL", a.DisplayName);
        await tx.CommitAsync();
    }
}

/// <summary>Startup retention for append-only tables.</summary>
public static class Maintenance
{
    public static async Task PruneAsync(AppDbContext db)
    {
        var auditCutoff = DateTime.UtcNow.AddDays(-365);
        await db.AuditLogs.Where(a => a.At < auditCutoff).ExecuteDeleteAsync();
        var activityCutoff = DateTime.UtcNow.AddDays(-400);
        await db.ActivityLogs.Where(a => a.OccurredAt < activityCutoff).ExecuteDeleteAsync();
    }
}
