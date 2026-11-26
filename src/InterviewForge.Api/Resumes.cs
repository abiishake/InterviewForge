using InterviewForge.Application;
using InterviewForge.Application.Common;
using InterviewForge.Application.Resumes;
using InterviewForge.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InterviewForge.Api;

/// <summary>The signed-in account's resumes. Ownership comes from the session, never from the request.</summary>
[Authorize, ApiController, Route("api/resumes")]
public sealed class ResumesController(ResumeService resumes) : ControllerBase
{
    private const long UploadLimit = ResumeService.MaxFileBytes + 64 * 1024; // file plus multipart overhead

    [HttpGet] public Task<IReadOnlyList<ResumeListItemDto>> List(CancellationToken ct) => resumes.ListAsync(ct);
    [HttpGet("{id:int}")] public Task<ResumeDetailDto> Get(int id, CancellationToken ct) => resumes.GetAsync(id, ct);

    [HttpPost, RequestSizeLimit(UploadLimit), RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<ActionResult<ResumeDetailDto>> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file is null) throw new ValidationException("file", "Choose a PDF or .tex file to upload.");
        await using var stream = file.OpenReadStream();
        var result = await resumes.UploadAsync(file.FileName, stream, file.Length, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")] public Task<ResumeListItemDto> Rename(int id, RenameResumeRequest req, CancellationToken ct) => resumes.RenameAsync(id, req, ct);
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id, CancellationToken ct) { await resumes.DeleteAsync(id, ct); return NoContent(); }
}

/// <summary>Skills found in resumes that the knowledge base does not cover. Contains no resume content or uploader identity.</summary>
[Authorize(Roles = "Admin"), ApiController, Route("api/admin/missing-topics")]
public sealed class AdminMissingTopicsController(MissingTopicService topics) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<MissingTopicDto>> List([FromQuery] MissingTopicStatus? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        topics.ListAsync(status, page, pageSize, ct);

    [HttpGet("count")] public async Task<IActionResult> Count(CancellationToken ct) => Ok(new { open = await topics.CountOpenAsync(ct) });
    [HttpPost("{id:int}/dismiss")] public Task<MissingTopicDto> Dismiss(int id, CancellationToken ct) => topics.DismissAsync(id, ct);
    [HttpPost("{id:int}/added")] public Task<MissingTopicDto> Added(int id, CancellationToken ct) => topics.MarkAddedAsync(id, ct);
    [HttpPost("{id:int}/reopen")] public Task<MissingTopicDto> Reopen(int id, CancellationToken ct) => topics.ReopenAsync(id, ct);
}

/// <summary>Periodically emails administrators a digest of new missing topics. Idle unless Email:SmtpHost and Email:From are set.</summary>
public sealed class MissingTopicDigestService(IServiceScopeFactory scopes, IEmailSender email, EmailOptions options, ILogger<MissingTopicDigestService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!email.IsConfigured) { logger.LogInformation("Email is not configured; missing-topic digests are disabled."); return; }
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(Math.Max(1, options.DigestIntervalMinutes)));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var sent = await scope.ServiceProvider.GetRequiredService<MissingTopicDigest>().SendPendingAsync(stoppingToken);
                if (sent > 0) logger.LogInformation("Emailed administrators about {Count} missing topics", sent);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "Sending the missing-topic digest failed; it will be retried."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
