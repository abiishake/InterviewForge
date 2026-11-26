using System.Text;
using System.Text.RegularExpressions;

namespace InterviewForge.Application.Resumes;

/// <summary>Turns LaTeX resume source into plain text good enough for skill detection. No TeX engine is run.</summary>
public static partial class LatexText
{
    [GeneratedRegex(@"(?<!\\)%.*$", RegexOptions.Multiline)] private static partial Regex Comment();
    [GeneratedRegex(@"\\begin\{document\}(.*?)(\\end\{document\}|$)", RegexOptions.Singleline)] private static partial Regex Body();
    [GeneratedRegex(@"\\(begin|end)\s*\{[^}]*\}(\s*(\[[^\]]*\]|\{[^}]*\}))*")] private static partial Regex Environment();
    [GeneratedRegex(@"\\item\b(\s*\[[^\]]*\])?")] private static partial Regex Item();
    [GeneratedRegex(@"\\\\(\[[^\]]*\])?|\\newline\b|\\par\b|\\linebreak\b")] private static partial Regex LineBreak();
    [GeneratedRegex(@"\\(href|url)\s*\{[^}]*\}")] private static partial Regex Link();
    [GeneratedRegex(@"\\(v|h)space\*?\s*\{[^}]*\}|\\(vfill|hfill|smallskip|medskip|bigskip|noindent|centering|clearpage|newpage|pagebreak)\b")] private static partial Regex Spacing();
    [GeneratedRegex(@"\}\s*\{")] private static partial Regex AdjacentArgs();
    [GeneratedRegex(@"\\[a-zA-Z@]+\*?(\s*\[[^\]]*\])?")] private static partial Regex Command();
    [GeneratedRegex(@"[ \t]+")] private static partial Regex Spaces();
    [GeneratedRegex(@"\n{3,}")] private static partial Regex BlankLines();

    public static string ToPlainText(string tex)
    {
        var s = tex.Replace("\r\n", "\n").Replace('\r', '\n');
        s = Comment().Replace(s, "");
        var body = Body().Match(s);
        if (body.Success) s = body.Groups[1].Value;

        // Protect escaped characters before braces and backslashes are removed.
        s = s.Replace(@"\#", "\u0001").Replace(@"\&", "\u0002").Replace(@"\%", "\u0003").Replace(@"\_", "\u0004")
             .Replace(@"\$", "\u0005").Replace(@"\{", "\u0006").Replace(@"\}", "\u0007");

        s = Link().Replace(s, " ");
        s = Spacing().Replace(s, " ");
        s = Environment().Replace(s, "\n");
        s = Item().Replace(s, "\n• ");
        s = LineBreak().Replace(s, "\n");
        s = AdjacentArgs().Replace(s, "}\n{");
        s = Command().Replace(s, " ");
        s = s.Replace("{", "").Replace("}", "").Replace("$", "").Replace("~", " ")
             .Replace("---", "-").Replace("--", "-").Replace("``", "\"").Replace("''", "\"");

        s = s.Replace('\u0001', '#').Replace('\u0002', '&').Replace('\u0003', '%').Replace('\u0004', '_')
             .Replace('\u0005', '$').Replace('\u0006', '{').Replace('\u0007', '}');

        var sb = new StringBuilder();
        foreach (var line in s.Split('\n')) sb.Append(Spaces().Replace(line, " ").Trim()).Append('\n');
        return BlankLines().Replace(sb.ToString(), "\n\n").Trim();
    }
}
