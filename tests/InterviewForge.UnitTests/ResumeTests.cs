using System.Text;
using InterviewForge.Application;
using InterviewForge.Application.Admin;
using InterviewForge.Application.Import;
using InterviewForge.Application.Resumes;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace InterviewForge.UnitTests;

public class ResumeTests
{
    private const string Tex = """
        \documentclass{article}
        % \section{Hidden} this comment must disappear
        \usepackage{hyperref}
        \begin{document}
        \section*{Summary}
        Senior engineer building ASP.NET Core services on Azure with Kubernetes (k8s) and C\# 12.
        \section*{Technical Skills}
        \begin{itemize}
          \item \textbf{Languages}: C\#, TypeScript, Zigzag
          \item \textbf{Cloud}: Azure, Docker
        \end{itemize}
        \section*{Experience}
        \resumeSubheading{Contoso}{2019 -- Present}
        Led a team of 5, improved communication.
        \end{document}
        """;

    private sealed class NoPdf : IPdfTextExtractor { public string Extract(byte[] pdf, int maxPages) => throw new InvalidOperationException(); }
    private sealed class AdminUser : ICurrentUser
    {
        public string UserId => "admin-1"; public string DisplayName => "Admin"; public bool IsAdmin => true; public string TimeZone => "UTC";
    }

    [Fact]
    public void Latex_is_reduced_to_plain_text()
    {
        var text = LatexText.ToPlainText(Tex);
        Assert.DoesNotContain("Hidden", text);
        Assert.DoesNotContain("\\", text);
        Assert.DoesNotContain("documentclass", text);
        Assert.Contains("C#", text);
        Assert.Contains("Technical Skills", text);
        Assert.Contains("Languages: C#, TypeScript, Zigzag", text);
        Assert.Contains("Contoso\n2019 - Present", text);
    }

    [Fact]
    public void Detects_catalog_aliases_and_prefers_longest_match()
    {
        var skills = ResumeAnalyzer.Detect("Built APIs with ASP.NET Core, deployed to k8s. Also .NET and node.js. I react quickly.");
        var keys = skills.Select(s => s.Key).ToList();
        Assert.Contains("aspdotnet-core", keys);
        Assert.DoesNotContain(SkillCatalog.KeyOf("ASP.NET"), keys);
        Assert.Contains("kubernetes", keys);
        Assert.Contains("dotnet", keys);
        Assert.Contains("node-js", keys);
        Assert.Equal(1, skills.Single(s => s.Key == "dotnet").Mentions);
    }

    [Fact]
    public void Case_sensitive_skills_only_match_exact_casing()
    {
        Assert.DoesNotContain(ResumeAnalyzer.Detect("We go to market quickly"), s => s.Key == "go");
        Assert.Contains(ResumeAnalyzer.Detect("Services written in Go and Rust"), s => s.Key == "go");
    }

    [Fact]
    public void Unknown_terms_are_taken_only_from_skills_sections()
    {
        var skills = ResumeAnalyzer.Detect(LatexText.ToPlainText(Tex));
        var unknown = skills.Where(s => !s.InCatalog).Select(s => s.Name).ToList();
        Assert.Equal(new[] { "Zigzag" }, unknown);
        Assert.False(ResumeAnalyzer.LooksLikeSkill("problem solving"));
        Assert.False(ResumeAnalyzer.LooksLikeSkill("Jan 2020"));
        Assert.False(ResumeAnalyzer.LooksLikeSkill("Leadership"));
        Assert.True(ResumeAnalyzer.LooksLikeSkill("Zigzag"));
    }

    private static async Task<SqliteFixture> SeededAsync()
    {
        var f = new SqliteFixture();
        await new ImportService(f.Db, new ImportOptions(), NullLogger<ImportService>.Instance).ImportAsync(ParserTests.FindDataDir());
        f.Db.Accounts.Add(new Account { Id = f.User.UserId, Username = "local", Email = "local@example.test", DisplayName = "Local" });
        await f.Db.SaveChangesAsync();
        return f;
    }

    private static Task<ResumeDetailDto> UploadTexAsync(SqliteFixture f, string tex = Tex) =>
        new ResumeService(f.Db, f.User, f.Clock, new NoPdf()).UploadAsync("my resume.tex", new MemoryStream(Encoding.UTF8.GetBytes(tex)), tex.Length, default);

    [Fact]
    public async Task Upload_builds_questions_and_records_missing_topics()
    {
        using var f = await SeededAsync();
        var resume = await UploadTexAsync(f);

        Assert.Equal("my resume", resume.Title);
        var csharp = resume.Skills.Single(s => s.Key == "csharp");
        Assert.True(csharp.InKnowledgeBase);
        Assert.NotEmpty(csharp.Questions);
        Assert.True(resume.TotalQuestions > 0);
        Assert.False(resume.Skills.Single(s => s.Name == "Zigzag").InKnowledgeBase);
        Assert.Empty(await f.Db.Plans.ToListAsync());

        var req = await f.Db.MissingTopicRequests.SingleAsync(r => r.Key == "zigzag");
        Assert.Equal(1, req.RequestCount);
        Assert.Equal(MissingTopicStatus.Open, req.Status);

        await UploadTexAsync(f);
        f.Db.ChangeTracker.Clear();
        Assert.Equal(2, (await f.Db.MissingTopicRequests.SingleAsync(r => r.Key == "zigzag")).RequestCount);
    }

    [Fact]
    public async Task New_knowledge_base_topic_appears_in_existing_resume_and_closes_request()
    {
        using var f = await SeededAsync();
        var uploaded = await UploadTexAsync(f);

        // An administrator adds the missing topic with one question.
        var section = await f.Db.Sections.FirstAsync();
        var topic = new Topic { SectionId = section.Id, Name = "Zigzag", Slug = "zigzag" };
        f.Db.Topics.Add(topic);
        await f.Db.SaveChangesAsync();
        f.Db.Questions.Add(new Question { TopicId = topic.Id, Text = "What is Zigzag?", ContentHash = "zz", SearchText = "zigzag" });
        await f.Db.SaveChangesAsync();

        var refreshed = await new ResumeService(f.Db, f.User, f.Clock, new NoPdf()).GetAsync(uploaded.Id, default);
        var zig = refreshed.Skills.Single(s => s.Name == "Zigzag");
        Assert.True(zig.InKnowledgeBase);
        Assert.Single(zig.Questions);

        var admin = new AdminUser();
        var inbox = new MissingTopicService(f.Db, admin, f.Clock, new AuditService(f.Db, admin, f.Clock));
        var list = await inbox.ListAsync(null, 1, 50, default);
        Assert.Equal(MissingTopicStatus.Added, list.Items.Single(i => i.Key == "zigzag").Status);
        Assert.True(await f.Db.AuditLogs.AnyAsync(a => a.Action == AuditActions.ResumeTopicAutoResolve && a.TargetName == "Zigzag"));
    }

    [Fact]
    public async Task Resumes_are_private_to_their_owner()
    {
        using var f = await SeededAsync();
        var mine = await UploadTexAsync(f);
        var other = new AdminUser();
        var svc = new ResumeService(f.Db, other, f.Clock, new NoPdf());
        Assert.Empty(await svc.ListAsync(default));
        await Assert.ThrowsAsync<InterviewForge.Application.Common.NotFoundException>(() => svc.GetAsync(mine.Id, default));
        await Assert.ThrowsAsync<InterviewForge.Application.Common.NotFoundException>(() => svc.DeleteAsync(mine.Id, default));
    }

    [Fact]
    public async Task Rejects_wrong_type_and_fake_pdf()
    {
        using var f = await SeededAsync();
        var svc = new ResumeService(f.Db, f.User, f.Clock, new NoPdf());
        await Assert.ThrowsAsync<InterviewForge.Application.Common.ValidationException>(() => svc.UploadAsync("cv.docx", new MemoryStream([1, 2, 3]), 3, default));
        await Assert.ThrowsAsync<InterviewForge.Application.Common.ValidationException>(() => svc.UploadAsync("cv.pdf", new MemoryStream("hello"u8.ToArray()), 5, default));
    }
    private sealed class CapturingEmail : IEmailSender
    {
        public List<(IReadOnlyList<string> To, string Subject, string Body)> Sent { get; } = new();
        public bool IsConfigured => true;
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken ct) { Sent.Add((recipients, subject, body)); return Task.CompletedTask; }
    }

    [Fact]
    public async Task Digest_emails_admins_once_without_resume_content()
    {
        using var f = await SeededAsync();
        f.Db.Accounts.Add(new Account { Id = "admin-1", Username = "boss", Email = "boss@example.test", DisplayName = "Boss" });
        f.Db.AccountRoles.Add(new AccountRole { AccountId = "admin-1", Role = "Admin" });
        await f.Db.SaveChangesAsync();
        await UploadTexAsync(f);

        var email = new CapturingEmail();
        var digest = new MissingTopicDigest(f.Db, email, f.Clock, new EmailOptions { PublicUrl = "https://forge.example.test/" });
        Assert.Equal(1, await digest.SendPendingAsync(default));
        var (to, subject, body) = Assert.Single(email.Sent);
        Assert.Equal(new[] { "boss@example.test" }, to);
        Assert.Contains("Zigzag", body);
        Assert.Contains("https://forge.example.test/admin/missing-topics", body);
        Assert.DoesNotContain("Contoso", body);
        Assert.DoesNotContain("local@example.test", body);

        Assert.Equal(0, await digest.SendPendingAsync(default));
        Assert.Single(email.Sent);
    }
}
