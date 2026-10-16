namespace InterviewForge.Application.Common;

/// <summary>Base class for expected, user-facing failures. Mapped to a consistent JSON error body by the API.</summary>
public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class NotFoundException(string code, string message) : AppException(code, message)
{
    public static NotFoundException For(string entity, object id) =>
        new($"{entity.ToUpperInvariant()}_NOT_FOUND", $"The requested {entity.ToLowerInvariant()} ({id}) was not found.");
}

public sealed class ForbiddenException(string message = "Only an administrator or the contributor can modify this content. Submit feedback instead.") : AppException("FORBIDDEN", message);

public sealed class ConflictException(string code, string message) : AppException(code, message);

public sealed class ValidationException : AppException
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("VALIDATION_FAILED", "One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public ValidationException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = new[] { message } }) { }
}

/// <summary>Tiny fluent validator collecting field errors; avoids an extra dependency.</summary>
public sealed class Validator
{
    private readonly Dictionary<string, List<string>> _errors = new();

    public Validator Required(string field, string? value, string? message = null)
    {
        if (string.IsNullOrWhiteSpace(value)) Add(field, message ?? $"{field} is required.");
        return this;
    }

    public Validator MaxLength(string field, string? value, int max)
    {
        if (value is not null && value.Length > max) Add(field, $"{field} must be at most {max} characters.");
        return this;
    }

    public Validator MinLength(string field, string? value, int min)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.Trim().Length < min) Add(field, $"{field} must be at least {min} characters.");
        return this;
    }

    public Validator Range(string field, int value, int min, int max)
    {
        if (value < min || value > max) Add(field, $"{field} must be between {min} and {max}.");
        return this;
    }

    public Validator Positive(string field, int value)
    {
        if (value <= 0) Add(field, $"{field} must be a positive id.");
        return this;
    }

    public Validator SafeUrl(string field, string? url)
    {
        if (!string.IsNullOrWhiteSpace(url) && !UrlPolicy.IsSafe(url)) Add(field, $"{field} must be an absolute http(s) URL.");
        return this;
    }

    public Validator Must(bool condition, string field, string message)
    {
        if (!condition) Add(field, message);
        return this;
    }

    public void Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = new List<string>();
        list.Add(message);
    }

    public bool IsValid => _errors.Count == 0;

    public void ThrowIfInvalid()
    {
        if (!IsValid) throw new ValidationException(_errors.ToDictionary(k => k.Key, v => v.Value.ToArray()));
    }
}

public static class UrlPolicy
{
    /// <summary>Only absolute http/https URLs are accepted for references. javascript:, data:, file: etc. are rejected.</summary>
    public static bool IsSafe(string url) =>
        Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
