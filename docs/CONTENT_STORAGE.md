# Where the knowledge base should live

## Recommendation

**Keep Markdown as the authoring format, split it into one file per subject, and keep SQLite as the runtime store.**

```text
data/
  dotnet_10_year_technology_skill_matrix.md      sections + topics (the curriculum)
  dotnet_10_year_interview_question_bank.md      legacy 39-topic bank (unchanged, still imported)
  question-bank/                                  ONE FILE PER SUBJECT (any *.md below this folder is imported)
    javascript.md  typescript.md  angular.md  react.md
  examples/                                       OPTIONAL "real-world code example" overlays keyed by question_id
    01-csharp-aspnet-rest.md ... 08-comparisons-scenarios-behavioral-lldrapidfire.md
  classification-overrides.json                  topic_id -> section/topic mapping
        │
        ▼  parsers (QuestionBankParser, ExamplesParser, SkillMatrixParser)
   idempotent import  ──►  SQLite  ──►  ASP.NET Core API  ──►  Angular UI
```

The database was already the runtime source of truth (search, progress, notes, admin edits, audit). The question is only how the *seed* is authored and versioned, and that is what changes.

## Why not something else?

| Option | Verdict |
|---|---|
| **One giant Markdown file** (today: 329 KB, 251 questions) | Works, but merge conflicts, slow review and accidental edits grow with every subject. Splitting fixes this without changing the format. |
| **Markdown per subject + examples overlay (chosen)** | Diff-friendly in Git, readable by humans and by the existing parser, code blocks stay real code, new subject = new file, no schema change, no migration. |
| JSON / YAML per question | Machine-friendly, but long answers and code blocks become escaped strings that are painful to write and review. Good for generated data, bad for prose + code. |
| Database as the only source (admin UI) | Fine for small edits (already supported: admin edits are preserved), but there is no review history, no diff, and bulk authoring in a browser is slow. |
| Headless CMS / external service | Adds a second system to host, secure and back up; breaks the "one SQLite file, downloadable app" architecture. |

## Rules that keep it healthy

1. **One subject per file** under `data/question-bank/`; ids are `<topic_id>-NNN` and are never reused (they are the stable import key).
2. **The skill matrix owns the structure.** Add a `# N. Subject` section with a `## … 10-year target` heading and `###` topics; map each bank `topic_id` to `section/topic` in `classification-overrides.json`.
3. **Every new question carries a real-world code example** in its answer. For existing questions, add an entry to `data/examples/*.md` instead of editing the large legacy file.
4. **Run `node scripts/validate-content.mjs`** before committing. It checks ids, topic ids, keywords, follow-ups, balanced code fences and that every example points at a real question.
5. Never rename a `question_id` or `topic_id`; add a new one and let the admin delete the old one (deletions are remembered, so they are not re-imported).
6. Admin edits win: a question marked admin-edited is not overwritten by a re-import (so it will not receive a newly added example either).

## When to revisit

- **Thousands of questions or non-developer authors:** add an admin "import Markdown file" endpoint and per-file hashing so only changed files are parsed.
- **Need for structured fields** (company tags, last-asked date, YAML front matter): extend the bank format with optional fields; the parser already ignores unknown fields.
- **Multi-instance deployments:** SQLite stays single-instance per the architecture rules; move to a server database only if that rule changes.
