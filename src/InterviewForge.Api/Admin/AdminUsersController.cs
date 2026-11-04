using InterviewForge.Application;
using InterviewForge.Application.Admin;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Api;

[Authorize(Roles = "Admin"), ApiController, Route("api/admin/users")]
public sealed class AdminUsersController(UserAdminService users, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<AdminUserListItem>> List([FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status,
        [FromQuery] string? sort, [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default) =>
        users.ListAsync(new UserListQuery(search, role, status, sort, page, pageSize), ct);

    [HttpGet("{id}")]
    public Task<AdminUserDetail> Get(string id, CancellationToken ct) => users.GetAsync(id, ct);

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest req, CancellationToken ct)
    {
        var result = await users.CreateAsync(req, ct);
        return Created($"/api/admin/users/{result.User.Id}", result);
    }

    [HttpPut("{id}")]
    public Task<AdminUserDetail> Update(string id, UpdateUserRequest req, CancellationToken ct) => users.UpdateAsync(id, req, ct);

    [HttpPost("{id}/role")]
    public Task<AdminUserDetail> SetRole(string id, SetRoleRequest req, CancellationToken ct) => users.SetRoleAsync(id, req, ct);

    [HttpPost("{id}/disable")]
    public Task<AdminUserDetail> Disable(string id, CancellationToken ct) => users.SetDisabledAsync(id, true, ct);

    [HttpPost("{id}/enable")]
    public Task<AdminUserDetail> Enable(string id, CancellationToken ct) => users.SetDisabledAsync(id, false, ct);

    [HttpPost("{id}/reset-password")]
    public Task<TemporaryPasswordResult> ResetPassword(string id, ResetPasswordRequest req, CancellationToken ct) => users.ResetPasswordAsync(id, req, ct);

    [HttpPost("{id}/revoke-sessions")]
    public async Task<IActionResult> RevokeSessions(string id, CancellationToken ct)
    {
        await users.RevokeSessionsAsync(id, ct);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, DeleteUserRequest req, CancellationToken ct)
    {
        await users.DeleteAsync(id, req, ct);
        return NoContent();
    }

    /// <summary>Read-only projection of a user's progress. Never includes note bodies.</summary>
    [HttpGet("{id}/progress")]
    public async Task<IActionResult> Progress(string id, [FromQuery] int take = 200, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 500);
        if (!await db.Accounts.AnyAsync(a => a.Id == id, ct)) throw NotFoundException.For("Account", id);
        return Ok(new
        {
            progress = await db.UserProgress.AsNoTracking().Where(p => p.UserId == id).OrderByDescending(p => p.UpdatedAt).Take(take)
                .Select(p => new { p.QuestionId, question = p.Question.Text, p.Status, p.IsFavorite, p.PersonalDifficulty, p.ReviewCount, p.LastReviewedAt, p.NextReviewAt }).ToListAsync(ct),
            plans = await db.Plans.AsNoTracking().Where(p => p.UserId == id).Select(p => new { p.Id, p.Name, p.Status, p.StartDate, p.DurationDays, p.IsCurrent }).ToListAsync(ct),
            activity = await db.ActivityLogs.AsNoTracking().Where(a => a.UserId == id).OrderByDescending(a => a.OccurredAt).Take(take)
                .Select(a => new { a.QuestionId, a.Kind, a.OccurredAt }).ToListAsync(ct)
        });
    }
}

public sealed record RegistrationSetting(string Registration);

[Authorize(Roles = "Admin"), ApiController, Route("api/admin/settings")]
public sealed class AdminSettingsController(UserAdminService users) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get(CancellationToken ct) => Ok(new RegistrationSetting(await users.GetRegistrationAsync(ct)));

    [HttpPut]
    public async Task<IActionResult> Put(RegistrationSetting req, CancellationToken ct) => Ok(new RegistrationSetting(await users.SetRegistrationAsync(req.Registration, ct)));
}

[Authorize(Roles = "Admin"), ApiController, Route("api/admin/audit")]
public sealed class AdminAuditController(AuditService audit) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<AuditEntryDto>> List([FromQuery] string? actor, [FromQuery] string? target, [FromQuery] string? action,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        audit.QueryAsync(new AuditQuery(actor, target, action, from, to, page, pageSize), ct);
}
