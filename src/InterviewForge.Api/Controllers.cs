using InterviewForge.Application;
using InterviewForge.Application.Content;
using InterviewForge.Application.Import;
using InterviewForge.Application.Plans;
using InterviewForge.Application.Progress;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace InterviewForge.Api.Controllers;

[Authorize, ApiController, Route("api/sections")]
public sealed class SectionsController(ContentService content) : ControllerBase
{
    [HttpGet] public Task<IReadOnlyList<SectionDto>> List(CancellationToken ct) => content.GetSectionsAsync(ct);
    [HttpGet("{id:int}")] public Task<SectionDetailDto> Get(int id, CancellationToken ct) => content.GetSectionAsync(id, ct);

    [HttpPost]
    public async Task<ActionResult<SectionDto>> Create(SaveSectionRequest req, CancellationToken ct)
    {
        var s = await content.CreateSectionAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = s.Id }, s);
    }

    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, SaveSectionRequest req, CancellationToken ct) { await content.UpdateSectionAsync(id, req, ct); return NoContent(); }
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id, CancellationToken ct) { await content.DeleteSectionAsync(id, ct); return NoContent(); }
}

[Authorize, ApiController, Route("api/topics")]
public sealed class TopicsController(ContentService content) : ControllerBase
{
    [HttpGet] public Task<IReadOnlyList<TopicDto>> List([FromQuery] int? sectionId, CancellationToken ct) => content.GetTopicsAsync(sectionId, ct);
    [HttpGet("{id:int}")] public Task<TopicDto> Get(int id, CancellationToken ct) => content.GetTopicAsync(id, ct);

    [HttpGet("{id:int}/questions")]
    public Task<PagedResult<QuestionSummaryDto>> Questions(int id, [FromQuery] QuestionFilter filter = QuestionFilter.All,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        content.GetQuestionsAsync(id, filter, null, page, pageSize, ct);

    [HttpPost]
    public async Task<ActionResult<TopicDto>> Create(SaveTopicRequest req, CancellationToken ct)
    {
        var t = await content.CreateTopicAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = t.Id }, t);
    }

    [HttpPut("{id:int}")] public async Task<IActionResult> Update(int id, SaveTopicRequest req, CancellationToken ct) { await content.UpdateTopicAsync(id, req, ct); return NoContent(); }
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id, CancellationToken ct) { await content.DeleteTopicAsync(id, ct); return NoContent(); }
}

[Authorize, ApiController, Route("api/questions")]
public sealed class QuestionsController(ContentService content, ProgressService progress) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<QuestionSummaryDto>> List([FromQuery] int? topicId, [FromQuery] QuestionFilter filter = QuestionFilter.All,
        [FromQuery] string? tag = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        content.GetQuestionsAsync(topicId, filter, tag, page, pageSize, ct);

    [HttpGet("{id:int}")] public Task<QuestionDetailDto> Get(int id, [FromQuery] int? topicId, CancellationToken ct) => content.GetQuestionAsync(id, topicId, ct);

    [HttpPost]
    public async Task<ActionResult<QuestionDetailDto>> Create(SaveQuestionRequest req, CancellationToken ct)
    {
        var q = await content.CreateQuestionAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = q.Id }, q);
    }

    [HttpPut("{id:int}")] public Task<QuestionDetailDto> Update(int id, SaveQuestionRequest req, CancellationToken ct) => content.UpdateQuestionAsync(id, req, ct);
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id, CancellationToken ct) { await content.DeleteQuestionAsync(id, ct); return NoContent(); }

    [HttpPost("{id:int}/progress")] public Task<UserStateDto> Progress(int id, UpdateProgressRequest req, CancellationToken ct) => progress.UpdateProgressAsync(id, req, ct);

    [HttpPut("{id:int}/note")]
    public async Task<IActionResult> Note(int id, SaveNoteRequest req, CancellationToken ct)
    {
        var note = await progress.SaveNoteAsync(id, req, ct);
        return note is null ? NoContent() : Ok(note);
    }
}

[Authorize, ApiController, Route("api/tags")]
public sealed class TagsController(ContentService content) : ControllerBase
{
    [HttpGet] public Task<IReadOnlyList<string>> List(CancellationToken ct) => content.GetTagsAsync(ct);
}

[Authorize, ApiController, Route("api/search")]
public sealed class SearchController(SearchService search) : ControllerBase
{
    [HttpGet]
    public Task<SearchResultDto> Search([FromQuery] string? q, [FromQuery] QuestionFilter filter = QuestionFilter.All,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default) =>
        search.SearchAsync(q is { Length: > 200 } ? q[..200] : q, filter, page, pageSize, ct);
}

[Authorize, ApiController, Route("api/notes")]
public sealed class NotesController(ProgressService progress) : ControllerBase
{
    [HttpGet] public Task<PagedResult<NoteDto>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) => progress.GetNotesAsync(page, pageSize, ct);
}

[Authorize, ApiController, Route("api/progress")]
public sealed class ProgressController(ProgressService progress) : ControllerBase
{
    [HttpGet] public Task<OverallProgressDto> Get(CancellationToken ct) => progress.GetOverallAsync(ct);
}

[Authorize, ApiController, Route("api/review")]
public sealed class ReviewController(ProgressService progress) : ControllerBase
{
    [HttpGet] public Task<ReviewOverviewDto> Overview(CancellationToken ct) => progress.GetReviewOverviewAsync(ct);

    [HttpGet("queue")]
    public Task<PagedResult<QuestionSummaryDto>> Queue([FromQuery] ReviewBucket bucket = ReviewBucket.All, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50, CancellationToken ct = default) => progress.GetReviewQueueAsync(bucket, page, pageSize, ct);
}

[Authorize, ApiController, Route("api/dashboard")]
public sealed class DashboardController(DashboardService dashboard) : ControllerBase
{
    [HttpGet] public Task<DashboardDto> Get(CancellationToken ct) => dashboard.GetAsync(ct);
}

[Authorize, ApiController, Route("api/algorithms")]
public sealed class AlgorithmsController(AlgorithmService algorithms) : ControllerBase
{
    [HttpPost] public async Task<ActionResult<AlgorithmDetailDto>> Create(SaveAlgorithmRequest req, CancellationToken ct) { var a = await algorithms.SaveAsync(null, req, ct); return CreatedAtAction(nameof(Get), new { slug = a.Slug }, a); }
    [HttpPut("{slug}")] public Task<AlgorithmDetailDto> Update(string slug, SaveAlgorithmRequest req, CancellationToken ct) => algorithms.SaveAsync(slug, req, ct);
    [HttpDelete("{slug}")] public async Task<IActionResult> Delete(string slug, CancellationToken ct) { await algorithms.DeleteAsync(slug, ct); return NoContent(); }
    [HttpGet] public Task<IReadOnlyList<AlgorithmSummaryDto>> List([FromQuery] string? category, CancellationToken ct) => algorithms.GetAllAsync(category, ct);
    [HttpGet("{slug}")] public Task<AlgorithmDetailDto> Get(string slug, CancellationToken ct) => algorithms.GetAsync(slug, ct);
}

[Authorize, ApiController, Route("api/plans")]
public sealed class PlansController(PlanService plans) : ControllerBase
{
    [HttpGet] public Task<IReadOnlyList<PlanDto>> List(CancellationToken ct) => plans.GetPlansAsync(ct);
    [HttpGet("current")]
    public async Task<ActionResult<PlanDto>> Current(CancellationToken ct) => await plans.GetCurrentPlanAsync(ct) is { } p ? p : NoContent();
    [HttpGet("{id:int}")] public Task<PlanDto> Get(int id, CancellationToken ct) => plans.GetPlanAsync(id, ct);

    [HttpPost]
    public async Task<ActionResult<PlanDto>> Create(CreatePlanRequest req, CancellationToken ct)
    {
        var p = await plans.CreateAsync(req, ct);
        return CreatedAtAction(nameof(Get), new { id = p.Id }, p);
    }

    [HttpPut("{id:int}")] public Task<PlanDto> Update(int id, UpdatePlanRequest req, CancellationToken ct) => plans.UpdateAsync(id, req, ct);
    [HttpDelete("{id:int}")] public async Task<IActionResult> Delete(int id, CancellationToken ct) { await plans.DeleteAsync(id, ct); return NoContent(); }
    [HttpGet("{id:int}/days")] public Task<IReadOnlyList<PlanDaySummaryDto>> Days(int id, CancellationToken ct) => plans.GetDaysAsync(id, ct);
    [HttpGet("{id:int}/days/{day:int}")] public Task<PlanDayDetailDto> Day(int id, int day, CancellationToken ct) => plans.GetDayAsync(id, day, ct);
    [HttpPost("{id:int}/generate")] public Task<GenerationResult> Generate(int id, [FromQuery] int? fromDay, CancellationToken ct) => plans.GenerateAsync(id, fromDay, ct);
    [HttpPost("{id:int}/current")] public Task<PlanDto> MakeCurrent(int id, CancellationToken ct) => plans.SetCurrentAsync(id, ct);
    [HttpPost("{id:int}/pause")] public Task<PlanDto> Pause(int id, CancellationToken ct) => plans.PauseAsync(id, ct);
    [HttpPost("{id:int}/resume")] public Task<PlanDto> Resume(int id, CancellationToken ct) => plans.ResumeAsync(id, ct);
    [HttpPost("{id:int}/restart")] public Task<PlanDto> Restart(int id, CancellationToken ct) => plans.RestartAsync(id, ct);
    [HttpPost("{id:int}/days/{day:int}/skip")] public async Task<IActionResult> Skip(int id, int day, CancellationToken ct) { await plans.SkipDayAsync(id, day, ct); return NoContent(); }
    [HttpPost("{id:int}/items/{itemId:int}/move")] public async Task<IActionResult> Move(int id, int itemId, MoveItemRequest req, CancellationToken ct) { await plans.MoveItemAsync(id, itemId, req, ct); return NoContent(); }
    [HttpPost("{id:int}/reschedule")] public async Task<IActionResult> Reschedule(int id, CancellationToken ct) => Ok(new { moved = await plans.RescheduleUnfinishedAsync(id, ct) });
}

[Authorize(Roles = "Admin"), ApiController, Route("api/admin")]
public sealed class AdminController(IImportService importer, IServiceProvider sp) : ControllerBase
{
    /// <summary>Re-runs the idempotent Markdown import. Safe to call repeatedly.</summary>
    [HttpPost("import")]
    public Task<ImportReport> Import(CancellationToken ct) => importer.ImportAsync(Program.DataDirectory(sp), ct);
}
