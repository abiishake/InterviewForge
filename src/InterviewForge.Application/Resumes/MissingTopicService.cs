using InterviewForge.Application.Admin;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Resumes;

/// <summary>
/// Administrator inbox of resume skills the knowledge base does not cover. Entries are aggregated per
/// skill and never reveal which account or resume asked. Every administrator change writes an audit row.
/// </summary>
public sealed class MissingTopicService(IAppDbContext db, ICurrentUser user, IClock clock, AuditService audit)
{
    public async Task<PagedResult<MissingTopicDto>> ListAsync(MissingTopicStatus? status, int page, int pageSize, CancellationToken ct)
    {
        await ResolveCoveredAsync(ct);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var q = db.MissingTopicRequests.AsNoTracking().AsQueryable();
        if (status is { } s) q = q.Where(r => r.Status == s);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(r => r.RequestCount).ThenByDescending(r => r.LastRequestedAt).ThenBy(r => r.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new MissingTopicDto(r.Id, r.Key, r.DisplayName, r.RequestCount, r.FirstRequestedAt, r.LastRequestedAt, r.Status, r.ResolvedBy, r.ResolvedAt, r.EmailedAt))
            .ToListAsync(ct);
        return new PagedResult<MissingTopicDto>(items, page, pageSize, total);
    }

    public Task<int> CountOpenAsync(CancellationToken ct) => db.MissingTopicRequests.CountAsync(r => r.Status == MissingTopicStatus.Open, ct);

    public Task<MissingTopicDto> DismissAsync(int id, CancellationToken ct) => SetStatusAsync(id, MissingTopicStatus.Dismissed, AuditActions.ResumeTopicDismiss, ct);
    public Task<MissingTopicDto> MarkAddedAsync(int id, CancellationToken ct) => SetStatusAsync(id, MissingTopicStatus.Added, AuditActions.ResumeTopicMarkAdded, ct);
    public Task<MissingTopicDto> ReopenAsync(int id, CancellationToken ct) => SetStatusAsync(id, MissingTopicStatus.Open, AuditActions.ResumeTopicReopen, ct);

    private Task<MissingTopicDto> SetStatusAsync(int id, MissingTopicStatus status, string action, CancellationToken ct) => ResumeWriteGate.RunAsync(async () =>
    {
        var r = await db.MissingTopicRequests.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw NotFoundException.For("Missing topic", id);
        var before = r.Status;
        await using var tx = await db.BeginTransactionAsync(ct);
        r.Status = status;
        r.ResolvedAt = status == MissingTopicStatus.Open ? null : clock.UtcNow;
        r.ResolvedBy = status == MissingTopicStatus.Open ? null : user.DisplayName;
        audit.Record(action, "missing-topic:" + r.Id, r.DisplayName, new { from = before.ToString(), to = status.ToString(), key = r.Key });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return ToDto(r);
    }, ct);

    /// <summary>Closes open entries whose skill now matches knowledge-base content (e.g. an administrator added the topic).</summary>
    private Task<int> ResolveCoveredAsync(CancellationToken ct) => ResumeWriteGate.RunAsync(async () =>
    {
        var open = await db.MissingTopicRequests.Where(r => r.Status == MissingTopicStatus.Open).ToListAsync(ct);
        if (open.Count == 0) return 0;
        var index = await KnowledgeBaseIndex.LoadAsync(db, ct);
        var covered = open.Where(r => index.Match(r.Key, r.DisplayName).Any).ToList();
        if (covered.Count == 0) return 0;
        await using var tx = await db.BeginTransactionAsync(ct);
        foreach (var r in covered)
        {
            r.Status = MissingTopicStatus.Added;
            r.ResolvedAt = clock.UtcNow;
            r.ResolvedBy = "Knowledge base match";
            audit.Record(AuditActions.ResumeTopicAutoResolve, "missing-topic:" + r.Id, r.DisplayName, new { key = r.Key });
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return covered.Count;
    }, ct);

    private static MissingTopicDto ToDto(MissingTopicRequest r) =>
        new(r.Id, r.Key, r.DisplayName, r.RequestCount, r.FirstRequestedAt, r.LastRequestedAt, r.Status, r.ResolvedBy, r.ResolvedAt, r.EmailedAt);
}

/// <summary>Emails administrators one digest of newly requested missing topics. Does nothing without SMTP settings.</summary>
public sealed class MissingTopicDigest(IAppDbContext db, IEmailSender email, IClock clock, EmailOptions options)
{
    public async Task<int> SendPendingAsync(CancellationToken ct)
    {
        if (!email.IsConfigured) return 0;
        var pending = await db.MissingTopicRequests.Where(r => r.Status == MissingTopicStatus.Open && r.EmailedAt == null)
            .OrderByDescending(r => r.RequestCount).ThenBy(r => r.DisplayName).Take(200).ToListAsync(ct);
        if (pending.Count == 0) return 0;

        var adminIds = db.AccountRoles.Where(r => r.Role == "Admin").Select(r => r.AccountId);
        var recipients = await db.Accounts.AsNoTracking().Where(a => adminIds.Contains(a.Id) && !a.IsDisabled && a.Email != "")
            .Select(a => a.Email).ToListAsync(ct);
        if (recipients.Count == 0) return 0;

        var lines = pending.Select(r => $"  - {r.DisplayName} (requested by {r.RequestCount} resume{(r.RequestCount == 1 ? "" : "s")})");
        var link = string.IsNullOrWhiteSpace(options.PublicUrl) ? "Admin > Missing topics" : options.PublicUrl.TrimEnd('/') + "/admin/missing-topics";
        var body = $"""
            Resumes uploaded to InterviewForge mention {pending.Count} skill{(pending.Count == 1 ? "" : "s")} that the knowledge base does not cover yet:

            {string.Join("\n", lines)}

            Add topics for them, or dismiss the ones that do not need content: {link}

            This message contains no resume content and does not identify who uploaded the resumes.
            """;
        await email.SendAsync(recipients, $"InterviewForge: {pending.Count} missing knowledge-base topic{(pending.Count == 1 ? "" : "s")}", body, ct);

        var now = clock.UtcNow;
        await ResumeWriteGate.RunAsync(async () =>
        {
            var ids = pending.Select(p => p.Id).ToList();
            await db.MissingTopicRequests.Where(r => ids.Contains(r.Id)).ExecuteUpdateAsync(s => s.SetProperty(r => r.EmailedAt, now), ct);
            return 0;
        }, ct);
        return pending.Count;
    }
}
