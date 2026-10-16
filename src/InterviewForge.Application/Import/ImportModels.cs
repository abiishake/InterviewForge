using InterviewForge.Domain;

namespace InterviewForge.Application.Import;

// Import DTOs: the Markdown files are *seed input*, deliberately decoupled from the domain model.

public sealed record MatrixSection(int Number, string Title, string Slug, string? Description, Priority Priority, IReadOnlyList<MatrixTopic> Topics);

public sealed record MatrixTopic(string Name, string Slug, Priority Priority, IReadOnlyList<string> ScopeItems, bool IsEssentials);

public sealed record BankTopic(string TopicId, string Title, Priority Priority, string? Category, IReadOnlyList<BankQuestion> Questions);

public sealed record BankQuestion(
    string QuestionId,
    string TopicId,
    string Title,
    string Question,
    string Answer,
    string? DifficultyLabel,
    string? QuestionType,
    IReadOnlyList<string> Keywords,
    IReadOnlyList<string> FollowUps);

public sealed record AlgorithmRecord(
    string Category,
    string Name,
    string Slug,
    string ProblemStatement,
    string Explanation,
    string Approach,
    string TimeComplexity,
    string SpaceComplexity,
    string Implementation,
    string Example,
    string InterviewQuestions,
    string CommonMistakes);

/// <summary>Where a bank topic ended up after classification against the skill matrix.</summary>
public sealed record TopicClassification(string BankTopicId, string SectionSlug, string? MatrixTopicSlug, double Score, string Reason);

public sealed class ImportReport
{
    public int SectionsCreated { get; set; }
    public int SectionsUpdated { get; set; }
    public int TopicsCreated { get; set; }
    public int TopicsUpdated { get; set; }
    public int QuestionsCreated { get; set; }
    public int QuestionsUpdated { get; set; }
    public int QuestionsUnchanged { get; set; }
    public int DuplicatesSkipped { get; set; }
    public int AlgorithmsCreated { get; set; }
    public int AlgorithmsUpdated { get; set; }
    public List<TopicClassification> Classifications { get; } = new();
    public List<string> Warnings { get; } = new();
    public TimeSpan Duration { get; set; }
}

public sealed class ImportOptions
{
    public const string SectionName = "Import";

    /// <summary>Directory containing the seed Markdown files.</summary>
    public string DataDirectory { get; set; } = "data";
    /// <summary>Used when DataDirectory does not contain the question bank (e.g. an empty mounted volume).</summary>
    public string FallbackDataDirectory { get; set; } = "seed";
    public string SkillMatrixFile { get; set; } = "dotnet_10_year_technology_skill_matrix.md";
    public string QuestionBankFile { get; set; } = "dotnet_10_year_interview_question_bank.md";
    public string AlgorithmsFile { get; set; } = "algorithms_csharp.md";
    /// <summary>Optional JSON map { "bankTopicId": "section-slug" or "section-slug/topic-slug" } to override automatic classification.</summary>
    public string ClassificationOverridesFile { get; set; } = "classification-overrides.json";
    /// <summary>Always | IfEmpty | Never. The import is idempotent so Always is safe.</summary>
    public string RunOnStartup { get; set; } = "Always";
}
