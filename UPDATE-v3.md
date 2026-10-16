# InterviewForge v3 — Username sign-up

Apply on top of v2: copy these files over your source tree (keep your `data/` folder), then `docker compose build && docker compose up -d`.

- Sign-up fields: Username (unique, case-insensitive, 3-32 chars: letters, digits, . _ -), Name, Email (unique), Password (min 12).
- Sign-in uses Username + Password.
- Sign-up always creates a normal member. The only admin is the one in `appsettings.json` → `Admin` (Username, Password, DisplayName, Email). Change `Admin:Password` before first start, or override with `Admin__Password` in `.env`.
- Database upgrade runs automatically: existing admin gets username `admin` (or your configured Admin:Username); other existing accounts get `user_<id>`.
