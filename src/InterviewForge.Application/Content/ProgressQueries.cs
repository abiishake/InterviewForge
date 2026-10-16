using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Content;

/// <summary>Aggregated progress queries (grouped server-side, no N+1).</summary>
public sealed class ProgressQueries(IAppDbContext db, ICurrentUser user)
{
    private sealed record Row(int Key, int Total, int Completed, int Review, int InProgress);

    public async Task<Dictionary<int, ProgressSummary>> ByTopicAsync(IReadOnlyCollection<int>? topicIds, CancellationToken ct)
    {
        var questions = db.Questions.AsNoTracking();
        if (topicIds is not null) questions = questions.Where(q => topicIds.Contains(q.TopicId));
        var rows = await (from q in questions
                          join p in db.UserProgress.Where(p => p.UserId == user.UserId) on q.Id equals p.QuestionId into gp
                          from p in gp.DefaultIfEmpty()
                          group p by q.TopicId into g
                          select new Row(g.Key, g.Count(),
                              g.Count(x => x != null && x.Status == ProgressStatus.Completed),
                              g.Count(x => x != null && x.Status == ProgressStatus.NeedsReview),
                              g.Count(x => x != null && x.Status == ProgressStatus.InProgress)))
                         .ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => new ProgressSummary(r.Total, r.Completed, r.Review, r.InProgress));
    }

    public async Task<Dictionary<int, ProgressSummary>> BySectionAsync(CancellationToken ct)
    {
        var rows = await (from q in db.Questions.AsNoTracking()
                          join p in db.UserProgress.Where(p => p.UserId == user.UserId) on q.Id equals p.QuestionId into gp
                          from p in gp.DefaultIfEmpty()
                          group p by q.Topic.SectionId into g
                          select new Row(g.Key, g.Count(),
                              g.Count(x => x != null && x.Status == ProgressStatus.Completed),
                              g.Count(x => x != null && x.Status == ProgressStatus.NeedsReview),
                              g.Count(x => x != null && x.Status == ProgressStatus.InProgress)))
                         .ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => new ProgressSummary(r.Total, r.Completed, r.Review, r.InProgress));
    }

    public async Task<ProgressSummary> OverallAsync(CancellationToken ct)
    {
        var total = await db.Questions.CountAsync(ct);
        var counts = await db.UserProgress.AsNoTracking().Where(p => p.UserId == user.UserId)
            .GroupBy(p => p.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        int C(ProgressStatus s) => counts.FirstOrDefault(c => c.Key == s)?.Count ?? 0;
        return new ProgressSummary(total, C(ProgressStatus.Completed), C(ProgressStatus.NeedsReview), C(ProgressStatus.InProgress));
    }

    public static ProgressSummary Empty => new(0, 0, 0, 0);
}
