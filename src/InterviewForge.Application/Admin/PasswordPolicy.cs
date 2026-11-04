using System.Security.Cryptography;
using InterviewForge.Application.Common;

namespace InterviewForge.Application.Admin;

public static class PasswordPolicy
{
    public const int MinLength = 12;
    public const int MaxLength = 128;
    private const string Lower = "abcdefghijkmnopqrstuvwxyz";
    private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Digits = "23456789";
    private const string Symbols = "!@#$%^&*-_=+";

    /// <summary>16 characters from an unambiguous alphabet with at least one of each class.</summary>
    public static string Generate(int length = 16)
    {
        var all = Lower + Upper + Digits + Symbols;
        var chars = new List<char> { Pick(Lower), Pick(Upper), Pick(Digits), Pick(Symbols) };
        while (chars.Count < length) chars.Add(Pick(all));
        for (var i = chars.Count - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }
        return new string(chars.ToArray());
    }

    private static char Pick(string set) => set[RandomNumberGenerator.GetInt32(set.Length)];

    /// <summary>Adds field errors for length and trivially guessable values.</summary>
    public static void Validate(Validator v, string field, string? password, string? username, string? email, string? displayName)
    {
        v.Required(field, password).MinLength(field, password, MinLength).MaxLength(field, password, MaxLength);
        if (string.IsNullOrWhiteSpace(password)) return;
        var lower = password.Trim().ToLowerInvariant();
        var local = (email ?? "").Split('@')[0].ToLowerInvariant();
        var banned = new[] { username?.ToLowerInvariant(), local, displayName?.Trim().ToLowerInvariant() }
            .Where(x => !string.IsNullOrEmpty(x) && x.Length >= 3);
        if (lower.StartsWith("password") || banned.Any(b => lower == b))
            v.Add(field, "Password is too easy to guess.");
    }
}
