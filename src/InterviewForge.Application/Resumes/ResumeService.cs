using System.Text;
using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.Application.Resumes;

/// <summary>
/// Resumes and their questions. Every query is scoped to the signed-in account; another account's
/// resume id is reported as not found. Questions come from the shared knowledge base, so progress
/// and notes are the same as everywhere else in the app. Study plans are never touched.
/// </summary>
public sealed class ResumeService(IAppDbContext db, ICurrentUser user, IClock clock, IPdfTextExtractor pdf)
{
    public const long MaxFileBytes = 5 * 1024 * 1024;
    public const int MaxTextLength = 100_000;
    public const int MaxResumesPerAccount = 20;
    public const int MaxQuestionsPerSkill = 40;
    public const int MaxPdfPages = 20;

    public async Task<IReadOnlyList<ResumeListItemDto>> ListAsync(CancellationToken ct)
    {
        var uid = user.UserId;
        var resumes = await db.Resumes.AsNoTracking().Where(r => r.UserId == uid).OrderByDescending(r => r.UploadedAt)
            .Select(r => new { r.Id, r.Title, r.FileName, r.FileKind, r.UploadedAt, Skills = r.Skills.Select(s => new { s.Key, s.DisplayName }).ToList() })
            .ToListAsync(ct);
        if (resumes.Count == 0) return [];
        var index = await KnowledgeBaseIndex.LoadAsync(db, ct);
        return resumes.Select(r => new ResumeListItemDto(r.Id, r.Title, r.FileName, r.FileKind, r.UploadedAt, r.Skills.Count,
            r.Skills.Count(s => index.Match(s.Key, s.DisplayName).Any))).ToList();
    }

    public async Task<ResumeDetailDto> GetAsync(int id, CancellationToken ct)
    {
        var uid = user.UserId;
        var resume = await db.Resumes.AsNoTracking().Include(r => r.Skills).FirstOrDefaultAsync(r => r.Id == id && r.UserId == uid, ct)
                     ?? throw NotFoundException.For("Resume", id);

        // Skills are re-matched on every view, so topics added to the knowledge base later appear automatically.
        var index = await KnowledgeBaseIndex.LoadAsync(db, ct);
        var matches = resume.Skills.ToDictionary(s => s.Key, s => index.Match(s.Key, s.DisplayName));
        var allTopicIds = matches.Values.SelectMany(m => m.Topics.Select(t => t.Id)).ToHashSet().ToList();
        var allTagIds = matches.Values.SelectMany(m => m.TagIds).ToHashSet().ToList();

        var candidates = allTopicIds.Count + allTagIds.Count == 0 ? [] : await db.Questions.AsNoTracking()
            .Where(q => allTopicIds.Contains(q.TopicId) || q.AdditionalTopics.Any(a => allTopicIds.Contains(a.TopicId)) || q.Tags.Any(t => allTagIds.Contains(t.TagId)))
            .OrderBy(q => q.Topic.Section.SortOrder).ThenBy(q => q.Topic.SortOrder).ThenBy(q => q.SortOrder).ThenBy(q => q.Id)
            .Select(q => new Candidate(q.Id, q.TopicId, q.AdditionalTopics.Select(a => a.TopicId).ToList(), q.Tags.Select(t => t.TagId).ToList()))
            .ToListAsync(ct);

        var perSkill = new Dictionary<string, (List<int> Ids, int Total)>();
        foreach (var s in resume.Skills)
        {
            var m = matches[s.Key];
            var topicIds = m.Topics.Select(t => t.Id).ToHashSet();
            var tagIds = m.TagIds.ToHashSet();
            var mine = candidates.Where(c => topicIds.Contains(c.TopicId) || c.ExtraTopics.Any(topicIds.Contains) || c.Tags.Any(tagIds.Contains)).ToList();
            perSkill[s.Key] = (Interleave(mine, topicIds).Take(MaxQuestionsPerSkill).ToList(), mine.Count);
        }

        var shownIds = perSkill.Values.SelectMany(v => v.Ids).Distinct().ToList();
        var summaries = (await SummariesAsync(shownIds, ct)).ToDictionary(q => q.Id);
        var distinct = candidates.Select(c => c.Id).ToHashSet();
        var completed = distinct.Count == 0 ? 0 : await db.UserProgress.AsNoTracking()
            .CountAsync(p => p.UserId == uid && p.Status == ProgressStatus.Completed && distinct.Contains(p.QuestionId), ct);

        var skills = resume.Skills
            .Select(s => new ResumeSkillDto(s.Key, s.DisplayName, s.Mentions, matches[s.Key].Any, matches[s.Key].Topics, perSkill[s.Key].Total,
                perSkill[s.Key].Ids.Where(summaries.ContainsKey).Select(i => summaries[i]).ToList()))
            .OrderByDescending(s => s.InKnowledgeBase).ThenByDescending(s => s.Mentions).ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
        return new ResumeDetailDto(resume.Id, resume.Title, resume.FileName, resume.FileKind, resume.UploadedAt, skills, distinct.Count, completed);
    }

    public async Task<ResumeDetailDto> UploadAsync(string? fileName, Stream content, long length, CancellationToken ct)
    {
        var name = Path.GetFileName((fileName ?? "").Trim());
        var ext = Path.GetExtension(name).ToLowerInvariant();
        var kind = ext switch { ".pdf" => "pdf", ".tex" => "tex", _ => throw new ValidationException("file", "Upload a PDF (.pdf) or LaTeX (.tex) file.") };
        if (length <= 0) throw new ValidationException("file", "The file is empty.");
        if (length > MaxFileBytes) throw new ValidationException("file", "The file is larger than 5 MB.");

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        if (buffer.Length > MaxFileBytes) throw new ValidationException("file", "The file is larger than 5 MB.");
        var bytes = buffer.ToArray();

        var text = kind == "pdf" ? ReadPdf(bytes) : ReadTex(bytes);
        if (text.Count(char.IsLetter) < 20)
            throw new ValidationException("file", kind == "pdf"
                ? "No readable text was found. Scanned or image-only PDFs are not supported; export the PDF with selectable text."
                : "No readable text was found in the .tex file.");
        if (text.Length > MaxTextLength) text = text[..MaxTextLength];

        var detected = ResumeAnalyzer.Detect(text);
        var title = Path.GetFileNameWithoutExtension(name);
        if (string.IsNullOrWhiteSpace(title)) title = "Resume";
        if (title.Length > 200) title = title[..200];
        if (name.Length > 260) name = name[..260];

        var id = await ResumeWriteGate.RunAsync(async () =>
        {
            var uid = user.UserId;
            if (await db.Resumes.CountAsync(r => r.UserId == uid, ct) >= MaxResumesPerAccount)
                throw new ValidationException("file", $"You can keep up to {MaxResumesPerAccount} resumes. Delete one to upload another.");

            var index = await KnowledgeBaseIndex.LoadAsync(db, ct);
            var now = clock.UtcNow;
            await using var tx = await db.BeginTransactionAsync(ct);
            var resume = new Resume
            {
                UserId = uid, Title = title, FileName = name, FileKind = kind, ExtractedText = text, UploadedAt = now, UpdatedAt = now,
                Skills = detected.Select(d => new ResumeSkill { Key = d.Key, DisplayName = d.Name, Mentions = d.Mentions }).ToList()
            };
            db.Resumes.Add(resume);

            var missing = detected.Where(d => !index.Match(d.Key, d.Name).Any).ToList();
            if (missing.Count > 0)
            {
                var keys = missing.Select(m => m.Key).ToList();
                var existing = await db.MissingTopicRequests.Where(r => keys.Contains(r.Key)).ToDictionaryAsync(r => r.Key, ct);
                foreach (var m in missing)
                {
                    if (existing.TryGetValue(m.Key, out var req))
                    {
                        req.RequestCount++;
                        req.LastRequestedAt = now;
                        // A topic marked as added that no longer matches anything (e.g. it was deleted) is reopened.
                        if (req.Status == MissingTopicStatus.Added) { req.Status = MissingTopicStatus.Open; req.ResolvedAt = null; req.ResolvedBy = null; req.EmailedAt = null; }
                    }
                    else
                    {
                        db.MissingTopicRequests.Add(new MissingTopicRequest
                        {
                            Key = m.Key, DisplayName = m.Name, RequestCount = 1, FirstRequestedAt = now, LastRequestedAt = now, Status = MissingTopicStatus.Open
                        });
                    }
                }
            }
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return resume.Id;
        }, ct);
        return await GetAsync(id, ct);
    }

    public Task<ResumeListItemDto> RenameAsync(int id, RenameResumeRequest req, CancellationToken ct) => ResumeWriteGate.RunAsync(async () =>
    {
        var title = (req.Title ?? "").Trim();
        new Validator().Required("title", title, "Enter a title.").MaxLength("title", title, 200).ThrowIfInvalid();
        var uid = user.UserId;
        var resume = await db.Resumes.Include(r => r.Skills).FirstOrDefaultAsync(r => r.Id == id && r.UserId == uid, ct) ?? throw NotFoundException.For("Resume", id);
        resume.Title = title;
        resume.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        var index = await KnowledgeBaseIndex.LoadAsync(db, ct);
        return new ResumeListItemDto(resume.Id, resume.Title, resume.FileName, resume.FileKind, resume.UploadedAt, resume.Skills.Count,
            resume.Skills.Count(s => index.Match(s.Key, s.DisplayName).Any));
    }, ct);

    public Task<bool> DeleteAsync(int id, CancellationToken ct) => ResumeWriteGate.RunAsync(async () =>
    {
        var uid = user.UserId;
        var resume = await db.Resumes.FirstOrDefaultAsync(r => r.Id == id && r.UserId == uid, ct) ?? throw NotFoundException.For("Resume", id);
        await using var tx = await db.BeginTransactionAsync(ct);
        await db.ResumeSkills.Where(s => s.ResumeId == id).ExecuteDeleteAsync(ct);
        db.Resumes.Remove(resume);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }, ct);

    private string ReadPdf(byte[] bytes)
    {
        if (bytes.Length < 5 || Encoding.ASCII.GetString(bytes, 0, 5) != "%PDF-")
            throw new ValidationException("file", "This file is not a valid PDF.");
        try { return pdf.Extract(bytes, MaxPdfPages); }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ValidationException("file", "This PDF could not be read. Password-protected or damaged PDFs are not supported.");
        }
    }

    private static string ReadTex(byte[] bytes)
    {
        var raw = new UTF8Encoding(false, false).GetString(bytes);
        if (raw.Contains('\0')) throw new ValidationException("file", "This .tex file is not a text file.");
        return LatexText.ToPlainText(raw);
    }

    private sealed record Candidate(int Id, int TopicId, List<int> ExtraTopics, List<int> Tags);

    /// <summary>Round-robin across topics so a broad skill (e.g. "Azure") shows a spread of topics instead of one.</summary>
    private static IEnumerable<int> Interleave(List<Candidate> questions, HashSet<int> topicIds)
    {
        var buckets = questions
            .GroupBy(c => topicIds.Contains(c.TopicId) ? c.TopicId : c.ExtraTopics.FirstOrDefault(topicIds.Contains))
            .Select(g => new Queue<int>(g.Select(c => c.Id))).ToList();
        while (buckets.Count > 0)
        {
            foreach (var b in buckets) yield return b.Dequeue();
            buckets.RemoveAll(b => b.Count == 0);
        }
    }

    private async Task<List<QuestionSummaryDto>> SummariesAsync(List<int> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return [];
        var uid = user.UserId;
        var rows = await db.Questions.AsNoTracking().Where(x => ids.Contains(x.Id))
            .Select(x => new
            {
                x.Id, x.TopicId, TopicName = x.Topic.Name, x.Topic.SectionId, SectionName = x.Topic.Section.Name, x.Text, x.Difficulty, x.IsUserCreated, x.CreatedByUserId, x.AddedBy,
                Progress = db.UserProgress.Where(p => p.UserId == uid && p.QuestionId == x.Id)
                    .Select(p => new { p.Status, p.IsFavorite, p.LastRating, p.PersonalDifficulty }).FirstOrDefault(),
                Tags = x.Tags.Select(t => t.Tag.Name).ToList()
            }).ToListAsync(ct);
        return rows.Select(r => new QuestionSummaryDto(r.Id, r.TopicId, r.TopicName, r.SectionId, r.SectionName, r.Text,
            r.Progress?.PersonalDifficulty ?? r.Difficulty, r.IsUserCreated, r.Progress?.Status ?? ProgressStatus.NotStarted,
            r.Progress?.IsFavorite ?? false, r.Progress?.LastRating, r.Tags, r.CreatedByUserId, r.AddedBy, user.IsAdmin || r.CreatedByUserId == uid)).ToList();
    }
}
