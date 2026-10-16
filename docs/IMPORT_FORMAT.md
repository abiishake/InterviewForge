# Seed Markdown formats & classification

The Markdown files are **input**, not the domain model:

```text
Markdown ──► Parser ──► Import DTOs ──► Classifier ──► Domain entities ──► EF Core ──► SQLite
```

## 1. Skill matrix (`dotnet_10_year_technology_skill_matrix.md`)

| Markdown | Becomes |
|---|---|
| `# N. Title` | a candidate **section** (sort order = N) |
| a `##` heading containing *target*, *should know* or *Recommended knowledge/level* | marks the candidate as a learning section; its content defines topics |
| `###` heading below the target heading | a **topic** (text after ` --- ` is dropped, e.g. `SQL Server --- expert` → `SQL Server`) |
| bullets below a topic heading | the topic's **scope** (shown on the topic page) |
| generic headings (`Core`, `Strong`, `Useful`, `Primary`, `Supporting`, `Must know`, `Other`, `Concepts`, `Recommended additions`…) | folded into one `<Section> Essentials` topic |
| bullets under a `## … Resume technologies` heading | the section description |
| priority words in headings (`Core`, `expert`, `Must` → Core; `Strong`; `Useful`; `Legacy`) | topic priority |

Narrative sections without a target heading (purpose, executive profile, tier summaries, final assessment) are ignored. A synthetic **Interview Scenarios** section is added last for cross-cutting material.

## 2. Question bank (`dotnet_10_year_interview_question_bank.md`)

```markdown
# TOPIC --- Entity Framework Core
**topic_id:** `ef-core`
**priority:** `Core`

## ef-core-001 --- Explain change tracking and AsNoTracking.
**question_id:** `ef-core-001`
**topic_id:** `ef-core`
**difficulty:** `Senior / Lead`
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Markdown…

**Answer**

Markdown… (URLs and code blocks allowed)

**Keywords:** `a, b, c`        (may also be on the next line)

**Follow-ups:**

-   …
```

Tolerances: `---`, `--`, `—`, `–` are accepted as separators; trailing pandoc `\` line breaks are removed; a missing `question_id` falls back to the heading id or a slug; unknown fields are ignored.

Difficulty labels are seniority bands, so they are mapped to an **initial estimate** (`Senior` → Advanced, `Senior / Lead` → Expert, `Junior` → Beginner, otherwise Intermediate). You can override per question in the UI.

## 3. Classification (question-bank topic → matrix section/topic)

1. **Override** in `classification-overrides.json` (`"topic_id": "section-slug"` or `"section-slug/topic-slug"`).
2. **Scoring**: technology phrases are normalised (`Entity Framework Core`/`EF Core` → `efcore`, `C#` → `csharp`, `SQL Server` → `sqlserver`, …). Each matrix section is scored by token overlap with the bank topic title — section heading ×6, topic headings ×4, scope bullets ×1 — plus 0.25 per overlap with the bank's question titles.
3. **Topic reuse**: inside the winning section, a matrix topic whose heading tokens are all contained in the bank title is reused (e.g. bank *Entity Framework Core* → matrix *EF Core*, *Kubernetes and AKS* → *Kubernetes*). Otherwise a new topic with the bank title is created in that section — no duplicates.
4. Score below threshold → **Interview Scenarios**.

The import report (`POST /api/admin/import`) lists every classification with its score so you can tune the overrides file.

## 4. Idempotency & duplicates

- Sections: `matrix:section:<slug>`; topics: `matrix:topic:<section>/<slug>` or `bank:topic:<topic_id>`.
- Questions: unique `ExternalId` (= `question_id`); a new id whose normalised text hash already belongs to another question is skipped as a duplicate.
- Re-imports update changed text/answers/classification in place; user progress, notes, favorites and user-created content are never modified.

## 5. Algorithms (`algorithms_csharp.md`)

```markdown
# Category: Arrays
## Two Sum
### Problem Statement
### Explanation
### Approach
### Time Complexity
### Space Complexity
### C# Implementation
### Example
### Common Interview Questions
### Common Mistakes
```

Headings inside fenced code blocks are ignored. Entries are keyed by `category-name` slug.
