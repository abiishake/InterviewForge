using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application;

/// <summary>Persistence port. Implemented by the EF Core SQLite context in Infrastructure.</summary>
public interface IAppDbContext
{
    DbSet<Section> Sections { get; }
    DbSet<Topic> Topics { get; }
    DbSet<Question> Questions { get; }
    DbSet<Answer> Answers { get; }
    DbSet<Tag> Tags { get; }
    DbSet<QuestionTag> QuestionTags { get; }
    DbSet<QuestionTopic> QuestionTopics { get; }
    DbSet<QuestionReference> QuestionReferences { get; }
    DbSet<UserProgress> UserProgress { get; }
    DbSet<UserNote> UserNotes { get; }
    DbSet<ActivityLog> ActivityLogs { get; }
    DbSet<Plan> Plans { get; }
    DbSet<PlanDay> PlanDays { get; }
    DbSet<PlanItem> PlanItems { get; }
    DbSet<Algorithm> Algorithms { get; }
    DbSet<Account> Accounts { get; }
    DbSet<AccountRole> AccountRoles { get; }
    DbSet<ContentFeedback> Feedback { get; }
    DbSet<DeletedSeed> DeletedSeeds { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<AppSetting> AppSettings { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IAppTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}

public interface IAppTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Identifies the current user. The app is single-user today ("local"), but all
/// per-user data is keyed by this id so real authentication can be added later.
/// </summary>
public interface ICurrentUser
{
    string UserId { get; }
    string DisplayName { get; }
    bool IsAdmin { get; }
    /// <summary>IANA time zone id of the signed-in account.</summary>
    string TimeZone { get; }
}

public interface IClock
{
    DateTime UtcNow { get; }
    DateOnly Today { get; }
}

/// <summary>"Today" in the signed-in user's time zone.</summary>
public interface IUserClock
{
    DateOnly Today { get; }
    DateTime StartOfTodayUtc { get; }
    DateOnly ToLocalDate(DateTime utc);
}

public sealed class UserClock(IClock clock, ICurrentUser user) : IUserClock
{
    private TimeZoneInfo Zone
    {
        get
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(user.TimeZone); }
            catch (Exception) { return TimeZoneInfo.Utc; }
        }
    }
    public DateOnly ToLocalDate(DateTime utc) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone));
    public DateOnly Today => ToLocalDate(clock.UtcNow);
    public DateTime StartOfTodayUtc
    {
        get
        {
            var local = Today.ToDateTime(TimeOnly.MinValue);
            return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), Zone);
        }
    }
}

public sealed class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
    public DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}
