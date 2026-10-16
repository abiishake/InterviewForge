using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InterviewForge.Application.Content;

public enum QuestionFilter { All, NotStarted, Completed, NeedsReview, Favorites, Mine, InProgress }

public sealed class ContentService(IAppDbContext db, ICurrentUser user, ProgressQueries progress, IClock clock, ILogger<ContentService> logger)
{
    public const int MaxQuestionLength = 2_000;
    public const int MaxAnswerLength = 50_000;
    public const int MaxNameLength = 120;

    // ---------------------------------------------------------------- Sections
    public async Task<IReadOnlyList<SectionDto>> GetSectionsAsync(CancellationToken ct)
    {
        var sections = await db.Sections.AsNoTracking().OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.Slug, s.Description, s.Priority, s.IsUserCreated, s.CreatedByUserId, s.AddedBy, s.SortOrder, TopicCount = s.Topics.Count })
            .ToListAsync(ct);
        var prog = await progress.BySectionAsync(ct);
        return sections.Select(s => new SectionDto(s.Id, s.Name, s.Slug, s.Description, s.Priority, s.IsUserCreated, s.SortOrder, s.TopicCount,
            prog.GetValueOrDefault(s.Id) ?? ProgressQueries.Empty, s.CreatedByUserId, s.AddedBy, user.IsAdmin || s.CreatedByUserId == user.UserId)).ToList();
    }

    public async Task<SectionDetailDto> GetSectionAsync(int id, CancellationToken ct)
    {
        var s = await db.Sections.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new { x.Id, x.Name, x.Slug, x.Description, x.Priority, x.IsUserCreated, x.CreatedByUserId, x.AddedBy, x.SortOrder, TopicCount = x.Topics.Count })
            .FirstOrDefaultAsync(ct) ?? throw NotFoundException.For("Section", id);
        var topics = await GetTopicsAsync(id, ct);
        var sectionProgress = new ProgressSummary(topics.Sum(t => t.Progress.Total), topics.Sum(t => t.Progress.Completed),
            topics.Sum(t => t.Progress.NeedsReview), topics.Sum(t => t.Progress.InProgress));
        return new SectionDetailDto(new SectionDto(s.Id, s.Name, s.Slug, s.Description, s.Priority, s.IsUserCreated, s.SortOrder, s.TopicCount, sectionProgress, s.CreatedByUserId, s.AddedBy, user.IsAdmin || s.CreatedByUserId == user.UserId), topics);
    }

    public async Task<SectionDto> CreateSectionAsync(SaveSectionRequest req, CancellationToken ct)
    {
        ValidateName(req.Name, "name");
        var name = req.Name.Trim();
        if (await db.Sections.AnyAsync(s => s.Name.ToLower() == name.ToLower(), ct))
            throw new ConflictException("SECTION_EXISTS", $"A section named '{name}' already exists.");
        var max = await db.Sections.MaxAsync(s => (int?)s.SortOrder, ct) ?? 0;
        var section = new Section { Name = name, Slug = Text.Slugify(name), Description = req.Description?.Trim(), IsUserCreated = true, SortOrder = max + 10, Priority = Priority.Strong };
        ContentAccess.Attribute(user, section);
        db.Sections.Add(section);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("User section {SectionId} created", section.Id);
        return new SectionDto(section.Id, section.Name, section.Slug, section.Description, section.Priority, true, section.SortOrder, 0, ProgressQueries.Empty, section.CreatedByUserId, section.AddedBy, true);
    }

    public async Task UpdateSectionAsync(int id, SaveSectionRequest req, CancellationToken ct)
    {
        ValidateName(req.Name, "name");
        var s = await db.Sections.FindAsync(new object[] { id }, ct) ?? throw NotFoundException.For("Section", id);
        ContentAccess.Ensure(user, s);
        s.Name = req.Name.Trim(); s.Description = req.Description?.Trim(); s.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteSectionAsync(int id, CancellationToken ct)
    {
        var s = await db.Sections.Include(x => x.Topics).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw NotFoundException.For("Section", id);
        ContentAccess.Ensure(user, s);
        var hasImported = await db.Questions.AnyAsync(q => q.Topic.SectionId == id && !q.IsUserCreated, ct);
        if (!user.IsAdmin && (hasImported || await db.Topics.AnyAsync(t => t.SectionId == id && t.CreatedByUserId != user.UserId, ct) || await db.Questions.AnyAsync(q => q.Topic.SectionId == id && q.CreatedByUserId != user.UserId, ct))) throw new ConflictException("SECTION_HAS_IMPORTED_CONTENT", "This section contains imported questions and cannot be deleted.");
        if (s.SourceKey is not null) db.DeletedSeeds.Add(new DeletedSeed { Kind = "Section", Key = s.SourceKey });
        foreach (var t in s.Topics.Where(t => t.SourceKey != null)) db.DeletedSeeds.Add(new DeletedSeed { Kind = "Topic", Key = t.SourceKey ?? "" });
        await DeleteQuestionsAsync(db.Questions.Where(q => q.Topic.SectionId == id), ct);
        db.Topics.RemoveRange(s.Topics);
        db.Sections.Remove(s);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("User section {SectionId} deleted", id);
    }

    // ---------------------------------------------------------------- Topics
    public async Task<IReadOnlyList<TopicDto>> GetTopicsAsync(int? sectionId, CancellationToken ct)
    {
        var query = db.Topics.AsNoTracking();
        if (sectionId is not null) query = query.Where(t => t.SectionId == sectionId);
        var topics = await query.OrderBy(t => t.Section.SortOrder).ThenBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new { t.Id, t.SectionId, SectionName = t.Section.Name, t.Name, t.Slug, t.Description, t.Scope, t.Priority, t.IsUserCreated, t.CreatedByUserId, t.AddedBy, t.SortOrder })
            .ToListAsync(ct);
        var prog = await progress.ByTopicAsync(sectionId is null ? null : topics.Select(t => t.Id).ToList(), ct);
        return topics.Select(t => new TopicDto(t.Id, t.SectionId, t.SectionName, t.Name, t.Slug, t.Description, t.Scope, t.Priority, t.IsUserCreated, t.SortOrder,
            prog.GetValueOrDefault(t.Id) ?? ProgressQueries.Empty, t.CreatedByUserId, t.AddedBy, user.IsAdmin || t.CreatedByUserId == user.UserId)).ToList();
    }

    public async Task<TopicDto> GetTopicAsync(int id, CancellationToken ct)
    {
        var t = await db.Topics.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new { x.Id, x.SectionId, SectionName = x.Section.Name, x.Name, x.Slug, x.Description, x.Scope, x.Priority, x.IsUserCreated, x.CreatedByUserId, x.AddedBy, x.SortOrder })
            .FirstOrDefaultAsync(ct) ?? throw NotFoundException.For("Topic", id);
        var prog = await progress.ByTopicAsync(new[] { id }, ct);
        return new TopicDto(t.Id, t.SectionId, t.SectionName, t.Name, t.Slug, t.Description, t.Scope, t.Priority, t.IsUserCreated, t.SortOrder,
            prog.GetValueOrDefault(id) ?? ProgressQueries.Empty, t.CreatedByUserId, t.AddedBy, user.IsAdmin || t.CreatedByUserId == user.UserId);
    }

    public async Task<TopicDto> CreateTopicAsync(SaveTopicRequest req, CancellationToken ct)
    {
        ValidateName(req.Name, "name");
        new Validator().Positive("sectionId", req.SectionId).ThrowIfInvalid();
        var section = await db.Sections.FindAsync(new object[] { req.SectionId }, ct)
                      ?? throw new ValidationException("sectionId", "Section does not exist.");
        var topic = await GetOrCreateTopicAsync(section, req.Name.Trim(), req.Description, ct);
        await db.SaveChangesAsync(ct);
        return await GetTopicAsync(topic.Id, ct);
    }

    public async Task UpdateTopicAsync(int id, SaveTopicRequest req, CancellationToken ct)
    {
        ValidateName(req.Name, "name");
        var t = await db.Topics.FindAsync(new object[] { id }, ct) ?? throw NotFoundException.For("Topic", id);
        ContentAccess.Ensure(user, t);
        if (!await db.Sections.AnyAsync(s => s.Id == req.SectionId, ct)) throw new ValidationException("sectionId", "Section does not exist.");
        t.Name = req.Name.Trim(); t.Description = req.Description?.Trim(); t.SectionId = req.SectionId; t.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteTopicAsync(int id, CancellationToken ct)
    {
        var t = await db.Topics.FindAsync(new object[] { id }, ct) ?? throw NotFoundException.For("Topic", id);
        ContentAccess.Ensure(user, t);
        if (!user.IsAdmin && await db.Questions.AnyAsync(q => q.TopicId == id && q.CreatedByUserId != user.UserId, ct))
            throw new ConflictException("TOPIC_HAS_IMPORTED_CONTENT", "This topic contains imported questions and cannot be deleted.");
        await DeleteQuestionsAsync(db.Questions.Where(q => q.TopicId == id), ct);
        if (t.SourceKey is not null) db.DeletedSeeds.Add(new DeletedSeed { Kind = "Topic", Key = t.SourceKey });
        db.Topics.Remove(t);
        await db.SaveChangesAsync(ct);
    }

    // ---------------------------------------------------------------- Questions
    public async Task<PagedResult<QuestionSummaryDto>> GetQuestionsAsync(int? topicId, QuestionFilter filter, string? tag, int page, int pageSize, CancellationToken ct)
    {
        if (topicId is not null && !await db.Topics.AnyAsync(t => t.Id == topicId, ct)) throw NotFoundException.For("Topic", topicId);
        var q = db.Questions.AsNoTracking();
        if (topicId is not null) q = q.Where(x => x.TopicId == topicId || x.AdditionalTopics.Any(a => a.TopicId == topicId));
        if (!string.IsNullOrWhiteSpace(tag)) { var tg = tag.Trim().TrimStart('#').ToLower(); q = q.Where(x => x.Tags.Any(t => t.Tag.Name.ToLower() == tg)); }
        q = ApplyFilter(q, filter);
        return await ToPagedSummariesAsync(q.OrderBy(x => x.Topic.Section.SortOrder).ThenBy(x => x.Topic.SortOrder).ThenBy(x => x.SortOrder).ThenBy(x => x.Id), page, pageSize, ct);
    }

    internal IQueryable<Question> ApplyFilter(IQueryable<Question> q, QuestionFilter filter)
    {
        var uid = user.UserId;
        var prog = db.UserProgress.Where(p => p.UserId == uid);
        return filter switch
        {
            QuestionFilter.NotStarted => q.Where(x => !prog.Any(p => p.QuestionId == x.Id && p.Status != ProgressStatus.NotStarted)),
            QuestionFilter.Completed => q.Where(x => prog.Any(p => p.QuestionId == x.Id && p.Status == ProgressStatus.Completed)),
            QuestionFilter.NeedsReview => q.Where(x => prog.Any(p => p.QuestionId == x.Id && p.Status == ProgressStatus.NeedsReview)),
            QuestionFilter.InProgress => q.Where(x => prog.Any(p => p.QuestionId == x.Id && p.Status == ProgressStatus.InProgress)),
            QuestionFilter.Favorites => q.Where(x => prog.Any(p => p.QuestionId == x.Id && p.IsFavorite)),
            QuestionFilter.Mine => q.Where(x => x.CreatedByUserId == uid),
            _ => q
        };
    }

    public async Task<PagedResult<QuestionSummaryDto>> ToPagedSummariesAsync(IQueryable<Question> ordered, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var total = await ordered.CountAsync(ct);
        var uid = user.UserId;
        var rows = await ordered.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new
            {
                x.Id, x.TopicId, TopicName = x.Topic.Name, x.Topic.SectionId, SectionName = x.Topic.Section.Name, x.Text, x.Difficulty, x.IsUserCreated, x.CreatedByUserId, x.AddedBy,
                Progress = db.UserProgress.Where(p => p.UserId == uid && p.QuestionId == x.Id)
                    .Select(p => new { p.Status, p.IsFavorite, p.LastRating, p.PersonalDifficulty }).FirstOrDefault(),
                Tags = x.Tags.Select(t => t.Tag.Name).ToList()
            }).ToListAsync(ct);
        var items = rows.Select(r => new QuestionSummaryDto(r.Id, r.TopicId, r.TopicName, r.SectionId, r.SectionName, r.Text,
            r.Progress?.PersonalDifficulty ?? r.Difficulty, r.IsUserCreated, r.Progress?.Status ?? ProgressStatus.NotStarted,
            r.Progress?.IsFavorite ?? false, r.Progress?.LastRating, r.Tags, r.CreatedByUserId, r.AddedBy, user.IsAdmin || r.CreatedByUserId == uid)).ToList();
        return new PagedResult<QuestionSummaryDto>(items, page, pageSize, total);
    }

    public async Task<QuestionDetailDto> GetQuestionAsync(int id, int? contextTopicId, CancellationToken ct)
    {
        var uid = user.UserId;
        var q = await db.Questions.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.ExternalId, x.TopicId, TopicName = x.Topic.Name, x.Topic.SectionId, SectionName = x.Topic.Section.Name, x.Text, x.Difficulty,
            x.QuestionType, x.IsUserCreated, x.CreatedByUserId, x.AddedBy, Answer = x.Answer != null ? x.Answer.Body : "", FollowUps = x.Answer != null ? x.Answer.FollowUps : null,
            Tags = x.Tags.Select(t => t.Tag.Name).ToList(),
            Refs = x.References.OrderBy(r => r.Id).Select(r => new ReferenceDto(r.Title, r.Url)).ToList(),
            Extra = x.AdditionalTopics.Select(a => new TopicRefDto(a.TopicId, a.Topic.Name, a.Topic.SectionId, a.Topic.Section.Name)).ToList(),
            x.SortOrder, x.CreatedAt, x.UpdatedAt
        }).FirstOrDefaultAsync(ct) ?? throw NotFoundException.For("Question", id);

        var p = await db.UserProgress.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == uid && x.QuestionId == id, ct);
        var note = await db.UserNotes.AsNoTracking().Where(n => n.UserId == uid && n.QuestionId == id).Select(n => n.Body).FirstOrDefaultAsync(ct);

        // previous/next within the topic used to navigate here (defaults to primary topic)
        var topicId = contextTopicId ?? q.TopicId;
        var siblings = await db.Questions.AsNoTracking()
            .Where(x => x.TopicId == topicId || x.AdditionalTopics.Any(a => a.TopicId == topicId))
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Id).Select(x => x.Id).ToListAsync(ct);
        var idx = siblings.IndexOf(id);
        int? prev = idx > 0 ? siblings[idx - 1] : null;
        int? next = idx >= 0 && idx < siblings.Count - 1 ? siblings[idx + 1] : null;

        var state = new UserStateDto(p?.Status ?? ProgressStatus.NotStarted, p?.LastRating, p?.IsFavorite ?? false, p?.PersonalDifficulty, p?.NextReviewAt, p?.ReviewCount ?? 0, note);
        return new QuestionDetailDto(q.Id, q.ExternalId, q.TopicId, q.TopicName, q.SectionId, q.SectionName, q.Text,
            p?.PersonalDifficulty ?? q.Difficulty, q.QuestionType, q.IsUserCreated, q.Answer, q.FollowUps, q.Tags, q.Refs, q.Extra, state, prev, next, q.CreatedAt, q.UpdatedAt, q.CreatedByUserId, q.AddedBy, user.IsAdmin || q.CreatedByUserId == uid);
    }

    public async Task<QuestionDetailDto> CreateQuestionAsync(SaveQuestionRequest req, CancellationToken ct)
    {
        ValidateQuestion(req);
        await using var tx = await db.BeginTransactionAsync(ct);
        var topic = await ResolveTopicAsync(req, ct);
        var maxOrder = await db.Questions.Where(x => x.TopicId == topic.Id).MaxAsync(x => (int?)x.SortOrder, ct) ?? 0;
        var question = new Question
        {
            Topic = topic, Text = req.Text.Trim(), Difficulty = req.Difficulty, IsUserCreated = true, ContentHash = Text.Hash(req.Text),
            SortOrder = maxOrder + 1, QuestionType = "User", Answer = new Answer { Body = req.Answer.Trim() }
        };
        ContentAccess.Attribute(user, question);
        db.Questions.Add(question);
        await ApplyRelationsAsync(question, req, ct);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        logger.LogInformation("User question {QuestionId} created in topic {TopicId}", question.Id, topic.Id);
        return await GetQuestionAsync(question.Id, null, ct);
    }

    public async Task<QuestionDetailDto> UpdateQuestionAsync(int id, SaveQuestionRequest req, CancellationToken ct)
    {
        ValidateQuestion(req);
        var question = await db.Questions.Include(x => x.Answer).Include(x => x.Tags).Include(x => x.References).Include(x => x.AdditionalTopics)
            .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw NotFoundException.For("Question", id);
        ContentAccess.Ensure(user, question);
        await using var tx = await db.BeginTransactionAsync(ct);
        var topic = await ResolveTopicAsync(req, ct);
        question.Topic = topic; question.TopicId = topic.Id;
        question.Text = req.Text.Trim(); question.Difficulty = req.Difficulty; question.ContentHash = Text.Hash(req.Text);
        question.Answer ??= new Answer();
        question.Answer.Body = req.Answer.Trim();
        question.UpdatedAt = clock.UtcNow;
        db.QuestionTags.RemoveRange(question.Tags); question.Tags.Clear();
        db.QuestionReferences.RemoveRange(question.References); question.References.Clear();
        db.QuestionTopics.RemoveRange(question.AdditionalTopics); question.AdditionalTopics.Clear();
        await ApplyRelationsAsync(question, req, ct);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await GetQuestionAsync(id, null, ct);
    }

    public async Task DeleteQuestionAsync(int id, CancellationToken ct)
    {
        var q = await db.Questions.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw NotFoundException.For("Question", id);
        ContentAccess.Ensure(user, q);
        await DeleteQuestionsAsync(db.Questions.Where(x => x.Id == id), ct);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("User question {QuestionId} deleted", id);
    }

    public async Task<IReadOnlyList<string>> GetTagsAsync(CancellationToken ct) =>
        await db.Tags.AsNoTracking().OrderBy(t => t.Name).Select(t => t.Name).ToListAsync(ct);

    // ---------------------------------------------------------------- helpers
    private async Task DeleteQuestionsAsync(IQueryable<Question> questions, CancellationToken ct)
    {
        var ids = await questions.Select(q => q.Id).ToListAsync(ct);
        if (ids.Count == 0) return;
        db.PlanItems.RemoveRange(db.PlanItems.Where(i => ids.Contains(i.QuestionId)));
        db.UserProgress.RemoveRange(db.UserProgress.Where(i => ids.Contains(i.QuestionId)));
        db.UserNotes.RemoveRange(db.UserNotes.Where(i => ids.Contains(i.QuestionId)));
        var removed = await db.Questions.Where(q => ids.Contains(q.Id)).ToListAsync(ct);
        foreach (var q in removed.Where(q => q.ExternalId != null)) db.DeletedSeeds.Add(new DeletedSeed { Kind = "Question", Key = q.ExternalId ?? "" });
        db.Questions.RemoveRange(removed);
    }

    private async Task<Topic> ResolveTopicAsync(SaveQuestionRequest req, CancellationToken ct)
    {
        if (req.TopicId is { } topicId)
            return await db.Topics.Include(t => t.Section).FirstOrDefaultAsync(t => t.Id == topicId, ct)
                   ?? throw new ValidationException("topicId", "Topic does not exist.");

        Section section;
        if (req.SectionId is { } sid)
            section = await db.Sections.FindAsync(new object[] { sid }, ct) ?? throw new ValidationException("sectionId", "Section does not exist.");
        else
        {
            var name = (req.NewSectionName ?? "").Trim();
            section = await db.Sections.FirstOrDefaultAsync(s => s.Name.ToLower() == name.ToLower(), ct) ?? new Section
            {
                Name = name, Slug = Text.Slugify(name), IsUserCreated = true, Priority = Priority.Strong,
                SortOrder = (await db.Sections.MaxAsync(s => (int?)s.SortOrder, ct) ?? 0) + 10
            };
            if (section.Id == 0) { ContentAccess.Attribute(user, section); db.Sections.Add(section); }
        }
        return await GetOrCreateTopicAsync(section, (req.NewTopicName ?? "").Trim(), null, ct);
    }

    private async Task<Topic> GetOrCreateTopicAsync(Section section, string name, string? description, CancellationToken ct)
    {
        if (section.Id != 0)
        {
            var existing = await db.Topics.FirstOrDefaultAsync(t => t.SectionId == section.Id && t.Name.ToLower() == name.ToLower(), ct);
            if (existing is not null) return existing;
        }
        var maxOrder = section.Id == 0 ? 0 : await db.Topics.Where(t => t.SectionId == section.Id).MaxAsync(t => (int?)t.SortOrder, ct) ?? 0;
        var topic = new Topic { Section = section, Name = name, Slug = Text.Slugify(name), Description = description?.Trim(), IsUserCreated = true, SortOrder = Math.Max(maxOrder, 2000) + 10, Priority = Priority.Strong };
        ContentAccess.Attribute(user, topic);
        db.Topics.Add(topic);
        return topic;
    }

    private async Task ApplyRelationsAsync(Question q, SaveQuestionRequest req, CancellationToken ct)
    {
        var tagNames = (req.Tags ?? Array.Empty<string>()).Select(Text.NormalizeTag).Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase).Take(20).ToList();
        var lowered = tagNames.Select(t => t.ToLower()).ToList();
        var existing = await db.Tags.Where(t => lowered.Contains(t.Name.ToLower())).ToListAsync(ct);
        foreach (var name in tagNames)
        {
            var tag = existing.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
            if (tag is null) { tag = new Tag { Name = name }; db.Tags.Add(tag); existing.Add(tag); }
            q.Tags.Add(new QuestionTag { Question = q, Tag = tag });
        }
        foreach (var r in req.References ?? Array.Empty<ReferenceDto>())
            q.References.Add(new QuestionReference { Title = string.IsNullOrWhiteSpace(r.Title) ? r.Url.Trim() : r.Title.Trim(), Url = r.Url.Trim() });

        var extra = (req.AdditionalTopicIds ?? Array.Empty<int>()).Distinct().Where(i => i != q.TopicId).Take(10).ToList();
        if (extra.Count > 0)
        {
            var valid = await db.Topics.Where(t => extra.Contains(t.Id)).Select(t => t.Id).ToListAsync(ct);
            foreach (var tid in valid) q.AdditionalTopics.Add(new QuestionTopic { Question = q, TopicId = tid });
        }
        q.SearchText = Text.BuildSearchText(q.Text, req.Answer, string.Join(' ', tagNames));
    }

    private static void ValidateName(string? name, string field) =>
        new Validator().Required(field, name).MaxLength(field, name, MaxNameLength).ThrowIfInvalid();

    internal static void ValidateQuestion(SaveQuestionRequest req)
    {
        var v = new Validator()
            .Required("text", req.Text).MinLength("text", req.Text, 5).MaxLength("text", req.Text, MaxQuestionLength)
            .Required("answer", req.Answer).MaxLength("answer", req.Answer, MaxAnswerLength)
            .Must(Enum.IsDefined(req.Difficulty), "difficulty", "Difficulty must be Beginner, Intermediate, Advanced or Expert.");
        if (req.TopicId is null)
        {
            v.Must(req.SectionId is not null || !string.IsNullOrWhiteSpace(req.NewSectionName), "section", "Choose a section or enter a new section name.");
            v.Required("newTopicName", req.NewTopicName, "Choose a topic or enter a new topic name.");
            v.MaxLength("newSectionName", req.NewSectionName, MaxNameLength).MaxLength("newTopicName", req.NewTopicName, MaxNameLength);
        }
        else v.Positive("topicId", req.TopicId.Value);
        var refs = req.References ?? Array.Empty<ReferenceDto>();
        v.Must(refs.Count <= 20, "references", "At most 20 references are allowed.");
        for (var i = 0; i < refs.Count; i++)
        {
            v.Required($"references[{i}].url", refs[i].Url).SafeUrl($"references[{i}].url", refs[i].Url)
             .MaxLength($"references[{i}].url", refs[i].Url, 2000).MaxLength($"references[{i}].title", refs[i].Title, 200);
        }
        v.Must((req.Tags?.Count ?? 0) <= 20, "tags", "At most 20 tags are allowed.");
        v.ThrowIfInvalid();
    }

}
