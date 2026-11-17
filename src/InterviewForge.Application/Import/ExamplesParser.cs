namespace InterviewForge.Application.Import;

/// <summary>
/// Parses an "examples overlay" file: real-world code examples keyed by question id, kept apart from the
/// question text so a question bank can be enriched without rewriting it.
/// <code>
/// ## csharp-001
/// Optional one-line context, then a fenced code block…
/// </code>
/// Headings inside fenced code blocks are ignored. The body of each entry is Markdown and is appended to the
/// matching question's answer by <see cref="ImportService"/>.
/// </summary>
public static class ExamplesParser
{
    public static IReadOnlyDictionary<string, string> Parse(string markdown)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string? id = null;
        var body = new List<string>();
        var inFence = false;

        void Flush()
        {
            if (id is null) return;
            var text = MarkdownHelpers.CleanBlock(body);
            if (text.Length > 0) result[id] = text; // last definition wins
            id = null; body = new();
        }

        foreach (var raw in markdown.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.TrimEnd();
            if (MarkdownHelpers.IsFence(line)) inFence = !inFence;
            if (!inFence && line.StartsWith("## ", StringComparison.Ordinal))
            {
                Flush();
                var heading = line[3..].Trim();
                var parts = MarkdownHelpers.DashSeparator().Split(heading, 2);
                id = parts[0].Trim();
                continue;
            }
            if (!inFence && line.StartsWith("# ", StringComparison.Ordinal)) { Flush(); continue; } // file title
            if (id is not null) body.Add(line);
        }
        Flush();
        return result;
    }
}
