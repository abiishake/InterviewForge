using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Content;

/// <summary>
/// Case-insensitive, multi-term (AND) search executed in SQLite.
/// Questions are matched against a denormalized lower-case SearchText column (question + answer + tags),
/// plus the topic/section name and the user's notes. Every term must match somewhere.
/// LIKE wildcards in user input are escaped; values are parameterized by EF Core (no SQL injection).
/// </summary>
public sealed class SearchService(IAppDbContext db, ICurrentUser user, ContentService content)
{
    public async Task<SearchResultDto> SearchAsync(string? query, QuestionFilter filter, int page, int pageSize, CancellationToken ct)
    {
        var terms = Text.QueryTerms(query);
        if (terms.Length == 0)
            return new SearchResultDto(query ?? "", Array.Empty<SectionHitDto>(), Array.Empty<TopicHitDto>(),
                new PagedResult<QuestionSummaryDto>(Array.Empty<QuestionSummaryDto>(), 1, pageSize, 0), Array.Empty<AlgorithmSummaryDto>());

        var uid = user.UserId;
        IQueryable<Question> questions = db.Questions.AsNoTracking();
        IQueryable<Section> sections = db.Sections.AsNoTracking();
        IQueryable<Topic> topics = db.Topics.AsNoTracking();
        IQueryable<Algorithm> algos = db.Algorithms.AsNoTracking();

        foreach (var term in terms)
        {
            var pattern = $"%{Text.EscapeLike(term)}%";
            questions = questions.Where(q =>
                EF.Functions.Like(q.SearchText, pattern, "\\") ||
                EF.Functions.Like(q.Topic.Name.ToLower(), pattern, "\\") ||
                EF.Functions.Like(q.Topic.Section.Name.ToLower(), pattern, "\\") ||
                db.UserNotes.Any(n => n.UserId == uid && n.QuestionId == q.Id && EF.Functions.Like(n.Body.ToLower(), pattern, "\\")));
            sections = sections.Where(s => EF.Functions.Like(s.Name.ToLower(), pattern, "\\") || EF.Functions.Like((s.Description ?? "").ToLower(), pattern, "\\"));
            topics = topics.Where(t => EF.Functions.Like(t.Name.ToLower(), pattern, "\\") ||
                                       EF.Functions.Like((t.Description ?? "").ToLower(), pattern, "\\") ||
                                       EF.Functions.Like((t.Scope ?? "").ToLower(), pattern, "\\"));
            algos = algos.Where(a => EF.Functions.Like(a.Name.ToLower(), pattern, "\\") || EF.Functions.Like(a.Category.ToLower(), pattern, "\\") ||
                                     EF.Functions.Like(a.ProblemStatement.ToLower(), pattern, "\\"));
        }

        questions = content.ApplyFilter(questions, filter);

        var sectionHits = await sections.OrderBy(s => s.SortOrder).Take(20)
            .Select(s => new SectionHitDto(s.Id, s.Name, s.Topics.Count)).ToListAsync(ct);
        var topicHits = await topics.OrderBy(t => t.Section.SortOrder).ThenBy(t => t.SortOrder).Take(30)
            .Select(t => new TopicHitDto(t.Id, t.Name, t.SectionId, t.Section.Name, t.Questions.Count)).ToListAsync(ct);
        var algoHits = await algos.OrderBy(a => a.SortOrder).Take(20)
            .Select(a => new AlgorithmSummaryDto(a.Id, a.Slug, a.Category, a.Name, a.TimeComplexity, a.SpaceComplexity)).ToListAsync(ct);

        // Rank: question text matches first, then by hierarchy.
        var first = $"%{Text.EscapeLike(terms[0])}%";
        var ordered = questions
            .OrderByDescending(q => EF.Functions.Like(q.Text.ToLower(), first, "\\"))
            .ThenBy(q => q.Topic.Section.SortOrder).ThenBy(q => q.Topic.SortOrder).ThenBy(q => q.SortOrder);
        var paged = await content.ToPagedSummariesAsync(ordered, page, pageSize, ct);

        return new SearchResultDto(query!.Trim(), sectionHits, topicHits, paged, algoHits);
    }
}
