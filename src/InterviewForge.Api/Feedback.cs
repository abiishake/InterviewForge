using InterviewForge.Application;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace InterviewForge.Api;

public sealed record SendFeedback(string Kind, int ContentId, string Message);
public sealed record ReviewFeedback(string Status, string? AdminResponse);

public sealed record FeedbackDto(int Id, string Kind, int ContentId, string UserId, string AddedBy, string Message, string Status,
    string? AdminResponse, string? ReviewedBy, DateTime CreatedAt, DateTime UpdatedAt, string? ContentTitle, string? ContentUrl, bool ContentExists);

[Authorize, ApiController, Route("api/feedback")]
public sealed class FeedbackController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    [HttpGet]
    public async Task<IActionResult> Mine(CancellationToken ct) =>
        Ok(await ToDtosAsync(await db.Feedback.AsNoTracking().Where(f => f.UserId == UserId).OrderByDescending(f => f.CreatedAt).ToListAsync(ct), ct));

    [HttpPost]
    public async Task<IActionResult> Send(SendFeedback req, CancellationToken ct)
    {
        new Validator().Required("message", req.Message).MaxLength("message", req.Message, 10000).ThrowIfInvalid();
        var exists = req.Kind switch
        {
            "Question" => await db.Questions.AnyAsync(x => x.Id == req.ContentId, ct),
            "Topic" => await db.Topics.AnyAsync(x => x.Id == req.ContentId, ct),
            "Section" => await db.Sections.AnyAsync(x => x.Id == req.ContentId, ct),
            "Algorithm" => await db.Algorithms.AnyAsync(x => x.Id == req.ContentId, ct),
            _ => false
        };
        if (!exists) throw new ValidationException("contentId", "Content does not exist.");
        var f = new ContentFeedback { Kind = req.Kind, ContentId = req.ContentId, Message = req.Message.Trim(), UserId = UserId, AddedBy = User.Identity?.Name ?? "" };
        db.Feedback.Add(f);
        await db.SaveChangesAsync(ct);
        return Ok((await ToDtosAsync([f], ct))[0]);
    }

    /// <summary>Administrator review queue with status filter and paging.</summary>
    [Authorize(Roles = "Admin"), HttpGet("all")]
    public async Task<IActionResult> All([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var rows = db.Feedback.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase)) rows = rows.Where(f => f.Status == status);
        var total = await rows.CountAsync(ct);
        var list = await rows.OrderByDescending(f => f.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new PagedResult<FeedbackDto>(await ToDtosAsync(list, ct), page, pageSize, total));
    }

    [Authorize(Roles = "Admin"), HttpPut("{id:int}/review")]
    public async Task<IActionResult> Review(int id, ReviewFeedback req, CancellationToken ct)
    {
        new Validator().Must(new[] { "Pending", "Accepted", "Rejected" }.Contains(req.Status), "status", "Invalid review status.")
            .MaxLength("adminResponse", req.AdminResponse, 10000).ThrowIfInvalid();
        var f = await db.Feedback.FindAsync(new object[] { id }, ct) ?? throw NotFoundException.For("Feedback", id);
        f.Status = req.Status; f.AdminResponse = req.AdminResponse; f.ReviewedBy = User.Identity?.Name; f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok((await ToDtosAsync([f], ct))[0]);
    }

    /// <summary>Adds the server-built title/link and whether the target still exists (one query per kind, not per row).</summary>
    private async Task<List<FeedbackDto>> ToDtosAsync(IReadOnlyList<ContentFeedback> rows, CancellationToken ct)
    {
        List<int> Ids(string kind) => rows.Where(r => r.Kind == kind).Select(r => r.ContentId).Distinct().ToList();
        var qIds = Ids("Question"); var tIds = Ids("Topic"); var sIds = Ids("Section"); var aIds = Ids("Algorithm");
        var questions = qIds.Count == 0 ? new Dictionary<int, string>() : await db.Questions.AsNoTracking().Where(x => qIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.Text, ct);
        var topics = tIds.Count == 0 ? new Dictionary<int, string>() : await db.Topics.AsNoTracking().Where(x => tIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.Name, ct);
        var sections = sIds.Count == 0 ? new Dictionary<int, string>() : await db.Sections.AsNoTracking().Where(x => sIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.Name, ct);
        var algos = aIds.Count == 0 ? new Dictionary<int, (string Name, string Slug)>() : await db.Algorithms.AsNoTracking().Where(x => aIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => (x.Name, x.Slug), ct);

        static string Clip(string s) => s.Length > 120 ? s[..120] + "..." : s;
        return rows.Select(r =>
        {
            string? title = null, url = null;
            switch (r.Kind)
            {
                case "Question" when questions.TryGetValue(r.ContentId, out var q): title = Clip(q); url = $"/questions/{r.ContentId}"; break;
                case "Topic" when topics.TryGetValue(r.ContentId, out var t): title = t; url = $"/topics/{r.ContentId}"; break;
                case "Section" when sections.TryGetValue(r.ContentId, out var s): title = s; url = $"/sections/{r.ContentId}"; break;
                case "Algorithm" when algos.TryGetValue(r.ContentId, out var a): title = a.Name; url = $"/algorithms/{a.Slug}"; break;
            }
            return new FeedbackDto(r.Id, r.Kind, r.ContentId, r.UserId, r.AddedBy, r.Message, r.Status, r.AdminResponse, r.ReviewedBy,
                r.CreatedAt, r.UpdatedAt, title, url, url is not null);
        }).ToList();
    }
}
