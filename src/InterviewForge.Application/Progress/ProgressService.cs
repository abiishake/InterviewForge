using InterviewForge.Application.Common;
using InterviewForge.Application.Content;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Progress;

public enum ReviewBucket { Due, Hard, NeedsReview, RecentlyIncorrect, Favorites, All }

public sealed class ProgressService(IAppDbContext db, ICurrentUser user, IClock clock, ContentService content, ProgressQueries progress)
{
    // SQLite deployment is single-instance. Serialize personal-state read/create/write
    // so simultaneous first updates cannot violate the per-user unique keys.
    private static readonly SemaphoreSlim PersonalStateGate = new(1,1);
    public async Task<UserStateDto> UpdateProgressAsync(int questionId, UpdateProgressRequest req, CancellationToken ct)
    { await PersonalStateGate.WaitAsync(ct); try { return await UpdateProgressCoreAsync(questionId,req,ct); } finally { PersonalStateGate.Release(); } }
    public async Task<NoteDto?> SaveNoteAsync(int questionId, SaveNoteRequest req, CancellationToken ct)
    { await PersonalStateGate.WaitAsync(ct); try { return await SaveNoteCoreAsync(questionId,req,ct); } finally { PersonalStateGate.Release(); } }
    public const int MaxNoteLength = 20_000;

    private async Task<UserStateDto> UpdateProgressCoreAsync(int questionId, UpdateProgressRequest req, CancellationToken ct)
    {
        if (req.Status is { } s && !Enum.IsDefined(s)) throw new ValidationException("status", "Unknown status.");
        if (req.Rating is { } r && !Enum.IsDefined(r)) throw new ValidationException("rating", "Unknown rating.");
        if (req.PersonalDifficulty is { } d && !Enum.IsDefined(d)) throw new ValidationException("personalDifficulty", "Unknown difficulty.");
        if (!await db.Questions.AnyAsync(q => q.Id == questionId, ct)) throw NotFoundException.For("Question", questionId);

        var now = clock.UtcNow;
        var p = await GetOrCreateAsync(questionId, ct);

        if (req.Rating is { } rating)
        {
            ReviewScheduler.Apply(p, rating, now);
            db.ActivityLogs.Add(new ActivityLog { UserId = user.UserId, QuestionId = questionId, Kind = ActivityKind.Rated, Rating = rating, Status = p.Status, OccurredAt = now });
        }
        if (req.Status is { } status)
        {
            p.Status = status;
            if (status == ProgressStatus.Completed) { p.CompletedAt ??= now; p.NextReviewAt ??= now.AddDays(4); }
            if (status == ProgressStatus.NeedsReview) p.NextReviewAt = now;
            if (status == ProgressStatus.NotStarted) { p.CompletedAt = null; p.NextReviewAt = null; }
            db.ActivityLogs.Add(new ActivityLog { UserId = user.UserId, QuestionId = questionId, Kind = ActivityKind.StatusChanged, Status = status, OccurredAt = now });
        }
        if (req.IsFavorite is { } fav)
        {
            p.IsFavorite = fav;
            db.ActivityLogs.Add(new ActivityLog { UserId = user.UserId, QuestionId = questionId, Kind = ActivityKind.Favorited, OccurredAt = now });
        }
        if (req.PersonalDifficulty is not null) p.PersonalDifficulty = req.PersonalDifficulty;
        p.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        var note = await db.UserNotes.AsNoTracking().Where(n => n.UserId == user.UserId && n.QuestionId == questionId).Select(n => n.Body).FirstOrDefaultAsync(ct);
        return new UserStateDto(p.Status, p.LastRating, p.IsFavorite, p.PersonalDifficulty, p.NextReviewAt, p.ReviewCount, note);
    }

    private async Task<NoteDto?> SaveNoteCoreAsync(int questionId, SaveNoteRequest req, CancellationToken ct)
    {
        new Validator().MaxLength("body", req.Body, MaxNoteLength).ThrowIfInvalid();
        var question = await db.Questions.AsNoTracking().Where(q => q.Id == questionId).Select(q => q.Text).FirstOrDefaultAsync(ct)
                       ?? throw NotFoundException.For("Question", questionId);
        var note = await db.UserNotes.FirstOrDefaultAsync(n => n.UserId == user.UserId && n.QuestionId == questionId, ct);
        if (string.IsNullOrWhiteSpace(req.Body))
        {
            if (note is not null) { db.UserNotes.Remove(note); await db.SaveChangesAsync(ct); }
            return null;
        }
        if (note is null) { note = new UserNote { UserId = user.UserId, QuestionId = questionId }; db.UserNotes.Add(note); }
        note.Body = req.Body; note.UpdatedAt = clock.UtcNow;
        db.ActivityLogs.Add(new ActivityLog { UserId = user.UserId, QuestionId = questionId, Kind = ActivityKind.NoteSaved, OccurredAt = clock.UtcNow });
        await db.SaveChangesAsync(ct);
        return new NoteDto(note.Id, questionId, question, note.Body, note.UpdatedAt);
    }

    public async Task<PagedResult<NoteDto>> GetNotesAsync(int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var q = db.UserNotes.AsNoTracking().Where(n => n.UserId == user.UserId);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(n => n.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(n => new NoteDto(n.Id, n.QuestionId, n.Question.Text, n.Body, n.UpdatedAt)).ToListAsync(ct);
        return new PagedResult<NoteDto>(items, page, pageSize, total);
    }

    public async Task<ReviewOverviewDto> GetReviewOverviewAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        var mine = db.UserProgress.AsNoTracking().Where(p => p.UserId == user.UserId);
        var hard = await mine.CountAsync(p => p.LastRating == RecallRating.Hard, ct);
        var needs = await mine.CountAsync(p => p.Status == ProgressStatus.NeedsReview, ct);
        var incorrect = await RecentlyIncorrectIds().CountAsync(ct);
        var due = await mine.CountAsync(p => p.NextReviewAt != null && p.NextReviewAt <= now, ct);
        var fav = await mine.CountAsync(p => p.IsFavorite, ct);
        var total = await mine.CountAsync(p => p.Status == ProgressStatus.NeedsReview || p.LastRating == RecallRating.Hard || p.LastRating == RecallRating.DidNotKnow, ct);
        return new ReviewOverviewDto(total, hard, needs, incorrect, due, fav);
    }

    private IQueryable<int> RecentlyIncorrectIds()
    {
        var since = clock.UtcNow.AddDays(-14);
        return db.ActivityLogs.Where(a => a.UserId == user.UserId && a.Kind == ActivityKind.Rated && a.Rating == RecallRating.DidNotKnow && a.OccurredAt >= since)
            .Select(a => a.QuestionId).Distinct();
    }

    public async Task<PagedResult<QuestionSummaryDto>> GetReviewQueueAsync(ReviewBucket bucket, int page, int pageSize, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var uid = user.UserId;
        var mine = db.UserProgress.Where(p => p.UserId == uid);
        IQueryable<Question> q = db.Questions.AsNoTracking();
        q = bucket switch
        {
            ReviewBucket.Due => q.Where(x => mine.Any(p => p.QuestionId == x.Id && p.NextReviewAt != null && p.NextReviewAt <= now)),
            ReviewBucket.Hard => q.Where(x => mine.Any(p => p.QuestionId == x.Id && p.LastRating == RecallRating.Hard)),
            ReviewBucket.NeedsReview => q.Where(x => mine.Any(p => p.QuestionId == x.Id && p.Status == ProgressStatus.NeedsReview)),
            ReviewBucket.RecentlyIncorrect => q.Where(x => RecentlyIncorrectIds().Contains(x.Id)),
            ReviewBucket.Favorites => q.Where(x => mine.Any(p => p.QuestionId == x.Id && p.IsFavorite)),
            _ => q.Where(x => mine.Any(p => p.QuestionId == x.Id && (p.Status == ProgressStatus.NeedsReview || p.LastRating == RecallRating.Hard || p.LastRating == RecallRating.DidNotKnow)))
        };
        var ordered = q.OrderBy(x => mine.Where(p => p.QuestionId == x.Id).Select(p => p.NextReviewAt).FirstOrDefault())
                       .ThenBy(x => x.Topic.Section.SortOrder).ThenBy(x => x.SortOrder);
        return await content.ToPagedSummariesAsync(ordered, page, pageSize, ct);
    }

    public async Task<OverallProgressDto> GetOverallAsync(CancellationToken ct)
    {
        var overall = await progress.OverallAsync(ct);
        var sections = await content.GetSectionsAsync(ct);
        var (done, total) = await TopicCompletionAsync(ct);
        var since = clock.UtcNow.Date.AddDays(-29);
        var raw = await db.ActivityLogs.AsNoTracking().Where(a => a.UserId == user.UserId && a.OccurredAt >= since)
            .Select(a => a.OccurredAt).ToListAsync(ct);
        var activity = raw.GroupBy(d => DateOnly.FromDateTime(d)).Select(g => new DailyActivityDto(g.Key, g.Count())).OrderBy(d => d.Date).ToList();
        return new OverallProgressDto(overall, sections, done, total, activity);
    }

    public async Task<(int Completed, int Total)> TopicCompletionAsync(CancellationToken ct)
    {
        var byTopic = await progress.ByTopicAsync(null, ct);
        return (byTopic.Values.Count(ProgressCalculator.IsTopicComplete), byTopic.Values.Count(v => v.Total > 0));
    }

    public async Task<int> StreakAsync(CancellationToken ct)
    {
        var since = clock.UtcNow.Date.AddDays(-400);
        var dates = await db.ActivityLogs.AsNoTracking().Where(a => a.UserId == user.UserId && a.OccurredAt >= since)
            .Select(a => a.OccurredAt).ToListAsync(ct);
        return ProgressCalculator.Streak(dates.Select(DateOnly.FromDateTime), clock.Today);
    }

    public async Task<int> CompletedTodayAsync(CancellationToken ct)
    {
        var start = clock.UtcNow.Date;
        return await db.UserProgress.AsNoTracking().CountAsync(p => p.UserId == user.UserId && p.Status == ProgressStatus.Completed && p.CompletedAt >= start, ct);
    }

    private async Task<UserProgress> GetOrCreateAsync(int questionId, CancellationToken ct)
    {
        var p = await db.UserProgress.FirstOrDefaultAsync(x => x.UserId == user.UserId && x.QuestionId == questionId, ct);
        if (p is not null) return p;
        p = new UserProgress { UserId = user.UserId, QuestionId = questionId, Status = ProgressStatus.InProgress };
        db.UserProgress.Add(p);
        return p;
    }
}
