using InterviewForge.Domain;

namespace InterviewForge.Application.Resumes;

/// <summary>PDF text extraction port, implemented in Infrastructure.</summary>
public interface IPdfTextExtractor
{
    /// <summary>Returns the document text with one line per text line. Throws on unreadable or encrypted files.</summary>
    string Extract(byte[] pdf, int maxPages);
}

/// <summary>Outgoing email port. <see cref="IsConfigured"/> is false when no SMTP host is set.</summary>
public interface IEmailSender
{
    bool IsConfigured { get; }
    Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken ct);
}

/// <summary>Bound from the "Email" configuration section.</summary>
public sealed class EmailOptions
{
    public const string SectionName = "Email";
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
    public bool EnableSsl { get; set; } = true;
    public string? From { get; set; }
    /// <summary>Public base URL used for links in emails, e.g. https://interviews.example.com.</summary>
    public string? PublicUrl { get; set; }
    public int DigestIntervalMinutes { get; set; } = 15;
}

public sealed record ResumeListItemDto(int Id, string Title, string FileName, string FileKind, DateTime UploadedAt, int SkillCount, int MatchedSkillCount);

public sealed record ResumeSkillDto(
    string Key, string Name, int Mentions, bool InKnowledgeBase, IReadOnlyList<TopicRefDto> Topics, int QuestionCount,
    IReadOnlyList<QuestionSummaryDto> Questions);

public sealed record ResumeDetailDto(
    int Id, string Title, string FileName, string FileKind, DateTime UploadedAt, IReadOnlyList<ResumeSkillDto> Skills,
    int TotalQuestions, int CompletedQuestions);

public sealed record RenameResumeRequest(string? Title);

public sealed record MissingTopicDto(
    int Id, string Key, string Name, int RequestCount, DateTime FirstRequestedAt, DateTime LastRequestedAt,
    MissingTopicStatus Status, string? ResolvedBy, DateTime? ResolvedAt, DateTime? EmailedAt);

/// <summary>
/// Serializes resume and missing-topic writes. SQLite runs single-instance; this keeps concurrent uploads
/// from racing on the unique missing-topic key.
/// </summary>
internal static class ResumeWriteGate
{
    public static readonly SemaphoreSlim Gate = new(1, 1);

    public static async Task<T> RunAsync<T>(Func<Task<T>> work, CancellationToken ct)
    {
        await Gate.WaitAsync(ct);
        try { return await work(); }
        finally { Gate.Release(); }
    }
}
