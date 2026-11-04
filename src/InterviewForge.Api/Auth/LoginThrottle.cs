using System.Collections.Concurrent;

namespace InterviewForge.Api;

/// <summary>
/// Per-username back-off on top of the per-IP limiter: 5 failures lock the name for 1 minute,
/// doubling up to 15 minutes. Unknown usernames are tracked the same way so nothing is revealed.
/// </summary>
public sealed class LoginThrottle(TimeProvider time)
{
    private sealed record Entry(int Failures, DateTimeOffset LockedUntil);
    private readonly ConcurrentDictionary<string, Entry> _entries = new();
    private const int Threshold = 5;

    public bool IsLocked(string username) =>
        username.Length > 0 && _entries.TryGetValue(username, out var e) && e.LockedUntil > time.GetUtcNow();

    public void Failure(string username)
    {
        if (username.Length == 0) return;
        if (_entries.Count > 10_000) _entries.Clear(); // bounded memory; resets the throttle rather than growing
        _entries.AddOrUpdate(username, _ => Next(null), (_, e) => Next(e));
    }

    public void Success(string username) => _entries.TryRemove(username, out _);

    private Entry Next(Entry? previous)
    {
        var failures = (previous?.Failures ?? 0) + 1;
        if (failures < Threshold) return new Entry(failures, DateTimeOffset.MinValue);
        var minutes = Math.Min(15, 1 << Math.Min(4, failures - Threshold));
        return new Entry(failures, time.GetUtcNow().AddMinutes(minutes));
    }
}
