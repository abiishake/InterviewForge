using InterviewForge.Application.Common;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;
namespace InterviewForge.Application.Content;
public sealed class AlgorithmService(IAppDbContext db, ICurrentUser user)
{
    public async Task<IReadOnlyList<AlgorithmSummaryDto>> GetAllAsync(string? category, CancellationToken ct)
    {
        var q = db.Algorithms.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(a => a.Category == category);
        var rows = await q.OrderBy(a => a.SortOrder).ToListAsync(ct);
        return rows.Select(a => new AlgorithmSummaryDto(a.Id, a.Slug, a.Category, a.Name, a.TimeComplexity, a.SpaceComplexity, a.CreatedByUserId, a.AddedBy, ContentAccess.CanEdit(user, a))).ToList();
    }
    public async Task<AlgorithmDetailDto> GetAsync(string slug, CancellationToken ct)
    {
        var a = await db.Algorithms.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw NotFoundException.For("Algorithm", slug);
        var prev = await db.Algorithms.Where(x => x.SortOrder < a.SortOrder).OrderByDescending(x => x.SortOrder).Select(x => x.Slug).FirstOrDefaultAsync(ct);
        var next = await db.Algorithms.Where(x => x.SortOrder > a.SortOrder).OrderBy(x => x.SortOrder).Select(x => x.Slug).FirstOrDefaultAsync(ct);
        return new(a.Id, a.Slug, a.Category, a.Name, a.ProblemStatement, a.Explanation, a.Approach, a.TimeComplexity, a.SpaceComplexity,
            a.Implementation, a.Example, a.InterviewQuestions, a.CommonMistakes, prev, next, a.CreatedByUserId, a.AddedBy, ContentAccess.CanEdit(user, a));
    }
    public async Task<AlgorithmDetailDto> SaveAsync(string? slug, SaveAlgorithmRequest req, CancellationToken ct)
    {
        var v = new Validator().Required("name", req.Name).MaxLength("name", req.Name, 120).Required("category", req.Category).MaxLength("category", req.Category, 120);
        foreach (var text in new[] {req.ProblemStatement, req.Explanation, req.Approach, req.TimeComplexity, req.SpaceComplexity, req.Implementation, req.Example, req.InterviewQuestions, req.CommonMistakes}) v.MaxLength("content", text, 50000);
        v.ThrowIfInvalid();
        Algorithm a;
        if (slug is null) {
            a = new Algorithm { Slug = Text.Slugify(req.Name) + "-" + Guid.NewGuid().ToString("N")[..8], IsUserCreated = true,
                SortOrder = (await db.Algorithms.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 10 };
            ContentAccess.Attribute(user, a); db.Algorithms.Add(a);
        } else { a = await db.Algorithms.FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw NotFoundException.For("Algorithm", slug); ContentAccess.Ensure(user, a); }
        a.Name=req.Name.Trim(); a.Category=req.Category.Trim(); a.ProblemStatement=req.ProblemStatement; a.Explanation=req.Explanation;
        a.Approach=req.Approach; a.TimeComplexity=req.TimeComplexity; a.SpaceComplexity=req.SpaceComplexity; a.Implementation=req.Implementation;
        a.Example=req.Example; a.InterviewQuestions=req.InterviewQuestions; a.CommonMistakes=req.CommonMistakes;
        await db.SaveChangesAsync(ct); return await GetAsync(a.Slug, ct);
    }
    public async Task DeleteAsync(string slug, CancellationToken ct)
    {
        var a = await db.Algorithms.FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw NotFoundException.For("Algorithm", slug);
        ContentAccess.Ensure(user, a);
        if (!a.IsUserCreated) db.DeletedSeeds.Add(new DeletedSeed { Kind="Algorithm", Key=a.Slug });
        db.Algorithms.Remove(a); await db.SaveChangesAsync(ct);
    }
}
