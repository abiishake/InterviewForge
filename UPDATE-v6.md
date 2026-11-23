# InterviewForge v6 update: AI, .NET platform, Azure SDK and architecture guidance

Content-only update, driven by the Microsoft Learn documentation for [.NET](https://learn.microsoft.com/en-us/dotnet/), [Azure for .NET developers](https://learn.microsoft.com/en-us/dotnet/azure/), [AI for .NET developers](https://learn.microsoft.com/en-us/dotnet/ai/) and the [.NET architecture e-books](https://learn.microsoft.com/en-us/dotnet/architecture/).

## What changed

Four new skill-matrix sections (38-41, 26 topics with *Expected scope*) and **121 new interview questions**, each with a *Real-world example* and a code block.

| Section | Topics | Questions | File |
|---|---|---|---|
| 38. AI for .NET Developers | LLM foundations/tokens/prompting; Microsoft.Extensions.AI and IChatClient; embeddings, vector search and RAG (MEVD, MEDI); agents, workflows and MCP; evaluating and observing AI apps; AI safety, security and responsible AI; models, hosting and classic ML | 34 | `data/question-bank/ai-dotnet.md` |
| 39. .NET Platform Fundamentals | types/collections/memory (Span, ArrayPool); System.Text.Json, Regex, DateTime/TimeProvider; CLR/JIT/ALC/publishing; Generic Host, options, logging, HybridCache, resilience; HttpClient, Channels, pipelines, TPL; SDK tooling and diagnostics; C# 14 / .NET 10 | 36 | `data/question-bank/dotnet-platform.md` |
| 40. Azure SDK & Cloud Services for .NET | Azure SDK clients and authentication; Functions and Durable Functions; Service Bus / Event Hubs / Event Grid; App Configuration, Aspire and azd; migrating .NET apps to Azure; Azure OpenAI, AI Search and prebuilt AI services | 22 | `data/question-bank/azure-dotnet-sdk.md` |
| 41. .NET Architecture Guidance | microservices and containers; DDD and CQRS in a microservice; cloud-native on Azure; modern web app architecture; Blazor and MAUI; framework and library design guidelines | 29 | `data/question-bank/dotnet-architecture-guidance.md` |

Also: `data/classification-overrides.json` maps the 26 new question topics onto the new matrix topics, so *Expected scope* and the questions share one topic page (`ScopeCoverageTests` stays green: every scoped topic has questions).

Every scope bullet of the four new sections now has at least one question that addresses it.

## Upgrade steps

1. Back up `./data` (database **and** `./data/keys`) as usual.
2. Copy the files listed in `CHANGED-FILES-v6.txt` over your tree. There is **no schema change and no EF migration**.
3. If you mount your own copies of the seed files into `/data`, also copy `data/question-bank/`, the skill matrix and `classification-overrides.json` there.
4. `docker compose build && docker compose up -d`. The idempotent import runs at startup (or use *Settings -> Run import now*): expect 121 new questions and 4 new sections; progress, notes, favourites and user content are untouched. Admin-edited or admin-deleted seed items are preserved.

## Verification status

- `node scripts/validate-content.mjs`: all 121 new questions pass the structural checks (ids, topic ids, 3+ keywords, 2+ follow-ups, a code example and a *Real-world example* lead-in). It still reports six **pre-existing** findings in `azure.md`, `dotnet-gaps.md`, `kubernetes-aks.md`, `realtime-frontend.md` and `testing-tools.md` (answers without the *Real-world example* lead-in); they are untouched by this update.
- A script check confirmed that every new `topic_id` resolves through the overrides to an existing matrix topic and every new matrix topic has questions.
- **No .NET SDK was available while writing this update: the C# importer and test suite were not run.** The change is data-only, but run `dotnet test` (or `docker compose build`, which runs the tests) before deploying.
- Code samples are illustrative and were **not compiled**. API shapes for Microsoft.Extensions.AI, MEVD, MEDI, the MCP C# SDK, Microsoft Agent Framework and the evaluation libraries were checked against the Microsoft Learn pages, but those libraries are evolving (some prerelease): pin versions and re-check signatures when you copy a sample.
