using System.Text.RegularExpressions;
using InterviewForge.Application.Common;

namespace InterviewForge.Application.Import;

/// <summary>
/// Parses data/algorithms_csharp.md:
/// <code>
/// # Category: Arrays
/// ## Two Sum
/// ### Problem Statement
/// ### Explanation
/// ### Approach
/// ### Time Complexity
/// ### Space Complexity
/// ### C# Implementation
/// ### Example
/// ### Common Interview Questions
/// ### Common Mistakes
/// </code>
/// </summary>
public static partial class AlgorithmMarkdownParser
{
    [GeneratedRegex(@"^#\s+Category:\s*(.+)$", RegexOptions.IgnoreCase)] private static partial Regex CategoryHeading();
    [GeneratedRegex(@"^##\s+(.+)$")] private static partial Regex NameHeading();
    [GeneratedRegex(@"^###\s+(.+)$")] private static partial Regex PartHeading();

    public static IReadOnlyList<AlgorithmRecord> Parse(string markdown)
    {
        var list = new List<AlgorithmRecord>();
        string category = "General";
        string? name = null;
        string? part = null;
        var parts = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        bool inFence = false;

        void Flush()
        {
            if (name is null) return;
            string P(string key) => parts.TryGetValue(key, out var l) ? MarkdownHelpers.CleanBlock(l) : "";
            list.Add(new AlgorithmRecord(category, name, Text.Slugify(category + "-" + name),
                P("problem statement"), P("explanation"), P("approach"), P("time complexity"), P("space complexity"),
                P("c# implementation"), P("example"), P("common interview questions"), P("common mistakes")));
            name = null; part = null; parts = new(StringComparer.OrdinalIgnoreCase);
        }

        foreach (var raw in markdown.Replace("\r\n", "\n").Split('\n'))
        {
            var line = raw.TrimEnd();
            if (line.TrimStart().StartsWith("```")) inFence = !inFence;
            if (!inFence)
            {
                var c = CategoryHeading().Match(line);
                if (c.Success) { Flush(); category = c.Groups[1].Value.Trim(); continue; }
                var n = NameHeading().Match(line);
                if (n.Success && line.StartsWith("## ")) { Flush(); name = n.Groups[1].Value.Trim(); continue; }
                var p = PartHeading().Match(line);
                if (p.Success && name is not null) { part = p.Groups[1].Value.Trim(); parts[part] = new(); continue; }
            }
            if (name is not null && part is not null) parts[part].Add(raw.TrimEnd());
        }
        Flush();
        return list;
    }
}
