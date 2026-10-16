using InterviewForge.Application;
using InterviewForge.Application.Content;
using InterviewForge.Application.Import;
using InterviewForge.Domain;
using InterviewForge.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace InterviewForge.UnitTests;

/// <summary>Runs against a real in-memory SQLite database (the production provider), not the EF in-memory provider.</summary>
public sealed class SqliteFixture : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    public AppDbContext Db { get; }
    public ICurrentUser User { get; } = new LocalUser();
    public IClock Clock { get; } = new SystemClock();

    public SqliteFixture()
    {
        _conn.Open();
        Db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
        Db.Database.Migrate();
    }

    public ContentService Content() => new(Db, User, new ProgressQueries(Db, User), Clock, NullLogger<ContentService>.Instance);
    public void Dispose() { Db.Dispose(); _conn.Dispose(); }
}

public class SearchAndImportTests
{
    [Fact]
    public async Task Import_is_idempotent()
    {
        using var f = new SqliteFixture();
        var importer = new ImportService(f.Db, new ImportOptions(), NullLogger<ImportService>.Instance);
        var dir = ParserTests.FindDataDir();
        var first = await importer.ImportAsync(dir);
        var countAfterFirst = await f.Db.Questions.CountAsync();
        var topicsAfterFirst = await f.Db.Topics.CountAsync();
        var second = await importer.ImportAsync(dir);

        Assert.Equal(112, first.QuestionsCreated);
        Assert.Equal(0, second.QuestionsCreated);
        Assert.Equal(112, second.QuestionsUnchanged);
        Assert.Equal(0, second.TopicsCreated);
        Assert.Equal(0, second.TopicsUpdated);
        Assert.Equal(countAfterFirst, await f.Db.Questions.CountAsync());
        Assert.Equal(topicsAfterFirst, await f.Db.Topics.CountAsync());
        // EF Core questions were merged into the matrix "EF Core" topic, not a duplicate topic
        Assert.Single(await f.Db.Topics.Where(t => t.Name.Contains("EF Core") || t.Name.Contains("Entity Framework")).ToListAsync());
    }

    [Fact]
    public async Task Search_matches_imported_and_user_content_case_insensitively()
    {
        using var f = new SqliteFixture();
        await new ImportService(f.Db, new ImportOptions(), NullLogger<ImportService>.Instance).ImportAsync(ParserTests.FindDataDir());
        var content = f.Content();
        await content.CreateQuestionAsync(new SaveQuestionRequest(null, "Azure", null, "Azure Functions", "What are Azure Functions?",
            "Serverless compute on RabbitMQ-free triggers.", Difficulty.Beginner, new[] { "Serverless" }, null, null), default);

        var search = new SearchService(f.Db, f.User, content);
        var ef = await search.SearchAsync("ENTITY framework", QuestionFilter.All, 1, 50, default);
        Assert.True(ef.Questions.TotalCount >= 3);

        var mine = await search.SearchAsync("serverless", QuestionFilter.Mine, 1, 50, default);
        Assert.Equal("What are Azure Functions?", Assert.Single(mine.Questions.Items).Text);

        var wildcard = await search.SearchAsync("%", QuestionFilter.All, 1, 50, default);
        Assert.Equal(0, wildcard.Questions.TotalCount);
    }
}
