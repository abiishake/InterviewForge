using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Resumes;

public sealed record SkillMatch(IReadOnlyList<TopicRefDto> Topics, IReadOnlyList<int> TagIds)
{
    public bool Any => Topics.Count > 0 || TagIds.Count > 0;
}

/// <summary>
/// Snapshot of knowledge-base section, topic and tag names used to map resume skills onto existing content.
/// Built per request, so topics an administrator adds later are picked up automatically.
/// </summary>
public sealed class KnowledgeBaseIndex
{
    private sealed record TopicEntry(TopicRefDto Ref, HashSet<string> Tokens, HashSet<string> SectionTokens);
    private sealed record TagEntry(int Id, string Compact);

    private readonly List<TopicEntry> _topics;
    private readonly List<TagEntry> _tags;

    private KnowledgeBaseIndex(List<TopicEntry> topics, List<TagEntry> tags) { _topics = topics; _tags = tags; }

    public static async Task<KnowledgeBaseIndex> LoadAsync(IAppDbContext db, CancellationToken ct)
    {
        var topics = await db.Topics.AsNoTracking()
            .OrderBy(t => t.Section.SortOrder).ThenBy(t => t.SortOrder).ThenBy(t => t.Id)
            .Select(t => new { t.Id, t.Name, t.SectionId, SectionName = t.Section.Name }).ToListAsync(ct);
        var tags = await db.Tags.AsNoTracking().Where(t => t.Questions.Any()).Select(t => new { t.Id, t.Name }).ToListAsync(ct);
        return new KnowledgeBaseIndex(
            topics.Select(t => new TopicEntry(new TopicRefDto(t.Id, t.Name, t.SectionId, t.SectionName), SkillText.Tokens(t.Name), SkillText.Tokens(t.SectionName))).ToList(),
            tags.Select(t => new TagEntry(t.Id, SkillText.Compact(t.Name))).Where(t => t.Compact.Length > 0).ToList());
    }

    /// <summary>
    /// A topic matches when every word of one of the skill's spellings (or related knowledge-base names) appears in the
    /// topic's name or its section's name. A tag matches when it is the same word written differently.
    /// </summary>
    public SkillMatch Match(string key, string displayName)
    {
        var aliases = (SkillCatalog.FindByKey(key)?.Aliases ?? []).Append(displayName).ToList();
        var spellings = aliases.Concat(SkillCatalog.RelatedTerms(key)).Select(SkillText.Tokens).Where(t => t.Count > 0).ToList();
        var compact = aliases.Select(SkillText.Compact).Where(c => c.Length > 0).ToHashSet();
        var topics = _topics.Where(t => spellings.Any(s => s.IsSubsetOf(t.Tokens) || s.IsSubsetOf(t.SectionTokens))).Select(t => t.Ref).ToList();
        var tags = _tags.Where(t => compact.Contains(t.Compact)).Select(t => t.Id).ToList();
        return new SkillMatch(topics, tags);
    }
}
