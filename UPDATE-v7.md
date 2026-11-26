# InterviewForge v7 update: resume questions

Members can upload their resumes and get interview questions tailored to each one. Skills the knowledge base doesn't cover yet are reported to administrators.

## What changed

- **Resume → Resume questions** (new navigation section; under *More* on phones).
  - Uploads accept PDF or LaTeX `.tex`, up to 5 MB, with up to 20 resumes per account.
  - Each resume gets its own question list, grouped by the skills found in it.
  - Resume lists are private to their owner and separate from the study plan.
  - Questions come from the shared knowledge base, so status, favourites and notes are the same as everywhere else.
- **Skill detection** is offline and deterministic. No AI service is called, and nothing leaves the server.
  - A curated catalog of about 300 technologies (`src/InterviewForge.Application/Resumes/SkillCatalog.cs`) recognises skills and their aliases, for example `k8s` as Kubernetes.
  - Anything listed under a *Skills* or *Technologies* heading is also picked up.
- **Matching to the knowledge base:**
  - Skills match topic names, section names and tags. A short related-names map catches skills the knowledge base covers under another title, such as SignalR under *Real-time* or xUnit under *Unit testing*.
  - Matching runs every time a resume is opened. When an administrator adds a topic, existing resumes show its questions automatically.
- **Administration → Missing topics** lists skills from resumes that match no knowledge-base content.
  - Each entry shows the skill and how many resumes asked for it, never who uploaded them or any resume text.
  - Entries close automatically once matching content exists. Administrators can also mark them added, dismiss them or reopen them. Every change is written to the audit log.
  - Open entries show a count badge in the admin navigation.
- **Optional email digest:** with `Email__SmtpHost` and `Email__From` set, administrators get one email every `Email__DigestIntervalMinutes` (default 15) listing new missing topics. It is sent to the email address of every enabled admin account, with recipients in Bcc.
- Deleting an account also deletes its resumes. Only the text extracted from a resume is stored, never the original file.
- New dependency: [PdfPig](https://github.com/UglyToad/PdfPig) 0.1.16 (Apache-2.0, pure .NET) for PDF text extraction.

## Upgrade steps

1. Back up `./data` (the database **and** `./data/keys`) as usual.
2. Copy the files listed in `CHANGED-FILES-v7.txt` over your tree.
3. There is **one additive EF migration**, `AddResumes`. It creates the `Resumes`, `ResumeSkills` and `MissingTopicRequests` tables and changes no existing table. It runs automatically at startup.
4. Optional: add the `Email__*` settings from `.env.example` to your `.env` to turn on the admin email digest. Without them, the in-app *Missing topics* page still works.
5. Run `docker compose build && docker compose up -d`.

## Limitations

- Questions cover the **skills** a resume mentions, not the person's own projects. Project-specific questions would need an AI service.
- Scanned, image-only PDFs have no text layer and are rejected with a clear message. Password-protected PDFs are rejected too.
- `.tex` files are converted with a lightweight LaTeX stripper, not a TeX engine. Content produced by custom macros defined in other files may be missed.

## Verification status

- **Tests:** `dotnet test` passes, with 56 unit and 59 integration tests.
  - 9 unit tests cover LaTeX stripping, alias and longest-match detection, case-sensitive terms, parsing of skills sections, upload and missing-topic counting, automatic refresh and closing when a topic is added, privacy between accounts, file validation, and the email digest (with a fake sender).
  - 4 integration tests use real HTTP:
    - Uploads of a `.tex` file and of a real generated PDF.
    - Another account gets 404 on someone else's resume.
    - Rename and delete.
    - Rejection of wrong file types, fake PDFs and oversized files.
    - A member gets 403 on the admin endpoints.
    - The admin listing contains no uploader or resume text, and dismissing an entry writes an audit row.
- **Frontend:** `ng build` succeeds. The app was run locally and the upload, resume detail, resume list and admin *Missing topics* pages were checked in a browser at desktop and phone widths, with no console errors and no horizontal scrolling.
- **Not tested:** delivery through a real SMTP server. The digest logic is unit-tested, but sending uses `System.Net.Mail` against your mail server, so send a test digest after configuring it.
