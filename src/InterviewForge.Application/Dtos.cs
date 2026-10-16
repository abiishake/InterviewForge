using InterviewForge.Domain;

namespace InterviewForge.Application;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public sealed record ProgressSummary(int Total, int Completed, int NeedsReview, int InProgress)
{
    public double Percent => Total == 0 ? 0 : Math.Round(Completed * 100.0 / Total, 1);
}

public sealed record SectionDto(int Id, string Name, string Slug, string? Description, Priority Priority, bool IsUserCreated, int SortOrder, int TopicCount, ProgressSummary Progress, string? CreatedByUserId = null, string? AddedBy = null, bool CanEdit = false);

public sealed record SectionDetailDto(SectionDto Section, IReadOnlyList<TopicDto> Topics);

public sealed record TopicDto(int Id, int SectionId, string SectionName, string Name, string Slug, string? Description, string? Scope, Priority Priority, bool IsUserCreated, int SortOrder, ProgressSummary Progress, string? CreatedByUserId = null, string? AddedBy = null, bool CanEdit = false);

public sealed record ReferenceDto(string Title, string Url);

public sealed record UserStateDto(ProgressStatus Status, RecallRating? LastRating, bool IsFavorite, Difficulty? PersonalDifficulty, DateTime? NextReviewAt, int ReviewCount, string? Note);

public sealed record QuestionSummaryDto(
    int Id, int TopicId, string TopicName, int SectionId, string SectionName, string Text, Difficulty Difficulty,
    bool IsUserCreated, ProgressStatus Status, bool IsFavorite, RecallRating? LastRating, IReadOnlyList<string> Tags, string? CreatedByUserId = null, string? AddedBy = null, bool CanEdit = false);

public sealed record QuestionDetailDto(
    int Id, string? ExternalId, int TopicId, string TopicName, int SectionId, string SectionName, string Text,
    Difficulty Difficulty, string? QuestionType, bool IsUserCreated, string AnswerMarkdown, string? FollowUpsMarkdown,
    IReadOnlyList<string> Tags, IReadOnlyList<ReferenceDto> References, IReadOnlyList<TopicRefDto> AdditionalTopics,
    UserStateDto UserState, int? PreviousId, int? NextId, DateTime CreatedAt, DateTime UpdatedAt, string? CreatedByUserId = null, string? AddedBy = null, bool CanEdit = false);

public sealed record TopicRefDto(int Id, string Name, int SectionId, string SectionName);

public sealed record SaveQuestionRequest(
    int? TopicId,
    string? NewSectionName,
    int? SectionId,
    string? NewTopicName,
    string Text,
    string Answer,
    Difficulty Difficulty,
    IReadOnlyList<string>? Tags,
    IReadOnlyList<ReferenceDto>? References,
    IReadOnlyList<int>? AdditionalTopicIds);

public sealed record SaveSectionRequest(string Name, string? Description);
public sealed record SaveTopicRequest(int SectionId, string Name, string? Description);

public sealed record UpdateProgressRequest(ProgressStatus? Status, RecallRating? Rating, bool? IsFavorite, Difficulty? PersonalDifficulty);
public sealed record SaveNoteRequest(string Body);
public sealed record NoteDto(int Id, int QuestionId, string QuestionText, string Body, DateTime UpdatedAt);

public sealed record SearchResultDto(
    string Query,
    IReadOnlyList<SectionHitDto> Sections,
    IReadOnlyList<TopicHitDto> Topics,
    PagedResult<QuestionSummaryDto> Questions,
    IReadOnlyList<AlgorithmSummaryDto> Algorithms);

public sealed record SectionHitDto(int Id, string Name, int TopicCount);
public sealed record TopicHitDto(int Id, string Name, int SectionId, string SectionName, int QuestionCount);

public sealed record AlgorithmSummaryDto(int Id, string Slug, string Category, string Name, string TimeComplexity, string SpaceComplexity, string? CreatedByUserId = null, string? AddedBy = null, bool CanEdit = false);
public sealed record AlgorithmDetailDto(int Id, string Slug, string Category, string Name, string ProblemStatement, string Explanation, string Approach,
    string TimeComplexity, string SpaceComplexity, string Implementation, string Example, string InterviewQuestions, string CommonMistakes,
    string? PreviousSlug, string? NextSlug, string? CreatedByUserId = null, string? AddedBy = null, bool CanEdit = false);

public sealed record CreatePlanRequest(
    string Name, int DurationDays, int QuestionsPerDay, int StudyMinutesPerDay, DateOnly? StartDate,
    IReadOnlyList<int>? SectionIds, IReadOnlyList<int>? TopicIds, bool IncludeCompleted = false, bool MakeCurrent = true);

public sealed record UpdatePlanRequest(string? Name, int? DurationDays, int? QuestionsPerDay, int? StudyMinutesPerDay,
    IReadOnlyList<int>? SectionIds, IReadOnlyList<int>? TopicIds, bool? IncludeCompleted, bool Regenerate = true);

public sealed record PlanDto(int Id, string Name, int DurationDays, int QuestionsPerDay, int StudyMinutesPerDay, DateOnly StartDate,
    PlanStatus Status, bool IsCurrent, int CurrentDay, IReadOnlyList<int> SectionIds, IReadOnlyList<int> TopicIds, bool IncludeCompleted,
    ProgressSummary Progress, int UnscheduledCount);

public sealed record PlanDaySummaryDto(int Id, int DayNumber, DateOnly Date, PlanDayStatus Status, string? Title, int Total, int Completed,
    IReadOnlyList<string> TopicNames, bool IsToday, bool IsPast);

public sealed record PlanItemDto(int Id, int QuestionId, string QuestionText, int TopicId, string TopicName, string SectionName, Difficulty Difficulty,
    ProgressStatus Status, bool IsReview, int SortOrder);

public sealed record PlanDayDetailDto(PlanDaySummaryDto Day, IReadOnlyList<TopicGroupDto> Topics, IReadOnlyList<PlanItemDto> Items);
public sealed record TopicGroupDto(int TopicId, string TopicName, string SectionName, int Total, int Completed);

public sealed record MoveItemRequest(int TargetDayNumber);

public sealed record GenerationResult(int DaysGenerated, int ItemsScheduled, int Unscheduled, int FromDay);

public sealed record DashboardDto(
    PlanDto? CurrentPlan,
    PlanDayDetailDto? Today,
    int Streak,
    int CompletedToday,
    ProgressSummary Overall,
    int TopicsCompleted,
    int TopicsTotal,
    int QuestionsRemaining,
    int OverdueItems,
    int DueForReview,
    int NeedsReview,
    ContinueTargetDto? Continue,
    IReadOnlyList<SectionDto> Sections);

public sealed record ContinueTargetDto(int QuestionId, string QuestionText, string TopicName, string Reason);

public sealed record ReviewOverviewDto(int TotalNeedingRevision, int Hard, int NeedsReview, int RecentlyIncorrect, int DueNow, int Favorites);

public sealed record OverallProgressDto(ProgressSummary Overall, IReadOnlyList<SectionDto> Sections, int TopicsCompleted, int TopicsTotal, IReadOnlyList<DailyActivityDto> Activity);
public sealed record DailyActivityDto(DateOnly Date, int Count);

public sealed record SaveAlgorithmRequest(string Category, string Name, string ProblemStatement, string Explanation, string Approach,
    string TimeComplexity, string SpaceComplexity, string Implementation, string Example, string InterviewQuestions, string CommonMistakes);
