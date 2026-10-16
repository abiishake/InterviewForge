using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InterviewForge.Application.Plans;

public sealed class PlanService(IAppDbContext db, ICurrentUser user, IClock clock, ILogger<PlanService> logger)
{
    public const int MaxDurationDays = 365;
    public const int MaxQuestionsPerDay = 200;

    // ------------------------------------------------------------------ queries
    public async Task<IReadOnlyList<PlanDto>> GetPlansAsync(CancellationToken ct)
    {
        var plans = await db.Plans.AsNoTracking().Where(p => p.UserId == user.UserId).OrderByDescending(p => p.IsCurrent).ThenByDescending(p => p.CreatedAt).ToListAsync(ct);
        var list = new List<PlanDto>();
        foreach (var p in plans) list.Add(await ToDtoAsync(p, ct));
        return list;
    }

    public async Task<PlanDto> GetPlanAsync(int id, CancellationToken ct) => await ToDtoAsync(await LoadAsync(id, ct, tracking: false), ct);

    public async Task<PlanDto?> GetCurrentPlanAsync(CancellationToken ct)
    {
        var p = await db.Plans.AsNoTracking().Where(x => x.UserId == user.UserId && x.IsCurrent).FirstOrDefaultAsync(ct);
        return p is null ? null : await ToDtoAsync(p, ct);
    }

    public async Task<IReadOnlyList<PlanDaySummaryDto>> GetDaysAsync(int planId, CancellationToken ct)
    {
        var plan = await LoadAsync(planId, ct, tracking: false);
        var current = CurrentDay(plan, clock.Today);
        var uid = user.UserId;
        var rows = await db.PlanDays.AsNoTracking().Where(d => d.PlanId == planId).OrderBy(d => d.DayNumber)
            .Select(d => new
            {
                d.Id, d.DayNumber, d.Status, d.Title,
                Total = d.Items.Count,
                Completed = d.Items.Count(i => db.UserProgress.Any(p => p.UserId == uid && p.QuestionId == i.QuestionId && p.Status == ProgressStatus.Completed))
            }).ToListAsync(ct);
        var topicRows = await db.PlanItems.AsNoTracking().Where(i => i.PlanDay.PlanId == planId)
            .OrderBy(i => i.SortOrder).Select(i => new { i.PlanDayId, i.Question.Topic.Name }).ToListAsync(ct);
        var topicsByDay = topicRows.GroupBy(t => t.PlanDayId).ToDictionary(g => g.Key, g => g.Select(x => x.Name).Distinct().ToList());
        return rows.Select(r => new PlanDaySummaryDto(r.Id, r.DayNumber, DateOf(plan, r.DayNumber), EffectiveStatus(r.Status, r.Total, r.Completed),
            r.Title, r.Total, r.Completed, (IReadOnlyList<string>?)topicsByDay.GetValueOrDefault(r.Id) ?? Array.Empty<string>(), r.DayNumber == current, r.DayNumber < current)).ToList();
    }

    public async Task<PlanDayDetailDto> GetDayAsync(int planId, int dayNumber, CancellationToken ct)
    {
        var plan = await LoadAsync(planId, ct, tracking: false);
        var day = await db.PlanDays.AsNoTracking().FirstOrDefaultAsync(d => d.PlanId == planId && d.DayNumber == dayNumber, ct)
                  ?? throw new NotFoundException("PLAN_DAY_NOT_FOUND", $"Day {dayNumber} does not exist in this plan.");
        return await BuildDayAsync(plan, day, ct);
    }

    internal async Task<PlanDayDetailDto?> GetTodayAsync(int planId, CancellationToken ct)
    {
        var plan = await LoadAsync(planId, ct, tracking: false);
        var current = CurrentDay(plan, clock.Today);
        var day = await db.PlanDays.AsNoTracking().FirstOrDefaultAsync(d => d.PlanId == planId && d.DayNumber == current, ct);
        return day is null ? null : await BuildDayAsync(plan, day, ct);
    }

    public async Task<int> OverdueCountAsync(int planId, CancellationToken ct)
    {
        var plan = await LoadAsync(planId, ct, tracking: false);
        var current = CurrentDay(plan, clock.Today);
        var uid = user.UserId;
        return await db.PlanItems.AsNoTracking().CountAsync(i => i.PlanDay.PlanId == planId && i.PlanDay.DayNumber < current &&
            i.PlanDay.Status != PlanDayStatus.Skipped &&
            !db.UserProgress.Any(p => p.UserId == uid && p.QuestionId == i.QuestionId && p.Status == ProgressStatus.Completed), ct);
    }

    // ------------------------------------------------------------------ commands
    public async Task<PlanDto> CreateAsync(CreatePlanRequest req, CancellationToken ct)
    {
        Validate(req.Name, req.DurationDays, req.QuestionsPerDay, req.StudyMinutesPerDay);
        await ValidateSelectionAsync(req.SectionIds, req.TopicIds, ct);

        await using var tx = await db.BeginTransactionAsync(ct);
        if (req.MakeCurrent) await ClearCurrentAsync(ct);
        var plan = new Plan
        {
            UserId = user.UserId, Name = req.Name.Trim(), DurationDays = req.DurationDays, QuestionsPerDay = req.QuestionsPerDay,
            StudyMinutesPerDay = req.StudyMinutesPerDay, StartDate = req.StartDate ?? clock.Today, Status = PlanStatus.Active,
            IsCurrent = req.MakeCurrent || !await db.Plans.AnyAsync(p => p.UserId == user.UserId && p.IsCurrent, ct),
            IncludeCompleted = req.IncludeCompleted,
            SelectedSectionIds = Join(req.SectionIds), SelectedTopicIds = Join(req.TopicIds)
        };
        db.Plans.Add(plan);
        await db.SaveChangesAsync(ct);
        await GenerateInternalAsync(plan, 1, ct);
        await tx.CommitAsync(ct);
        return await ToDtoAsync(plan, ct);
    }

    public async Task<PlanDto> UpdateAsync(int id, UpdatePlanRequest req, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        Validate(req.Name ?? plan.Name, req.DurationDays ?? plan.DurationDays, req.QuestionsPerDay ?? plan.QuestionsPerDay, req.StudyMinutesPerDay ?? plan.StudyMinutesPerDay);
        if (req.SectionIds is not null || req.TopicIds is not null) await ValidateSelectionAsync(req.SectionIds, req.TopicIds, ct);
        plan.Name = req.Name?.Trim() ?? plan.Name;
        plan.DurationDays = req.DurationDays ?? plan.DurationDays;
        plan.QuestionsPerDay = req.QuestionsPerDay ?? plan.QuestionsPerDay;
        plan.StudyMinutesPerDay = req.StudyMinutesPerDay ?? plan.StudyMinutesPerDay;
        plan.IncludeCompleted = req.IncludeCompleted ?? plan.IncludeCompleted;
        if (req.SectionIds is not null) plan.SelectedSectionIds = Join(req.SectionIds);
        if (req.TopicIds is not null) plan.SelectedTopicIds = Join(req.TopicIds);
        plan.UpdatedAt = clock.UtcNow;
        await using var tx = await db.BeginTransactionAsync(ct);
        await db.SaveChangesAsync(ct);
        if (req.Regenerate) await GenerateInternalAsync(plan, CurrentDay(plan, clock.Today), ct);
        await tx.CommitAsync(ct);
        return await ToDtoAsync(plan, ct);
    }

    /// <summary>Regenerates the plan from <paramref name="fromDay"/> (default: today). Earlier days and all progress are preserved.</summary>
    public async Task<GenerationResult> GenerateAsync(int id, int? fromDay, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        var start = fromDay ?? CurrentDay(plan, clock.Today);
        new Validator().Range("fromDay", start, 1, plan.DurationDays).ThrowIfInvalid();
        await using var tx = await db.BeginTransactionAsync(ct);
        var result = await GenerateInternalAsync(plan, start, ct);
        await tx.CommitAsync(ct);
        return result;
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        db.Plans.Remove(plan); // days/items cascade; question progress is independent and kept
        await db.SaveChangesAsync(ct);
    }

    public async Task<PlanDto> SetCurrentAsync(int id, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        await ClearCurrentAsync(ct);
        plan.IsCurrent = true;
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(plan, ct);
    }

    public async Task<PlanDto> PauseAsync(int id, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        if (plan.Status != PlanStatus.Paused) { plan.Status = PlanStatus.Paused; plan.PausedOn = clock.Today; }
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(plan, ct);
    }

    public async Task<PlanDto> ResumeAsync(int id, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        if (plan.Status == PlanStatus.Paused && plan.PausedOn is { } pausedOn)
            plan.PausedDays += Math.Max(0, clock.Today.DayNumber - pausedOn.DayNumber);
        plan.Status = PlanStatus.Active; plan.PausedOn = null;
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(plan, ct);
    }

    /// <summary>Starts the plan again from today. Progress history is kept; completed questions are skipped unless IncludeCompleted.</summary>
    public async Task<PlanDto> RestartAsync(int id, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        plan.StartDate = clock.Today; plan.PausedDays = 0; plan.PausedOn = null; plan.Status = PlanStatus.Active;
        await using var tx = await db.BeginTransactionAsync(ct);
        await db.SaveChangesAsync(ct);
        await GenerateInternalAsync(plan, 1, ct);
        await tx.CommitAsync(ct);
        return await ToDtoAsync(plan, ct);
    }

    /// <summary>Marks a day as skipped and carries its unfinished questions to the following day.</summary>
    public async Task SkipDayAsync(int id, int dayNumber, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        var day = await db.PlanDays.Include(d => d.Items).FirstOrDefaultAsync(d => d.PlanId == id && d.DayNumber == dayNumber, ct)
                  ?? throw new NotFoundException("PLAN_DAY_NOT_FOUND", $"Day {dayNumber} does not exist in this plan.");
        var target = await GetOrCreateDayAsync(plan, dayNumber + 1, ct);
        await MoveIncompleteAsync(day.Items, target, ct);
        day.Status = PlanDayStatus.Skipped;
        await db.SaveChangesAsync(ct);
    }

    public async Task MoveItemAsync(int id, int itemId, MoveItemRequest req, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        new Validator().Range("targetDayNumber", req.TargetDayNumber, 1, MaxDurationDays).ThrowIfInvalid();
        var item = await db.PlanItems.Include(i => i.PlanDay).FirstOrDefaultAsync(i => i.Id == itemId && i.PlanDay.PlanId == id, ct)
                   ?? throw NotFoundException.For("PlanItem", itemId);
        var target = await GetOrCreateDayAsync(plan, req.TargetDayNumber, ct);
        var max = await db.PlanItems.Where(i => i.PlanDayId == target.Id).MaxAsync(i => (int?)i.SortOrder, ct) ?? 0;
        item.PlanDay = target; item.PlanDayId = target.Id; item.SortOrder = max + 1;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Moves every unfinished item from past days onto today.</summary>
    public async Task<int> RescheduleUnfinishedAsync(int id, CancellationToken ct)
    {
        var plan = await LoadAsync(id, ct);
        var current = CurrentDay(plan, clock.Today);
        var pastItems = await db.PlanItems.Include(i => i.PlanDay).Where(i => i.PlanDay.PlanId == id && i.PlanDay.DayNumber < current).ToListAsync(ct);
        var target = await GetOrCreateDayAsync(plan, current, ct);
        var moved = await MoveIncompleteAsync(pastItems, target, ct);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Plan {PlanId}: rescheduled {Count} unfinished items to day {Day}", id, moved, current);
        return moved;
    }

    // ------------------------------------------------------------------ internals
    private async Task<GenerationResult> GenerateInternalAsync(Plan plan, int fromDay, CancellationToken ct)
    {
        var toRemove = await db.PlanDays.Where(d => d.PlanId == plan.Id && d.DayNumber >= fromDay).ToListAsync(ct);
        db.PlanDays.RemoveRange(toRemove);
        await db.SaveChangesAsync(ct);

        var keptQuestionIds = await db.PlanItems.Where(i => i.PlanDay.PlanId == plan.Id).Select(i => i.QuestionId).ToListAsync(ct);
        var candidates = await LoadCandidatesAsync(plan, ct);
        var kept = keptQuestionIds.ToHashSet();
        var days = plan.DurationDays - fromDay + 1;
        var generated = PlanGenerator.Generate(candidates.Where(c => !kept.Contains(c.QuestionId)), days, plan.QuestionsPerDay,
            plan.StudyMinutesPerDay, plan.IncludeCompleted, fromDay);

        foreach (var gd in generated.Days)
        {
            var day = new PlanDay { PlanId = plan.Id, DayNumber = gd.DayNumber, Title = gd.Title };
            var order = 0;
            foreach (var c in gd.Items) day.Items.Add(new PlanItem { QuestionId = c.QuestionId, SortOrder = ++order });
            db.PlanDays.Add(day);
        }
        // Keep empty placeholder days so the calendar always shows the full duration.
        for (var n = fromDay + generated.Days.Count; n <= plan.DurationDays; n++)
            db.PlanDays.Add(new PlanDay { PlanId = plan.Id, DayNumber = n, Title = "Buffer / review day" });

        await db.SaveChangesAsync(ct);
        var scheduled = generated.Days.Sum(d => d.Items.Count);
        logger.LogInformation("Plan {PlanId} generated from day {FromDay}: {Days} days, {Scheduled} questions, {Unscheduled} unscheduled",
            plan.Id, fromDay, generated.Days.Count, scheduled, generated.Unscheduled);
        return new GenerationResult(generated.Days.Count, scheduled, generated.Unscheduled, fromDay);
    }

    private async Task<List<PlanCandidate>> LoadCandidatesAsync(Plan plan, CancellationToken ct)
    {
        var sectionIds = Split(plan.SelectedSectionIds);
        var topicIds = Split(plan.SelectedTopicIds);
        var uid = user.UserId;
        var q = db.Questions.AsNoTracking();
        if (topicIds.Count > 0) q = q.Where(x => topicIds.Contains(x.TopicId));
        else if (sectionIds.Count > 0) q = q.Where(x => sectionIds.Contains(x.Topic.SectionId));
        return await q.Select(x => new PlanCandidate(
                x.Id, x.TopicId, x.Topic.Name, x.Topic.SectionId, x.Topic.Section.SortOrder, x.Topic.SortOrder, x.Topic.Priority,
                db.UserProgress.Where(p => p.UserId == uid && p.QuestionId == x.Id).Select(p => p.PersonalDifficulty).FirstOrDefault() ?? x.Difficulty,
                x.SortOrder,
                db.UserProgress.Any(p => p.UserId == uid && p.QuestionId == x.Id && p.Status == ProgressStatus.Completed)))
            .ToListAsync(ct);
    }

    private async Task<int> MoveIncompleteAsync(IEnumerable<PlanItem> items, PlanDay target, CancellationToken ct)
    {
        var list = items.Where(i => i.PlanDayId != target.Id).ToList();
        var ids = list.Select(i => i.QuestionId).ToList();
        var completed = (await db.UserProgress.Where(p => p.UserId == user.UserId && ids.Contains(p.QuestionId) && p.Status == ProgressStatus.Completed)
            .Select(p => p.QuestionId).ToListAsync(ct)).ToHashSet();
        var order = target.Id == 0 ? 0 : await db.PlanItems.Where(i => i.PlanDayId == target.Id).MaxAsync(i => (int?)i.SortOrder, ct) ?? 0;
        var moved = 0;
        foreach (var item in list.Where(i => !completed.Contains(i.QuestionId)))
        {
            item.PlanDay = target; item.SortOrder = ++order; moved++;
        }
        return moved;
    }

    private async Task<PlanDay> GetOrCreateDayAsync(Plan plan, int dayNumber, CancellationToken ct)
    {
        var day = await db.PlanDays.FirstOrDefaultAsync(d => d.PlanId == plan.Id && d.DayNumber == dayNumber, ct);
        if (day is not null) return day;
        day = new PlanDay { PlanId = plan.Id, DayNumber = dayNumber, Title = "Carried over" };
        db.PlanDays.Add(day);
        if (dayNumber > plan.DurationDays) plan.DurationDays = dayNumber;
        await db.SaveChangesAsync(ct);
        return day;
    }

    private async Task<PlanDayDetailDto> BuildDayAsync(Plan plan, PlanDay day, CancellationToken ct)
    {
        var uid = user.UserId;
        var items = await db.PlanItems.AsNoTracking().Where(i => i.PlanDayId == day.Id).OrderBy(i => i.SortOrder)
            .Select(i => new PlanItemDto(i.Id, i.QuestionId, i.Question.Text, i.Question.TopicId, i.Question.Topic.Name, i.Question.Topic.Section.Name,
                i.Question.Difficulty,
                db.UserProgress.Where(p => p.UserId == uid && p.QuestionId == i.QuestionId).Select(p => (ProgressStatus?)p.Status).FirstOrDefault() ?? ProgressStatus.NotStarted,
                i.IsReview, i.SortOrder))
            .ToListAsync(ct);
        var groups = items.GroupBy(i => new { i.TopicId, i.TopicName, i.SectionName })
            .Select(g => new TopicGroupDto(g.Key.TopicId, g.Key.TopicName, g.Key.SectionName, g.Count(), g.Count(x => x.Status == ProgressStatus.Completed)))
            .ToList();
        var current = CurrentDay(plan, clock.Today);
        var completed = items.Count(i => i.Status == ProgressStatus.Completed);
        var summary = new PlanDaySummaryDto(day.Id, day.DayNumber, DateOf(plan, day.DayNumber), EffectiveStatus(day.Status, items.Count, completed),
            day.Title, items.Count, completed, groups.Select(g => g.TopicName).ToList(), day.DayNumber == current, day.DayNumber < current);
        return new PlanDayDetailDto(summary, groups, items);
    }

    private async Task<PlanDto> ToDtoAsync(Plan p, CancellationToken ct)
    {
        var uid = user.UserId;
        var total = await db.PlanItems.CountAsync(i => i.PlanDay.PlanId == p.Id, ct);
        var completed = await db.PlanItems.CountAsync(i => i.PlanDay.PlanId == p.Id &&
            db.UserProgress.Any(x => x.UserId == uid && x.QuestionId == i.QuestionId && x.Status == ProgressStatus.Completed), ct);
        var review = await db.PlanItems.CountAsync(i => i.PlanDay.PlanId == p.Id &&
            db.UserProgress.Any(x => x.UserId == uid && x.QuestionId == i.QuestionId && x.Status == ProgressStatus.NeedsReview), ct);
        var unscheduled = await UnscheduledAsync(p, ct);
        return new PlanDto(p.Id, p.Name, p.DurationDays, p.QuestionsPerDay, p.StudyMinutesPerDay, p.StartDate, p.Status, p.IsCurrent,
            CurrentDay(p, clock.Today), Split(p.SelectedSectionIds), Split(p.SelectedTopicIds), p.IncludeCompleted,
            new ProgressSummary(total, completed, review, 0), unscheduled);
    }

    private async Task<int> UnscheduledAsync(Plan p, CancellationToken ct)
    {
        var sectionIds = Split(p.SelectedSectionIds);
        var topicIds = Split(p.SelectedTopicIds);
        var uid = user.UserId;
        var q = db.Questions.AsNoTracking();
        if (topicIds.Count > 0) q = q.Where(x => topicIds.Contains(x.TopicId));
        else if (sectionIds.Count > 0) q = q.Where(x => sectionIds.Contains(x.Topic.SectionId));
        if (!p.IncludeCompleted) q = q.Where(x => !db.UserProgress.Any(u => u.UserId == uid && u.QuestionId == x.Id && u.Status == ProgressStatus.Completed));
        return await q.CountAsync(x => !db.PlanItems.Any(i => i.QuestionId == x.Id && i.PlanDay.PlanId == p.Id), ct);
    }

    public static int CurrentDay(Plan plan, DateOnly today)
    {
        var reference = plan.Status == PlanStatus.Paused && plan.PausedOn is { } paused ? paused : today;
        var day = reference.DayNumber - plan.StartDate.DayNumber + 1 - plan.PausedDays;
        return Math.Clamp(day, 1, Math.Max(1, plan.DurationDays));
    }

    private static DateOnly DateOf(Plan plan, int dayNumber) => plan.StartDate.AddDays(dayNumber - 1 + plan.PausedDays);

    private static PlanDayStatus EffectiveStatus(PlanDayStatus stored, int total, int completed) =>
        stored == PlanDayStatus.Skipped ? stored : total > 0 && completed >= total ? PlanDayStatus.Completed : PlanDayStatus.Pending;

    private async Task<Plan> LoadAsync(int id, CancellationToken ct, bool tracking = true)
    {
        var q = tracking ? db.Plans : db.Plans.AsNoTracking();
        return await q.FirstOrDefaultAsync(p => p.Id == id && p.UserId == user.UserId, ct) ?? throw NotFoundException.For("Plan", id);
    }

    private async Task ClearCurrentAsync(CancellationToken ct)
    {
        foreach (var p in await db.Plans.Where(p => p.UserId == user.UserId && p.IsCurrent).ToListAsync(ct)) p.IsCurrent = false;
    }

    internal static void Validate(string? name, int duration, int perDay, int minutes) =>
        new Validator()
            .Required("name", name).MaxLength("name", name, 120)
            .Range("durationDays", duration, 1, MaxDurationDays)
            .Range("questionsPerDay", perDay, 1, MaxQuestionsPerDay)
            .Range("studyMinutesPerDay", minutes, 0, 24 * 60)
            .ThrowIfInvalid();

    private async Task ValidateSelectionAsync(IReadOnlyList<int>? sectionIds, IReadOnlyList<int>? topicIds, CancellationToken ct)
    {
        var v = new Validator();
        if (sectionIds is { Count: > 0 })
        {
            var found = await db.Sections.CountAsync(s => sectionIds.Contains(s.Id), ct);
            v.Must(found == sectionIds.Distinct().Count(), "sectionIds", "One or more sections do not exist.");
        }
        if (topicIds is { Count: > 0 })
        {
            var found = await db.Topics.CountAsync(t => topicIds.Contains(t.Id), ct);
            v.Must(found == topicIds.Distinct().Count(), "topicIds", "One or more topics do not exist.");
        }
        v.ThrowIfInvalid();
    }

    private static string Join(IReadOnlyList<int>? ids) => ids is null ? "" : string.Join(',', ids.Distinct());
    private static List<int> Split(string s) =>
        string.IsNullOrWhiteSpace(s) ? new() : s.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();
}
