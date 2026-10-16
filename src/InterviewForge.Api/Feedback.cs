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
[Authorize, ApiController, Route("api/feedback")]
public sealed class FeedbackController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Mine(CancellationToken ct) => Ok(await db.Feedback.Where(f => f.UserId == User.FindFirstValue(ClaimTypes.NameIdentifier)).OrderByDescending(f => f.CreatedAt).ToListAsync(ct));
    [HttpPost] public async Task<IActionResult> Send(SendFeedback req, CancellationToken ct)
    {
        new Validator().Required("message",req.Message).MaxLength("message",req.Message,10000).ThrowIfInvalid();
        var exists=req.Kind switch {"Question" => await db.Questions.AnyAsync(x => x.Id == req.ContentId,ct), "Topic" => await db.Topics.AnyAsync(x => x.Id == req.ContentId,ct), "Section" => await db.Sections.AnyAsync(x => x.Id == req.ContentId,ct), "Algorithm" => await db.Algorithms.AnyAsync(x => x.Id == req.ContentId,ct), _ => false};
        if (!exists) throw new ValidationException("contentId","Content does not exist.");
        var f=new ContentFeedback {Kind=req.Kind,ContentId=req.ContentId,Message=req.Message.Trim(),UserId=User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "",AddedBy=User.Identity?.Name ?? ""};
        db.Feedback.Add(f);await db.SaveChangesAsync(ct);return Ok(f);
    }
    [Authorize(Roles="Admin"), HttpGet("all")] public async Task<IActionResult> All(CancellationToken ct) => Ok(await db.Feedback.OrderByDescending(f=>f.CreatedAt).ToListAsync(ct));
    [Authorize(Roles="Admin"), HttpPut("{id:int}/review")] public async Task<IActionResult> Review(int id, ReviewFeedback req, CancellationToken ct)
    {
        new Validator().Must(new[]{"Pending","Accepted","Rejected"}.Contains(req.Status),"status","Invalid review status.").MaxLength("adminResponse",req.AdminResponse,10000).ThrowIfInvalid();
        var f=await db.Feedback.FindAsync(new object[]{id},ct) ?? throw NotFoundException.For("Feedback",id);
        f.Status=req.Status;f.AdminResponse=req.AdminResponse;f.ReviewedBy=User.Identity?.Name;f.UpdatedAt=DateTime.UtcNow;await db.SaveChangesAsync(ct);return Ok(f);
    }
}
[Authorize(Roles="Admin"), ApiController, Route("api/admin/users")]
public sealed class AdminUsersController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await db.Accounts.OrderBy(a=>a.DisplayName).Select(a=>new {a.Id,a.Username,a.DisplayName,a.Email,
        completed=db.UserProgress.Count(p=>p.UserId==a.Id && p.Status==ProgressStatus.Completed), reviews=db.UserProgress.Where(p=>p.UserId==a.Id).Sum(p=>p.ReviewCount),
        plans=db.Plans.Count(p=>p.UserId==a.Id), contributions=db.Questions.Count(q=>q.CreatedByUserId==a.Id)+db.Algorithms.Count(q=>q.CreatedByUserId==a.Id)}).ToListAsync(ct));
    [HttpGet("{id}/progress")] public async Task<IActionResult> Progress(string id,CancellationToken ct)
    {
        if (!await db.Accounts.AnyAsync(a=>a.Id==id,ct)) throw NotFoundException.For("Account",id);
        return Ok(new {progress=await db.UserProgress.Where(p=>p.UserId==id).Select(p=>new{p.QuestionId,question=p.Question.Text, p.Status,p.IsFavorite,p.PersonalDifficulty,p.ReviewCount,p.LastReviewedAt,p.NextReviewAt}).ToListAsync(ct),
            plans=await db.Plans.Where(p=>p.UserId==id).Select(p=>new{p.Id,p.Name,p.Status,p.StartDate,p.DurationDays,p.IsCurrent}).ToListAsync(ct),
            activity=await db.ActivityLogs.Where(a=>a.UserId==id).OrderByDescending(a=>a.OccurredAt).Take(200).Select(a=>new{a.QuestionId,a.Kind,a.OccurredAt}).ToListAsync(ct)});
    }
}
