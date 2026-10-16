using InterviewForge.Application.Common;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace InterviewForge.Api;

/// <summary>Consistent error body: { "error": { "code", "message", "details"? } }.</summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, code, message, details) = ex switch
        {
            ForbiddenException f => (403, f.Code, f.Message, null),
            ValidationException v => (400, v.Code, v.Message, (object?)v.Errors),
            NotFoundException n => (404, n.Code, n.Message, null),
            ConflictException c => (409, c.Code, c.Message, null),
            BadHttpRequestException b => (b.StatusCode, "BAD_REQUEST", "The request was malformed or too large.", null),
            OperationCanceledException => (499, "REQUEST_CANCELLED", "The request was cancelled.", null),
            _ => (500, "INTERNAL_ERROR", "An unexpected error occurred.", null)
        };
        if (status >= 500) logger.LogError(ex, "Unhandled error on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
        else logger.LogInformation("Request failed {Status} {Code} on {Method} {Path}", status, code, ctx.Request.Method, ctx.Request.Path);

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new { error = new { code, message, details } }, ct);
        return true;
    }
}

public sealed class SqliteHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            return await db.Database.CanConnectAsync(ct)
                ? HealthCheckResult.Healthy($"{await db.Questions.CountAsync(ct)} questions")
                : HealthCheckResult.Unhealthy("Cannot open SQLite database");
        }
        catch (Exception ex) { return HealthCheckResult.Unhealthy("SQLite error", ex); }
    }
}
