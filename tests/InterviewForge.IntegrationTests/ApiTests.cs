using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InterviewForge.IntegrationTests;

/// <summary>Boots the real API against a temporary SQLite file with the real seed data.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "if-tests-" + Guid.NewGuid().ToString("N"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Directory.CreateDirectory(_dir);
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", $"Data Source={Path.Combine(_dir, "test.db")};Pooling=False");
        builder.UseSetting("Import:DataDirectory", FindDataDir());
        builder.UseSetting("Import:RunOnStartup", "Always");
        builder.UseSetting("Admin:Email", "admin@example.test");
        builder.UseSetting("Admin:Password", "Test-only-admin-pass-123");
        builder.UseSetting("Auth:KeyDirectory", Path.Combine(_dir,"keys"));
    }

    private static string FindDataDir()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d is not null && !File.Exists(Path.Combine(d.FullName, "data", "dotnet_10_year_interview_question_bank.md"))) d = d.Parent;
        return Path.Combine(d?.FullName ?? throw new InvalidOperationException("Seed data missing"), "data");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try { Directory.Delete(_dir, true); } catch { /* best effort */ }
    }
}

public class ApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    private readonly HttpClient _client = CreateSignedIn(factory);
    private static HttpClient CreateSignedIn(ApiFactory factory) { var client=factory.CreateClient();client.DefaultRequestHeaders.Add("X-InterviewForge","1");var res=client.PostAsJsonAsync("/api/auth/register",new {username="u"+Guid.NewGuid().ToString("N")[..20],name="Test user",email=Guid.NewGuid()+"@example.test",password="Test-only-member-pass-123"}).GetAwaiter().GetResult();res.EnsureSuccessStatusCode();return client; }

    private async Task<JsonElement> Get(string url)
    {
        var res = await _client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return await res.Content.ReadFromJsonAsync<JsonElement>(Json);
    }

    [Fact]
    public async Task Health_is_ok()
    {
        var res = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Sections_topics_and_questions_are_served()
    {
        var sections = await Get("/api/sections");
        Assert.True(sections.GetArrayLength() >= 15);
        var section = sections.EnumerateArray().First(s => s.GetProperty("name").GetString() == "Databases & Data");
        var detail = await Get($"/api/sections/{section.GetProperty("id").GetInt32()}");
        var efTopic = detail.GetProperty("topics").EnumerateArray().First(t => t.GetProperty("name").GetString() == "EF Core");
        var questions = await Get($"/api/topics/{efTopic.GetProperty("id").GetInt32()}/questions");
        Assert.Equal(3, questions.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Unknown_question_returns_consistent_error()
    {
        var res = await _client.GetAsync("/api/questions/999999");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("QUESTION_NOT_FOUND", body.GetProperty("error").GetProperty("code").GetString());
    }

    [Fact]
    public async Task Create_edit_search_and_delete_user_question()
    {
        var create = await _client.PostAsJsonAsync("/api/questions", new
        {
            newSectionName = "Company Specific Questions", newTopicName = "Company A",
            text = "What architecture does Company A use?", answer = "Event driven. [Docs](https://example.com)",
            difficulty = "Intermediate", tags = new[] { "#Company" }, references = new[] { new { title = "Site", url = "https://example.com" } }
        }, Json);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var q = await create.Content.ReadFromJsonAsync<JsonElement>(Json);
        var id = q.GetProperty("id").GetInt32();
        Assert.True(q.GetProperty("isUserCreated").GetBoolean());

        var update = await _client.PutAsJsonAsync($"/api/questions/{id}", new
        {
            topicId = q.GetProperty("topicId").GetInt32(), text = "What architecture does Company A use today?",
            answer = "Modular monolith.", difficulty = "Advanced", tags = new[] { "Company" }
        }, Json);
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var search = await Get("/api/search?q=modular+monolith");
        Assert.Contains(search.GetProperty("questions").GetProperty("items").EnumerateArray(), i => i.GetProperty("id").GetInt32() == id);

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/questions/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/questions/{id}")).StatusCode);
    }

    [Fact]
    public async Task Imported_questions_are_read_only()
    {
        var res = await _client.DeleteAsync("/api/questions/1");
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Invalid_reference_url_is_rejected()
    {
        var res = await _client.PostAsJsonAsync("/api/questions", new
        {
            topicId = 1, text = "Some valid question?", answer = "x", difficulty = "Beginner",
            references = new[] { new { title = "bad", url = "javascript:alert(1)" } }
        }, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Plan_generation_and_progress_updates()
    {
        var create = await _client.PostAsJsonAsync("/api/plans", new { name = "Test plan", durationDays = 5, questionsPerDay = 10, studyMinutesPerDay = 120 }, Json);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var plan = await create.Content.ReadFromJsonAsync<JsonElement>(Json);
        var planId = plan.GetProperty("id").GetInt32();

        var days = await Get($"/api/plans/{planId}/days");
        Assert.Equal(5, days.GetArrayLength());
        Assert.All(days.EnumerateArray(), d => Assert.True(d.GetProperty("total").GetInt32() <= 10));

        var day1 = await Get($"/api/plans/{planId}/days/1");
        var questionId = day1.GetProperty("items")[0].GetProperty("questionId").GetInt32();

        var progress = await _client.PostAsJsonAsync($"/api/questions/{questionId}/progress", new { status = "Completed" }, Json);
        Assert.Equal(HttpStatusCode.OK, progress.StatusCode);

        var after = await Get($"/api/plans/{planId}/days/1");
        Assert.Equal(1, after.GetProperty("day").GetProperty("completed").GetInt32());

        // Regenerating keeps historical progress
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/plans/{planId}/generate?fromDay=1", null)).StatusCode);
        var q = await Get($"/api/questions/{questionId}");
        Assert.Equal("Completed", q.GetProperty("userState").GetProperty("status").GetString());
    }

    [Fact]
    public async Task Plan_validation_errors()
    {
        var res = await _client.PostAsJsonAsync("/api/plans", new { name = "", durationDays = 0, questionsPerDay = 0, studyMinutesPerDay = 60 }, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        var details = body.GetProperty("error").GetProperty("details");
        Assert.True(details.TryGetProperty("durationDays", out _));
    }

    [Fact]
    public async Task Rating_feeds_review_queue()
    {
        await _client.PostAsJsonAsync("/api/questions/2/progress", new { rating = "DidNotKnow" }, Json);
        var review = await Get("/api/review");
        Assert.True(review.GetProperty("needsReview").GetInt32() >= 1);
        var queue = await Get("/api/review/queue?bucket=RecentlyIncorrect");
        Assert.Contains(queue.GetProperty("items").EnumerateArray(), i => i.GetProperty("id").GetInt32() == 2);
    }

    [Fact]
    public async Task Algorithms_and_dashboard()
    {
        var algos = await Get("/api/algorithms");
        Assert.True(algos.GetArrayLength() >= 40);
        var dash = await Get("/api/dashboard");
        Assert.True(dash.GetProperty("overall").GetProperty("total").GetInt32() >= 112);
    }

    [Fact]
    public async Task Reimport_is_idempotent()
    {
        using var admin=factory.CreateClient();admin.DefaultRequestHeaders.Add("X-InterviewForge","1");(await admin.PostAsJsonAsync("/api/auth/login",new{username="admin",password="Test-only-admin-pass-123"})).EnsureSuccessStatusCode();
        var res = await admin.PostAsync("/api/admin/import", null);
        var report = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(0, report.GetProperty("questionsCreated").GetInt32());
    }
}
