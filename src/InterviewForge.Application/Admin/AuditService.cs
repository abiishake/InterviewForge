using System.Text.Json;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Admin;

public sealed class AuditService(IAppDbContext db, ICurrentUser user, IClock clock)
{
    /// <summary>Adds an audit row to the current unit of work. The caller saves it with its own changes.</summary>
    public void Record(string action, string? targetId, string? targetName, object? detail = null) =>
        db.AuditLogs.Add(new AuditLog
        {
            At = clock.UtcNow, ActorId = user.UserId, ActorName = user.DisplayName, Action = action,
            TargetId = targetId, TargetName = targetName,
            Detail = detail is null ? null : Truncate(JsonSerializer.Serialize(detail), 2000)
        });

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];

    public async Task<PagedResult<AuditEntryDto>> QueryAsync(AuditQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page); var size = Math.Clamp(q.PageSize, 1, 200);
        var rows = db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q.Action)) rows = rows.Where(a => a.Action == q.Action);
        if (!string.IsNullOrWhiteSpace(q.Actor)) rows = rows.Where(a => a.ActorId == q.Actor);
        if (!string.IsNullOrWhiteSpace(q.Target)) rows = rows.Where(a => a.TargetId == q.Target);
        if (q.From is { } from) rows = rows.Where(a => a.At >= from);
        if (q.To is { } to) rows = rows.Where(a => a.At <= to);
        var total = await rows.CountAsync(ct);
        var items = await rows.OrderByDescending(a => a.At).ThenByDescending(a => a.Id).Skip((page - 1) * size).Take(size)
            .Select(a => new AuditEntryDto(a.Id, a.At, a.ActorName, a.Action, a.TargetName, a.Detail)).ToListAsync(ct);
        return new PagedResult<AuditEntryDto>(items, page, size, total);
    }
}
