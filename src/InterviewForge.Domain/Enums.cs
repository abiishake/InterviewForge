namespace InterviewForge.Domain;

public enum Difficulty
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
    Expert = 4
}

/// <summary>Coarse importance of a topic/section, derived from the skill matrix priority labels.</summary>
public enum Priority
{
    Core = 1,
    Strong = 2,
    Useful = 3,
    Legacy = 4
}

public enum ProgressStatus
{
    NotStarted = 0,
    InProgress = 1,
    Completed = 2,
    NeedsReview = 3
}

/// <summary>Self-assessed recall rating used by interview mode and the review scheduler.</summary>
public enum RecallRating
{
    DidNotKnow = 0,
    Hard = 1,
    Okay = 2,
    Easy = 3
}

public enum PlanStatus
{
    Active = 0,
    Paused = 1,
    Completed = 2,
    Archived = 3
}

public enum PlanDayStatus
{
    Pending = 0,
    Completed = 1,
    Skipped = 2
}

public enum ActivityKind
{
    StatusChanged = 0,
    Rated = 1,
    NoteSaved = 2,
    Favorited = 3
}
