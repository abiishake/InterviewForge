using InterviewForge.Application.Import;

namespace InterviewForge.UnitTests;

/// <summary>B11: '#' comments and field-looking lines inside code fences must not change document structure.</summary>
public class FenceParserTests
{
    private const string Bank = """
        # TOPIC --- Shell scripting

        **topic_id:** `shell`\
        **priority:** `Core`\
        **category:** `Interview`

        ## shell-001 --- How do you comment a script?

        **question_id:** `shell-001`\
        **topic_id:** `shell`\
        **difficulty:** `Mid`\
        **question_type:** `Conceptual`

        **Question**

        How do you comment a script?

        **Answer**

        Use a hash:

        ```bash
        # TOPIC --- not a topic
        ## shell-999 --- not a question
        **Answer**
        echo hello
        ```

        Done.

        ## shell-002 --- Second question stays attached.

        **question_id:** `shell-002`\
        **topic_id:** `shell`\
        **difficulty:** `Mid`\
        **question_type:** `Conceptual`

        **Question**

        Second question stays attached.

        **Answer**

        Yes.
        """;

    [Fact]
    public void Hash_lines_inside_fences_do_not_split_topics_or_questions()
    {
        var topics = QuestionBankParser.Parse(Bank);
        var topic = Assert.Single(topics);
        Assert.Equal(2, topic.Questions.Count);
        var first = topic.Questions[0];
        Assert.Contains("echo hello", first.Answer);
        Assert.Contains("# TOPIC --- not a topic", first.Answer);
        Assert.Contains("Done.", first.Answer);
    }

    [Fact]
    public void Matrix_headings_inside_fences_are_ignored()
    {
        const string matrix = """
            # 9. Databases & Data

            ## 9.2 10-year target

            ### EF Core

            -   Change tracking

            ```sql
            # 10. Fake section
            ### Fake topic
            -   fake bullet
            ```

            -   Migrations
            """;
        var sections = SkillMatrixParser.Parse(matrix);
        var section = Assert.Single(sections);
        Assert.DoesNotContain(section.Topics, t => t.Name.Contains("Fake"));
    }
}

public class ExamplesParserTests
{
    [Fact]
    public void Examples_are_keyed_by_question_id_and_ignore_headings_inside_fences()
    {
        var md = """
            # Examples

            ## csharp-001 --- optional title
            Claims platform context.

            ```csharp
            // ## not-a-new-entry
            public readonly record struct Money(decimal Amount, string Currency);
            ```

            ## csharp-002
            ```csharp
            var q = db.Claims.AsNoTracking();
            ```
            """;
        var map = InterviewForge.Application.Import.ExamplesParser.Parse(md);
        Assert.Equal(2, map.Count);
        Assert.Contains("record struct Money", map["csharp-001"]);
        Assert.Contains("// ## not-a-new-entry", map["csharp-001"]);
        Assert.DoesNotContain("not-a-new-entry", map["csharp-002"]);
    }
}

public class SplitContentTests
{
    [Fact]
    public void Split_question_bank_files_parse_and_have_unique_ids_with_code_examples()
    {
        var dir = Path.Combine(ParserTests.FindDataDir(), "question-bank");
        var files = Directory.GetFiles(dir, "*.md", SearchOption.AllDirectories);
        Assert.NotEmpty(files);
        var questions = files
            .SelectMany(f => InterviewForge.Application.Import.QuestionBankParser.Parse(File.ReadAllText(f)))
            .SelectMany(t => t.Questions).ToList();
        Assert.Equal(questions.Count, questions.Select(q => q.QuestionId).Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.All(questions, q => Assert.Contains("```", q.Answer));
    }

    private static (IReadOnlyList<MatrixSection> Matrix, Dictionary<string, string> Overrides) LoadMatrixAndOverrides()
    {
        var data = ParserTests.FindDataDir();
        var matrix = SkillMatrixParser.Parse(File.ReadAllText(Path.Combine(data, "dotnet_10_year_technology_skill_matrix.md")));
        var raw = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(
            File.ReadAllText(Path.Combine(data, "classification-overrides.json")))!;
        return (matrix, raw.Where(kv => !kv.Key.StartsWith('_')).ToDictionary(kv => kv.Key, kv => kv.Value.GetString()!));
    }

    [Fact]
    public void New_bank_topics_map_to_existing_matrix_sections_and_topics()
    {
        var (matrix, overrides) = LoadMatrixAndOverrides();
        foreach (var slug in new[] { "javascript", "typescript", "angular", "react" })
            Assert.Contains(matrix, s => s.Slug == slug);

        var data = ParserTests.FindDataDir();
        var topics = Directory.GetFiles(Path.Combine(data, "question-bank"), "*.md", SearchOption.AllDirectories)
            .SelectMany(f => QuestionBankParser.Parse(File.ReadAllText(f))).ToList();
        Assert.True(topics.Count >= 20);
        foreach (var t in topics)
        {
            var c = TopicClassifier.Classify(t, matrix, overrides);
            var section = matrix.SingleOrDefault(s => s.Slug == c.SectionSlug);
            Assert.True(section is not null, $"{t.TopicId}: unknown section '{c.SectionSlug}'");
            Assert.True(c.MatrixTopicSlug is not null && section!.Topics.Any(m => m.Slug == c.MatrixTopicSlug),
                $"{t.TopicId}: matrix topic '{c.MatrixTopicSlug}' not found in section '{c.SectionSlug}'");
        }
    }

    [Fact]
    public void Adding_the_frontend_sections_does_not_pull_legacy_bank_topics_into_them()
    {
        var (matrix, overrides) = LoadMatrixAndOverrides();
        var legacy = QuestionBankParser.Parse(File.ReadAllText(Path.Combine(ParserTests.FindDataDir(), "dotnet_10_year_interview_question_bank.md")));
        var newSlugs = new HashSet<string> { "javascript", "typescript", "angular", "react" };
        foreach (var t in legacy)
            Assert.DoesNotContain(TopicClassifier.Classify(t, matrix, overrides).SectionSlug, newSlugs);
    }

    [Fact]
    public void Every_example_matches_an_existing_question()
    {
        var data = ParserTests.FindDataDir();
        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var f in new[] { Path.Combine(data, "dotnet_10_year_interview_question_bank.md") }.Concat(Directory.GetFiles(Path.Combine(data, "question-bank"), "*.md", SearchOption.AllDirectories)))
            foreach (var t in InterviewForge.Application.Import.QuestionBankParser.Parse(File.ReadAllText(f)))
                foreach (var q in t.Questions) ids.Add(q.QuestionId);
        foreach (var f in Directory.GetFiles(Path.Combine(data, "examples"), "*.md", SearchOption.AllDirectories))
            foreach (var id in InterviewForge.Application.Import.ExamplesParser.Parse(File.ReadAllText(f)).Keys)
                Assert.True(ids.Contains(id), $"example '{id}' in {Path.GetFileName(f)} has no matching question");
    }
}
