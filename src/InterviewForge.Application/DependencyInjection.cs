using InterviewForge.Application.Content;
using InterviewForge.Application.Import;
using InterviewForge.Application.Plans;
using InterviewForge.Application.Progress;
using Microsoft.Extensions.DependencyInjection;

namespace InterviewForge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton<IClock, SystemClock>();
        services.AddScoped<ProgressQueries>();
        services.AddScoped<ContentService>();
        services.AddScoped<SearchService>();
        services.AddScoped<AlgorithmService>();
        services.AddScoped<ProgressService>();
        services.AddScoped<PlanService>();
        services.AddScoped<DashboardService>();
        services.AddScoped<IImportService, ImportService>();
        return services;
    }
}
