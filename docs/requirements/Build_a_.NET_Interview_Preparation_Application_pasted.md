# Build a .NET Interview Preparation Application

## Role

You are a **Senior/Principal .NET Software Architect and Full-Stack Developer**.

I want you to design and implement a production-quality **.NET-based Interview Preparation Application** that I can run on my own self-hosted Debian server using Docker.

The application is intended for a **senior/lead .NET developer with approximately 10 years of experience** who wants to prepare systematically for technical interviews over several days or weeks.

I am providing two Markdown files:

1. `dotnet_10_year_technology_skill_matrix.md`
2. `dotnet_10_year_interview_question_bank.md`

These files are the primary source of truth for the application's initial technology/topic classification and interview questions.

---

# 1. Core Objective

Build an application that provides two major ways of preparing for interviews:

### Mode 1 — Follow a Preparation Plan

The user creates or selects an interview preparation plan.

The application breaks the technology scope from:

`dotnet_10_year_technology_skill_matrix.md`

into:

- Sections
- Topics
- Subtopics where appropriate
- Daily targets
- Questions to study
- Answers to questions
- Progress tracking

The user should be able to prepare over a configurable number of days/weeks.

For example:

```text
30 Day .NET Interview Preparation

Day 1
 ├── C# Fundamentals
 ├── OOP
 └── Collections

Day 2
 ├── Advanced C#
 ├── LINQ
 └── Async/Await

Day 3
 ├── .NET Core
 ├── Dependency Injection
 └── Middleware

...

Day 30
 ├── System Design
 ├── Architecture
 └── Mock Interview
```

The actual classification should be derived from the provided skill matrix rather than hard-coded assumptions.

The user should be able to:

- See today's targets
- See completed targets
- See pending targets
- Open topics
- Read interview questions
- Read answers
- Mark questions as completed
- Mark topics as completed
- Move incomplete work to another day
- Review previous days
- See overall progress
- See progress by section/topic
- Continue from where they stopped

---

# 2. Mode 2 — Topic / Interview Knowledge Lookup

The user should NOT be forced to follow the preparation plan.

Provide a prominent **Search / Explore Topics** experience.

The user can search for:

```text
Entity Framework
```

or:

```text
async await
```

or:

```text
RabbitMQ
```

or:

```text
Kubernetes
```

or:

```text
System Design
```

The application should return the relevant:

- Sections
- Topics
- Subtopics
- Interview questions
- Answers
- User-created questions
- User-created answers

The search must search both:

1. Questions imported from `dotnet_10_year_interview_question_bank.md`
2. Questions created by the user

The user should be able to access any topic at any time regardless of the current preparation-plan day.

---

# 3. User-Generated Content

The application must allow the user to extend the interview database.

The user can create:

```text
Section
    ↓
Topic
    ↓
Question
    ↓
Answer
```

For example:

```text
Section:
Azure

Topic:
Azure Functions

Question:
What are Azure Functions?

Answer:
Azure Functions is a serverless compute service...
```

User-created content must behave exactly like imported content.

It should appear in:

- Topic pages
- Search results
- Preparation plan
- Question lists
- Review pages
- Progress tracking

The user must be able to:

- Create
- Edit
- Delete
- Search
- Mark as completed
- Favorite/bookmark
- Add notes
- Add URLs
- Categorize

their own questions.

---

# 4. URL Support

Answers can contain URLs.

Example:

```text
ASP.NET Core middleware is executed through the request pipeline.

Official documentation:
https://learn.microsoft.com/aspnet/core/fundamentals/middleware/
```

URLs must:

- Be automatically detected
- Be rendered as clickable links
- Open in a new browser tab
- Be safe against XSS
- Preserve URLs when editing
- Work for both imported and user-created answers

Prefer Markdown-style links where appropriate:

```markdown
[ASP.NET Core Middleware Documentation](https://learn.microsoft.com/...)
```

The UI should render Markdown safely.

Do NOT allow arbitrary HTML to be executed from answers.

---

# 5. Interview Question Experience

When opening a topic, show something similar to:

```text
.NET Core
────────────────────────────

Dependency Injection

[Question]
What is Dependency Injection?

[Answer]
Dependency Injection is a design pattern...

[Question]
What are Singleton, Scoped and Transient lifetimes?

[Answer]
...

[Question]
What happens if a Singleton depends on a Scoped service?

[Answer]
...

[✓ Mark Complete]
[☆ Favorite]
[📝 Add Note]
```

The question page should make it easy to:

- Hide/show answers
- Reveal answer
- Mark question as known
- Mark question as needs review
- Favorite question
- Add personal notes
- Edit user-created questions
- Navigate to next/previous question

Consider adding a **"Reveal Answer"** interaction so that the user can test themselves before seeing the answer.

---

# 6. Preparation Plan

Create a flexible preparation-plan system.

The user should be able to configure:

```text
Plan Name:
10 Day .NET Interview Preparation

Duration:
10 days

Questions per day:
25

Study time:
2 hours/day
```

or:

```text
Plan Name:
30 Day Senior .NET Interview Preparation

Duration:
30 days

Questions per day:
20
```

The system should distribute topics/questions across the selected number of days.

However, the plan should respect the hierarchy from the skill matrix.

For example:

```text
Section
   ├── Topic A
   ├── Topic B
   ├── Topic C

Section 2
   ├── Topic D
   ├── Topic E
```

Do NOT simply randomly distribute questions.

Create a sensible progression from:

```text
Fundamentals
      ↓
Intermediate
      ↓
Advanced
      ↓
Architecture
      ↓
System Design
      ↓
Production/Cloud
      ↓
Interview Scenarios
```

Where the provided skill matrix establishes an appropriate ordering, follow it.

---

# 7. Daily Dashboard

The home page should show the user's current preparation status.

Example:

```text
Good Morning!

Day 7 of 30

Today's Progress
████████████░░░░ 75%

18 / 24 Questions Completed

Today's Topics

✓ Async / Await
✓ Task Parallelism
→ Entity Framework
→ SQL Performance
○ Redis

[Continue Preparation]
```

Also show:

- Current streak
- Total questions completed
- Questions remaining
- Topics completed
- Overall percentage
- Today's target
- Overdue topics
- Questions requiring review

Avoid excessive gamification. The application should primarily feel like a serious technical study tool.

---

# 8. Progress Tracking

Track progress at multiple levels.

## Question Level

Possible states:

```text
Not Started
In Progress
Completed
Needs Review
```

## Topic Level

Calculate progress based on questions completed.

Example:

```text
Entity Framework

18 / 25 questions completed

72%
```

## Section Level

Example:

```text
C#

78%

.NET

64%

SQL Server

81%

Angular

54%

System Design

42%
```

## Overall

Example:

```text
Overall Preparation

68%

412 / 605 questions completed
```

The user should be able to drill down:

```text
Overall
 ↓
Section
 ↓
Topic
 ↓
Question
```

---

# 9. Review System

Include a review mechanism.

The user should be able to mark questions:

```text
Easy
Medium
Hard
Needs Review
```

Create a review area:

```text
Review

Questions needing revision: 34

Hard:
12

Needs Review:
15

Recently Incorrect:
7
```

The application should make it easy to revisit difficult questions.

If practical, implement a lightweight spaced-review mechanism, but do NOT make the application unnecessarily complex.

---

# 10. Common Algorithms Section

Apart from the technology-based interview preparation, create a dedicated section:

```text
Common Algorithms & Data Structures
```

This section should be independent of the technology skill matrix.

It should contain common interview algorithms implemented in **C#**.

Examples include:

### Arrays

- Two Sum
- Maximum Subarray
- Merge Sorted Arrays
- Rotate Array
- Remove Duplicates
- Kadane's Algorithm

### Strings

- Reverse String
- Palindrome
- Anagram
- Character Frequency
- Longest Substring Without Repeating Characters

### Linked Lists

- Reverse Linked List
- Detect Cycle
- Merge Two Sorted Lists
- Find Middle Node
- Remove Nth Node

### Stack / Queue

- Valid Parentheses
- Min Stack
- Queue using Stacks
- Stack using Queues

### Trees

- DFS
- BFS
- Inorder Traversal
- Preorder Traversal
- Postorder Traversal
- Maximum Depth
- Binary Search Tree validation

### Graphs

- BFS
- DFS
- Detect Cycle
- Topological Sort
- Shortest Path

### Searching

- Linear Search
- Binary Search
- Binary Search variations

### Sorting

- Bubble Sort
- Selection Sort
- Insertion Sort
- Merge Sort
- Quick Sort
- Heap Sort

### Dynamic Programming

Include common interview-level problems where appropriate.

Each algorithm should contain:

```text
Algorithm Name

Problem Statement

Explanation

Approach

Time Complexity

Space Complexity

C# Implementation

Example

Common Interview Questions

Common Mistakes
```

The C# implementation should use modern, clean C#.

---

# 11. Custom Sections

The user should be able to create completely custom learning sections.

For example:

```text
Section:
Company Specific Questions

Topic:
Company A

Questions:
What architecture does the company use?

What database technology do they use?

How would you improve their API?
```

Another example:

```text
Section:
Project Experience

Topic:
My Current Project

Question:
Explain the architecture of my current application.

Answer:
...
```

The hierarchy should therefore support:

```text
Section
    ↓
Topic
    ↓
Question
    ↓
Answer
```

with no hard-coded restriction that sections must be .NET technologies.

---

# 12. Initial Data Import

The two supplied Markdown files must be parsed and imported into the database.

## File 1

```text
dotnet_10_year_technology_skill_matrix.md
```

This defines:

- Sections
- Technologies
- Topics
- Skill categories
- Expected proficiency/scope
- Potential topic hierarchy

Use it as the source for classification.

## File 2

```text
dotnet_10_year_interview_question_bank.md
```

This contains:

- Questions
- Answers
- Topics/categories

Map questions from this file to the appropriate topics defined by the skill matrix.

Do NOT duplicate topics unnecessarily.

For example, if the question bank has:

```text
Entity Framework Core
```

and the skill matrix contains:

```text
.NET → Data Access → Entity Framework Core
```

map the questions to that existing topic.

---

# 13. Important Import Requirement

Create an import mechanism rather than manually hardcoding hundreds of questions.

The application should have a mechanism such as:

```text
POST /api/admin/import
```

or a startup/import command that can:

1. Read the Markdown files
2. Parse sections/topics/questions/answers
3. Classify questions
4. Detect duplicates
5. Insert/update records
6. Preserve relationships

The import should ideally be **idempotent**.

Running the importer twice should NOT create duplicate questions.

Use a stable identifier/hash where appropriate.

---

# 14. Architecture

Use a modern production-grade .NET architecture.

Prefer:

```text
Frontend
   ↓
ASP.NET Core Web API
   ↓
Application Layer
   ↓
Domain Layer
   ↓
Infrastructure Layer
   ↓
Database
```

A clean architecture / modular architecture approach is preferred.

Suggested solution:

```text
InterviewForge.sln

src/
    InterviewForge.Api/
    InterviewForge.Application/
    InterviewForge.Domain/
    InterviewForge.Infrastructure/

tests/
    InterviewForge.UnitTests/
    InterviewForge.IntegrationTests/
```

If you determine another architecture is more appropriate, explain why before implementing it.

Avoid unnecessary over-engineering.

---

# 15. Backend Technology

Use a current supported version of **ASP.NET Core / .NET**.

Use:

- ASP.NET Core Web API
- Entity Framework Core
- SQL Server or PostgreSQL
- Dependency Injection
- Configuration via appsettings/environment variables
- Structured logging
- Global exception handling
- Validation
- Health checks
- OpenAPI/Swagger
- Async APIs
- CancellationToken where appropriate

The application must be suitable for production deployment.

---

# 16. Database

Design a normalized relational database.

At minimum consider entities such as:

```text
Section
Topic
Question
Answer
QuestionTag
Plan
PlanDay
PlanItem
UserProgress
UserNote
Favorite
Review
```

You may modify this model if a better design exists.

Important relationships:

```text
Section
  1 ─── N Topic

Topic
  1 ─── N Question

Question
  1 ─── 1 Answer
```

For plans:

```text
Plan
  1 ─── N PlanDay

PlanDay
  1 ─── N PlanItem

PlanItem
  ─── Question
```

Progress should be separated from the question itself.

Do not store mutable user progress directly on the question record.

---

# 17. User Model

Initially this can be a **single-user application** because it will run on my private Debian server.

Do not introduce a complex multi-user authentication system unless it is useful for the architecture.

However, design the application so authentication can be added later.

If authentication is implemented, use standard ASP.NET Core authentication practices.

Do NOT hardcode credentials.

---

# 18. Search

Implement application-level search.

Search should cover:

- Section names
- Topic names
- Question text
- Answer text
- User-created questions
- Tags
- Notes where appropriate

Example:

```text
Search: "dependency injection"

Results:

.NET
  → Dependency Injection

12 Questions

1. What is dependency injection?
2. Explain service lifetimes.
3. What is constructor injection?
4. What happens when scoped service is injected into singleton?
...
```

Search should be fast and case-insensitive.

If full-text search is useful for the chosen database, use it appropriately.

---

# 19. Tags

Allow questions/topics to have tags.

Examples:

```text
#CSharp
#DotNet
#EntityFramework
#SQL
#Azure
#SystemDesign
#Microservices
#RabbitMQ
#Angular
#React
#Interview
#Advanced
```

Tags can help search and filtering.

---

# 20. Markdown Rendering

Answers should support Markdown.

Supported content should include:

- Headings
- Bold
- Italics
- Bullet lists
- Numbered lists
- Code blocks
- Inline code
- Tables where appropriate
- Links

Example:

```markdown
## Dependency Injection

A service can be registered as:

```csharp
services.AddScoped<IOrderService, OrderService>();
```

Documentation:

[Microsoft Documentation](https://learn.microsoft.com/)
```

Render this safely on the frontend.

Never execute arbitrary HTML/JavaScript contained inside user-provided Markdown.

---

# 21. API Design

Create RESTful APIs.

Examples:

```text
GET    /api/sections
GET    /api/sections/{id}

GET    /api/topics
GET    /api/topics/{id}

GET    /api/topics/{id}/questions

GET    /api/questions/{id}

POST   /api/questions
PUT    /api/questions/{id}
DELETE /api/questions/{id}

POST   /api/questions/{id}/progress

GET    /api/search?q=entity+framework

GET    /api/plans
POST   /api/plans

GET    /api/plans/{id}/days
GET    /api/plans/{id}/days/{day}

POST   /api/plans/{id}/generate

GET    /api/progress

GET    /api/review
```

Follow proper HTTP semantics.

Use DTOs rather than exposing EF entities directly.

---

# 22. Frontend

Create a modern responsive frontend.

You may use **Angular** for the frontend because this is intended as a .NET developer interview-preparation application and Angular is part of the technology scope.

Prefer:

- Angular
- TypeScript
- RxJS
- Angular routing
- Reactive forms
- Reusable components
- Lazy-loaded feature areas
- Responsive UI

Suggested structure:

```text
frontend/

src/app/

core/
    services/
    interceptors/
    models/

shared/
    components/
    pipes/
    directives/

features/

dashboard/
plan/
sections/
topics/
questions/
search/
algorithms/
review/
notes/
settings/
```

Keep the frontend maintainable and modular.

---

# 23. Main UI

Create a clean developer-focused interface.

Suggested sidebar:

```text
INTERVIEW FORGE

Dashboard

Preparation
    Current Plan
    Today's Target
    Calendar
    Progress

Knowledge Base
    Sections
    Topics
    Search

Algorithms
    Data Structures
    Algorithms
    C# Implementations

Review
    Needs Review
    Favorites
    Difficult Questions

My Content
    My Questions
    My Sections

Settings
```

---

# 24. Dashboard

Dashboard should contain cards such as:

```text
Current Plan
Day 8 / 30

Today's Target
20 Questions

Completed Today
14 / 20

Overall Progress
63%

Questions
412 / 650

Topics
32 / 54
```

Also include:

```text
Continue Learning
```

which opens the next incomplete question/topic.

---

# 25. Topic Page

A topic page should show:

```text
.NET
  → Entity Framework
```

Then:

```text
Entity Framework

Description

Progress: 72%

Questions

[1] What is Entity Framework Core?
[2] EF Core vs Dapper?
[3] What is Change Tracking?
[4] What is AsNoTracking?
...
```

Allow filtering:

```text
All
Not Started
Completed
Needs Review
Favorites
My Questions
```

---

# 26. Question UI

Each question should support:

```text
Question:
What is Change Tracking in EF Core?

Difficulty:
Advanced

Answer:

...

Code Example:

...

References:

Microsoft Documentation ↗

[Reveal Answer]
[Mark Complete]
[Needs Review]
[Favorite]
[Add Note]
```

The user should be able to collapse the answer to practice recalling it.

---

# 27. Question Creation

Provide an intuitive form:

```text
Create Question

Section
[.NET                  ]

Topic
[Entity Framework      ]

Question
[_____________________]

Answer
[Markdown editor       ]

Difficulty
[Easy / Medium / Hard]

Tags
[#EFCore #Database]

References
[URL]

[Save]
```

Support Markdown preview.

---

# 28. Plan Generation Algorithm

Create a sensible plan-generation service.

Inputs:

```text
Plan duration
Daily study time
Questions per day
Selected sections/topics
```

Output:

```text
Plan
 ├── Day 1
 ├── Day 2
 ├── Day 3
 ...
```

The algorithm should consider:

- Topic hierarchy
- Topic priority
- Difficulty
- Number of questions
- Estimated study time
- Previously completed questions
- User-selected sections

Avoid assigning the same question repeatedly unless it is part of review.

Allow the user to regenerate the plan.

---

# 29. Plan Flexibility

The user should be able to:

- Pause a plan
- Resume a plan
- Skip a day
- Move a task
- Reschedule unfinished questions
- Change questions/day
- Change duration
- Add/remove topics
- Restart a plan

Never delete historical progress simply because a plan is regenerated.

---

# 30. Interview Mode

Consider adding a focused **Interview Mode**.

In this mode:

```text
Question:
Explain how dependency injection works in ASP.NET Core.
```

The answer is hidden.

The user mentally answers.

Then:

```text
[Show Answer]
```

After revealing:

```text
How well did you know this?

○ Easy
○ Okay
○ Hard
○ Didn't Know
```

Store this result for review.

---

# 31. Architecture / System Design Questions

The application should support questions that are not simple factual questions.

For example:

```text
Design a scalable notification system.

Requirements:
- 1 million users
- High availability
- Async processing
- Retry
- Dead-letter queues
```

Answers may contain:

- Architecture explanations
- Diagrams represented in Markdown/Mermaid if supported
- Code
- Trade-offs
- Scaling considerations
- Failure scenarios

Ensure Markdown rendering is secure.

---

# 32. Seed Data

The initial database should be populated from the supplied Markdown files.

Do not create a tiny fake dataset merely to demonstrate the application.

The actual application should be capable of importing the full question bank.

If the Markdown structure is ambiguous, create a robust parser and document the expected Markdown format.

---

# 33. Docker

The entire application must be deployable using Docker on Debian.

Create:

```text
Dockerfile
docker-compose.yml
.env.example
```

Prefer a multi-stage Docker build.

Example architecture:

```text
Internet
   ↓
Debian Server
   ↓
Docker
   ↓
InterviewForge
   ↓
ASP.NET Core
   ↓
Database
```

The application should be accessible at:

```text
http://<server-ip>:8888
```

The application itself must listen on port `8888`.

If using Docker port mapping, support:

```text
8888:8888
```

Do not require me to manually modify the source code to change the port.

Use environment variables.

Example:

```env
ASPNETCORE_URLS=http://+:8888
ConnectionStrings__DefaultConnection=...
```

---

# 34. Docker Compose

Create a production-oriented `docker-compose.yml`.

At minimum include:

```text
interviewforge
database
```

Use persistent volumes for the database.

The application must survive container restarts without losing data.

Provide health checks where appropriate.

---

# 35. Debian Deployment

Provide exact deployment instructions for a Debian server.

Example:

```bash
git clone ...
cd InterviewForge

cp .env.example .env

docker compose build
docker compose up -d
```

Then:

```text
http://SERVER_IP:8888
```

Also document:

```bash
docker compose ps
docker compose logs -f
docker compose restart
docker compose down
```

Explain how to update the application safely.

---

# 36. Configuration

Never hardcode:

- Database credentials
- Secrets
- API keys
- Connection strings
- JWT secrets
- Environment-specific configuration

Use:

```text
appsettings.json
appsettings.Development.json
Environment Variables
.env
```

Ensure `.env` is excluded from Git.

---

# 37. Logging

Implement structured logging.

Log:

- Application startup
- Database connection issues
- Import operations
- Plan generation
- API errors
- Important application events

Do NOT log sensitive information.

---

# 38. Error Handling

Create centralized exception handling.

API responses should have a consistent structure.

For example:

```json
{
  "error": {
    "code": "QUESTION_NOT_FOUND",
    "message": "The requested question was not found."
  }
}
```

Use appropriate HTTP status codes.

---

# 39. Validation

Validate:

- Required fields
- Question length
- Answer length
- URLs
- IDs
- Plan duration
- Questions/day
- Invalid relationships

Return useful validation messages.

---

# 40. Testing

Create automated tests.

At minimum:

### Unit Tests

Test:

- Plan generation
- Markdown parsing
- Question classification
- Search
- Progress calculations
- Review logic
- Validation

### Integration Tests

Test:

- API endpoints
- EF Core database operations
- Question creation
- Topic retrieval
- Plan generation
- Progress updates

The important business logic must be testable independently from the API.

---

# 41. Performance

The application may eventually contain thousands of questions.

Design accordingly.

Use:

- Database indexes
- Pagination
- Async EF Core
- Efficient projections
- `AsNoTracking()` for read-only queries where appropriate
- Avoid N+1 queries
- Server-side filtering
- Server-side searching
- Lazy loading only if there is a strong reason

Do not load the entire question bank into the browser.

---

# 42. Security

Even though this is primarily a private self-hosted application:

Implement sensible security practices.

Protect against:

- SQL injection
- XSS
- Unsafe Markdown
- Malicious URLs
- Invalid input
- Overly large payloads

Sanitize rendered Markdown.

For links, consider:

```text
target="_blank"
rel="noopener noreferrer"
```

Do not allow:

```text
javascript:
data:
```

URLs unless explicitly safe.

---

# 43. Database Migrations

Use EF Core migrations.

The application should support:

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

For Docker deployment, document how migrations are applied.

Prefer an automated startup migration only if implemented safely and appropriately for this single-user deployment.

---

# 44. Project Structure

Produce a clean repository such as:

```text
InterviewForge/

├── src/
│   ├── InterviewForge.Api/
│   ├── InterviewForge.Application/
│   ├── InterviewForge.Domain/
│   └── InterviewForge.Infrastructure/
│
├── frontend/
│   └── interview-forge/
│
├── tests/
│   ├── InterviewForge.UnitTests/
│   └── InterviewForge.IntegrationTests/
│
├── data/
│   ├── dotnet_10_year_technology_skill_matrix.md
│   └── dotnet_10_year_interview_question_bank.md
│
├── docker/
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
└── README.md
```

You may modify the structure if there is a strong architectural reason.

---

# 45. Important Domain Model Requirement

Do not tightly couple the database model to the exact Markdown structure.

The Markdown files are **input/seed data**, not the application's permanent domain model.

The application should be able to evolve independently.

For example:

```text
Markdown
   ↓
Parser
   ↓
Import DTO
   ↓
Domain Model
   ↓
EF Core
   ↓
Database
```

---

# 46. Initial Classification

When importing questions from:

`dotnet_10_year_interview_question_bank.md`

classify each question according to:

`dotnet_10_year_technology_skill_matrix.md`

For example:

```text
Section:
C#

Topic:
Async/Await

Question:
What is the difference between Task and Thread?
```

or:

```text
Section:
ASP.NET Core

Topic:
Middleware

Question:
Explain the ASP.NET Core middleware pipeline.
```

The classification should be explicit in the database.

Do not depend entirely on dynamically searching the Markdown files at runtime.

---

# 47. Handling Ambiguous Questions

Some questions may reasonably belong to multiple topics.

Support multiple topic associations if useful.

For example:

```text
Question:
How would you design a highly scalable .NET API?

Topics:
- ASP.NET Core
- Microservices
- System Design
- Performance
- Cloud
```

However, avoid unnecessary duplication of the question itself.

Use relationships/tags where appropriate.

---

# 48. Question Difficulty

Support:

```text
Beginner
Intermediate
Advanced
Expert
```

The initial difficulty can be inferred from the question bank where possible.

Do not pretend the difficulty is objectively accurate.

Allow the user to change it.

---

# 49. Favorites and Notes

Allow:

```text
☆ Favorite
```

and:

```text
My Notes

[textarea]
```

Notes should belong to the user/question relationship rather than changing the canonical answer.

This is important because the original question/answer should remain intact.

---

# 50. Imported vs User Content

Clearly distinguish:

```text
Source:
Imported
```

versus:

```text
Source:
User
```

User content should be editable.

Imported content can either be read-only or editable depending on implementation.

Prefer keeping original imported content intact while allowing user-specific notes/overrides.

---

# 51. Dashboard Search

Provide global search accessible from every page.

Keyboard shortcut would be useful:

```text
Ctrl + K
```

Search:

```text
Entity Framework
```

Results:

```text
Topics
Questions
Algorithms
My Questions
```

---

# 52. Responsive Design

The UI should work on:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop is the primary target.

Use a clean developer-oriented design rather than a generic marketing website.

---

# 53. UX Principles

Prioritize:

1. Fast navigation
2. Minimal clicks
3. Easy reading
4. Easy question review
5. Strong search
6. Clear progress
7. Focused preparation
8. Excellent code rendering
9. Excellent Markdown rendering
10. No unnecessary animations

The user should be able to go from:

```text
Dashboard
→ Today's Topic
→ Question
→ Reveal Answer
→ Mark Complete
→ Next Question
```

with minimal friction.

---

# 54. Future Extensibility

Design the architecture so these can be added later:

- Multiple users
- Authentication
- AI-generated questions
- AI answer evaluation
- Mock interviews
- Voice-based interviews
- Interview timer
- Company-specific interview plans
- Import from PDF
- Import from additional Markdown files
- Export to Markdown/PDF
- Question analytics
- Spaced repetition
- Interview history
- Cloud deployment

Do NOT implement all future features now.

Build a clean foundation that makes them possible.

---

# 55. AI Features — Do Not Make Them Mandatory

The first version should NOT depend on an external AI API.

The core application must work completely offline/self-hosted except for URLs the user chooses to visit.

AI functionality can be added later.

---

# 56. Important Requirement: Actually Build It

Do not merely give me an architecture document.

I want you to **generate the actual application code**.

Start by analyzing the two supplied Markdown files.

Then:

1. Understand the skill matrix
2. Understand the question bank
3. Determine the hierarchy
4. Design the domain model
5. Design the database
6. Design the APIs
7. Design the frontend
8. Implement the backend
9. Implement the frontend
10. Implement Markdown import
11. Implement search
12. Implement preparation plans
13. Implement progress tracking
14. Implement algorithms section
15. Implement user-created sections/topics/questions
16. Add Docker support
17. Add tests
18. Add documentation

---

# 57. Do Not Take Shortcuts

Do NOT:

- Create a toy application
- Hardcode only 10 questions
- Use fake placeholder data instead of the supplied question bank
- Ignore the provided Markdown files
- Store everything as one giant JSON document
- Put business logic inside controllers
- Expose EF Core entities directly
- Put database logic inside Angular components
- Hardcode the port
- Hardcode database credentials
- Use insecure Markdown rendering
- Create duplicate topics for every question
- Implement search only on the frontend
- Lose user progress when plans change

---

# 58. Development Approach

Work incrementally.

First show me:

```text
1. Understanding of the supplied Markdown files
2. Proposed domain model
3. Proposed architecture
4. Proposed database schema
5. Proposed API structure
6. Proposed frontend structure
7. Implementation plan
```

Then implement the application.

If the project is too large to generate in one response, continue in logical phases.

Do not omit critical files just because the project is large.

When generating code, provide complete files rather than fragments wherever possible.

---

# 59. Code Quality

Follow modern .NET practices.

Use:

- Nullable reference types
- Dependency injection
- SOLID principles
- Clean separation of concerns
- Async/await
- CancellationToken
- DTOs
- Fluent validation or equivalent validation approach
- EF Core best practices
- Structured logging
- API versioning if appropriate
- OpenAPI
- Automated tests

Avoid:

- God classes
- God controllers
- Static service classes for business logic
- Service locator
- Excessive abstraction
- Repository pattern purely for the sake of abstraction when EF Core already provides the required abstraction

Use pragmatic architecture.

---

# 60. Database Choice

Choose between:

```text
PostgreSQL
```

and:

```text
SQL Server
```

based on the application's requirements and Docker/self-hosted environment.

Explain the choice briefly.

If PostgreSQL is selected, use PostgreSQL-specific features only where they provide meaningful value.

If SQL Server is selected, ensure it is practical to run in Docker on my Debian server.

---

# 61. Port

The final application must be reachable on:

```text
http://<server-ip>:8888
```

Use:

```text
8888
```

as the application's external port.

Make sure there is no conflict between:

- Angular frontend
- ASP.NET Core API
- Docker
- Reverse proxy, if used

If using a single-container deployment, explain the approach.

If using separate frontend/backend containers, explain the networking and port mapping.

Prefer a simple deployment suitable for a personal self-hosted server.

---

# 62. README

Create a comprehensive README containing:

## Requirements

```text
Docker
Docker Compose
Git
```

## Development

Explain:

```text
Backend development
Frontend development
Database
Migrations
Seed/import
```

## Production

Explain:

```bash
docker compose build
docker compose up -d
```

## Access

```text
http://SERVER_IP:8888
```

## Logs

```bash
docker compose logs -f
```

## Updating

Explain how to update without losing the database.

## Backup

Explain how to back up the database volume/data.

## Troubleshooting

Include common issues and solutions.

---

# 63. Deliverables

The final implementation should contain:

### Backend

- .NET solution
- API
- Domain models
- Application services
- Infrastructure
- EF Core DbContext
- Migrations
- DTOs
- Validators
- Exception handling
- Logging
- Health checks
- Swagger/OpenAPI
- Import service
- Search service
- Plan generation service
- Progress service
- Review service

### Frontend

- Angular application
- Dashboard
- Preparation plan
- Daily targets
- Sections
- Topics
- Question list
- Question detail
- Search
- Algorithms
- User content management
- Notes
- Favorites
- Review
- Settings

### Infrastructure

- Dockerfile
- docker-compose.yml
- `.env.example`
- Database configuration
- Health checks
- Persistent storage

### Tests

- Unit tests
- Integration tests

### Documentation

- README
- Architecture explanation
- Database schema explanation
- API documentation
- Deployment instructions

---

# 64. Acceptance Criteria

Consider the application complete only when all of the following work:

### Knowledge Base

- [ ] Sections exist
- [ ] Topics exist
- [ ] Questions exist
- [ ] Answers exist
- [ ] Questions are correctly classified
- [ ] Imported questions are searchable

### User Content

- [ ] User can create sections
- [ ] User can create topics
- [ ] User can create questions
- [ ] User can create answers
- [ ] User can edit their questions
- [ ] User can delete their questions
- [ ] User-created questions appear in search

### URLs

- [ ] URLs are clickable
- [ ] Links open safely in a new tab
- [ ] Markdown links work
- [ ] Unsafe HTML/JavaScript is not executed

### Preparation

- [ ] User can create a plan
- [ ] User can specify duration
- [ ] User can specify daily target
- [ ] Questions are distributed intelligently
- [ ] User can see today's target
- [ ] User can complete questions
- [ ] User can resume the plan
- [ ] User can reschedule unfinished work

### Progress

- [ ] Question progress works
- [ ] Topic progress works
- [ ] Section progress works
- [ ] Overall progress works
- [ ] Review status works
- [ ] Favorites work
- [ ] Notes work

### Search

- [ ] Topic search works
- [ ] Question search works
- [ ] Answer search works
- [ ] User-created content is searchable
- [ ] Search is server-side

### Algorithms

- [ ] Algorithms section exists
- [ ] C# implementations exist
- [ ] Complexity is displayed
- [ ] Algorithm questions can be reviewed

### Deployment

- [ ] Docker build works
- [ ] Docker Compose works
- [ ] Database persists
- [ ] Application runs on Debian
- [ ] Application is accessible on port 8888
- [ ] Restarting containers does not lose data

---

# 65. Final Instruction

Treat the two Markdown files as important project inputs.

Do not ignore their contents.

Before implementation, inspect their actual structure and use them to create the initial knowledge hierarchy.

The final product should feel like a serious **personal .NET Interview Knowledge Base + Structured Interview Preparation Platform**, not merely a CRUD application.

The primary workflow should be:

```text
                    ┌─────────────────────┐
                    │      Dashboard      │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
     ┌──────────────────┐              ┌──────────────────┐
     │ Preparation Plan │              │  Search / Explore│
     └────────┬─────────┘              └────────┬─────────┘
              │                                 │
              ▼                                 ▼
       Today's Targets                     Section / Topic
              │                                 │
              └──────────────┬──────────────────┘
                             ▼
                     ┌─────────────────┐
                     │    Questions    │
                     └────────┬────────┘
                              ▼
                     ┌─────────────────┐
                     │     Answer      │
                     └────────┬────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
          Complete         Review           Favorite
                              │
                              ▼
                           Notes
```

The application should allow me to switch seamlessly between **structured preparation** and **free-form knowledge lookup**.

The end goal is that I can use this application every day to prepare for senior/lead .NET interviews and continuously expand my own interview knowledge base.

Now analyze the two Markdown files and begin designing and implementing the application.