using System.Text.RegularExpressions;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Admin;

public sealed class UserAdminService(IAppDbContext db, ICurrentUser actor, IClock clock, AuditService audit, IPasswordService passwords, IAccountSessionCache sessions)
{
    private static readonly string[] Roles = ["Admin", "Member"];

    // ---- Queries ---------------------------------------------------------------------------
    public async Task<PagedResult<AdminUserListItem>> ListAsync(UserListQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, 100);
        var accounts = db.Accounts.AsNoTracking().AsQueryable();
        var admins = db.AccountRoles.Where(r => r.Role == "Admin").Select(r => r.AccountId);

        var search = (q.Search ?? "").Trim().ToLowerInvariant();
        if (search.Length > 0)
        {
            var like = "%" + search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            accounts = accounts.Where(a => EF.Functions.Like(a.Username, like, "\\")
                                           || EF.Functions.Like(a.Email, like, "\\")
                                           || EF.Functions.Like(a.DisplayName.ToLower(), like, "\\"));
        }

        accounts = (q.Role ?? "all").ToLowerInvariant() switch
        {
            "admin" => accounts.Where(a => admins.Contains(a.Id)),
            "member" => accounts.Where(a => !admins.Contains(a.Id)),
            _ => accounts
        };
        accounts = (q.Status ?? "all").ToLowerInvariant() switch
        {
            "active" => accounts.Where(a => !a.IsDisabled),
            "disabled" => accounts.Where(a => a.IsDisabled),
            _ => accounts
        };

        var sort = (q.Sort ?? "name").Trim();
        var desc = sort.StartsWith('-');
        sort = sort.TrimStart('-').ToLowerInvariant();
        var ordered = (sort, desc) switch
        {
            ("username", false) => accounts.OrderBy(a => a.Username),
            ("username", true) => accounts.OrderByDescending(a => a.Username),
            ("created", false) => accounts.OrderBy(a => a.CreatedAt),
            ("created", true) => accounts.OrderByDescending(a => a.CreatedAt),
            ("lastlogin", false) => accounts.OrderBy(a => a.LastLoginAt),
            ("lastlogin", true) => accounts.OrderByDescending(a => a.LastLoginAt),
            (_, true) => accounts.OrderByDescending(a => a.DisplayName),
            _ => accounts.OrderBy(a => a.DisplayName)
        };

        var total = await accounts.CountAsync(ct);
        var pageRows = await ordered.ThenBy(a => a.Id).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        var ids = pageRows.Select(a => a.Id).ToList();

        // Aggregates for just this page: one grouped query each, never a subquery per row.
        var adminIds = (await db.AccountRoles.AsNoTracking().Where(r => ids.Contains(r.AccountId) && r.Role == "Admin")
            .Select(r => r.AccountId).ToListAsync(ct)).ToHashSet();
        var completed = await db.UserProgress.AsNoTracking().Where(p => ids.Contains(p.UserId) && p.Status == ProgressStatus.Completed)
            .GroupBy(p => p.UserId).Select(g => new { Id = g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Id, x => x.N, ct);
        var lastActive = await db.ActivityLogs.AsNoTracking().Where(a => ids.Contains(a.UserId))
            .GroupBy(a => a.UserId).Select(g => new { Id = g.Key, At = g.Max(a => a.OccurredAt) }).ToDictionaryAsync(x => x.Id, x => x.At, ct);

        var contrib = new Dictionary<string, int>();
        void Add(IEnumerable<(string? Id, int N)> rows)
        {
            foreach (var (id, n) in rows)
                if (id is not null) contrib[id] = contrib.GetValueOrDefault(id) + n;
        }
        Add((await db.Questions.AsNoTracking().Where(x => x.CreatedByUserId != null && ids.Contains(x.CreatedByUserId)).GroupBy(x => x.CreatedByUserId).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct)).Select(x => (x.Key, x.N)));
        Add((await db.Algorithms.AsNoTracking().Where(x => x.CreatedByUserId != null && ids.Contains(x.CreatedByUserId)).GroupBy(x => x.CreatedByUserId).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct)).Select(x => (x.Key, x.N)));
        Add((await db.Topics.AsNoTracking().Where(x => x.CreatedByUserId != null && ids.Contains(x.CreatedByUserId)).GroupBy(x => x.CreatedByUserId).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct)).Select(x => (x.Key, x.N)));
        Add((await db.Sections.AsNoTracking().Where(x => x.CreatedByUserId != null && ids.Contains(x.CreatedByUserId)).GroupBy(x => x.CreatedByUserId).Select(g => new { g.Key, N = g.Count() }).ToListAsync(ct)).Select(x => (x.Key, x.N)));

        var items = pageRows.Select(a => new AdminUserListItem(
            a.Id, a.Username, a.DisplayName, a.Email, adminIds.Contains(a.Id) ? "Admin" : "Member", a.IsDisabled,
            a.CreatedAt, a.LastLoginAt, lastActive.TryGetValue(a.Id, out var at) ? at : null,
            completed.GetValueOrDefault(a.Id), contrib.GetValueOrDefault(a.Id))).ToList();
        return new PagedResult<AdminUserListItem>(items, page, size, total);
    }

    public async Task<AdminUserDetail> GetAsync(string id, CancellationToken ct)
    {
        var a = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw NotFoundException.For("Account", id);
        var isAdmin = await db.AccountRoles.AnyAsync(r => r.AccountId == id && r.Role == "Admin", ct);
        var progress = db.UserProgress.AsNoTracking().Where(p => p.UserId == id);
        return new AdminUserDetail(
            a.Id, a.Username, a.DisplayName, a.Email, isAdmin ? "Admin" : "Member", a.IsDisabled, a.DisabledAt,
            a.MustChangePassword, a.TimeZone, a.CreatedAt, a.LastLoginAt, a.PasswordChangedAt,
            await progress.CountAsync(p => p.Status == ProgressStatus.Completed, ct),
            await progress.CountAsync(p => p.Status == ProgressStatus.NeedsReview, ct),
            await progress.SumAsync(p => p.ReviewCount, ct),
            await db.Plans.CountAsync(p => p.UserId == id, ct),
            await db.Sections.CountAsync(x => x.CreatedByUserId == id, ct),
            await db.Topics.CountAsync(x => x.CreatedByUserId == id, ct),
            await db.Questions.CountAsync(x => x.CreatedByUserId == id, ct),
            await db.Algorithms.CountAsync(x => x.CreatedByUserId == id, ct),
            await db.Feedback.CountAsync(x => x.UserId == id, ct));
    }

    // ---- Commands --------------------------------------------------------------------------
    public async Task<CreateUserResult> CreateAsync(CreateUserRequest req, CancellationToken ct)
    {
        var username = Normalize(req.Username);
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var name = (req.DisplayName ?? "").Trim();
        var role = ParseRole(req.Role);

        var v = new Validator();
        ValidateProfile(v, username, name, email);
        var generated = string.IsNullOrEmpty(req.Password);
        if (generated && !req.GeneratePassword) v.Add("password", "Provide a password or choose to generate one.");
        if (!generated) PasswordPolicy.Validate(v, "password", req.Password, username, email, name);
        v.ThrowIfInvalid();
        await EnsureUniqueAsync(username, email, null, ct);

        var password = generated ? PasswordPolicy.Generate() : req.Password!;
        await using var tx = await db.BeginTransactionAsync(ct);
        var a = new Account { Username = username, Email = email, DisplayName = name, MustChangePassword = true };
        a.PasswordHash = passwords.Hash(password);
        db.Accounts.Add(a);
        db.AccountRoles.Add(new AccountRole { AccountId = a.Id, Role = role });
        audit.Record(AuditActions.UserCreate, a.Id, a.DisplayName, new { username, role });
        await SaveUniqueAsync(ct);
        await tx.CommitAsync(ct);
        return new CreateUserResult(await GetAsync(a.Id, ct), generated ? password : null);
    }

    public async Task<AdminUserDetail> UpdateAsync(string id, UpdateUserRequest req, CancellationToken ct)
    {
        var username = Normalize(req.Username);
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var name = (req.DisplayName ?? "").Trim();
        var v = new Validator();
        ValidateProfile(v, username, name, email);
        v.ThrowIfInvalid();

        var a = await FindAsync(id, ct);
        await EnsureUniqueAsync(username, email, id, ct);
        await using var tx = await db.BeginTransactionAsync(ct);
        var changes = new Dictionary<string, string[]>();
        if (a.Username != username) changes["username"] = [a.Username, username];
        if (a.Email != email) changes["email"] = [a.Email, email];
        var nameChanged = a.DisplayName != name;
        if (nameChanged) changes["displayName"] = [a.DisplayName, name];
        a.Username = username;
        a.Email = email;
        a.DisplayName = name;
        a.UpdatedAt = clock.UtcNow;
        audit.Record(AuditActions.UserUpdate, a.Id, name, changes);
        await SaveUniqueAsync(ct);
        if (nameChanged) await SyncDisplayNameAsync(id, name, ct);
        await tx.CommitAsync(ct);
        sessions.Invalidate(id);
        return await GetAsync(id, ct);
    }

    public async Task<AdminUserDetail> SetRoleAsync(string id, SetRoleRequest req, CancellationToken ct)
    {
        var role = ParseRole(req.Role);
        var a = await FindAsync(id, ct);
        RejectSelf(id);
        var current = await db.AccountRoles.Where(r => r.AccountId == id).ToListAsync(ct);
        var wasAdmin = current.Any(r => r.Role == "Admin");
        if (wasAdmin && role != "Admin") await EnsureNotLastAdminAsync(id, ct);

        await using var tx = await db.BeginTransactionAsync(ct);
        if (current.All(r => r.Role != role))
        {
            db.AccountRoles.RemoveRange(current);
            db.AccountRoles.Add(new AccountRole { AccountId = id, Role = role });
        }
        a.UpdatedAt = clock.UtcNow;
        audit.Record(AuditActions.UserRoleChange, id, a.DisplayName, new { role = new[] { wasAdmin ? "Admin" : "Member", role } });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        sessions.Invalidate(id);
        return await GetAsync(id, ct);
    }

    public async Task<AdminUserDetail> SetDisabledAsync(string id, bool disabled, CancellationToken ct)
    {
        var a = await FindAsync(id, ct);
        if (disabled)
        {
            RejectSelf(id);
            if (await db.AccountRoles.AnyAsync(r => r.AccountId == id && r.Role == "Admin", ct)) await EnsureNotLastAdminAsync(id, ct);
        }
        await using var tx = await db.BeginTransactionAsync(ct);
        a.IsDisabled = disabled;
        a.DisabledAt = disabled ? clock.UtcNow : null;
        a.UpdatedAt = clock.UtcNow;
        if (disabled) a.SecurityStamp = Guid.NewGuid().ToString("N");
        audit.Record(disabled ? AuditActions.UserDisable : AuditActions.UserEnable, id, a.DisplayName);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        sessions.Invalidate(id);
        return await GetAsync(id, ct);
    }

    public async Task<TemporaryPasswordResult> ResetPasswordAsync(string id, ResetPasswordRequest req, CancellationToken ct)
    {
        var a = await FindAsync(id, ct);
        var generated = string.IsNullOrEmpty(req.Password);
        if (!generated)
        {
            var v = new Validator();
            PasswordPolicy.Validate(v, "password", req.Password, a.Username, a.Email, a.DisplayName);
            v.ThrowIfInvalid();
        }
        var password = generated ? PasswordPolicy.Generate() : req.Password!;
        await using var tx = await db.BeginTransactionAsync(ct);
        a.PasswordHash = passwords.Hash(password);
        a.MustChangePassword = true;
        a.PasswordChangedAt = clock.UtcNow;
        a.UpdatedAt = clock.UtcNow;
        a.SecurityStamp = Guid.NewGuid().ToString("N");
        audit.Record(AuditActions.UserPasswordReset, id, a.DisplayName);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        sessions.Invalidate(id);
        return new TemporaryPasswordResult(password);
    }

    public async Task RevokeSessionsAsync(string id, CancellationToken ct)
    {
        var a = await FindAsync(id, ct);
        await using var tx = await db.BeginTransactionAsync(ct);
        a.SecurityStamp = Guid.NewGuid().ToString("N");
        a.UpdatedAt = clock.UtcNow;
        audit.Record(AuditActions.UserSessionsRevoked, id, a.DisplayName);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        sessions.Invalidate(id);
    }

    public async Task DeleteAsync(string id, DeleteUserRequest req, CancellationToken ct)
    {
        var a = await FindAsync(id, ct);
        RejectSelf(id);
        if (!string.Equals((req.ConfirmUsername ?? "").Trim(), a.Username, StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("confirmUsername", "Type the account's username to confirm deletion.");
        if (await db.AccountRoles.AnyAsync(r => r.AccountId == id && r.Role == "Admin", ct)) await EnsureNotLastAdminAsync(id, ct);

        var label = a.DisplayName + " (former member)";
        var adminId = actor.UserId;
        var targetName = a.DisplayName;
        await using var tx = await db.BeginTransactionAsync(ct);
        var detail = new
        {
            username = a.Username,
            sections = await db.Sections.CountAsync(x => x.CreatedByUserId == id, ct),
            topics = await db.Topics.CountAsync(x => x.CreatedByUserId == id, ct),
            questions = await db.Questions.CountAsync(x => x.CreatedByUserId == id, ct),
            algorithms = await db.Algorithms.CountAsync(x => x.CreatedByUserId == id, ct),
            progress = await db.UserProgress.CountAsync(x => x.UserId == id, ct),
            notes = await db.UserNotes.CountAsync(x => x.UserId == id, ct),
            plans = await db.Plans.CountAsync(x => x.UserId == id, ct),
            feedback = await db.Feedback.CountAsync(x => x.UserId == id, ct)
        };

        // Shared contributions stay available to everyone; ownership moves to the acting administrator.
        await db.Sections.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.CreatedByUserId, adminId).SetProperty(x => x.AddedBy, label), ct);
        await db.Topics.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.CreatedByUserId, adminId).SetProperty(x => x.AddedBy, label), ct);
        await db.Questions.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.CreatedByUserId, adminId).SetProperty(x => x.AddedBy, label), ct);
        await db.Algorithms.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.CreatedByUserId, adminId).SetProperty(x => x.AddedBy, label), ct);

        // Private study data goes with the account; other people's data is never touched.
        await db.UserProgress.Where(x => x.UserId == id).ExecuteDeleteAsync(ct);
        await db.UserNotes.Where(x => x.UserId == id).ExecuteDeleteAsync(ct);
        await db.ActivityLogs.Where(x => x.UserId == id).ExecuteDeleteAsync(ct);
        await db.Plans.Where(x => x.UserId == id).ExecuteDeleteAsync(ct);
        await db.Feedback.Where(x => x.UserId == id).ExecuteDeleteAsync(ct);
        await db.AccountRoles.Where(x => x.AccountId == id).ExecuteDeleteAsync(ct);
        await db.Accounts.Where(x => x.Id == id).ExecuteDeleteAsync(ct);

        audit.Record(AuditActions.UserDelete, id, targetName, detail);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        sessions.Invalidate(id);
    }

    // ---- Settings --------------------------------------------------------------------------
    public async Task<string> GetRegistrationAsync(CancellationToken ct) =>
        await db.AppSettings.AsNoTracking().Where(s => s.Key == "Registration").Select(s => s.Value).FirstOrDefaultAsync(ct) ?? "Open";

    public async Task<string> SetRegistrationAsync(string value, CancellationToken ct)
    {
        if (value is not ("Open" or "Closed")) throw new ValidationException("registration", "Registration must be Open or Closed.");
        var s = await db.AppSettings.FirstOrDefaultAsync(x => x.Key == "Registration", ct);
        var before = s?.Value ?? "Open";
        if (s is null)
        {
            s = new AppSetting { Key = "Registration" };
            db.AppSettings.Add(s);
        }
        s.Value = value;
        s.UpdatedAt = clock.UtcNow;
        s.UpdatedBy = actor.DisplayName;
        if (before != value) audit.Record(AuditActions.RegistrationChange, null, null, new { registration = new[] { before, value } });
        await db.SaveChangesAsync(ct);
        return value;
    }

    // ---- Helpers ---------------------------------------------------------------------------
    public static string Normalize(string? username) => (username ?? "").Trim().ToLowerInvariant();

    private static string ParseRole(string? role) =>
        Roles.FirstOrDefault(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase))
        ?? throw new ValidationException("role", "Role must be Admin or Member.");

    private static void ValidateProfile(Validator v, string username, string name, string email)
    {
        v.Must(Regex.IsMatch(username, "^[a-z0-9._-]{3,32}$"), "username", "Username must be 3-32 characters: letters, digits, dot, dash or underscore.")
         .Required("displayName", name).MaxLength("displayName", name, 80)
         .Required("email", email).MaxLength("email", email, 254)
         .Must(System.Net.Mail.MailAddress.TryCreate(email, out var mail) && mail.Address == email, "email", "A valid email is required.");
    }

    private async Task<Account> FindAsync(string id, CancellationToken ct) =>
        await db.Accounts.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw NotFoundException.For("Account", id);

    private void RejectSelf(string id)
    {
        if (id == actor.UserId)
            throw new ConflictException("SELF_ACTION_NOT_ALLOWED", "You cannot do this to your own account. Ask another administrator.");
    }

    private async Task EnsureNotLastAdminAsync(string id, CancellationToken ct)
    {
        var others = await db.AccountRoles.CountAsync(r => r.Role == "Admin" && r.AccountId != id
            && db.Accounts.Any(a => a.Id == r.AccountId && !a.IsDisabled), ct);
        if (others == 0) throw new ConflictException("LAST_ADMIN", "At least one enabled administrator must remain.");
    }

    private async Task EnsureUniqueAsync(string username, string email, string? exceptId, CancellationToken ct)
    {
        if (await db.Accounts.AnyAsync(a => a.Username == username && a.Id != exceptId, ct)) throw new ConflictException("USERNAME_TAKEN", "This username is already taken.");
        if (await db.Accounts.AnyAsync(a => a.Email == email && a.Id != exceptId, ct)) throw new ConflictException("EMAIL_TAKEN", "This email is already registered.");
    }

    private async Task SaveUniqueAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ConflictException("ACCOUNT_EXISTS", "This username or email is already registered."); }
    }

    private async Task SyncDisplayNameAsync(string id, string name, CancellationToken ct)
    {
        await db.Sections.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
        await db.Topics.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
        await db.Questions.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
        await db.Algorithms.Where(x => x.CreatedByUserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
        await db.Feedback.Where(x => x.UserId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.AddedBy, name), ct);
    }
}
