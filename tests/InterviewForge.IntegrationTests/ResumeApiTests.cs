using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace InterviewForge.IntegrationTests;

public class ResumeApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Tex = """
        \documentclass{article}
        \begin{document}
        \section*{Summary}
        Backend engineer: ASP.NET Core, Kubernetes and Redis.
        \section*{Skills}
        Languages: C\#, TypeScript, Quuxlang
        \end{document}
        """;

    private HttpClient Member()
    {
        var c = factory.CreateClient();
        c.DefaultRequestHeaders.Add("X-InterviewForge", "1");
        c.PostAsJsonAsync("/api/auth/register", new { username = "u" + Guid.NewGuid().ToString("N")[..20], name = "Resume user", email = Guid.NewGuid() + "@example.test", password = "Test-only-member-pass-123" })
            .GetAwaiter().GetResult().EnsureSuccessStatusCode();
        return c;
    }

    private async Task<HttpClient> Admin()
    {
        var c = factory.CreateClient();
        c.DefaultRequestHeaders.Add("X-InterviewForge", "1");
        (await c.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "Test-only-admin-pass-123" })).EnsureSuccessStatusCode();
        return c;
    }

    private static Task<HttpResponseMessage> Upload(HttpClient c, byte[] bytes, string name, string type)
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(type);
        form.Add(file, "file", name);
        return c.PostAsync("/api/resumes", form);
    }

    private static byte[] Pdf(params string[] lines)
    {
        var builder = new PdfDocumentBuilder();
        var page = builder.AddPage(595, 842);
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        var y = 800;
        foreach (var l in lines) { page.AddText(l, 11, new UglyToad.PdfPig.Core.PdfPoint(40, y), font); y -= 16; }
        return builder.Build();
    }

    [Fact]
    public async Task Tex_upload_lists_questions_for_owner_only()
    {
        var owner = Member();
        var res = await Upload(owner, Encoding.UTF8.GetBytes(Tex), "cv.tex", "application/x-tex");
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var detail = await res.Content.ReadFromJsonAsync<JsonElement>();
        var id = detail.GetProperty("id").GetInt32();
        Assert.True(detail.GetProperty("totalQuestions").GetInt32() > 0);
        var skills = detail.GetProperty("skills").EnumerateArray().ToList();
        Assert.Contains(skills, s => s.GetProperty("key").GetString() == "kubernetes" && s.GetProperty("inKnowledgeBase").GetBoolean() && s.GetProperty("questions").GetArrayLength() > 0);
        Assert.Contains(skills, s => s.GetProperty("name").GetString() == "Quuxlang" && !s.GetProperty("inKnowledgeBase").GetBoolean());

        var list = await owner.GetFromJsonAsync<JsonElement>("/api/resumes");
        Assert.Equal(1, list.GetArrayLength());

        var stranger = Member();
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/resumes/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/resumes/{id}")).StatusCode);
        Assert.Equal(0, (await stranger.GetFromJsonAsync<JsonElement>("/api/resumes")).GetArrayLength());

        var renamed = await owner.PutAsJsonAsync($"/api/resumes/{id}", new { title = "Backend CV" });
        Assert.Equal("Backend CV", (await renamed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/resumes/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync($"/api/resumes/{id}")).StatusCode);
    }

    [Fact]
    public async Task Pdf_upload_extracts_text()
    {
        var c = Member();
        var res = await Upload(c, Pdf("Jane Doe", "Senior developer with Angular, Docker and SQL Server", "Skills", "C#, Redis, Kafka"), "cv.pdf", "application/pdf");
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var keys = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("skills").EnumerateArray().Select(s => s.GetProperty("key").GetString()).ToList();
        Assert.Contains("angular", keys);
        Assert.Contains("docker", keys);
        Assert.Contains("apache-kafka", keys);
    }

    [Fact]
    public async Task Invalid_files_are_rejected()
    {
        var c = Member();
        Assert.Equal(HttpStatusCode.BadRequest, (await Upload(c, "hello"u8.ToArray(), "cv.docx", "application/octet-stream")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Upload(c, "not really a pdf"u8.ToArray(), "cv.pdf", "application/pdf")).StatusCode);
        var big = new byte[6 * 1024 * 1024]; "%PDF-"u8.CopyTo(big);
        var tooLarge = await Upload(c, big, "cv.pdf", "application/pdf");
        Assert.True(tooLarge.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.RequestEntityTooLarge, tooLarge.StatusCode.ToString());
    }

    [Fact]
    public async Task Missing_topics_reach_admins_without_uploader_details()
    {
        var member = Member();
        (await Upload(member, Encoding.UTF8.GetBytes(Tex.Replace("Quuxlang", "Frobnicate")), "cv.tex", "text/plain")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/admin/missing-topics")).StatusCode);

        var admin = await Admin();
        var count = await admin.GetFromJsonAsync<JsonElement>("/api/admin/missing-topics/count");
        Assert.True(count.GetProperty("open").GetInt32() >= 1);
        var raw = await admin.GetStringAsync("/api/admin/missing-topics?status=Open");
        Assert.DoesNotContain("Resume user", raw);
        Assert.DoesNotContain("Backend engineer", raw);
        var item = JsonDocument.Parse(raw).RootElement.GetProperty("items").EnumerateArray().Single(i => i.GetProperty("key").GetString() == "frobnicate");

        var dismissed = await admin.PostAsync($"/api/admin/missing-topics/{item.GetProperty("id").GetInt32()}/dismiss", null);
        Assert.Equal("Dismissed", (await dismissed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
        var audit = await admin.GetStringAsync("/api/admin/audit?action=resume_topic.dismiss");
        Assert.Contains("Frobnicate", audit);
    }
}
