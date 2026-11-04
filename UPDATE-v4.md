# InterviewForge v4 update

This update implements `INTERVIEWFORGE_V4_IMPLEMENTATION_BRIEF.md` except the Vitest and Playwright suites (explicitly excluded) and the items under **Not done**.

## Upgrade steps

1. Back up `./data` (database **and** `./data/keys`).
2. Copy the files listed in `CHANGED-FILES-v4.txt` over your tree, and **delete** `src/InterviewForge.Api/data/keys/key-e52d9297-d03b-4d50-9ae7-fbacb0a480af.xml` (removed from git in this update).
3. `docker compose build && docker compose up -d`. The additive migration `AddUserManagement` runs at startup.

## Mandatory owner actions (cannot be done in code)

- **Rotate the admin password.** The old default in `appsettings.json` was committed to the repository; treat it as public. `appsettings.json` now ships an empty `Admin:Password`; set `Admin__Password` (12+ characters) in `.env` for first start or lock-out recovery. Rewriting git history does not un-leak it.
- **Rotate the key ring.** The committed Data Protection key is removed from the tree and ignored. If any deployment used it, delete the deployed `/data/keys` directory (everyone signs in again once). Purge history with `git filter-repo --path src/InterviewForge.Api/data/keys --invert-paths` if the repo is shared.

## Done

**Security / config:** S1 (secret removed, startup refuses without a strong admin password), S2 (key file untracked, `.gitignore`/`.dockerignore`, warning when `Auth__KeyDirectory` is unset in Production), S3 (`Proxy:Enabled`, `Proxy:KnownProxies`, `Proxy:KnownNetworks` forwarded headers), S4 (CSP `img-src 'self' data:`; remote Markdown images render as links), S5 (docs only in Development / `Api:ExposeDocs=true`, otherwise OpenAPI JSON is admin-only), S6 (per-username back-off: 5 failures lock 1 min, doubling to 15), D3, D4 (`.github/workflows/ci.yml`).

**Backend:** B1 (per-user IANA time zone, `IUserClock`; plan day, streak, completed-today and activity use the local date), B4 (favourite/difficulty-only calls keep `NotStarted`), B5 (un-completing clears `CompletedAt` and the auto review date), B6 (user questions no longer block seed import), B10 (`LocalUser` and default interface members removed; unauthenticated access maps to 401), B14 (activity retention 400 days, audit 365 days, pruned at startup).

**User management (section 4):** new `Account` columns, `AuditLog` and `AppSetting` tables; cookie re-validation with security stamp and 30 s snapshot cache; `UserAdminService` (list/search/filter/sort/page without N+1, create, edit, role, disable/enable, reset password, revoke sessions, delete with reassignment to the acting admin labelled "former member", registration switch); self-service `/api/account` (profile, time zone, password change, sign out other devices); forced password change enforced server-side (`403 PASSWORD_CHANGE_REQUIRED`); last-admin and self-action guards (`409 LAST_ADMIN`, `409 SELF_ACTION_NOT_ALLOWED`); audit log API; bootstrap limited to the `local` account with lock-out recovery (`bootstrap.recovery` audit row).

**Frontend:** light/dark/system theme with pre-paint `theme-init.js` (CSP-safe), AA-oriented palette; shell hidden on the sign-in page, skip link, backdrop/Esc/`aria-expanded` mobile drawer, 44 px touch targets; themeable `DialogService` (native `<dialog>`, bottom sheet on phones) replacing every `confirm()`/`prompt()`; auth page with password reveal, registration-closed and session-expired states; F4 (cached user cleared on 401, guard re-validates); Account page; Administration area (`/admin/users`, user detail with Profile/Security/Progress/Audit tabs and danger zone, create user, feedback with status filter, import, settings, audit log with CSV export). `/settings` redirects to `/admin/import`.


**Second pass (bug fixes B2, B3, B7, B8, B11, B12, B13 and frontend fixes F1-F3, F5, F7-F10, F12, F13, B9):**
- B2: `GET /api/{questions|topics|sections}/{id}/impact` returns counts only; members get `409 CONTENT_IN_USE` when other members have progress/notes, admins may delete (audited as `content.force_delete`); `GET /api/admin/deleted-seeds` and `POST /api/admin/deleted-seeds/restore` bring a deleted seed item back (audited `seed.restore`).
- B3: feedback DTOs carry `contentTitle`, `contentUrl` (algorithms use their slug), `contentExists`, `createdAt`; deleting content marks its feedback `ContentDeleted`; `GET /api/feedback/all` is paged and filterable by status.
- B7: moving a plan item is limited to days 1..duration+1. B8: a plan whose questions are all completed reports `Completed` (dashboard and plan page offer "Create next plan"). B11: `QuestionBankParser` and `SkillMatrixParser` ignore `#`/`##` and field markers inside ``` / ~~~ fences (`AlgorithmMarkdownParser` already did). B12: `POST /api/admin/import` returns counts and warnings; classifications only with `?verbose=true`. B13: section/topic rename enforces uniqueness and refreshes the slug.
- F3: `GET /api/questions` accepts `sectionId`, `random=true`, `limit`; interview pools are built server-side.
- F1: progress responses and note saves are tagged with the question id and dropped if the user moved on; loading uses `switchMap`. F2: rating is guarded while a request is in flight (no double submit, error keeps the same question). F5: one `ShortcutService` ignores modifiers, key repeat, focused controls, editable fields and open dialogs. F7/F8: shared pagination on review, notes, my content, topic questions, search (search pages the query that produced the results), feedback. F9: the feedback form is a dialog that resets when the target changes and shows errors and a counter. F10: debounced note autosave with a saved/saving state plus unload protection. F12: unloaded font names removed (system font stack). F13: dates use the date pipe. B9: plan edit keeps topic selection; "Make this my current plan" checkbox; live "about N questions/day will fit" estimate; start date defaults to the server's today. B1 (frontend): dashboard and heat-map use the server's local date.
- UI (section 3): five-destination information architecture (Home, Plan, Practice, Library, Me, plus Admin); bottom tab bar with a More drawer below 768 px, icon rail from 768 px, labelled sidebar from 1024 px; back chevron on nested phone pages; Ctrl/Cmd+K command palette (live search, recent searches, quick actions); icon set; skeleton, empty-state, pagination, ring, menu and dialog components; month-style plan calendar (agenda list on phones); plan actions in a menu; day-picker dialog instead of a 365-option select; sticky question action bar, notes panel at 1440 px, copy buttons on code blocks; interview mode as a focus view with a rating grid and session summary; algorithm tabs on phones; section/progress rings; inline `style=""` attributes removed.

## Behaviour changes users will notice

- "Today", streaks and plan days follow the account's time zone (detected at sign-in, editable on the Account page).
- Accounts created or reset by an administrator must change the temporary password first.
- Disabling, deleting, role changes and password resets apply within 30 seconds.
- Remote images in shared Markdown are shown as links.
- Members cannot delete shared content that other members have studied; the delete confirmation shows the impact for admins.
- Interview mode and question pages use the new layouts; the tab bar is hidden in interview mode and replaced by the action bar on question pages (phones).

## Verification (this machine)

- `dotnet build -c Release`: succeeded.
- `dotnet test`: **94 passed, 0 failed** (39 unit, 55 integration).
- `npx ng build --configuration production`: no warnings; initial bundle about 404 kB raw / 110 kB transfer (budget 150 kB).
- `npm audit --omit=dev`: 0 vulnerabilities.
- Manual smoke test in the built-in browser against a locally running instance (fresh SQLite DB, seeded): sign-in, dashboard, question page, and `/plan`, `/sections`, `/topics`, `/algorithms`, `/progress`, `/admin/users`, `/account`, `/interview` at a 375 px viewport had no horizontal page overflow and no console errors; the user table collapses to cards.
- Pre-existing test drift fixed: the earlier knowledge-bank update changed seed counts (203 questions, 5 in the EF Core topic); three assertions still expected the old numbers.

## Not done

- Vitest and Playwright suites (excluded by request), axe/Lighthouse runs, and the screenshot set at the five viewports in both themes.
- Optional swipe navigation on question pages; the shared `app-data-table`, `app-avatar`, `app-badge`, `app-tabs` pieces exist as CSS classes and page-level markup rather than separate components.
- A real v3 database upgrade and `docker compose build` were not run on this machine (the migration is covered by an automated upgrade test).
- B8 (derived `Completed` plan status) has no dedicated automated test.

## Known limitations

- The 30-second snapshot cache is per process (single-instance SQLite assumption).
- Login back-off state is in memory and resets on restart.
