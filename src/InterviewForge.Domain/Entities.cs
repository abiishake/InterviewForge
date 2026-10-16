namespace InterviewForge.Domain;

public interface IContributedContent
{
    string? CreatedByUserId { get; set; }
    string? AddedBy { get; set; }
    bool IsAdminEdited { get; set; }
}

public abstract class AuditableEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Top-level learning area (e.g. "Backend / .NET", "Company Specific Questions").</summary>
public class Section : AuditableEntity, IContributedContent
{
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public Priority Priority { get; set; } = Priority.Strong;
    public bool IsUserCreated { get; set; }
    public string? CreatedByUserId { get; set; }
    public string? AddedBy { get; set; }
    public bool IsAdminEdited { get; set; }
    /// <summary>Stable key from the importer (null for user content). Used for idempotent imports.</summary>
    public string? SourceKey { get; set; }
    public List<Topic> Topics { get; set; } = new();
}

public class Topic : AuditableEntity, IContributedContent
{
    public int SectionId { get; set; }
    public Section Section { get; set; } = null!;
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? Description { get; set; }
    /// <summary>Markdown describing the expected scope (bullets from the skill matrix).</summary>
    public string? Scope { get; set; }
    public int SortOrder { get; set; }
    public Priority Priority { get; set; } = Priority.Strong;
    public bool IsUserCreated { get; set; }
    public string? CreatedByUserId { get; set; }
    public string? AddedBy { get; set; }
    public bool IsAdminEdited { get; set; }
    public string? SourceKey { get; set; }
    public List<Question> Questions { get; set; } = new();
    public List<QuestionTopic> RelatedQuestions { get; set; } = new();
}

public class Question : AuditableEntity, IContributedContent
{
    /// <summary>Primary topic.</summary>
    public int TopicId { get; set; }
    public Topic Topic { get; set; } = null!;
    /// <summary>Stable external id from the question bank (e.g. "csharp-001"); null for user-created questions.</summary>
    public string? ExternalId { get; set; }
    /// <summary>Hash of normalized question text; used to detect duplicates across imports.</summary>
    public string ContentHash { get; set; } = "";
    public string Text { get; set; } = "";
    public Difficulty Difficulty { get; set; } = Difficulty.Intermediate;
    public string? QuestionType { get; set; }
    public bool IsUserCreated { get; set; }
    public string? CreatedByUserId { get; set; }
    public string? AddedBy { get; set; }
    public bool IsAdminEdited { get; set; }
    public int SortOrder { get; set; }
    /// <summary>Lower-cased denormalized text (question + answer + tags) used for fast server-side LIKE search on SQLite.</summary>
    public string SearchText { get; set; } = "";
    public Answer? Answer { get; set; }
    public List<QuestionTag> Tags { get; set; } = new();
    public List<QuestionReference> References { get; set; } = new();
    public List<QuestionTopic> AdditionalTopics { get; set; } = new();
}

public class Answer
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    /// <summary>Markdown body. Rendered and sanitized on the client; never treated as HTML.</summary>
    public string Body { get; set; } = "";
    public string? FollowUps { get; set; }
}

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<QuestionTag> Questions { get; set; } = new();
}

public class QuestionTag
{
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

/// <summary>Secondary topic association; avoids duplicating a question that belongs to several topics.</summary>
public class QuestionTopic
{
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public int TopicId { get; set; }
    public Topic Topic { get; set; } = null!;
}

public class QuestionReference
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Url { get; set; } = "";
}

/// <summary>Mutable per-user state for a question. Kept separate from the canonical question.</summary>
public class UserProgress
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public ProgressStatus Status { get; set; }
    public RecallRating? LastRating { get; set; }
    public bool IsFavorite { get; set; }
    /// <summary>User override of the canonical difficulty (the imported value is only an estimate).</summary>
    public Difficulty? PersonalDifficulty { get; set; }
    public int ReviewCount { get; set; }
    public int LapseCount { get; set; }
    public double IntervalDays { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public DateTime? NextReviewAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UserNote : AuditableEntity
{
    public string UserId { get; set; } = "";
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public string Body { get; set; } = "";
}

/// <summary>Append-only study log. Drives streaks, "completed today" and "recently incorrect".</summary>
public class ActivityLog
{
    public long Id { get; set; }
    public string UserId { get; set; } = "";
    public int QuestionId { get; set; }
    public ActivityKind Kind { get; set; }
    public ProgressStatus? Status { get; set; }
    public RecallRating? Rating { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}

public class Plan : AuditableEntity
{
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public int DurationDays { get; set; }
    public int QuestionsPerDay { get; set; }
    public int StudyMinutesPerDay { get; set; }
    public DateOnly StartDate { get; set; }
    public PlanStatus Status { get; set; }
    public bool IsCurrent { get; set; }
    public DateOnly? PausedOn { get; set; }
    public int PausedDays { get; set; }
    public bool IncludeCompleted { get; set; }
    /// <summary>Comma separated section ids; empty = all sections.</summary>
    public string SelectedSectionIds { get; set; } = "";
    /// <summary>Comma separated topic ids; empty = all topics of selected sections.</summary>
    public string SelectedTopicIds { get; set; } = "";
    public List<PlanDay> Days { get; set; } = new();
}

public class PlanDay
{
    public int Id { get; set; }
    public int PlanId { get; set; }
    public Plan Plan { get; set; } = null!;
    public int DayNumber { get; set; }
    public PlanDayStatus Status { get; set; }
    public string? Title { get; set; }
    public List<PlanItem> Items { get; set; } = new();
}

public class PlanItem
{
    public int Id { get; set; }
    public int PlanDayId { get; set; }
    public PlanDay PlanDay { get; set; } = null!;
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public int SortOrder { get; set; }
    public bool IsReview { get; set; }
}

/// <summary>Independent algorithms & data-structures catalogue (C# implementations).</summary>
public class Algorithm : IContributedContent
{
    public bool IsUserCreated { get; set; }
    public string? CreatedByUserId { get; set; }
    public string? AddedBy { get; set; }
    public bool IsAdminEdited { get; set; }
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Category { get; set; } = "";
    public string Name { get; set; } = "";
    public string ProblemStatement { get; set; } = "";
    public string Explanation { get; set; } = "";
    public string Approach { get; set; } = "";
    public string TimeComplexity { get; set; } = "";
    public string SpaceComplexity { get; set; } = "";
    public string Implementation { get; set; } = "";
    public string Example { get; set; } = "";
    public string InterviewQuestions { get; set; } = "";
    public string CommonMistakes { get; set; } = "";
    public int SortOrder { get; set; }
}

public class Account
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
public class AccountRole
{
    public string AccountId { get; set; } = "";
    public string Role { get; set; } = "Member";
}
public class ContentFeedback : AuditableEntity
{
    public string UserId { get; set; } = "";
    public string AddedBy { get; set; } = "";
    public string Kind { get; set; } = "";
    public int ContentId { get; set; }
    public string Message { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public string? AdminResponse { get; set; }
    public string? ReviewedBy { get; set; }
}
public class DeletedSeed
{
    public string Kind { get; set; } = "";
    public string Key { get; set; } = "";
}
