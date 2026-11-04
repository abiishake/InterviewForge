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
