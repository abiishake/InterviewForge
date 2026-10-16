using InterviewForge.Application.Import;
using InterviewForge.Domain;

namespace InterviewForge.UnitTests;

public class ParserTests
{
    private const string Bank = """
        # TOPIC --- Entity Framework Core

        **topic_id:** `ef-core`\
        **priority:** `Core`\
        **category:** `Interview`

        ## ef-core-001 --- Explain change tracking and AsNoTracking.

        **question_id:** `ef-core-001`\
        **topic_id:** `ef-core`\
        **difficulty:** `Senior / Lead`\
        **question_type:** `Conceptual`

        **Question**

        Explain change tracking and AsNoTracking.

        **Answer**

        The DbContext tracks entities.
        See https://learn.microsoft.com/ef/core/

        **Keywords:**
        `change, tracking`

        **Follow-ups:**

        -   Ask for a real production example.
        -   Ask about trade-offs.
        """;

    private const string Matrix = """
        # 1. Purpose
        Narrative only.

        # 9. Databases & Data

        ## 9.1 Resume technologies

        -   **Microsoft SQL Server**
        -   **Redis**

        ## 9.2 10-year target

        ### SQL Server --- expert

        -   Indexes
        -   Deadlocks

        ### EF Core

        -   Change tracking
        -   N+1 queries

        # 3. Languages

        ## 3.2 10-year .NET developer should know

        ### Core

        -   C#

        ### Useful

        -   Python
        """;

    [Fact]
    public void QuestionBank_parses_topic_question_answer_keywords_and_followups()
    {
        var topics = QuestionBankParser.Parse(Bank);
        var t = Assert.Single(topics);
        Assert.Equal("ef-core", t.TopicId);
        Assert.Equal("Entity Framework Core", t.Title);
        Assert.Equal(Priority.Core, t.Priority);
        var q = Assert.Single(t.Questions);
        Assert.Equal("ef-core-001", q.QuestionId);
        Assert.Equal("Explain change tracking and AsNoTracking.", q.Question);
        Assert.Contains("https://learn.microsoft.com/ef/core/", q.Answer);
        Assert.Equal(new[] { "change", "tracking" }, q.Keywords);
        Assert.Equal(2, q.FollowUps.Count);
        Assert.Equal(Difficulty.Expert, MarkdownHelpers.ParseDifficulty(q.DifficultyLabel));
    }

    [Fact]
    public void SkillMatrix_keeps_only_target_sections_and_folds_generic_headings()
    {
        var sections = SkillMatrixParser.Parse(Matrix);
        Assert.Equal(new[] { "Databases & Data", "Languages" }, sections.Select(s => s.Title));

        var db = sections[0];
        Assert.Equal(new[] { "SQL Server", "EF Core" }, db.Topics.Select(t => t.Name));
        Assert.Equal(Priority.Core, db.Topics[0].Priority);
        Assert.Contains("Microsoft SQL Server", db.Description);

        var lang = sections[1];
        var essentials = Assert.Single(lang.Topics);
        Assert.True(essentials.IsEssentials);
        Assert.Equal("Languages Essentials", essentials.Name);
        Assert.Equal(new[] { "C#", "Python" }, essentials.ScopeItems);
        Assert.Equal(Priority.Core, essentials.Priority);
    }

    [Fact]
    public void Classifier_maps_bank_topic_onto_existing_matrix_topic_without_duplicating()
    {
        var sections = SkillMatrixParser.Parse(Matrix);
        var bank = QuestionBankParser.Parse(Bank)[0];
        var c = TopicClassifier.Classify(bank, sections);
        Assert.Equal("databases-and-data", c.SectionSlug);
        Assert.Equal("ef-core", c.MatrixTopicSlug); // "Entity Framework Core" == "EF Core"
    }

    [Fact]
    public void Classifier_override_wins()
    {
        var sections = SkillMatrixParser.Parse(Matrix);
        var bank = QuestionBankParser.Parse(Bank)[0];
        var c = TopicClassifier.Classify(bank, sections, new Dictionary<string, string> { ["ef-core"] = "languages" });
        Assert.Equal("languages", c.SectionSlug);
        Assert.Null(c.MatrixTopicSlug);
    }

    [Fact]
    public void Classifier_sends_unmatched_topics_to_interview_scenarios()
    {
        var sections = SkillMatrixParser.Parse(Matrix);
        var bank = new BankTopic("rapid", "Rapid-Fire Questions", Priority.Core, null, Array.Empty<BankQuestion>());
        Assert.Equal(TopicClassifier.ScenarioSectionSlug, TopicClassifier.Classify(bank, sections).SectionSlug);
    }

    [Fact]
    public void Algorithm_parser_reads_all_parts_and_keeps_code_fences()
    {
        var md = """
            # Category: Arrays
            ## Two Sum
            ### Problem Statement
            Find two numbers.
            ### Time Complexity
            O(n)
            ### C# Implementation
            ```csharp
            // ### not a heading inside code
            var x = 1;
            ```
            ### Common Mistakes
            - Off by one
            """;
        var a = Assert.Single(AlgorithmMarkdownParser.Parse(md));
        Assert.Equal("Arrays", a.Category);
        Assert.Equal("O(n)", a.TimeComplexity);
        Assert.Contains("// ### not a heading inside code", a.Implementation);
        Assert.Equal("- Off by one", a.CommonMistakes);
    }

    [Fact]
    public void Real_seed_files_parse_completely()
    {
        var dir = FindDataDir();
        var bank = QuestionBankParser.Parse(File.ReadAllText(Path.Combine(dir, "dotnet_10_year_interview_question_bank.md")));
        var matrix = SkillMatrixParser.Parse(File.ReadAllText(Path.Combine(dir, "dotnet_10_year_technology_skill_matrix.md")));
        Assert.Equal(112, bank.Sum(t => t.Questions.Count));
        Assert.All(bank.SelectMany(t => t.Questions), q => Assert.False(string.IsNullOrWhiteSpace(q.Answer)));
        Assert.True(matrix.Count >= 15);
        Assert.True(AlgorithmMarkdownParser.Parse(File.ReadAllText(Path.Combine(dir, "algorithms_csharp.md"))).Count >= 40);
    }

    internal static string FindDataDir()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d is not null && !Directory.Exists(Path.Combine(d.FullName, "data"))) d = d.Parent;
        return Path.Combine(d!.FullName, "data");
    }
}
