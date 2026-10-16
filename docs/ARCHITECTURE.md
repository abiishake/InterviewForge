# Architecture

## Why this shape

A pragmatic **Clean Architecture** with four projects. It keeps business rules (plan generation, spaced review, parsing, classification, validation) testable without HTTP, while avoiding ceremony (no MediatR, no repository-per-entity, no CQRS split) that a single-user app does not need.

```text
src/
  InterviewForge.Domain          Entities + enums. No dependencies.
  InterviewForge.Application     Use-case services, DTOs, pure algorithms (PlanGenerator, ReviewScheduler,
                                 ProgressCalculator), Markdown parsers, TopicClassifier, ImportService, validation.
                                 Depends on EF Core abstractions through IAppDbContext (a deliberate trade-off:
                                 LINQ projections stay in the use case, avoiding N+1 and leaky repositories).
  InterviewForge.Infrastructure  AppDbContext (SQLite), Fluent configuration, indexes, migrations, ICurrentUser.
  InterviewForge.Api             Controllers (thin), global exception handler, health checks, OpenAPI,
                                 security headers, static hosting of the Angular build, startup migration + import.
frontend/interview-forge         Angular 21 standalone app (core / shared / features, lazy routes, signals, zoneless).
tests/
  InterviewForge.UnitTests       Parsers, classifier, plan generator, review scheduler, progress, validation,
                                 search + idempotent import against in-memory SQLite.
  InterviewForge.IntegrationTests WebApplicationFactory against a temporary SQLite file with the real seed data.
```

The Angular app is served by the API from `wwwroot`, so there is **one container and one origin** (no CORS, simplest reliable deployment). SQLite is owned by that container and persisted on the `./data` bind mount.

## Data model

```text
Section 1─N Topic 1─N Question 1─1 Answer
Question N─N Tag (QuestionTag)          Question N─N Topic (QuestionTopic, secondary associations)
Question 1─N QuestionReference
UserProgress (UserId, QuestionId) unique   — status, last rating, favorite, personal difficulty, SRS interval/next review
UserNote     (UserId, QuestionId) unique   — never modifies the canonical answer
ActivityLog  append-only                   — streaks, completed today, recently incorrect
Plan 1─N PlanDay 1─N PlanItem ─► Question  — completion derived from UserProgress (no duplicated state)
Algorithm                                   — independent catalogue
```

Mutable progress is never stored on `Question`. Regenerating or deleting a plan never deletes progress.

## Key algorithms

- **Plan generation** (`PlanGenerator`, pure): order by section order (skill-matrix progression → Interview Scenarios last) → topic priority → topic order → difficulty → question order; keep topics contiguous; capacity = min(questions/day, study minutes ÷ estimated minutes per difficulty); spread evenly; avoid splitting a topic that fits the next day; exclude completed/already-scheduled questions; report unscheduled count. Regeneration starts at the current day and preserves history.
- **Spaced review** (`ReviewScheduler`): simplified SM-2 — Didn't know → due now, Hard → 1 day, Okay → ×2 (≥2 d), Easy → ×3 (≥4 d), capped at 60 days.
- **Search**: AND of terms using `LIKE` over a denormalised lower-case `SearchText` column (question + answer + tags), topic/section names and the user's notes; ranked by question-text match then hierarchy; paginated. For thousands of questions this is fast on SQLite; an FTS5 virtual table could be added later behind `SearchService` without API changes.

## SQLite specifics

- WAL journal mode enabled at startup for concurrent reads during writes.
- Indexes on all foreign keys, `(UserId, QuestionId)`, `(UserId, Status)`, `(UserId, NextReviewAt)`, `(PlanId, DayNumber)`, `ExternalId`, `ContentHash`, `SourceKey`.
- No provider-specific features beyond EF Core's SQLite provider; queries avoid constructs SQLite cannot translate (e.g. APPLY).
- Read paths use `AsNoTracking()` and DTO projections; writes that span several statements use explicit transactions.

## Adding authentication later

All per-user tables already have `UserId`. Replace `LocalUser` with an `ICurrentUser` that reads `HttpContext.User`, add `AddAuthentication().AddJwtBearer()/AddCookie()` and `[Authorize]`; no schema change is required.
