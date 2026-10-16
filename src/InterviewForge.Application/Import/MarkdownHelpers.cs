using System.Text.RegularExpressions;
using InterviewForge.Domain;

namespace InterviewForge.Application.Import;

internal static partial class MarkdownHelpers
{
    // Pandoc renders an em-dash as "---"; accept ---, --, — and – as title separators.
    [GeneratedRegex(@"\s+(?:---|--|—|–)\s+")] public static partial Regex DashSeparator();
    [GeneratedRegex(@"^\s*(?:[-*+]|\d+\.)\s+(.*)$")] public static partial Regex Bullet();
    [GeneratedRegex(@"\*\*(.+?)\*\*")] private static partial Regex Bold();
    [GeneratedRegex(@"fileciteturn\S*")] private static partial Regex CitationArtifact();

    public static string CleanTitle(string title) =>
        DashSeparator().Replace(title.Trim(), " — ").Trim();

    public static string StripInline(string s) =>
        Bold().Replace(CitationArtifact().Replace(s, ""), "$1").Trim().TrimEnd('\\').Trim();

    /// <summary>Removes pandoc hard-break backslashes and citation artifacts, trims blank edges.</summary>
    public static string CleanBlock(IEnumerable<string> lines)
    {
        var cleaned = lines
            .Select(l => CitationArtifact().Replace(l, "").TrimEnd())
            .Select(l => l.EndsWith('\\') ? l[..^1].TrimEnd() : l)
            .ToList();
        while (cleaned.Count > 0 && string.IsNullOrWhiteSpace(cleaned[0])) cleaned.RemoveAt(0);
        while (cleaned.Count > 0 && string.IsNullOrWhiteSpace(cleaned[^1])) cleaned.RemoveAt(cleaned.Count - 1);
        return string.Join('\n', cleaned);
    }

    public static Priority ParsePriority(string? label, Priority fallback = Priority.Strong)
    {
        if (string.IsNullOrWhiteSpace(label)) return fallback;
        var l = label.ToLowerInvariant();
        if (l.Contains("core") || l.Contains("must") || l.Contains("expert")) return Priority.Core;
        if (l.Contains("legacy") || l.Contains("specialized")) return Priority.Legacy;
        if (l.Contains("useful") || l.Contains("optional")) return Priority.Useful;
        if (l.Contains("strong")) return Priority.Strong;
        return fallback;
    }

    /// <summary>
    /// The bank's difficulty labels are seniority bands, not objective difficulty. We map them to an initial
    /// estimate the user can override.
    /// </summary>
    public static Difficulty ParseDifficulty(string? label)
    {
        if (string.IsNullOrWhiteSpace(label)) return Difficulty.Intermediate;
        var l = label.ToLowerInvariant();
        if (l.Contains("lead") || l.Contains("principal") || l.Contains("expert") || l.Contains("architect")) return Difficulty.Expert;
        if (l.Contains("senior") || l.Contains("advanced") || l.Contains("hard")) return Difficulty.Advanced;
        if (l.Contains("junior") || l.Contains("beginner") || l.Contains("easy")) return Difficulty.Beginner;
        return Difficulty.Intermediate;
    }

    /// <summary>Reads a "**key:** `value`" metadata line.</summary>
    public static bool TryReadField(string line, out string key, out string value)
    {
        var m = Regex.Match(line.Trim(), @"^\*\*([A-Za-z_\- ]+):\*\*\s*`?([^`]*)`?\\?\s*$");
        if (m.Success)
        {
            key = m.Groups[1].Value.Trim().ToLowerInvariant().Replace(' ', '_').Replace('-', '_');
            value = m.Groups[2].Value.Trim();
            return true;
        }
        key = value = "";
        return false;
    }
}
