using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace InterviewForge.IntegrationTests;

public class BackendFixTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private HttpClient NewClient()
    {
        var c = factory.CreateClient();
        c.DefaultRequestHeaders.Add("X-InterviewForge", "1");
        return c;
    }

    private async Task<HttpClient> Member(string name = "Member")
    {
        var c = NewClient();
        (await c.PostAsJsonAsync("/api/auth/register", new { username = "u" + Guid.NewGuid().ToString("N")[..20], name, email = Guid.NewGuid() + "@example.test", password = "Test-only-member-pass-123" })).EnsureSuccessStatusCode();
        return c;
    }

    private async Task<HttpClient> Admin()
    {
        var c = NewClient();
        (await c.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "Test-only-admin-pass-123" })).EnsureSuccessStatusCode();
        return c;
    }

    private static async Task<JsonElement> Body(HttpResponseMessage r)
    {
        var text = await r.Content.ReadAsStringAsync();
        Assert.True(r.IsSuccessStatusCode, $"{(int)r.StatusCode}: {text}");
        return JsonDocument.Parse(text).RootElement.Clone();
    }

    private static object Q(string text) => new { topicId = 1, text, answer = "Answer", difficulty = "Intermediate", tags = Array.Empty<string>() };

    [Fact]
    public async Task Member_cannot_delete_content_other_members_studied_but_admin_can_and_it_is_audited()
    {
        using var author = await Member("Author");
        using var reader = await Member("Reader");
        using var admin = await Admin();
        var id = (await Body(await author.PostAsJsonAsync("/api/questions", Q("Shared question in use?")))).GetProperty("id").GetInt32();
        (await reader.PostAsJsonAsync($"/api/questions/{id}/progress", new { status = "Completed" })).EnsureSuccessStatusCode();
        await reader.PutAsJsonAsync($"/api/questions/{id}/note", new { body = "mine" });

        var impact = await Body(await author.GetAsync($"/api/questions/{id}/impact"));
        Assert.Equal(1, impact.GetProperty("usersWithProgress").GetInt32());
        Assert.Equal(1, impact.GetProperty("usersWithNotes").GetInt32());

        var blocked = await author.DeleteAsync($"/api/questions/{id}");
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        Assert.Equal("CONTENT_IN_USE", (await blocked.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetProperty("code").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/questions/{id}")).StatusCode);
        var audit = await admin.GetStringAsync("/api/admin/audit?action=content.force_delete");
        Assert.Contains("content.force_delete", audit);
    }

    [Fact]
    public async Task Member_can_delete_own_question_nobody_else_studied()
    {
        using var author = await Member("Solo");
        var id = (await Body(await author.PostAsJsonAsync("/api/questions", Q("Solo question, unused?")))).GetProperty("id").GetInt32();
        await author.PostAsJsonAsync($"/api/questions/{id}/progress", new { status = "Completed" });
        Assert.Equal(HttpStatusCode.NoContent, (await author.DeleteAsync($"/api/questions/{id}")).StatusCode);
    }

    [Fact]
    public async Task Feedback_links_to_algorithm_slug_and_is_marked_when_content_is_deleted()
    {
        using var author = await Member("Author");
        using var admin = await Admin();
        var algo = await Body(await author.PostAsJsonAsync("/api/algorithms", new
        {
            category = "Tests", name = "Feedback algo " + Guid.NewGuid().ToString("N")[..6], problemStatement = "P", explanation = "E", approach = "A",
            timeComplexity = "O(n)", spaceComplexity = "O(1)", implementation = "c", example = "e", interviewQuestions = "q", commonMistakes = "m"
        }));
        var slug = algo.GetProperty("slug").GetString();
        var algoId = algo.GetProperty("id").GetInt32();
        var fb = await Body(await author.PostAsJsonAsync("/api/feedback", new { kind = "Algorithm", contentId = algoId, message = "Check this" }));
        Assert.Equal($"/algorithms/{slug}", fb.GetProperty("contentUrl").GetString());
        Assert.True(fb.GetProperty("contentExists").GetBoolean());

        (await admin.DeleteAsync($"/api/algorithms/{slug}")).EnsureSuccessStatusCode();
        var all = await Body(await admin.GetAsync("/api/feedback/all?status=ContentDeleted&pageSize=100"));
        var row = all.GetProperty("items").EnumerateArray().First(x => x.GetProperty("id").GetInt32() == fb.GetProperty("id").GetInt32());
        Assert.False(row.GetProperty("contentExists").GetBoolean());
        Assert.Equal("ContentDeleted", row.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Favourite_only_update_keeps_question_not_started()
    {
        using var m = await Member();
        var state = await Body(await m.PostAsJsonAsync("/api/questions/2/progress", new { isFavorite = true }));
        Assert.Equal("NotStarted", state.GetProperty("status").GetString());
        Assert.True(state.GetProperty("isFavorite").GetBoolean());
    }

    [Fact]
    public async Task Uncompleting_clears_completion_side_effects()
    {
        using var m = await Member();
        var done = await Body(await m.PostAsJsonAsync("/api/questions/3/progress", new { status = "Completed" }));
        Assert.NotEqual(JsonValueKind.Null, done.GetProperty("nextReviewAt").ValueKind);
        var back = await Body(await m.PostAsJsonAsync("/api/questions/3/progress", new { status = "InProgress" }));
        Assert.Equal(JsonValueKind.Null, back.GetProperty("nextReviewAt").ValueKind);
    }

    [Fact]
    public async Task Moving_a_plan_item_far_ahead_is_rejected()
    {
        using var m = await Member();
        var plan = await Body(await m.PostAsJsonAsync("/api/plans", new { name = "Move test", durationDays = 5, questionsPerDay = 3, studyMinutesPerDay = 60 }));
        var pid = plan.GetProperty("id").GetInt32();
        var day = await Body(await m.GetAsync($"/api/plans/{pid}/days/1"));
        var itemId = day.GetProperty("items")[0].GetProperty("id").GetInt32();
        var res = await m.PostAsJsonAsync($"/api/plans/{pid}/items/{itemId}/move", new { targetDayNumber = 99 });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await m.PostAsJsonAsync($"/api/plans/{pid}/items/{itemId}/move", new { targetDayNumber = 6 })).StatusCode);
    }

    [Fact]
    public async Task Renaming_to_an_existing_section_name_conflicts_and_refreshes_slug()
    {
        using var m = await Member();
        var a = await Body(await m.PostAsJsonAsync("/api/sections", new { name = "Rename A " + Guid.NewGuid().ToString("N")[..6] }));
        var b = await Body(await m.PostAsJsonAsync("/api/sections", new { name = "Rename B " + Guid.NewGuid().ToString("N")[..6] }));
        var clash = await m.PutAsJsonAsync($"/api/sections/{b.GetProperty("id").GetInt32()}", new { name = a.GetProperty("name").GetString()!.ToUpperInvariant() });
        Assert.Equal(HttpStatusCode.Conflict, clash.StatusCode);
        var newName = "Renamed " + Guid.NewGuid().ToString("N")[..6];
        (await m.PutAsJsonAsync($"/api/sections/{b.GetProperty("id").GetInt32()}", new { name = newName })).EnsureSuccessStatusCode();
        var got = await Body(await m.GetAsync($"/api/sections/{b.GetProperty("id").GetInt32()}"));
        Assert.StartsWith("renamed-", got.GetProperty("section").GetProperty("slug").GetString());
    }

    [Fact]
    public async Task Questions_can_be_listed_by_section_randomly_and_limited()
    {
        using var m = await Member();
        var sections = await Body(await m.GetAsync("/api/sections"));
        var sid = sections.EnumerateArray().First(s => s.GetProperty("progress").GetProperty("total").GetInt32() > 0).GetProperty("id").GetInt32();
        var res = await Body(await m.GetAsync($"/api/questions?sectionId={sid}&random=true&limit=5"));
        var items = res.GetProperty("items").EnumerateArray().ToList();
        Assert.InRange(items.Count, 1, 5);
        Assert.All(items, i => Assert.Equal(sid, i.GetProperty("sectionId").GetInt32()));
    }

    [Fact]
    public async Task Import_report_hides_classifications_unless_verbose_and_deleted_seeds_can_be_restored()
    {
        using var admin = await Admin();
        var quiet = await Body(await admin.PostAsync("/api/admin/import", null));
        Assert.Equal(0, quiet.GetProperty("classifications").GetArrayLength());
        var loud = await Body(await admin.PostAsync("/api/admin/import?verbose=true", null));
        Assert.True(loud.GetProperty("classifications").GetArrayLength() > 0);

        var algos = await Body(await admin.GetAsync("/api/algorithms"));
        var slug = algos.EnumerateArray().First(x => x.GetProperty("createdByUserId").ValueKind == JsonValueKind.Null).GetProperty("slug").GetString();
        (await admin.DeleteAsync($"/api/algorithms/{slug}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/algorithms/{slug}")).StatusCode);
        var deleted = await Body(await admin.GetAsync("/api/admin/deleted-seeds"));
        var row = deleted.EnumerateArray().First(d => d.GetProperty("key").GetString() == slug);
        (await admin.PostAsJsonAsync("/api/admin/deleted-seeds/restore", new { kind = row.GetProperty("kind").GetString(), key = slug })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync($"/api/algorithms/{slug}")).StatusCode);
    }
}
