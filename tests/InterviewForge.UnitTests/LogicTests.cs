using InterviewForge.Application;
using InterviewForge.Application.Common;
using InterviewForge.Application.Content;
using InterviewForge.Application.Plans;
using InterviewForge.Application.Progress;
using InterviewForge.Domain;

namespace InterviewForge.UnitTests;

public class PlanGeneratorTests
{
    private static List<PlanCandidate> Candidates(params (int Section, int Topic, int Count)[] spec)
    {
        var list = new List<PlanCandidate>();
        var id = 0;
        foreach (var (s, t, c) in spec)
            for (var i = 0; i < c; i++)
                list.Add(new PlanCandidate(++id, t, $"T{t}", s, s * 10, t, Priority.Strong, Difficulty.Intermediate, i, false));
        return list;
    }

    [Fact]
    public void Respects_section_then_topic_order()
    {
        var c = Candidates((2, 20, 3), (1, 10, 3));
        var plan = PlanGenerator.Generate(c, days: 2, questionsPerDay: 3, studyMinutesPerDay: 0);
        Assert.All(plan.Days[0].Items, i => Assert.Equal(10, i.TopicId));
        Assert.All(plan.Days[1].Items, i => Assert.Equal(20, i.TopicId));
    }

    [Fact]
    public void Never_exceeds_questions_per_day_and_reports_unscheduled()
    {
        var plan = PlanGenerator.Generate(Candidates((1, 1, 50)), days: 3, questionsPerDay: 10, studyMinutesPerDay: 0);
        Assert.Equal(3, plan.Days.Count);
        Assert.All(plan.Days, d => Assert.True(d.Items.Count <= 10));
        Assert.Equal(20, plan.Unscheduled);
    }

    [Fact]
    public void Spreads_evenly_when_there_is_spare_capacity()
    {
        var plan = PlanGenerator.Generate(Candidates((1, 1, 20)), days: 10, questionsPerDay: 25, studyMinutesPerDay: 0);
        Assert.Equal(10, plan.Days.Count);
        Assert.All(plan.Days, d => Assert.Equal(2, d.Items.Count));
    }

    [Fact]
    public void Study_minutes_limit_daily_load()
    {
        // Intermediate = 5 minutes; 20 minutes => 4 per day
        var plan = PlanGenerator.Generate(Candidates((1, 1, 8)), days: 2, questionsPerDay: 25, studyMinutesPerDay: 20);
        Assert.All(plan.Days, d => Assert.Equal(4, d.Items.Count));
    }

    [Fact]
    public void Skips_completed_questions_and_never_repeats()
    {
        var c = Candidates((1, 1, 4));
        c[0] = c[0] with { IsCompleted = true };
        c.Add(c[1]); // duplicate
        var plan = PlanGenerator.Generate(c, days: 5, questionsPerDay: 5, studyMinutesPerDay: 0);
        var ids = plan.Days.SelectMany(d => d.Items).Select(i => i.QuestionId).ToList();
        Assert.Equal(3, ids.Count);
        Assert.DoesNotContain(c[0].QuestionId, ids);
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Fact]
    public void Day_numbers_start_at_requested_day()
    {
        var plan = PlanGenerator.Generate(Candidates((1, 1, 4)), days: 2, questionsPerDay: 2, studyMinutesPerDay: 0, firstDayNumber: 5);
        Assert.Equal(new[] { 5, 6 }, plan.Days.Select(d => d.DayNumber));
    }

    [Fact]
    public void Current_day_accounts_for_pause()
    {
        var plan = new Plan { StartDate = new DateOnly(2026, 1, 1), DurationDays = 30, PausedDays = 2 };
        Assert.Equal(8, PlanService.CurrentDay(plan, new DateOnly(2026, 1, 10)));
        plan.Status = PlanStatus.Paused; plan.PausedOn = new DateOnly(2026, 1, 5);
        Assert.Equal(3, PlanService.CurrentDay(plan, new DateOnly(2026, 1, 20)));
    }
}

public class ReviewAndProgressTests
{
    private static readonly DateTime Now = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void DidNotKnow_is_due_now_and_needs_review()
    {
        var p = new UserProgress();
        ReviewScheduler.Apply(p, RecallRating.DidNotKnow, Now);
        Assert.Equal(ProgressStatus.NeedsReview, p.Status);
        Assert.Equal(Now, p.NextReviewAt);
        Assert.Equal(1, p.LapseCount);
    }

    [Fact]
    public void Easy_grows_interval_and_completes()
    {
        var p = new UserProgress();
        ReviewScheduler.Apply(p, RecallRating.Easy, Now);
        Assert.Equal(4, p.IntervalDays);
        ReviewScheduler.Apply(p, RecallRating.Easy, Now);
        Assert.Equal(12, p.IntervalDays);
        Assert.Equal(ProgressStatus.Completed, p.Status);
        Assert.NotNull(p.CompletedAt);
    }

    [Fact]
    public void Interval_is_capped()
    {
        var p = new UserProgress { IntervalDays = 50 };
        ReviewScheduler.Apply(p, RecallRating.Easy, Now);
        Assert.Equal(ReviewScheduler.MaxIntervalDays, p.IntervalDays);
    }

    [Fact]
    public void Hard_is_due_tomorrow()
    {
        var p = new UserProgress { IntervalDays = 10 };
        ReviewScheduler.Apply(p, RecallRating.Hard, Now);
        Assert.Equal(Now.AddDays(1), p.NextReviewAt);
        Assert.Equal(ProgressStatus.NeedsReview, p.Status);
    }

    [Fact]
    public void Summary_percent_and_topic_completion()
    {
        var s = ProgressCalculator.Summarize(4, new[] { ProgressStatus.Completed, ProgressStatus.Completed, ProgressStatus.NeedsReview });
        Assert.Equal(50, s.Percent);
        Assert.Equal(1, s.NeedsReview);
        Assert.False(ProgressCalculator.IsTopicComplete(s));
        Assert.True(ProgressCalculator.IsTopicComplete(new ProgressSummary(2, 2, 0, 0)));
        Assert.False(ProgressCalculator.IsTopicComplete(new ProgressSummary(0, 0, 0, 0)));
    }

    [Fact]
    public void Streak_counts_consecutive_days_and_tolerates_not_studied_yet_today()
    {
        var today = new DateOnly(2026, 3, 10);
        Assert.Equal(3, ProgressCalculator.Streak(new[] { today, today.AddDays(-1), today.AddDays(-2), today.AddDays(-5) }, today));
        Assert.Equal(2, ProgressCalculator.Streak(new[] { today.AddDays(-1), today.AddDays(-2) }, today));
        Assert.Equal(0, ProgressCalculator.Streak(new[] { today.AddDays(-3) }, today));
    }
}

public class ValidationTests
{
    private static SaveQuestionRequest Valid() =>
        new(1, null, null, null, "What is DI?", "An answer", Difficulty.Beginner, new[] { "#DI" }, new[] { new ReferenceDto("Docs", "https://learn.microsoft.com") }, null);

    [Fact] public void Valid_request_passes() => ContentService.ValidateQuestion(Valid());

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html;base64,PHNjcmlwdD4=")]
    [InlineData("file:///etc/passwd")]
    [InlineData("not a url")]
    public void Unsafe_reference_urls_are_rejected(string url)
    {
        var ex = Assert.Throws<ValidationException>(() => ContentService.ValidateQuestion(Valid() with { References = new[] { new ReferenceDto("x", url) } }));
        Assert.Contains("references[0].url", ex.Errors.Keys);
    }

    [Fact]
    public void Missing_text_and_too_long_answer_are_rejected()
    {
        var ex = Assert.Throws<ValidationException>(() => ContentService.ValidateQuestion(Valid() with { Text = "", Answer = new string('a', ContentService.MaxAnswerLength + 1) }));
        Assert.Contains("text", ex.Errors.Keys);
        Assert.Contains("answer", ex.Errors.Keys);
    }

    [Fact]
    public void New_topic_requires_section()
    {
        var ex = Assert.Throws<ValidationException>(() => ContentService.ValidateQuestion(Valid() with { TopicId = null, NewTopicName = "X" }));
        Assert.Contains("section", ex.Errors.Keys);
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(366, 10)]
    [InlineData(10, 0)]
    [InlineData(10, 201)]
    public void Plan_limits_are_enforced(int days, int perDay) =>
        Assert.Throws<ValidationException>(() => PlanService.Validate("Plan", days, perDay, 60));

    [Fact]
    public void Search_terms_are_normalised_and_like_wildcards_escaped()
    {
        Assert.Equal(new[] { "entity", "framework" }, Text.QueryTerms("  Entity   FRAMEWORK entity "));
        Assert.Equal("100\\%\\_x", Text.EscapeLike("100%_x"));
    }

    [Fact]
    public void Content_hash_ignores_case_and_punctuation()
    {
        Assert.Equal(Text.Hash("What is DI?"), Text.Hash("what is   di"));
    }
}
