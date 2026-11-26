using System.Text.RegularExpressions;

namespace InterviewForge.Application.Resumes;

/// <param name="InCatalog">False for terms read from a resume's skills list that the skill catalog does not know.</param>
public sealed record DetectedSkill(string Key, string Name, int Mentions, bool InCatalog);

/// <summary>Finds technology skills in resume text. Deterministic and offline.</summary>
public static partial class ResumeAnalyzer
{
    public const int MaxSkills = 80;

    private sealed record AliasPattern(SkillEntry Skill, Regex Pattern);

    // Whole-term match: not glued to letters/digits or to tech punctuation (so ".net" in "asp.net" is not a separate hit).
    private static readonly AliasPattern[] Patterns = SkillCatalog.All
        .SelectMany(s => s.Aliases.Select(a => new AliasPattern(s, new Regex(
            @"(?<![A-Za-z0-9#+.])" + Regex.Escape(a) + @"(?![A-Za-z0-9#+]|\.[A-Za-z0-9])",
            s.CaseSensitive ? RegexOptions.CultureInvariant : RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))))
        .ToArray();

    [GeneratedRegex(@"^(technical\s+|core\s+|key\s+|professional\s+|primary\s+)?(skills?|technolog(y|ies)|tech(nical)?\s+stack|tools(\s*(&|and)\s*technologies)?|technical\s+(expertise|proficiency|proficiencies)|competenc(y|ies)|skill\s*set|stack|toolbox|programming\s+languages|languages\s*(&|and)\s*(frameworks|tools)|areas\s+of\s+expertise)\b", RegexOptions.IgnoreCase)]
    private static partial Regex SkillsHeading();

    [GeneratedRegex(@"^(professional\s+|work\s+|relevant\s+)?(experience|employment|education|academic|projects?|certifications?|summary|profile|objective|achievements|accomplishments|awards|publications|interests|hobbies|references|volunteer(ing)?|courses|training|contact|personal|declaration)\b", RegexOptions.IgnoreCase)]
    private static partial Regex OtherHeading();

    [GeneratedRegex(@"[,;|•·▪◦●■►]")] private static partial Regex ItemSeparator();
    [GeneratedRegex(@"\b(19|20)\d{2}\b")] private static partial Regex Year();
    [GeneratedRegex(@"^[-*•·▪◦●■►\s]+")] private static partial Regex LeadingBullet();

    private static readonly HashSet<string> NotSkills = new(StringComparer.OrdinalIgnoreCase)
    {
        "and", "or", "the", "with", "of", "in", "on", "for", "to", "a", "an", "etc", "years", "year", "experience", "knowledge", "familiar",
        "basic", "basics", "good", "strong", "working", "including", "various", "other", "others", "more", "tools", "frameworks", "framework",
        "languages", "language", "databases", "database", "cloud", "platforms", "platform", "skills", "skill", "technologies", "technology",
        "soft", "communication", "leadership", "teamwork", "team", "problem", "solving", "management", "mentoring", "collaboration",
        "english", "hindi", "spanish", "french", "german", "present", "current", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug",
        "sep", "sept", "oct", "nov", "dec", "january", "february", "march", "april", "june", "july", "august", "september", "october",
        "november", "december", "ide", "ides", "os", "methodologies", "methodology", "concepts", "libraries", "library", "expert",
        "proficient", "intermediate", "beginner", "advanced", "native", "fluent", "time", "critical", "thinking", "analytical", "adaptability",
    };

    // Everyday tools that are not interview topics; never reported to administrators.
    private static readonly HashSet<string> NotInterviewTopics = new(StringComparer.OrdinalIgnoreCase)
    {
        "Jira", "Confluence", "Visual Studio", "VS Code", "VSCode", "Visual Studio Code", "Rider", "JetBrains Rider", "IntelliJ", "Eclipse",
        "Slack", "Trello", "Notion", "Teams", "Microsoft Teams", "MS Teams", "Zoom", "MS Office", "Microsoft Office", "Office 365", "Excel",
        "Word", "PowerPoint", "Outlook", "Windows", "macOS", "Mac OS", "SSMS", "SQL Server Management Studio", "Swagger", "Fiddler", "WinSCP",
        "PuTTY", "Notepad++", "Figma", "Miro", "Lucidchart", "ServiceNow", "Asana", "Monday", "Azure Boards", "TFS",
    };

    public static IReadOnlyList<DetectedSkill> Detect(string text)
    {
        var mentions = new Dictionary<string, (SkillEntry Skill, int Count)>();

        // 1. Catalog terms anywhere in the text; longest match wins so "ASP.NET Core" is not also counted as "ASP.NET".
        var hits = new List<(int Start, int Length, SkillEntry Skill)>();
        foreach (var p in Patterns)
            foreach (Match m in p.Pattern.Matches(text)) hits.Add((m.Index, m.Length, p.Skill));
        var taken = new bool[text.Length];
        foreach (var h in hits.OrderByDescending(h => h.Length).ThenBy(h => h.Start))
        {
            if (Enumerable.Range(h.Start, h.Length).Any(i => taken[i])) continue;
            for (var i = h.Start; i < h.Start + h.Length; i++) taken[i] = true;
            mentions[h.Skill.Key] = (h.Skill, mentions.TryGetValue(h.Skill.Key, out var c) ? c.Count + 1 : 1);
        }

        var found = mentions.Values.ToDictionary(v => v.Skill.Key, v => new DetectedSkill(v.Skill.Key, v.Skill.Name, v.Count, true));

        // 2. Terms listed under a "Skills"/"Technologies" heading that the catalog does not know.
        foreach (var term in SkillsSectionTerms(text))
        {
            var known = SkillCatalog.FindByAlias(term);
            if (known is not null)
            {
                found.TryAdd(known.Key, new DetectedSkill(known.Key, known.Name, 1, true));
                continue;
            }
            if (NotInterviewTopics.Contains(term) || !LooksLikeSkill(term)) continue;
            var key = SkillCatalog.KeyOf(term);
            if (key.Length == 0) continue;
            found.TryAdd(key, new DetectedSkill(key, term.Length > 80 ? term[..80] : term, 1, false));
        }

        return found.Values.OrderByDescending(s => s.Mentions).ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase).Take(MaxSkills).ToList();
    }

    /// <summary>Items listed under skills-like headings, e.g. "Languages: C#, Go | Cloud: Azure".</summary>
    internal static IEnumerable<string> SkillsSectionTerms(string text)
    {
        var inSection = false;
        var linesInSection = 0;
        foreach (var raw in text.Split('\n'))
        {
            var line = LeadingBullet().Replace(raw, "").Trim();
            if (line.Length == 0) continue;
            var headingLike = line.Length <= 60 && !line.Contains(',');

            if (SkillsHeading().IsMatch(line) && (headingLike || line.Contains(':')))
            {
                inSection = true; linesInSection = 0;
                var colon = line.IndexOf(':');
                if (colon < 0) continue;
                line = line[(colon + 1)..];
            }
            else if (inSection && headingLike && OtherHeading().IsMatch(line) && !line.Contains(':'))
            {
                inSection = false;
                continue;
            }
            if (!inSection) continue;
            if (++linesInSection > 40) { inSection = false; continue; }

            foreach (var term in SplitItems(line)) yield return term;
        }
    }

    private static IEnumerable<string> SplitItems(string line)
    {
        var s = line.Replace('(', ',').Replace(')', ',').Replace('[', ',').Replace(']', ',');
        foreach (var part in ItemSeparator().Split(s))
        {
            var item = part;
            var colon = item.IndexOf(':');
            if (colon >= 0) item = item[(colon + 1)..];
            item = item.Trim().TrimEnd('.').Trim();
            if (item.StartsWith("and ", StringComparison.OrdinalIgnoreCase)) item = item[4..].Trim();
            if (item.Length > 0) yield return item;
        }
    }

    internal static bool LooksLikeSkill(string term)
    {
        if (term.Length is < 2 or > 30) return false;
        if (!char.IsLetter(term[0]) && term[0] != '.') return false;
        var words = term.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length > 3) return false;
        if (words.Any(w => NotSkills.Contains(w.Trim('-', '/', '&')))) return false;
        if (Year().IsMatch(term)) return false;
        // Skills lists capitalize product names; lower-case phrases are usually prose.
        return term.Any(char.IsUpper) || term.IndexOfAny(['.', '#', '+']) >= 0;
    }
}
