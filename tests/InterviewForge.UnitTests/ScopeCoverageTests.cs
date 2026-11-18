using InterviewForge.Application.Import;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace InterviewForge.UnitTests;

/// <summary>Guards the link between skill-matrix "Expected scope" and the question bank.</summary>
public class ScopeCoverageTests
{
    // Topics that legitimately have questions but no matrix scope (cross-cutting or not yet split into matrix topics).
    private static readonly string[] UnscopedBankTopics =
    {
        "Azure Architecture", "Rapid-Fire Questions", "High-Value Senior Comparisons",
        "Senior/Lead Production Scenarios", "Behavioral and Situational Interviews"
    };

    [Fact]
    public async Task Question_topics_reuse_matrix_topics_so_scope_and_questions_share_a_page()
    {
        using var f = new SqliteFixture();
        await new ImportService(f.Db, new ImportOptions(), NullLogger<ImportService>.Instance).ImportAsync(ParserTests.FindDataDir());

        var bankOnly = await f.Db.Topics.Where(t => t.SourceKey!.StartsWith("bank:topic:")).Select(t => t.Name).ToListAsync();
        Assert.All(bankOnly, n => Assert.Contains(n, UnscopedBankTopics));
    }

    [Fact]
    public async Task Reimport_removes_empty_importer_topics_but_keeps_admin_edited_ones()
    {
        using var f = new SqliteFixture();
        var importer = new ImportService(f.Db, new ImportOptions(), NullLogger<ImportService>.Instance);
        await importer.ImportAsync(ParserTests.FindDataDir());

        var section = await f.Db.Sections.FirstAsync();
        f.Db.Topics.Add(new InterviewForge.Domain.Topic { SectionId = section.Id, Name = "Stale", Slug = "stale", SourceKey = "bank:topic:stale" });
        f.Db.Topics.Add(new InterviewForge.Domain.Topic { SectionId = section.Id, Name = "Edited", Slug = "edited", SourceKey = "bank:topic:edited", IsAdminEdited = true });
        await f.Db.SaveChangesAsync();

        await importer.ImportAsync(ParserTests.FindDataDir());
        Assert.False(await f.Db.Topics.AnyAsync(t => t.SourceKey == "bank:topic:stale"));
        Assert.True(await f.Db.Topics.AnyAsync(t => t.SourceKey == "bank:topic:edited"));
    }

    [Fact]
    public async Task Scoped_topics_have_questions_unless_listed()
    {
        using var f = new SqliteFixture();
        await new ImportService(f.Db, new ImportOptions(), NullLogger<ImportService>.Instance).ImportAsync(ParserTests.FindDataDir());
        var empty = await f.Db.Topics.Where(t => t.Scope != null && !t.Questions.Any()).Select(t => t.Section.Name + " / " + t.Name).ToListAsync();
        // Known gaps tracked in the coverage plan (Part 2 adds questions); this list must only shrink.
        Assert.True(empty.Count <= 0, $"{empty.Count} scoped topics without questions:\n" + string.Join("\n", empty));
    }
}
