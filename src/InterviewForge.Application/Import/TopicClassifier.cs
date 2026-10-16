using System.Text.RegularExpressions;

namespace InterviewForge.Application.Import;

/// <summary>
/// Maps question-bank topics onto the skill-matrix hierarchy.
///
/// 1. Explicit overrides (data/classification-overrides.json) win.
/// 2. Otherwise each matrix section is scored by token overlap with the bank topic title
///    (section heading ×6, topic heading ×4, scope bullets ×1) plus a small contribution from
///    the bank questions' text.
/// 3. Inside the winning section, an existing matrix topic is reused when all of its (non-generic)
///    heading tokens appear in the bank topic title — e.g. matrix "EF Core" ⇐ bank "Entity Framework Core".
///    This prevents duplicate topics.
/// 4. If no section scores above the threshold the topic goes to the synthetic
///    "Interview Scenarios" section (comparisons, rapid-fire, leadership scenarios).
/// </summary>
public static partial class TopicClassifier
{
    public const string ScenarioSectionSlug = "interview-scenarios";
    public const string ScenarioSectionTitle = "Interview Scenarios";
    private const double Threshold = 4.0;

    [GeneratedRegex("[a-z0-9]+")] private static partial Regex Word();

    // Multi-word technology phrases collapsed to a single token before tokenizing.
    private static readonly (string Phrase, string Token)[] Aliases =
    {
        ("entity framework core", "efcore"), ("entity framework", "efcore"), ("ef core", "efcore"),
        ("asp.net core", "aspnetcore"), ("asp.net", "aspnet"), ("c#", "csharp"), (".net", "dotnet"),
        ("sql server", "sqlserver"), ("web api", "webapi"), ("real-time", "realtime"), ("real time", "realtime"),
        ("system design", "systemdesign"), ("design patterns", "designpatterns"), ("rate limiting", "ratelimiting"),
        ("service bus", "servicebus"), ("power bi", "powerbi"), ("event-driven", "eventdriven"), ("event driven", "eventdriven"),
        ("ci/cd", "cicd"), ("devops", "devops"), ("open telemetry", "opentelemetry"), ("actor model", "actormodel"),
        ("multi-cloud", "multicloud"), ("background services", "backgroundservices"), ("hosted services", "backgroundservices"),
        ("domain-driven", "ddd"), ("signalr", "signalr"), ("websockets", "websocket"), ("websocket", "websocket"),
    };

    private static readonly HashSet<string> Stop = new()
    {
        "and", "the", "a", "an", "of", "to", "in", "for", "with", "on", "vs", "versus", "or", "how", "what", "is",
        "are", "do", "you", "why", "when", "would", "your", "should", "be", "it", "that", "this", "at", "as", "by",
        "from", "can", "senior", "lead", "level", "target", "know", "high", "value", "questions", "question",
        "explain", "difference", "between", "use", "using", "into", "about", "year", "10", "developer", "net", "dotnet",
        "essentials", "expert", "strong", "core", "useful", "production", "engineering"
    };

    public static HashSet<string> Tokens(string text)
    {
        var s = " " + text.ToLowerInvariant() + " ";
        foreach (var (phrase, token) in Aliases) s = s.Replace(phrase, " " + token + " ");
        var set = new HashSet<string>();
        foreach (Match m in Word().Matches(s))
        {
            var w = m.Value;
            if (w.Length < 2 || Stop.Contains(w)) continue;
            if (w.Length > 4 && w.EndsWith("s") && !w.EndsWith("ss")) w = w[..^1]; // naive plural folding
            set.Add(w);
        }
        return set;
    }

    public static TopicClassification Classify(
        BankTopic bank,
        IReadOnlyList<MatrixSection> sections,
        IReadOnlyDictionary<string, string>? overrides = null)
    {
        if (overrides is not null && overrides.TryGetValue(bank.TopicId, out var target))
        {
            var parts = target.Split('/', 2);
            return new TopicClassification(bank.TopicId, parts[0], parts.Length == 2 ? parts[1] : null, double.MaxValue, "override");
        }

        var titleTokens = Tokens(bank.Title);
        var bodyTokens = Tokens(string.Join(' ', bank.Questions.Select(q => q.Title)));

        MatrixSection? best = null; double bestScore = 0;
        foreach (var section in sections)
        {
            var sTokens = Tokens(section.Title);
            var tTokens = section.Topics.SelectMany(t => Tokens(t.Name)).ToHashSet();
            var scopeTokens = section.Topics.SelectMany(t => t.ScopeItems).SelectMany(Tokens).ToHashSet();
            if (section.Description is not null) scopeTokens.UnionWith(Tokens(section.Description));

            double score = 0;
            foreach (var tok in titleTokens)
            {
                if (sTokens.Contains(tok)) score += 6;
                if (tTokens.Contains(tok)) score += 4;
                if (scopeTokens.Contains(tok)) score += 1;
            }
            foreach (var tok in bodyTokens)
                if (scopeTokens.Contains(tok) || tTokens.Contains(tok)) score += 0.25;

            if (score > bestScore) { bestScore = score; best = section; }
        }

        if (best is null || bestScore < Threshold)
            return new TopicClassification(bank.TopicId, ScenarioSectionSlug, null, bestScore, "no strong match in skill matrix");

        var topic = MatchTopic(bank.Title, best);
        return new TopicClassification(bank.TopicId, best.Slug, topic?.Slug, bestScore,
            topic is null ? "section match; new topic" : "section and topic match");
    }

    public static MatrixTopic? MatchTopic(string bankTitle, MatrixSection section)
    {
        var titleTokens = Tokens(bankTitle);
        return section.Topics
            .Where(t => !t.IsEssentials)
            .Select(t => (Topic: t, Tokens: Tokens(t.Name)))
            .Where(x => x.Tokens.Count > 0 && x.Tokens.IsSubsetOf(titleTokens))
            .OrderByDescending(x => x.Tokens.Count)
            .Select(x => x.Topic)
            .FirstOrDefault();
    }
}
