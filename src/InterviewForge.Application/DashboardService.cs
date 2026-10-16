using InterviewForge.Application.Content;
using InterviewForge.Application.Plans;
using InterviewForge.Application.Progress;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application;

public sealed class DashboardService(IAppDbContext db, ICurrentUser user, IClock clock, PlanService plans, ProgressService progressService,
    ProgressQueries progress, ContentService content)
{
    public async Task<DashboardDto> GetAsync(CancellationToken ct)
    {
        var plan = await plans.GetCurrentPlanAsync(ct);
        PlanDayDetailDto? today = null;
        var overdue = 0;
        if (plan is not null)
        {
            today = await plans.GetTodayAsync(plan.Id, ct);
            overdue = await plans.OverdueCountAsync(plan.Id, ct);
        }
        var overall = await progress.OverallAsync(ct);
        var (topicsDone, topicsTotal) = await progressService.TopicCompletionAsync(ct);
        var review = await progressService.GetReviewOverviewAsync(ct);
        var sections = await content.GetSectionsAsync(ct);

        return new DashboardDto(plan, today, await progressService.StreakAsync(ct), await progressService.CompletedTodayAsync(ct),
            overall, topicsDone, topicsTotal, overall.Total - overall.Completed, overdue, review.DueNow, review.NeedsReview,
            await ContinueAsync(today, ct), sections);
    }

    /// <summary>Next incomplete question: today's plan first, then the most recently touched in-progress question, then the first untouched question.</summary>
    private async Task<ContinueTargetDto?> ContinueAsync(PlanDayDetailDto? today, CancellationToken ct)
    {
        var next = today?.Items.FirstOrDefault(i => i.Status != ProgressStatus.Completed);
        if (next is not null) return new ContinueTargetDto(next.QuestionId, next.QuestionText, next.TopicName, "Next in today's plan");

        var uid = user.UserId;
        var recent = await db.UserProgress.AsNoTracking().Where(p => p.UserId == uid && p.Status == ProgressStatus.InProgress)
            .OrderByDescending(p => p.UpdatedAt).Select(p => new { p.QuestionId, p.Question.Text, TopicName = p.Question.Topic.Name }).FirstOrDefaultAsync(ct);
        if (recent is not null) return new ContinueTargetDto(recent.QuestionId, recent.Text, recent.TopicName, "Continue where you stopped");

        var first = await db.Questions.AsNoTracking()
            .Where(q => !db.UserProgress.Any(p => p.UserId == uid && p.QuestionId == q.Id))
            .OrderBy(q => q.Topic.Section.SortOrder).ThenBy(q => q.Topic.SortOrder).ThenBy(q => q.SortOrder)
            .Select(q => new { q.Id, q.Text, TopicName = q.Topic.Name }).FirstOrDefaultAsync(ct);
        return first is null ? null : new ContinueTargetDto(first.Id, first.Text, first.TopicName, "Start something new");
    }
}
