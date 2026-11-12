# InterviewForge v5 update: JavaScript, TypeScript, Angular, React and code examples everywhere

## What changed

- **Four new skill-matrix sections** (33-36): JavaScript (7 topics), TypeScript (4), Angular (9), React (7), each with topic scope bullets.
- **104 new interview questions** in `data/question-bank/{javascript,typescript,angular,react}.md`, every answer with a *Real-world example* and a code block (modern Angular standalone/signals, React 18/19 hooks and Server Components, strict TypeScript, ES2024 JavaScript; all tied to an ASP.NET Core backend).
- **A real-world code example for all 251 existing questions**, stored in `data/examples/*.md` (keyed by `question_id`) and appended to each answer at import time as **Real-world code example**. The 329 KB legacy question bank is untouched.
- **Storage recommendation** in [`docs/CONTENT_STORAGE.md`](docs/CONTENT_STORAGE.md): Markdown per subject as the authoring format, SQLite as the runtime store.
- Importer: reads every `*.md` under `data/question-bank/` and `data/examples/` (new `ImportOptions.QuestionBankDirectory` / `ExamplesDirectory`; defaults need no configuration). New `ExamplesParser`.
- `scripts/validate-content.mjs`: dependency-free content check (ids, topic ids, keywords, follow-ups, balanced fences, examples point at real questions).
- `classification-overrides.json`: 27 new topic mappings, plus `modern-dotnet -> backend-dotnet` (without it, the new JavaScript section would have captured that topic by token overlap).

## Upgrade steps

1. Back up `./data` (database **and** `./data/keys`) as usual.
2. Copy the files listed in `CHANGED-FILES-v5.txt` over your tree. There is **no schema change and no EF migration**.
3. If you mount your own copies of the seed files into `/data`, also copy `data/question-bank/` and `data/examples/` there, and replace your copies of the skill matrix and `classification-overrides.json`. (The importer reads the folders from the same directory in which it finds the legacy question bank.)
4. `docker compose build && docker compose up -d`. The idempotent import runs at startup (or use *Settings -> Run import now*): expect about 354 new questions and 4 new sections; existing progress, notes, favourites and user content are untouched.

## Behaviour to know

- Questions an administrator has edited (`IsAdminEdited`) are not overwritten, so they will not receive the new code example. Create the example yourself or reset the question.
- Deleted seed items stay deleted (existing `DeletedSeeds` behaviour).
- The new sections are numbered 33-36 in the matrix, so they appear after the existing sections (before *Interview Scenarios*). Renumber the `# N.` headings in the matrix file if you prefer them next to *Frontend*.

## Verification status

- `node scripts/validate-content.mjs`: 355 questions, 251/251 legacy questions have an example, all 104 new answers contain code.
- All 113 JavaScript/TypeScript/TSX blocks were syntax-checked with esbuild; C#, SQL, YAML and the other languages were **not** compiled (they are illustrative snippets).
- A Python port of the skill-matrix parser and topic classifier showed no change in classification for the 39 existing bank topics once the `modern-dotnet` override was added.
- **The C# changes (importer, `ExamplesParser`, tests) were written in an environment without the .NET SDK and have not been compiled or run.** Run `dotnet test` (or `docker compose build`, which runs the tests) before deploying. New tests: `ExamplesParserTests`, `SplitContentTests`; `Import_is_idempotent` now expects the split-bank questions as well.
