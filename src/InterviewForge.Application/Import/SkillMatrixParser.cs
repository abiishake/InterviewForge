using System.Text.RegularExpressions;
using InterviewForge.Application.Common;
using InterviewForge.Domain;

namespace InterviewForge.Application.Import;

/// <summary>
/// Parses the technology skill matrix into sections and topics.
///
/// Rules (see docs/IMPORT_FORMAT.md):
///  * "# N. Title" starts a candidate section.
///  * A candidate becomes a learning section only if it has a "##" heading describing the target
///    ("10-year target", "should know", "Recommended knowledge/level"). Narrative sections
///    (purpose, executive profile, tier summaries, final assessment) are ignored.
///  * "###" headings under the target become topics; their bullet lists become topic scope.
///  * Generic headings (Core, Strong, Useful, Must know, ...) are folded into a single
///    "&lt;Section&gt; Essentials" topic so we do not create meaningless topic names.
///  * The "resume technologies" list becomes the section description.
/// </summary>
public static partial class SkillMatrixParser
{
    [GeneratedRegex(@"^#\s+(\d+)\.\s+(.+)$")] private static partial Regex SectionHeading();
    [GeneratedRegex(@"^##\s+(?:\d+(?:\.\d+)*\s+)?(.+)$")] private static partial Regex SubHeading();
    [GeneratedRegex(@"^###\s+(.+)$")] private static partial Regex TopicHeading();
    [GeneratedRegex(@"target|should know|recommended (?:knowledge|level)", RegexOptions.IgnoreCase)] private static partial Regex TargetHeading();
    [GeneratedRegex(@"resume", RegexOptions.IgnoreCase)] private static partial Regex ResumeHeading();

    internal static readonly HashSet<string> GenericTopicNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "core", "strong", "useful", "primary", "supporting", "must know", "know", "other", "concepts",
        "recommended additions", "recommended addition", "recommended stack", "core — expert level",
        "legacy/specialized", "legacy"
    };

    public static IReadOnlyList<MatrixSection> Parse(string markdown)
    {
        var sections = new List<MatrixSection>();
        var lines = markdown.Replace("\r\n", "\n").Split('\n');

        int? number = null; string? title = null;
        var resumeItems = new List<string>();
        var topics = new List<(string Name, Priority Priority, List<string> Items)>();
        var essentials = new List<string>();
        var essentialsPriority = Priority.Useful;
        bool hasTarget = false, inTarget = false, inResume = false;
        (string Name, Priority Priority, List<string> Items)? currentTopic = null;

        void Flush()
        {
            if (number is null || title is null || !hasTarget) return;
            var cleanTitle = MarkdownHelpers.CleanTitle(title);
            var sectionSlug = Text.Slugify(cleanTitle);
            var result = new List<MatrixTopic>();
            if (essentials.Count > 0)
            {
                var shortName = cleanTitle.Split(" — ")[0].Trim();
                var name = $"{shortName} Essentials";
                result.Add(new MatrixTopic(name, Text.Slugify(name), essentialsPriority, essentials.Distinct().ToList(), true));
            }
            foreach (var t in topics)
            {
                var name = MarkdownHelpers.CleanTitle(t.Name);
                var display = name.Split(" — ")[0].Trim();
                if (result.Any(r => r.Slug == Text.Slugify(display))) continue;
                result.Add(new MatrixTopic(display, Text.Slugify(display), t.Priority, t.Items.Distinct().ToList(), false));
            }
            var priority = result.Count == 0 ? Priority.Strong : result.Min(r => r.Priority);
            var description = resumeItems.Count > 0
                ? "Technologies in scope: " + string.Join(", ", resumeItems.Distinct().Take(25)) + "."
                : null;
            sections.Add(new MatrixSection(number.Value, cleanTitle, sectionSlug, description, priority, result));
        }

        foreach (var raw in lines)
        {
            var line = raw.TrimEnd();
            var sm = SectionHeading().Match(line);
            if (sm.Success)
            {
                Flush();
                number = int.Parse(sm.Groups[1].Value);
                title = sm.Groups[2].Value.Trim();
                resumeItems = new(); topics = new(); essentials = new();
                essentialsPriority = Priority.Useful;
                hasTarget = inTarget = inResume = false; currentTopic = null;
                continue;
            }
            if (number is null) continue;

            var sub = SubHeading().Match(line);
            if (sub.Success && line.StartsWith("## "))
            {
                var h = sub.Groups[1].Value;
                inTarget = TargetHeading().IsMatch(h);
                inResume = !inTarget && ResumeHeading().IsMatch(h);
                hasTarget |= inTarget;
                currentTopic = null;
                continue;
            }

            var th = TopicHeading().Match(line);
            if (th.Success)
            {
                if (!inTarget) { currentTopic = null; continue; }
                var name = MarkdownHelpers.CleanTitle(MarkdownHelpers.StripInline(th.Groups[1].Value));
                var priority = MarkdownHelpers.ParsePriority(name, Priority.Strong);
                if (IsGeneric(name))
                {
                    if (priority < essentialsPriority) essentialsPriority = priority;
                    currentTopic = ("__essentials", priority, essentials);
                }
                else
                {
                    currentTopic = (name, priority, new List<string>());
                    topics.Add(currentTopic.Value);
                }
                continue;
            }

            var bm = MarkdownHelpers.Bullet().Match(line);
            if (!bm.Success) continue;
            var item = MarkdownHelpers.StripInline(bm.Groups[1].Value);
            if (item.Length == 0 || item.Length > 160) continue;
            if (inResume) resumeItems.Add(MarkdownHelpers.CleanTitle(item.Trim('`')));
            else if (inTarget)
            {
                if (currentTopic is { } ct) ct.Items.Add(item);
                else { essentials.Add(item); if (essentialsPriority > Priority.Strong) essentialsPriority = Priority.Strong; }
            }
        }
        Flush();
        return sections;
    }

    internal static bool IsGeneric(string name)
    {
        var n = name.Trim();
        if (GenericTopicNames.Contains(n)) return true;
        var head = n.Split(" — ")[0].Trim();
        return GenericTopicNames.Contains(head);
    }
}
