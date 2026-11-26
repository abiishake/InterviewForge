using System.Text.RegularExpressions;

namespace InterviewForge.Application.Resumes;

/// <summary>Tokenizer shared by resume skill detection and knowledge-base matching.</summary>
public static partial class SkillText
{
    [GeneratedRegex("[a-z0-9]+")] private static partial Regex Word();

    // Technology spellings whose punctuation carries meaning, collapsed to one token before splitting.
    private static readonly (string Phrase, string Token)[] Phrases =
    {
        ("asp.net", "aspnet"), ("c#", "csharp"), ("f#", "fsharp"), ("c++", "cpp"), ("vb.net", "vbnet"),
        ("node.js", "nodejs"), ("vue.js", "vuejs"), ("next.js", "nextjs"), ("react.js", "react"), ("express.js", "express"),
        ("three.js", "threejs"), ("d3.js", "d3"), ("ci/cd", "cicd"), ("pl/sql", "plsql"), ("t-sql", "tsql"), ("async/await", "async await"),
        ("objective-c", "objectivec"), ("ml.net", "mldotnet"), ("akka.net", "akka"), ("quartz.net", "quartz"), (".net", " dotnet"),
    };

    private static readonly HashSet<string> Stop = new()
    {
        "and", "the", "a", "an", "of", "to", "in", "for", "with", "on", "vs", "or", "how", "what", "is", "are", "using", "use",
        "intro", "introduction", "basics", "fundamentals", "advanced", "overview", "deep", "dive", "essentials",
    };

    /// <summary>Spelling-insensitive form for tag comparison: "EntityFramework", "Entity Framework" and "entity-framework" are equal.</summary>
    public static string Compact(string text)
    {
        var s = " " + text.ToLowerInvariant() + " ";
        foreach (var (phrase, token) in Phrases) s = s.Replace(phrase, " " + token + " ");
        var c = string.Concat(Word().Matches(s).Select(m => m.Value));
        return c.Length > 4 && c.EndsWith('s') && !c.EndsWith("ss") ? c[..^1] : c;
    }

    public static HashSet<string> Tokens(string text)
    {
        var s = " " + text.ToLowerInvariant() + " ";
        foreach (var (phrase, token) in Phrases) s = s.Replace(phrase, " " + token + " ");
        var set = new HashSet<string>();
        foreach (Match m in Word().Matches(s))
        {
            var w = m.Value;
            if (Stop.Contains(w)) continue;
            if (w.Length > 4 && w.EndsWith('s') && !w.EndsWith("ss")) w = w[..^1];
            set.Add(w);
        }
        return set;
    }
}
