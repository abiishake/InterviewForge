using System.Text.RegularExpressions;
using InterviewForge.Domain;

namespace InterviewForge.Application.Import;

/// <summary>
/// Parses the interview question bank. Expected format (see docs/IMPORT_FORMAT.md):
/// <code>
/// # TOPIC --- Topic Title
/// **topic_id:** `csharp`
/// **priority:** `Core`
///
/// ## csharp-001 --- Short title
/// **question_id:** `csharp-001`
/// **difficulty:** `Senior`
/// **Question**
/// ...markdown...
/// **Answer**
/// ...markdown...
/// **Keywords:** `a, b`
/// **Follow-ups:**
/// - ...
/// </code>
/// The parser is tolerant: missing ids fall back to slugs, unknown fields are ignored.
/// </summary>
public static partial class QuestionBankParser
{
    [GeneratedRegex(@"^#\s+TOPIC\s*(?:---|--|—|–|:)\s*(.+)$", RegexOptions.IgnoreCase)] private static partial Regex TopicHeading();
    [GeneratedRegex(@"^##\s+(.+)$")] private static partial Regex QuestionHeading();
    [GeneratedRegex(@"^#\s+")] private static partial Regex AnyH1();

    private enum Block { None, Question, Answer, FollowUps }

    public static IReadOnlyList<BankTopic> Parse(string markdown)
    {
        var result = new List<BankTopic>();
        var lines = markdown.Replace("\r\n", "\n").Split('\n');

        string? topicTitle = null; string? topicId = null; string? topicPriority = null; string? category = null;
        var questions = new List<BankQuestion>();

        // question state
        string? qHeading = null; var fields = new Dictionary<string, string>();
        var qLines = new List<string>(); var aLines = new List<string>(); var fLines = new List<string>();
        var keywords = new List<string>();
        var block = Block.None;
        var pendingKeywords = false;

        void FlushQuestion()
        {
            if (qHeading is null) return;
            var parts = MarkdownHelpers.DashSeparator().Split(qHeading, 2);
            var headingId = parts.Length == 2 ? parts[0].Trim() : null;
            var title = parts.Length == 2 ? parts[1].Trim() : qHeading.Trim();
            var qText = MarkdownHelpers.CleanBlock(qLines);
            if (string.IsNullOrWhiteSpace(qText)) qText = title;
            var id = fields.GetValueOrDefault("question_id") ?? headingId ?? Common.Text.Slugify(title);
            questions.Add(new BankQuestion(
                id,
                fields.GetValueOrDefault("topic_id") ?? topicId ?? "",
                title,
                qText,
                MarkdownHelpers.CleanBlock(aLines),
                fields.GetValueOrDefault("difficulty"),
                fields.GetValueOrDefault("question_type"),
                keywords.ToList(),
                fLines.Select(l => MarkdownHelpers.Bullet().Match(l)).Where(m => m.Success)
                      .Select(m => MarkdownHelpers.StripInline(m.Groups[1].Value)).Where(s => s.Length > 0).ToList()));
            qHeading = null; fields = new(); qLines = new(); aLines = new(); fLines = new(); keywords = new(); block = Block.None; pendingKeywords = false;
        }

        void FlushTopic()
        {
            FlushQuestion();
            if (topicTitle is null) return;
            var title = MarkdownHelpers.CleanTitle(topicTitle);
            var id = topicId ?? Common.Text.Slugify(title);
            var qs = questions.Select(q => string.IsNullOrEmpty(q.TopicId) ? q with { TopicId = id } : q).ToList();
            result.Add(new BankTopic(id, title, MarkdownHelpers.ParsePriority(topicPriority), category, qs));
            topicTitle = topicId = topicPriority = category = null; questions = new();
        }

        foreach (var raw in lines)
        {
            var line = raw.TrimEnd();
            var tm = TopicHeading().Match(line);
            if (tm.Success) { FlushTopic(); topicTitle = tm.Groups[1].Value; continue; }
            if (AnyH1().IsMatch(line)) { FlushTopic(); continue; } // non-topic H1 ends current topic

            if (topicTitle is null) continue;

            var qm = QuestionHeading().Match(line);
            if (qm.Success && line.StartsWith("## "))
            {
                FlushQuestion();
                qHeading = qm.Groups[1].Value.Trim();
                continue;
            }

            var trimmedLine = line.Trim();
            if (pendingKeywords && trimmedLine.Length > 0)
            {
                pendingKeywords = false;
                if (trimmedLine.StartsWith('`'))
                {
                    keywords = trimmedLine.Trim('`', '\\', ' ').Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                    continue;
                }
            }
            if (qHeading is not null && Regex.IsMatch(trimmedLine, @"^\*\*Follow-?ups:?\*\*:?$", RegexOptions.IgnoreCase)) { block = Block.FollowUps; continue; }

            if (MarkdownHelpers.TryReadField(line, out var key, out var value))
            {
                if (qHeading is null)
                {
                    if (key == "topic_id") topicId = value;
                    else if (key == "priority") topicPriority = value;
                    else if (key == "category") category = value;
                    continue;
                }
                if (key == "keywords")
                {
                    keywords = value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                    pendingKeywords = keywords.Count == 0;
                    block = Block.None;
                    continue;
                }
                if (block is Block.None) { fields[key] = value; continue; }
            }

            if (qHeading is null) continue;
            var trimmed = line.Trim();
            if (Regex.IsMatch(trimmed, @"^\*\*Question\*\*:?$", RegexOptions.IgnoreCase)) { block = Block.Question; continue; }
            if (Regex.IsMatch(trimmed, @"^\*\*Answer\*\*:?$", RegexOptions.IgnoreCase)) { block = Block.Answer; continue; }
            if (Regex.IsMatch(trimmed, @"^\*\*Follow-?ups:?\*\*:?$", RegexOptions.IgnoreCase)) { block = Block.FollowUps; continue; }
            if (Regex.IsMatch(trimmed, @"^\*\*Keywords:?\*\*", RegexOptions.IgnoreCase)) { block = Block.None; continue; }

            switch (block)
            {
                case Block.Question: qLines.Add(line); break;
                case Block.Answer: aLines.Add(line); break;
                case Block.FollowUps: fLines.Add(line); break;
            }
        }
        FlushTopic();
        return result;
    }
}
