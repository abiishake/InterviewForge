using InterviewForge.Application;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace InterviewForge.Infrastructure;

public sealed class LocalUser : ICurrentUser
{
    public string UserId => "local";
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var cs = config.GetConnectionString("DefaultConnection") ?? "Data Source=data/interviewforge.db";
        services.AddDbContext<AppDbContext>(o => o.UseSqlite(cs, sql => sql.CommandTimeout(30)));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<ICurrentUser, LocalUser>();
        return services;
    }

    /// <summary>Ensures the DB directory exists, applies migrations and enables WAL for better concurrency.</summary>
    public static async Task MigrateAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        var builder = new SqliteConnectionStringBuilder(db.Database.GetConnectionString());
        var dir = Path.GetDirectoryName(Path.GetFullPath(builder.DataSource));
        if (!string.IsNullOrEmpty(dir) && builder.DataSource != ":memory:") Directory.CreateDirectory(dir);
        logger.LogInformation("Applying database migrations to {DataSource}", builder.DataSource);
        await db.Database.MigrateAsync(ct);
        await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;", ct);
        await db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys=ON;", ct);
    }
}
