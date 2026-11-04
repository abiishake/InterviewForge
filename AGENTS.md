# Architecture rules
- Keep this downloadable application on its existing ASP.NET Core, Angular and SQLite architecture; the Lovable preview is only a source/deployment page.
- Authenticate API requests with HttpOnly cookies and derive account identity from server claims; request payloads never control ownership or administrator roles.
- Store roles separately from account profile data; public registration always creates a member.
- Use server-enforced contributor ownership for shared knowledge-base mutations, and preserve imported admin edits/deletions during seed import.
- Keep study state keyed by the authenticated account and expose administrator progress as read-only projections, not impersonation or note access.
- Treat SQLite as single-instance and serialize personal-state writes to avoid concurrent first-row unique-key conflicts.
- Disabled or deleted accounts are rejected by cookie validation (security stamp); admin endpoints never expose private notes and never impersonate users.
- Every administrator mutation writes an audit row in the same transaction, without secrets.
- Ship additive EF migrations and changes-only archives for upgrades so existing source and persisted data survive.
