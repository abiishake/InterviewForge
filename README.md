# InterviewForge — .NET Interview Preparation

A self-hosted study tool for senior/lead .NET engineers. It imports the supplied **skill matrix** and **interview question bank**, lets you follow a day-by-day **preparation plan** or freely **search/explore**, add **your own sections, topics and questions**, practise in **interview mode** with lightweight **spaced review**, and study a **C# algorithms** catalogue.

- **Backend:** ASP.NET Core 10 Web API · EF Core 10 · **SQLite** (the production database — no DB server needed)
- **Frontend:** Angular 21 (standalone components, signals, lazy-loaded features), safe Markdown rendering (marked + DOMPurify)
- **Deployment:** one Docker container, port **8888**, data persisted in `./data`

---

## 1. Quick start on Debian (Docker)

Prerequisites: Docker Engine with the Compose plugin.

```bash
# Install Docker if needed (Debian 12/13)
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER   # log out/in afterwards

# Get the code (copy the folder/zip to the server, or git clone your repo)
cd InterviewForge
cp .env.example .env
mkdir -p data
# Set Admin__Email and Admin__Password (12+ characters) in .env before starting.

docker compose build          # builds Angular + .NET, runs all tests
docker compose up -d
```

Open **http://SERVER_IP:8888**. On first start the app creates `./data/interviewforge.db`, applies migrations and imports the Markdown seed files (≈112 questions, ~20 sections, 49 algorithms).

If a firewall is active: `sudo ufw allow 8888/tcp`.

### Everyday commands

```bash
docker compose ps              # status + health
docker compose logs -f         # structured JSON logs
docker compose restart         # restart the app
docker compose down            # stop (data in ./data is kept)
docker compose up -d           # start again
```

### Updating safely

```bash
cd InterviewForge
./scripts/backup.sh            # 1. back up the database (see §2)
git pull                       # 2. or copy the new source over the old folder (keep ./data and .env)
docker compose build           # 3. tests run during the build; a failing build leaves the old container running
docker compose up -d           # 4. recreates the container; migrations apply automatically on startup
docker compose logs -f         # 5. confirm "Import finished" and no errors
```

Your progress, notes, plans and own questions live only in `./data/interviewforge.db`, which is never touched by rebuilding the image.

### Changing the port

Edit `.env` — no code change required:

```env
HOST_PORT=9000   # port on the Debian host
APP_PORT=8888    # port inside the container (ASPNETCORE_URLS)
```

---

## 2. SQLite backup & restore

The whole database is the single file `./data/interviewforge.db` (plus `-wal`/`-shm` files while running, because WAL mode is enabled).

**Simplest (consistent) backup – stop, copy, start:**

```bash
docker compose stop
mkdir -p backups && cp data/interviewforge.db backups/interviewforge-$(date +%F-%H%M).db
docker compose start
```

**Online backup without stopping** (uses SQLite's backup API; requires `sudo apt-get install sqlite3`):

```bash
./scripts/backup.sh            # writes backups/interviewforge-YYYY-MM-DD-HHMM.db
```

Nightly cron example (`crontab -e`):

```cron
15 3 * * * cd /home/you/InterviewForge && ./scripts/backup.sh >/dev/null 2>&1
```

**Restore:**

```bash
docker compose stop
cp backups/interviewforge-2026-10-15-0315.db data/interviewforge.db
rm -f data/interviewforge.db-wal data/interviewforge.db-shm
docker compose start
```

---

## 3. Using the app

| Area | What you can do |
|---|---|
| **Dashboard** | Day X of N, today's target and topics, overall %, topics completed, streak, overdue items, due reviews, *Continue preparation* |
| **Preparation → Current plan** | Calendar of days; pause/resume, skip a day, move a question to another day, reschedule unfinished work to today, regenerate, edit questions/day & duration & sections, restart |
| **Knowledge base** | Sections → topics → questions with filters (All / Not started / Completed / Needs review / Favorites / My questions) and the skill-matrix *expected scope* per topic |
| **Question page** | Hidden answer + *Reveal* (Space), mark complete / needs review, favorite, personal difficulty, private notes (Markdown), references, previous/next (k/j) |
| **Search** | Multi-word, case-insensitive search across sections, topics, questions, answers, tags, your notes, your questions and algorithms |
| **Interview mode** | Answer mentally → show answer → rate *Easy / Okay / Hard / Didn't know* (keys 1–4). Ratings drive spaced review |
| **Review** | Due now, needs review, hard, recently incorrect (14 days), favorites |
| **Algorithms** | 49 classics (arrays, strings, linked lists, stacks/queues, trees, graphs, searching, sorting, DP) with C# code, complexity, examples, interview questions and mistakes |
| **My content** | Create/rename/delete your own sections & topics; create/edit/delete questions with Markdown preview, tags and URLs |
| **Settings** | Re-run the idempotent import; links to Swagger and health |

Imported content is **read-only for members**. Members add shared contributions (tagged with their display name) and edit/delete only their own additions. Administrators can edit/delete any knowledge-base content; other users submit feedback for admin review. Personal notes, progress, ratings, favorites and plans remain isolated per account. Algorithms support contributions and owner/admin editing too.

---

## 4. Seed data & import

Seed files live in `data/` (also baked into the image under `/app/seed`):

| File | Purpose |
|---|---|
| `dotnet_10_year_technology_skill_matrix.md` | Sections, topics, priorities and topic scope |
| `dotnet_10_year_interview_question_bank.md` | Questions, answers, difficulty, follow-ups |
| `algorithms_csharp.md` | Algorithms catalogue |
| `classification-overrides.json` | Optional manual corrections of question-topic → section mapping |

The importer runs on startup (`Import__RunOnStartup=Always|IfEmpty|Never`) and via **`POST /api/admin/import`** (or *Settings → Run import now*). It is **idempotent**: sections/topics are keyed by a stable source key, questions by `question_id` (fallback: normalized-text hash), algorithms by slug. Running it twice creates nothing new, and it never touches progress, notes, plans or user content.

To change seed content on the server, edit the files in `./data` (the importer prefers `/data` when it contains the question bank, otherwise it uses the baked-in copies) and run the import again.

The expected Markdown formats and the classification rules are documented in **[docs/IMPORT_FORMAT.md](docs/IMPORT_FORMAT.md)**.

---

## 5. Local development

Requirements: .NET 10 SDK, Node 22+.

```bash
# API (http://localhost:8888, Swagger at /swagger). Uses ./data-local/interviewforge.db and seeds from ./data
cd src/InterviewForge.Api && dotnet run

# Angular dev server with proxy to the API (http://localhost:4200)
cd frontend/interview-forge && npm ci && npm start

# Tests (unit + multi-user integration tests, real SQLite)
dotnet test
```

### EF Core migrations

```bash
dotnet tool install -g dotnet-ef
dotnet ef migrations add <Name> -p src/InterviewForge.Infrastructure -s src/InterviewForge.Api -o Migrations
dotnet ef database update      -p src/InterviewForge.Infrastructure -s src/InterviewForge.Api
```

In Docker, pending migrations are applied automatically at startup (`Database.MigrateAsync`) before the app begins serving. This is appropriate for a single-instance SQLite deployment; take a backup before upgrading.

---

## 6. Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

```text
Angular SPA (wwwroot) ──► ASP.NET Core Web API (controllers, DTOs, global error handler, health, OpenAPI)
                              │
                              ▼
                       Application layer  (services, plan generator, review scheduler, parsers, classifier, validation)
                              │
                              ▼
                       Domain layer       (entities & enums, no dependencies)
                              ▲
                       Infrastructure     (EF Core DbContext, SQLite, migrations)
                              │
                              ▼
                       /data/interviewforge.db
```

### API overview

```text
GET    /api/dashboard
GET    /api/sections · GET /api/sections/{id} · POST/PUT/DELETE /api/sections[/{id}]
GET    /api/topics?sectionId= · GET /api/topics/{id} · GET /api/topics/{id}/questions?filter=
GET    /api/questions?topicId=&filter=&tag= · GET /api/questions/{id}
POST   /api/questions · PUT /api/questions/{id} · DELETE /api/questions/{id}
POST   /api/questions/{id}/progress      { status?, rating?, isFavorite?, personalDifficulty? }
PUT    /api/questions/{id}/note          { body }
GET    /api/search?q=entity+framework&filter=&page=
GET    /api/plans · POST /api/plans · GET/PUT/DELETE /api/plans/{id} · GET /api/plans/current
GET    /api/plans/{id}/days · GET /api/plans/{id}/days/{day}
POST   /api/plans/{id}/generate?fromDay= · /pause · /resume · /restart · /current · /reschedule
POST   /api/plans/{id}/days/{day}/skip · POST /api/plans/{id}/items/{itemId}/move { targetDayNumber }
GET    /api/progress · GET /api/review · GET /api/review/queue?bucket=Due|Hard|NeedsReview|RecentlyIncorrect|Favorites|All
GET    /api/algorithms · GET /api/algorithms/{slug} · GET /api/tags · GET /api/notes
POST   /api/admin/import
GET    /health · /health/live · /swagger · /openapi/v1.json
```

Errors always use:

```json
{ "error": { "code": "QUESTION_NOT_FOUND", "message": "The requested question (42) was not found.", "details": null } }
```

---

## 7. Security notes

- Email/password accounts use ASP.NET Core password hashing and HttpOnly, SameSite=Strict cookies. All study and content APIs require a session; ownership and admin roles are enforced server-side. Roles are stored separately from profiles.
- Configure the first administrator through `Admin__Email` / `Admin__Password`; public signup never grants administrator privileges. Existing `local` study data and legacy contributions are assigned to this administrator.
- Use HTTPS for public deployment and set `Auth__SecureCookies=true`. Keep `.env` private. Every API mutation requires `X-InterviewForge: 1`; no CORS origins are enabled. Login/signup are rate-limited.
- Persist and back up `/data/keys` alongside SQLite so cookie signatures remain stable after rebuilds. Keys are protected by filesystem permissions; encryption at rest is not configured.
- User progress is visible to administrators through the read-only Administration view; private notes are not exposed there.
- Markdown is rendered client-side through marked → DOMPurify; raw HTML/scripts/event handlers/iframes are stripped, only `http(s)`, `mailto` and in-app links survive, and external links open with `target="_blank" rel="noopener noreferrer"`.
- Reference URLs are validated server-side (absolute http/https only — `javascript:`/`data:` rejected).
- EF Core parameterizes all queries; LIKE wildcards in search input are escaped.
- Request bodies are limited to 1 MB; field lengths are validated.
- Strict Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` headers.
- The container runs as the unprivileged `app` user. Bootstrap credentials are environment configuration, never source constants.
- This update does not add email verification or email-based password recovery. Signup signs users in immediately.
- Existing dependency audit warnings remain in the original dependency set; this update is not a full dependency security audit.
