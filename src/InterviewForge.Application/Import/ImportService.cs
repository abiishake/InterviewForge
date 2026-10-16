using System.Diagnostics;
using System.Text.Json;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InterviewForge.Application.Import;

public interface IImportService
{
    Task<ImportReport> ImportAsync(string dataDirectory, CancellationToken ct = default);
}

/// <summary>
/// Idempotent importer: Markdown → parser DTOs → classifier → domain upsert.
/// Sections/topics are keyed by SourceKey, questions by ExternalId (fallback: ContentHash),
/// algorithms by slug. User progress, notes and user-created content are never touched.
/// </summary>
public sealed class ImportService(IAppDbContext db, ImportOptions options, ILogger<ImportService> logger) : IImportService
{
    private static readonly (string Tag, string[] Needles)[] TechTags =
    {
        ("CSharp", new[] { "c#", "linq", "async", "await", "record", "struct", "span<" }),
        ("DotNet", new[] { ".net", "asp.net", "dotnet" }),
        ("EntityFramework", new[] { "ef core", "entity framework", "dbcontext" }),
        ("SQL", new[] { "sql", "index", "isolation", "deadlock", "query plan", "execution plan" }),
        ("Azure", new[] { "azure", "aks", "entra" }),
        ("AWS", new[] { "aws", "lambda", "s3" }),
        ("Docker", new[] { "docker", "container image", "dockerfile" }),
        ("Kubernetes", new[] { "kubernetes", "pod", "aks", "helm" }),
        ("RabbitMQ", new[] { "rabbitmq", "masstransit" }),
        ("Messaging", new[] { "queue", "topic", "dead-letter", "service bus", "outbox" }),
        ("Redis", new[] { "redis", "cache" }),
        ("Microservices", new[] { "microservice", "distributed", "saga", "eventual consistency" }),
        ("SystemDesign", new[] { "design a", "scalab", "throughput", "architecture" }),
        ("Security", new[] { "oauth", "jwt", "oidc", "owasp", "xss", "csrf", "authentication", "authorization" }),
        ("Angular", new[] { "angular", "rxjs" }),
        ("React", new[] { "react" }),
        ("Testing", new[] { "test", "mock" }),
        ("Observability", new[] { "logging", "tracing", "metrics", "opentelemetry", "application insights" }),
    };

    public async Task<ImportReport> ImportAsync(string dataDirectory, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var report = new ImportReport();
        var matrixPath = Path.Combine(dataDirectory, options.SkillMatrixFile);
        var bankPath = Path.Combine(dataDirectory, options.QuestionBankFile);
        var algoPath = Path.Combine(dataDirectory, options.AlgorithmsFile);
        var overridesPath = Path.Combine(dataDirectory, options.ClassificationOverridesFile);

        logger.LogInformation("Import started from {DataDirectory}", dataDirectory);

        var deleted = await db.DeletedSeeds.ToListAsync(ct);
        bool IsDeleted(string kind, string key) => deleted.Any(d => d.Kind == kind && d.Key == key);
        var matrix = File.Exists(matrixPath) ? SkillMatrixParser.Parse(await File.ReadAllTextAsync(matrixPath, ct)) : Array.Empty<MatrixSection>();
        var bank = File.Exists(bankPath) ? QuestionBankParser.Parse(await File.ReadAllTextAsync(bankPath, ct)) : Array.Empty<BankTopic>();
        var algos = File.Exists(algoPath) ? AlgorithmMarkdownParser.Parse(await File.ReadAllTextAsync(algoPath, ct)) : Array.Empty<AlgorithmRecord>();
        if (matrix.Count == 0) report.Warnings.Add($"Skill matrix not found or empty: {matrixPath}");
        if (bank.Count == 0) report.Warnings.Add($"Question bank not found or empty: {bankPath}");
        var overrides = await LoadOverridesAsync(overridesPath, ct);

        await using var tx = await db.BeginTransactionAsync(ct);

        // ---- Sections & matrix topics -------------------------------------------------------
        var sectionsByKey = await db.Sections.Where(s => s.SourceKey != null).ToDictionaryAsync(s => s.SourceKey!, ct);
        var topicsByKey = await db.Topics.Where(t => t.SourceKey != null).ToDictionaryAsync(t => t.SourceKey!, ct);
        var sectionBySlug = new Dictionary<string, Section>();
        var matrixTopicBySlug = new Dictionary<string, Topic>(); // key: sectionSlug/topicSlug

        foreach (var ms in matrix)
        {
            if (IsDeleted("Section", $"matrix:section:{ms.Slug}")) continue;
            var section = UpsertSection(sectionsByKey, $"matrix:section:{ms.Slug}", ms.Title, ms.Slug, ms.Description, ms.Number * 10, ms.Priority, report);
            sectionBySlug[ms.Slug] = section;
            var order = 0;
            foreach (var mt in ms.Topics)
            {
                if (IsDeleted("Topic", $"matrix:topic:{ms.Slug}/{mt.Slug}")) continue;
                var scope = mt.ScopeItems.Count == 0 ? null : string.Join('\n', mt.ScopeItems.Select(i => "- " + i));
                var topic = UpsertTopic(topicsByKey, $"matrix:topic:{ms.Slug}/{mt.Slug}", section, mt.Name, mt.Slug, null, scope, (order++) * 10, mt.Priority, report);
                matrixTopicBySlug[$"{ms.Slug}/{mt.Slug}"] = topic;
            }
        }

        // ---- Classify bank topics ----------------------------------------------------------
        Section ScenarioSection() =>
            sectionBySlug.TryGetValue(TopicClassifier.ScenarioSectionSlug, out var s) ? s :
            sectionBySlug[TopicClassifier.ScenarioSectionSlug] = UpsertSection(sectionsByKey,
                $"matrix:section:{TopicClassifier.ScenarioSectionSlug}", TopicClassifier.ScenarioSectionTitle,
                TopicClassifier.ScenarioSectionSlug,
                "Cross-cutting senior/lead interview practice: comparisons, production scenarios, rapid-fire and mock-interview material.",
                10_000, Priority.Core, report);

        var questionTargets = new List<(BankQuestion Q, Topic Topic, BankTopic Bank)>();
        var nextOrderPerSection = new Dictionary<Section, int>(ReferenceEqualityComparer.Instance);

        foreach (var bt in bank)
        {
            var c = TopicClassifier.Classify(bt, matrix, overrides);
            report.Classifications.Add(c);
            if (IsDeleted("Section", $"matrix:section:{c.SectionSlug}") || IsDeleted("Topic", $"bank:topic:{bt.TopicId}") || (c.MatrixTopicSlug != null && IsDeleted("Topic", $"matrix:topic:{c.SectionSlug}/{c.MatrixTopicSlug}"))) continue;
            if (!sectionBySlug.TryGetValue(c.SectionSlug, out var section))
            {
                if (c.SectionSlug != TopicClassifier.ScenarioSectionSlug)
                    report.Warnings.Add($"Override for '{bt.TopicId}' references unknown section '{c.SectionSlug}'; using {TopicClassifier.ScenarioSectionTitle}.");
                section = ScenarioSection();
            }

            Topic topic;
            if (c.MatrixTopicSlug is not null && matrixTopicBySlug.TryGetValue($"{section.Slug}/{c.MatrixTopicSlug}", out var existing))
            {
                topic = existing;
                if (!topic.IsAdminEdited) topic.Description ??= $"Interview focus: {bt.Title}.";
            }
            else
            {
                if (!nextOrderPerSection.TryGetValue(section, out var ord)) ord = 1000;
                nextOrderPerSection[section] = ord + 10;
                var slug = Text.Slugify(bt.Title);
                topic = UpsertTopic(topicsByKey, $"bank:topic:{bt.TopicId}", section, bt.Title, slug,
                    $"Interview focus: {bt.Title}.", null, ord, bt.Priority, report);
            }
            foreach (var q in bt.Questions) questionTargets.Add((q, topic, bt));
        }

        await db.SaveChangesAsync(ct); // assign ids

        // ---- Questions ------------------------------------------------------------------------
        var existingByExt = await db.Questions.Include(q => q.Answer).Include(q => q.Tags)
            .Where(q => q.ExternalId != null).ToDictionaryAsync(q => q.ExternalId!, ct);
        var hashes = await db.Questions.Select(q => new { q.ContentHash, q.ExternalId }).ToListAsync(ct);
        var hashOwners = hashes.GroupBy(h => h.ContentHash).ToDictionary(g => g.Key, g => g.First().ExternalId);
        var tagsByName = await db.Tags.ToDictionaryAsync(t => t.Name.ToLowerInvariant(), ct);

        var position = 0;
        var seenInThisRun = new HashSet<string>();
        foreach (var (bq, topic, bt) in questionTargets)
        {
            position++;
            if (IsDeleted("Question", bq.QuestionId)) continue;
            var hash = Text.Hash(bq.Question);
            if (!seenInThisRun.Add(bq.QuestionId) ||
                (hashOwners.TryGetValue(hash, out var owner) && owner != bq.QuestionId && !existingByExt.ContainsKey(bq.QuestionId)))
            {
                report.DuplicatesSkipped++;
                continue;
            }

            var difficulty = MarkdownHelpers.ParseDifficulty(bq.DifficultyLabel);
            var followUps = bq.FollowUps.Count == 0 ? null : string.Join('\n', bq.FollowUps.Select(f => "- " + f));
            var tagNames = BuildTags(bq, bt);

            if (existingByExt.TryGetValue(bq.QuestionId, out var q))
            {
                if (q.IsAdminEdited) { report.QuestionsUnchanged++; continue; }
                var changed = q.Text != bq.Question || q.Answer?.Body != bq.Answer || q.TopicId != topic.Id ||
                              q.Difficulty != difficulty || q.Answer?.FollowUps != followUps || q.SortOrder != position;
                if (changed)
                {
                    q.Text = bq.Question; q.TopicId = topic.Id; q.Difficulty = difficulty; q.QuestionType = bq.QuestionType;
                    q.ContentHash = hash; q.SortOrder = position; q.UpdatedAt = DateTime.UtcNow;
                    q.Answer ??= new Answer();
                    q.Answer.Body = bq.Answer; q.Answer.FollowUps = followUps;
                    report.QuestionsUpdated++;
                }
                else report.QuestionsUnchanged++;
                SyncTags(q, tagNames, tagsByName);
                q.SearchText = Text.BuildSearchText(q.Text, bq.Answer, string.Join(' ', tagNames), bq.Title);
            }
            else
            {
                q = new Question
                {
                    ExternalId = bq.QuestionId, TopicId = topic.Id, Text = bq.Question, ContentHash = hash,
                    Difficulty = difficulty, QuestionType = bq.QuestionType, SortOrder = position,
                    Answer = new Answer { Body = bq.Answer, FollowUps = followUps },
                    SearchText = Text.BuildSearchText(bq.Question, bq.Answer, string.Join(' ', tagNames), bq.Title)
                };
                SyncTags(q, tagNames, tagsByName);
                db.Questions.Add(q);
                hashOwners[hash] = bq.QuestionId;
                report.QuestionsCreated++;
            }
        }

        // ---- Algorithms ----------------------------------------------------------------------
        var algoBySlug = await db.Algorithms.ToDictionaryAsync(a => a.Slug, ct);
        var aOrder = 0;
        foreach (var a in algos)
        {
            aOrder += 10;
            if (IsDeleted("Algorithm", a.Slug)) continue;
            if (!algoBySlug.TryGetValue(a.Slug, out var entity))
            {
                entity = new Algorithm { Slug = a.Slug };
                db.Algorithms.Add(entity);
                algoBySlug[a.Slug] = entity;
                report.AlgorithmsCreated++;
            }
            else { if (entity.IsUserCreated || entity.IsAdminEdited) continue; report.AlgorithmsUpdated++; }
            entity.Category = a.Category; entity.Name = a.Name; entity.ProblemStatement = a.ProblemStatement;
            entity.Explanation = a.Explanation; entity.Approach = a.Approach; entity.TimeComplexity = a.TimeComplexity;
            entity.SpaceComplexity = a.SpaceComplexity; entity.Implementation = a.Implementation; entity.Example = a.Example;
            entity.InterviewQuestions = a.InterviewQuestions; entity.CommonMistakes = a.CommonMistakes; entity.SortOrder = aOrder;
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        report.Duration = sw.Elapsed;
        logger.LogInformation(
            "Import finished in {Elapsed} ms: sections +{SC}/~{SU}, topics +{TC}/~{TU}, questions +{QC}/~{QU}/={QN}, duplicates {Dup}, algorithms +{AC}/~{AU}",
            sw.ElapsedMilliseconds, report.SectionsCreated, report.SectionsUpdated, report.TopicsCreated, report.TopicsUpdated,
            report.QuestionsCreated, report.QuestionsUpdated, report.QuestionsUnchanged, report.DuplicatesSkipped,
            report.AlgorithmsCreated, report.AlgorithmsUpdated);
        foreach (var w in report.Warnings) logger.LogWarning("Import warning: {Warning}", w);
        return report;
    }

    private Section UpsertSection(Dictionary<string, Section> byKey, string key, string name, string slug, string? description, int order, Priority priority, ImportReport report)
    {
        if (byKey.TryGetValue(key, out var s))
        {
            if (s.IsAdminEdited) return s;
            if (s.Name != name || s.Description != description || s.SortOrder != order || s.Priority != priority)
            {
                s.Name = name; s.Description = description; s.SortOrder = order; s.Priority = priority; s.UpdatedAt = DateTime.UtcNow;
                report.SectionsUpdated++;
            }
            return s;
        }
        s = new Section { SourceKey = key, Name = name, Slug = slug, Description = description, SortOrder = order, Priority = priority };
        db.Sections.Add(s);
        byKey[key] = s;
        report.SectionsCreated++;
        return s;
    }

    private Topic UpsertTopic(Dictionary<string, Topic> byKey, string key, Section section, string name, string slug, string? description, string? scope, int order, Priority priority, ImportReport report)
    {
        if (byKey.TryGetValue(key, out var t))
        {
            if (t.IsAdminEdited) return t;
            if (t.Name != name || t.Scope != scope || t.SortOrder != order || t.Priority != priority || t.SectionId != section.Id || (description != null && t.Description != description))
            {
                t.Name = name; t.Scope = scope; t.SortOrder = order; t.Priority = priority; t.Section = section;
                if (description != null) t.Description = description;
                t.UpdatedAt = DateTime.UtcNow;
                report.TopicsUpdated++;
            }
            return t;
        }
        t = new Topic { SourceKey = key, Section = section, Name = name, Slug = slug, Description = description, Scope = scope, SortOrder = order, Priority = priority };
        db.Topics.Add(t);
        byKey[key] = t;
        report.TopicsCreated++;
        return t;
    }

    internal static List<string> BuildTags(BankQuestion q, BankTopic bt)
    {
        var tags = new List<string> { "Interview" };
        var hay = (q.Question + " " + q.Title + " " + bt.Title).ToLowerInvariant();
        foreach (var (tag, needles) in TechTags)
            if (needles.Any(hay.Contains)) tags.Add(tag);
        if (MarkdownHelpers.ParseDifficulty(q.DifficultyLabel) >= Difficulty.Advanced) tags.Add("Advanced");
        return tags.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private void SyncTags(Question q, List<string> names, Dictionary<string, Tag> tagsByName)
    {
        foreach (var name in names)
        {
            var key = name.ToLowerInvariant();
            if (!tagsByName.TryGetValue(key, out var tag))
            {
                tag = new Tag { Name = name };
                db.Tags.Add(tag);
                tagsByName[key] = tag;
            }
            if (!q.Tags.Any(t => (tag.Id != 0 && t.TagId == tag.Id) || ReferenceEquals(t.Tag, tag)))
                q.Tags.Add(new QuestionTag { Question = q, Tag = tag });
        }
    }

    private static async Task<Dictionary<string, string>> LoadOverridesAsync(string path, CancellationToken ct)
    {
        if (!File.Exists(path)) return new();
        await using var stream = File.OpenRead(path);
        var raw = await JsonSerializer.DeserializeAsync<Dictionary<string, JsonElement>>(stream, cancellationToken: ct) ?? new();
        return raw.Where(kv => !kv.Key.StartsWith('_') && kv.Value.ValueKind == JsonValueKind.String)
                  .ToDictionary(kv => kv.Key, kv => kv.Value.GetString()!);
    }
}
