using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace InterviewForge.Application.Common;

public static partial class Text
{
    [GeneratedRegex("[^a-z0-9]+")] private static partial Regex NonAlnum();
    [GeneratedRegex(@"\s+")] private static partial Regex Ws();

    public static string Slugify(string value)
    {
        var s = value.ToLowerInvariant()
            .Replace("c#", "csharp")
            .Replace(".net", "dotnet")
            .Replace("&", " and ");
        s = NonAlnum().Replace(s, "-").Trim('-');
        return s.Length > 80 ? s[..80].Trim('-') : s;
    }

    /// <summary>Lower-case, collapse whitespace, drop punctuation. Basis of duplicate detection.</summary>
    public static string NormalizeForHash(string value)
    {
        var s = value.ToLowerInvariant();
        s = NonAlnum().Replace(s, " ");
        return Ws().Replace(s, " ").Trim();
    }

    public static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(NormalizeForHash(value)));
        return Convert.ToHexString(bytes)[..32].ToLowerInvariant();
    }

    public static string BuildSearchText(params string?[] parts)
    {
        var joined = string.Join(' ', parts.Where(p => !string.IsNullOrWhiteSpace(p)));
        return Ws().Replace(joined.ToLowerInvariant(), " ").Trim();
    }

    /// <summary>Splits a user query into lower-case terms (max 8) for AND-matching.</summary>
    public static string[] QueryTerms(string? query)
    {
        if (string.IsNullOrWhiteSpace(query)) return Array.Empty<string>();
        return Ws().Split(query.Trim().ToLowerInvariant())
            .Select(t => t.Trim('"', '\'', ',', ';'))
            .Where(t => t.Length > 0)
            .Distinct()
            .Take(8)
            .ToArray();
    }

    /// <summary>Escape LIKE wildcards so user input is matched literally.</summary>
    public static string EscapeLike(string term) =>
        term.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    public static string NormalizeTag(string tag)
    {
        var t = tag.Trim().TrimStart('#');
        t = Regex.Replace(t, "[^A-Za-z0-9.+#-]", "");
        return t.Length > 40 ? t[..40] : t;
    }
}
