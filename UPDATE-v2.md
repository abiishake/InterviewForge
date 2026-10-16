# InterviewForge v2 — changes-only upgrade

This archive contains only added/modified files relative to the original InterviewForge source archive. Extract it **over the existing source folder**; it is not a standalone project. Do not delete unchanged files, `.env`, seed files, or `data/interviewforge.db`.

## Upgrade on Debian

1. Back up SQLite with the existing `scripts/backup.sh` and copy your `.env` somewhere safe.
2. Stop the running container: `docker compose stop`.
3. Extract this archive from the parent of your existing `InterviewForge` folder, allowing replacement of source files.
4. Add these entries to your existing `.env` (do not replace it with `.env.example`):

```env
Admin__Email=YOUR_REAL_ADMIN_EMAIL
Admin__Password=YOUR_UNIQUE_PASSWORD_AT_LEAST_12_CHARACTERS
Admin__DisplayName=YOUR_DISPLAY_NAME
Auth__KeyDirectory=/data/keys
Auth__SecureCookies=false
```

5. Rebuild/restart:

```bash
cd InterviewForge
docker compose build
docker compose up -d
docker compose logs -f
```

6. Open `http://SERVER_IP:8888`, sign in using the configured administrator, then open **Administration**.

The additive migration runs automatically before serving requests. The first administrator receives the existing `local` progress, notes, plans, favorites and legacy user-created content. Public signup never claims these or grants administrator access. Bootstrap settings do not reset the administrator password on later starts. Keep `/data/keys` persistent and protected; back it up with the database.

## Permissions and workflow

- Members create accounts with email, display name and password (12+ characters), and sign in immediately after signup.
- All users see the shared knowledge base, including contributions tagged **Added by [display name]**.
- Members edit/delete only their own sections, topics, questions and algorithms. Deleting a container is blocked if it would delete another contributor's content or imported content.
- Only administrators edit/delete imported content or other users' contributions. Their edits survive re-import; deleted imported records are not resurrected by seed import.
- Feedback on sections, topics, questions or algorithms goes into a private submission list and the administrator's review queue. Accept/reject/reopen and admin responses are supported. Acceptance does not silently modify content: open the content, edit it, and then mark feedback accepted.
- Study plans, progress, notes, ratings, favorites, review queues and personal difficulty remain account-specific. Administrators can read user progress, plan summaries and recent activity; notes stay private.
- Settings/import and the admin progress/feedback APIs require the administrator role.

## Verification

- **60 tests passed**: 35 existing unit tests and 25 integration tests, including real SQLite migration/legacy-data preservation, ownership boundaries, shared algorithms, feedback privacy/review, admin access, immediate signup session, sign-out and concurrent first progress saves.
- Angular production build passed.
- Browser flow verified signup → create question → complete it → add algorithm → sign out → admin sign in → review feedback → read the user's progress, with no browser runtime errors.
- Desktop and mobile admin views inspected; mobile width remained 390px without horizontal overflow.
- Docker itself was not available here; run the Docker build/start on your deployment server.

## Security / operational limits

- Serve over HTTPS for public use and set `Auth__SecureCookies=true`; leave false only for HTTP local testing. Never transmit passwords over public HTTP.
- API mutations require `X-InterviewForge: 1`, automatically supplied by the app; no CORS origins are enabled. Session cookies are HttpOnly and SameSite=Strict. Auth requests are rate-limited (10/minute/IP; the test environment uses a larger limit).
- Password hashes use ASP.NET Core Identity's password hasher; administrator credentials come from environment configuration, not source.
- This remains a **single-instance SQLite** deployment. Personal-state writes are serialized to prevent simultaneous first-update conflicts; do not run multiple replicas against the same SQLite file.
- Email verification, email delivery and forgotten-password recovery are not added. Display names are stored at contribution time for attribution; profile editing is not included.
- Original dependency audit warnings remain; this is not a full dependency security audit.
- The Lovable preview remains the original deployment page; this update applies to the downloadable self-hosted application only.
