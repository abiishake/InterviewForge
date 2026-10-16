using InterviewForge.Domain;

namespace InterviewForge.Application.Progress;

/// <summary>
/// Lightweight spaced repetition (a simplified SM-2). Deliberately small:
///  * DidNotKnow → due again today, status NeedsReview, lapse counted.
///  * Hard       → 1 day, status NeedsReview.
///  * Okay       → interval × 2 (min 2 days), status Completed.
///  * Easy       → interval × 3 (min 4 days), status Completed.
/// Intervals are capped at 60 days.
/// </summary>
public static class ReviewScheduler
{
    public const double MaxIntervalDays = 60;

    public static void Apply(UserProgress p, RecallRating rating, DateTime nowUtc)
    {
        p.LastRating = rating;
        p.ReviewCount++;
        p.LastReviewedAt = nowUtc;

        switch (rating)
        {
            case RecallRating.DidNotKnow:
                p.LapseCount++;
                p.IntervalDays = 0;
                p.Status = ProgressStatus.NeedsReview;
                break;
            case RecallRating.Hard:
                p.IntervalDays = 1;
                p.Status = ProgressStatus.NeedsReview;
                break;
            case RecallRating.Okay:
                p.IntervalDays = Math.Max(2, p.IntervalDays * 2);
                p.Status = ProgressStatus.Completed;
                break;
            case RecallRating.Easy:
                p.IntervalDays = Math.Max(4, p.IntervalDays * 3);
                p.Status = ProgressStatus.Completed;
                break;
        }
        p.IntervalDays = Math.Min(p.IntervalDays, MaxIntervalDays);
        p.NextReviewAt = nowUtc.AddDays(p.IntervalDays);
        if (p.Status == ProgressStatus.Completed) p.CompletedAt ??= nowUtc;
        p.UpdatedAt = nowUtc;
    }

    public static bool IsDue(UserProgress p, DateTime nowUtc) =>
        p.NextReviewAt is { } next && next <= nowUtc;
}

public static class ProgressCalculator
{
    public static ProgressSummary Summarize(int total, IEnumerable<ProgressStatus> statuses)
    {
        int completed = 0, review = 0, inProgress = 0;
        foreach (var s in statuses)
        {
            if (s == ProgressStatus.Completed) completed++;
            else if (s == ProgressStatus.NeedsReview) review++;
            else if (s == ProgressStatus.InProgress) inProgress++;
        }
        return new ProgressSummary(total, Math.Min(completed, total), review, inProgress);
    }

    /// <summary>A topic counts as complete when it has questions and every one of them is completed.</summary>
    public static bool IsTopicComplete(ProgressSummary p) => p.Total > 0 && p.Completed >= p.Total;

    /// <summary>Number of consecutive days with study activity ending today (or yesterday, so the streak survives until you study today).</summary>
    public static int Streak(IEnumerable<DateOnly> activityDays, DateOnly today)
    {
        var days = activityDays.ToHashSet();
        var cursor = days.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;
        while (days.Contains(cursor)) { streak++; cursor = cursor.AddDays(-1); }
        return streak;
    }
}
