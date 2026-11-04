# Zecko AI --- 10-Year .NET Developer Interview Question Bank

> Database-friendly interview bank based on the supplied .NET
> technology/skills matrix. Each question has stable identifiers and
> classification fields.

## Record Format

Every record uses: `question_id`, `topic_id`, `difficulty`,
`question_type`, `question`, `answer`, `keywords`, `follow_ups`.

# TOPIC --- C# and .NET Language Internals

**topic_id:** `csharp`\
**priority:** `Core`\
**category:** `Interview`

## csharp-001 --- What is the difference between class, struct, record and record struct?

**question_id:** `csharp-001`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between class, struct, record and record struct?

**Answer**

A class is a reference type and is appropriate when identity, mutable
state or polymorphism matters. A struct is a value type and is copied by
value, so it should generally be small and value-like. A record provides
concise data-oriented syntax and value-based equality, while a record
struct combines record semantics with value-type behavior. In an
enterprise application I would commonly use classes for EF entities,
records for immutable DTOs/commands where useful, and structs only when
their value semantics and small size provide a real benefit. Real-world
example: In an insurance claims platform the Claim entity is a class
because it has identity and a lifecycle tracked by EF Core;
CreateClaimCommand and ClaimResponse are records so they are immutable
and compare by value in tests; and a readonly record struct Money
(amount plus currency) avoids heap allocations when millions of line
items are summed. Making the Claim entity itself a mutable struct would
cause surprising copy bugs because changes would apply to copies.

**Keywords:**
`what, is, the, difference, between, class,, struct,, record`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## csharp-002 --- Explain IEnumerable versus IQueryable and why it matters in EF Core.

**question_id:** `csharp-002`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain IEnumerable versus IQueryable and why it matters in EF Core.

**Answer**

IEnumerable represents a sequence that is normally processed in .NET
memory. IQueryable represents a query expression that a provider such as
EF Core can translate into SQL. Keeping an EF query as IQueryable allows
filtering, projection and ordering to execute in the database. Calling
ToList too early can materialize a large result set and move subsequent
filtering into memory. A senior developer should know where execution
happens and inspect generated SQL rather than assuming LINQ is always
executed in the application. Real-world example: A back-office reporting
endpoint for an e-commerce company called context.Orders.ToList() and
then filtered by date in memory, pulling an entire orders table into the
web server and spiking memory. Keeping the query as IQueryable and
applying Where and Select before materializing made SQL Server return
only the few hundred rows needed, and logging the generated SQL in a
lower environment confirmed the filter had moved into the WHERE clause.

**Keywords:**
`explain, ienumerable, versus, iqueryable, and, why, it, matters`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## csharp-003 --- Explain async/await, Task and Thread.

**question_id:** `csharp-003`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain async/await, Task and Thread.

**Answer**

A Thread is an execution resource; Task represents asynchronous work or
a future result. async/await is language support for composing
asynchronous operations. During an I/O operation such as SQL or HTTP,
await allows the current thread to return to the runtime instead of
blocking while the external resource responds. This improves scalability
for I/O-heavy servers. It does not make CPU-bound work free: CPU-heavy
work still consumes CPU and may require a different execution strategy.
Real-world example: A payments API that awaits a bank-gateway call and a
SQL query lets a small set of threads serve thousands of concurrent
requests during a sale. The classic failure is a legacy MVC action
calling .Result on an async method, which blocks a thread per request
and freezes the site under load until the call chain is async end to
end. CPU-bound work such as PDF generation or image resizing belongs on
a worker fed by a queue, not wrapped in Task.Run on the web server.

**Keywords:** `explain, async/await,, task, and, thread.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## csharp-004 --- What are exception handling best practices in C#, and what is the difference between throw and throw ex?

**question_id:** `csharp-004`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are exception handling best practices in C#, and what is the
difference between throw and throw ex?

**Answer**

Catch only exceptions you can handle or add context to, let the rest
bubble to a central handler, and never swallow exceptions silently. Use
throw to rethrow because it preserves the original stack trace, while
throw ex resets it. Prefer specific exception types, exception filters
(catch when) for conditional handling, and avoid using exceptions for
normal control flow because they are expensive. Real-world example: a
payment service caught Exception, logged a message and returned null, so
failed charges looked like successes in reports; replacing that with a
domain PaymentDeclinedException handled at the API boundary and mapped
to a 402 or 422 ProblemDetails made failures visible, and using throw
instead of throw ex kept the original stack frame that pointed to the
gateway call.

**Keywords:**
`what, are, exception, handling, best, practices, in, c#,, and, what`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- ASP.NET Core and Web API

**topic_id:** `aspnet-core`\
**priority:** `Core`\
**category:** `Interview`

## aspnet-core-001 --- Explain the ASP.NET Core middleware pipeline.

**question_id:** `aspnet-core-001`\
**topic_id:** `aspnet-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain the ASP.NET Core middleware pipeline.

**Answer**

Middleware executes in an ordered request pipeline. A middleware can run
code before calling the next component and after it returns. Ordering is
important: exception handling needs to be early, authentication must
occur before authorization, and endpoint execution must occur at the
correct point in the pipeline. Middleware is ideal for cross-cutting
concerns such as exception handling, correlation IDs, security headers,
request logging and timing. Real-world example: In a multi-tenant SaaS
API the order is typically exception handler, correlation-ID middleware,
HTTPS redirection, routing, CORS, authentication, authorization, then
endpoints. A frequent real bug is registering UseCors after
authentication: browser preflight OPTIONS requests are rejected with 401
and the SPA fails only in production, while placing UseAuthorization
before UseAuthentication makes every caller look anonymous.

**Keywords:** `explain, the, asp.net, core, middleware, pipeline.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## aspnet-core-002 --- Explain Singleton, Scoped and Transient dependency injection lifetimes.

**question_id:** `aspnet-core-002`\
**topic_id:** `aspnet-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Singleton, Scoped and Transient dependency injection lifetimes.

**Answer**

Singleton is one instance for the application lifetime, Scoped is
normally one instance per request scope, and Transient creates an
instance each time it is requested. DbContext is normally scoped. A
singleton must not capture a scoped dependency because that can extend
the scoped object's lifetime incorrectly. Singleton services also need
to be thread-safe because concurrent requests can access the same
instance. Real-world example: A team registered a CachedPricingService
as a singleton that took a scoped DbContext in its constructor. Scope
validation flags this in Development, but in production it showed up as
DbContext concurrency errors because one context was shared across
requests. The fix was to inject IServiceScopeFactory (or
IDbContextFactory) and create a short scope for each refresh.

**Keywords:**
`explain, singleton,, scoped, and, transient, dependency, injection, lifetimes.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## aspnet-core-003 --- How would you design a production-grade ASP.NET Core API?

**question_id:** `aspnet-core-003`\
**topic_id:** `aspnet-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you design a production-grade ASP.NET Core API?

**Answer**

I would start with a stable API contract and resource model, then
separate presentation, application/business logic and infrastructure
concerns. Production requirements include authentication and
authorization, validation, centralized error handling, structured
logging, correlation IDs, OpenTelemetry, health checks, timeouts,
appropriate retries, caching where justified, rate limiting and graceful
cancellation. The service should be horizontally scalable, externally
configured, covered by automated tests and deployed through an immutable
CI/CD pipeline with monitoring and rollback. Real-world example:
Consider a bank's account-balance API: Entra ID JWTs validated at API
Management, ProblemDetails for every error, Serilog to Application
Insights with trace IDs, readiness probes that check SQL, Polly timeouts
on the core-banking call, per-client rate limits and blue/green
releases. When the core system slowed down, the timeout and circuit
breaker let the API return a controlled 503 with Retry-After instead of
exhausting its threads.

**Keywords:**
`how, would, you, design, a, production-grade, asp.net, core`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## aspnet-core-004 --- Why should you use IHttpClientFactory instead of creating HttpClient with new?

**question_id:** `aspnet-core-004`\
**topic_id:** `aspnet-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Why should you use IHttpClientFactory instead of creating HttpClient
with new?

**Answer**

Creating an HttpClient per request and disposing it leaves sockets in
TIME_WAIT and can cause socket exhaustion, while a single static
HttpClient never refreshes DNS. IHttpClientFactory pools and recycles
handlers, supports named and typed clients and lets you attach
resilience handlers centrally. Real-world example: a travel API created
new HttpClient inside every request to a hotel-supplier API and began
failing with SocketException under peak load; moving to a typed client
with AddHttpClient, a Polly-based resilience handler and a base address
in configuration removed the exhaustion and gave one place to set
timeouts, retries and a User-Agent header.

**Keywords:**
`why, should, you, use, ihttpclientfactory, instead, of, creating`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## aspnet-core-005 --- Explain the Options pattern and how you manage configuration and secrets in ASP.NET Core.

**question_id:** `aspnet-core-005`\
**topic_id:** `aspnet-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain the Options pattern and how you manage configuration and secrets
in ASP.NET Core.

**Answer**

The Options pattern binds configuration sections to strongly typed
classes. IOptions is a singleton snapshot read at startup,
IOptionsSnapshot is scoped and re-read per request, and IOptionsMonitor
supports change notifications for singletons. Configuration is layered
from appsettings, environment-specific files, environment variables and
secret stores, with later sources overriding earlier ones;
ValidateOnStart catches bad settings at boot. Secrets belong in Key
Vault or a similar store, not in source control. Real-world example: a
team deployed to production with a missing email-provider setting and
found out only when the first email failed; adding data-annotation
validation with ValidateOnStart made the container fail its startup
probe immediately, so the bad release never took traffic.

**Keywords:**
`explain, the, options, pattern, and, how, you, manage, configuration`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- REST API Design

**topic_id:** `rest`\
**priority:** `Core`\
**category:** `Interview`

## rest-001 --- What makes a REST API well designed?

**question_id:** `rest-001`\
**topic_id:** `rest`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What makes a REST API well designed?

**Answer**

A good REST API has predictable resource-oriented URLs, correct HTTP
semantics, consistent status codes and a stable error contract.
Collections should support bounded pagination rather than returning
unbounded data. Filtering and sorting should be explicit. Idempotency
matters for operations that can be retried. Production APIs also need
authentication, authorization, rate limiting, caching where useful,
OpenAPI documentation, observability and backward-compatibility rules.
Real-world example: Stripe's public API is a well-known reference:
resource-oriented URLs, one consistent error object, cursor pagination,
idempotency keys on POST and date-based versions so integrations keep
working for years. In a legal case-management system, GET
/cases/123/documents?status=filed&pageSize=50 returns a bounded page
with a next cursor, and a 422 with ProblemDetails lists the invalid
fields.

**Keywords:** `what, makes, a, rest, api, well, designed`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## rest-002 --- How would you paginate a very large dataset?

**question_id:** `rest-002`\
**topic_id:** `rest`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you paginate a very large dataset?

**Answer**

Offset pagination is simple but can become expensive for large offsets
because the database may still need to locate and skip many rows. For
very large or rapidly changing datasets, keyset or cursor pagination is
often better. The query uses an indexed, stable ordering key such as an
ID or carefully designed timestamp-plus-ID pair. The API returns an
opaque cursor to the client. This avoids exposing database-specific
offsets and generally provides more predictable performance. Real-world
example: An audit-log screen over roughly 200 million rows used OFFSET
5000000 and became slow because SQL Server still had to read and discard
the skipped rows. Switching to keyset pagination (filter on CreatedAt
and Id after the last row returned, ordered by the same columns, backed
by a matching index) kept every page fast regardless of depth. Stripe,
Slack and GitHub's GraphQL API expose opaque cursors for the same
reason.

**Keywords:** `how, would, you, paginate, a, very, large, dataset`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## rest-003 --- How would you make a payment POST endpoint idempotent?

**question_id:** `rest-003`\
**topic_id:** `rest`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you make a payment POST endpoint idempotent?

**Answer**

The client sends an idempotency key with the request. The server stores
that key with the resulting business operation and returns the existing
result when the same key is submitted again. The check and business
state change need atomic protection; a simple read-then-write against
Redis can race. For critical operations I would combine an idempotency
record or unique constraint with a database transaction and, if
downstream messaging is involved, an outbox pattern. Real-world example:
Stripe asks clients to send an Idempotency-Key header on POST requests;
if a mobile app times out and retries, the original charge is returned
instead of a second one. In an invoicing service, a unique index on
ClientId plus IdempotencyKey inserted in the same transaction as the
payment record meant a double-tapped Pay button created exactly one
payment.

**Keywords:** `how, would, you, make, a, payment, post, endpoint`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## rest-004 --- How do you version an API and keep backward compatibility?

**question_id:** `rest-004`\
**topic_id:** `rest`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you version an API and keep backward compatibility?

**Answer**

Prefer additive, backward-compatible changes (new optional fields, new
endpoints) and treat removing or renaming fields as breaking. When a
break is unavoidable, introduce a new version through the URL segment, a
header or a media type, run both versions for a published deprecation
period and use Sunset and Deprecation headers plus usage telemetry to
know when clients have moved. Consumer-driven contract tests protect
compatibility. Real-world example: Stripe pins each account to the API
version it first used and lets customers upgrade deliberately, while an
internal HR API added a middleName field without a version change
because clients ignore unknown fields, and used /v2/employees only when
the employee identifier format changed.

**Keywords:**
`how, do, you, version, an, api, and, keep, backward, compatibility`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## rest-005 --- How would you design an API for a long-running operation such as report generation or document processing?

**question_id:** `rest-005`\
**topic_id:** `rest`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you design an API for a long-running operation such as report
generation or document processing?

**Answer**

Do not hold the HTTP request open. Accept the request, validate it,
return 202 Accepted with a Location header pointing to a status
resource, and process the work in the background through a queue. The
client polls the status resource (with Retry-After guidance) or receives
a webhook or push notification when it finishes, and the final result is
fetched from a result URL. Include an idempotency key so retries do not
start duplicate jobs. Real-world example: a case-management system
generating a 500-page filing packet returns 202 with a job URL, a worker
assembles the PDF and stores it in Blob Storage, and the status resource
later returns a time-limited download link; the earlier synchronous
design timed out at the load balancer after 60 seconds.

**Keywords:**
`how, would, you, design, an, api, for, a, long-running, operation`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Entity Framework Core

**topic_id:** `ef-core`\
**priority:** `Core`\
**category:** `Interview`

## ef-core-001 --- Explain change tracking and AsNoTracking.

**question_id:** `ef-core-001`\
**topic_id:** `ef-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain change tracking and AsNoTracking.

**Answer**

EF Core change tracking keeps entity state in the DbContext so
SaveChanges can determine inserts, updates and deletes. For read-only
APIs, tracking can be unnecessary overhead, so AsNoTracking is useful.
Projection into DTOs is often even better because it selects only
required columns. I would choose tracking based on whether the unit of
work needs entity modification, not simply because AsNoTracking is
always faster. Real-world example: A product-catalog list endpoint that
loaded full entities with tracking paid for identity resolution and
snapshots it never used; switching to AsNoTracking with a Select into a
ProductListItem DTO reduced memory and latency for pages of thousands of
items. The order-checkout flow, which loads an Order, changes it and
calls SaveChanges, deliberately keeps tracking.

**Keywords:** `explain, change, tracking, and, asnotracking.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## ef-core-002 --- What is the N+1 query problem?

**question_id:** `ef-core-002`\
**topic_id:** `ef-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the N+1 query problem?

**Answer**

N+1 occurs when one query loads N parent records and then an additional
query runs for each parent to load related data. The result is 1+N
database round trips. Solutions include projection, appropriate Include
usage, batching and carefully designed queries. Include is not a
universal solution because large joins can themselves create excessive
data. Query count, generated SQL and execution plans should be
inspected. Real-world example: An HR portal showing 500 employees with
their departments issued 501 queries because the view touched
employee.Department lazily; projecting into an EmployeeDto with a single
Select brought page load down from seconds to milliseconds. The opposite
failure also happens: Include across three collections produced a huge
Cartesian join, which AsSplitQuery fixed.

**Keywords:** `what, is, the, n+1, query, problem`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## ef-core-003 --- How do you handle optimistic concurrency in EF Core?

**question_id:** `ef-core-003`\
**topic_id:** `ef-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you handle optimistic concurrency in EF Core?

**Answer**

A common SQL Server implementation uses a rowversion concurrency token.
EF includes the original version in the update condition, so if another
process changed the row first, the update affects no rows and EF raises
a concurrency exception. The application then decides whether to reload
and merge, reject the update or ask the user to retry. This is
preferable to holding long database locks for many ordinary web
workflows. Real-world example: Two case workers open the same
immigration case form and both change the status. With a RowVersion
token the second save raises DbUpdateConcurrencyException and the UI
says the case was changed by someone else and shows the differences,
instead of silently overwriting. Seat, room and appointment booking
systems use the same idea so the last writer does not erase a
colleague's work.

**Keywords:** `how, do, you, handle, optimistic, concurrency, in, ef`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## ef-core-004 --- How do you run EF Core migrations safely in production with zero downtime?

**question_id:** `ef-core-004`\
**topic_id:** `ef-core`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you run EF Core migrations safely in production with zero
downtime?

**Answer**

Generate migrations in source control, review the SQL, and apply them
through the pipeline or a dedicated migration job rather than at
application startup in every instance. Because old and new application
versions run side by side during a rolling deployment, use the expand
and contract pattern: add nullable columns or new tables first, deploy
code that works with both shapes, backfill in batches, and only later
add constraints or drop old columns. Real-world example: renaming a
column in one migration broke the old Pods during a rolling update; the
team switched to adding the new column, dual-writing for a release,
backfilling in batches of 10,000 rows to avoid long locks and dropping
the old column a release later.

**Keywords:**
`how, do, you, run, ef, core, migrations, safely, in, production`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## ef-core-005 --- How do you tune EF Core for bulk and high-throughput work?

**question_id:** `ef-core-005`\
**topic_id:** `ef-core`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you tune EF Core for bulk and high-throughput work?

**Answer**

Avoid loading entities just to update them: use ExecuteUpdate and
ExecuteDelete for set-based changes, batch inserts through SaveChanges
or a bulk library, disable tracking for reads, use compiled queries for
hot paths, AsSplitQuery for large Include graphs and DbContext pooling
to reduce allocation. Keep a DbContext short-lived because it is not
thread-safe. Real-world example: a nightly job that marked 2 million
expired subscriptions inactive loaded every entity and took hours; one
ExecuteUpdate statement with a date filter finished in seconds and used
almost no memory, while per-row domain events were handled by a separate
query for only the affected IDs.

**Keywords:**
`how, do, you, tune, ef, core, for, bulk, and, high-throughput`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- SQL Server and Query Performance

**topic_id:** `sql`\
**priority:** `Core`\
**category:** `Interview`

## sql-001 --- A SQL query is slow in production. How do you investigate?

**question_id:** `sql-001`\
**topic_id:** `sql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

A SQL query is slow in production. How do you investigate?

**Answer**

I first determine whether the bottleneck is CPU, I/O, blocking, plan
regression, parameter sensitivity, memory pressure or increased data
volume. I inspect the actual execution plan, duration, CPU, logical
reads, waits, blocking, indexes and statistics. I correlate the issue
with recent releases and parameter values. The fix may be an index, a
SARGable predicate, query rewrite, statistics correction, plan
correction, partitioning or an architectural change. I avoid guessing
before measuring. Real-world example: A report that ran in seconds began
taking minutes after a release. The actual execution plan showed a plan
cached for an atypical parameter (parameter sniffing) doing millions of
logical reads. Query Store exposed the plan regression and let the team
force the previous plan while a covering index and a query rewrite were
tested, instead of reacting by adding hardware.

**Keywords:** `a, sql, query, is, slow, in, production., how`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## sql-002 --- What does SARGable mean?

**question_id:** `sql-002`\
**topic_id:** `sql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What does SARGable mean?

**Answer**

A SARGable predicate is written so the optimizer can efficiently use an
index to locate qualifying rows. For example, filtering an indexed date
column with a range is generally more seek-friendly than applying a
function to the indexed column. SARGability does not guarantee an index
seek because the optimizer still considers cost and statistics, but it
preserves the possibility of efficient index access. Real-world example:
Filtering a 100-million-row Orders table with WHERE YEAR(OrderDate) =
2025 forces a scan because the function wraps the column; rewriting it
as OrderDate greater than or equal to the start of the year and less
than the start of the next year lets the optimizer seek.
Leading-wildcard LIKE patterns and implicit conversions, such as
comparing a varchar column to an nvarchar parameter generated by an ORM,
break SARGability in the same way.

**Keywords:** `what, does, sargable, mean`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## sql-003 --- Explain clustered, nonclustered and covering indexes.

**question_id:** `sql-003`\
**topic_id:** `sql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain clustered, nonclustered and covering indexes.

**Answer**

A clustered index defines the table's primary row-ordering structure and
there can be only one. A nonclustered index is a separate structure
containing keys and row references. A covering index contains all
columns required by a query, using key and included columns, so the
engine can avoid a base-table lookup. Indexes improve reads but add
storage and write-maintenance cost, so they must be designed from real
workload patterns. Real-world example: A claims table clustered on an
ever-increasing ClaimId handles inserts well, while a nonclustered index
on PolicyNumber and Status with ClaimDate and Amount as included columns
covers the open claims for a policy screen without key lookups. The
opposite problem is over-indexing: a write-heavy table with fifteen
indexes had slow inserts until sys.dm_db_index_usage_stats showed
several were never read and they were dropped.

**Keywords:**
`explain, clustered,, nonclustered, and, covering, indexes.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## sql-004 --- What is parameter sniffing and how do you handle it?

**question_id:** `sql-004`\
**topic_id:** `sql`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is parameter sniffing and how do you handle it?

**Answer**

SQL Server compiles a plan using the parameter values seen on first
execution and reuses it. If those values are atypical, for example a
rare customer with three rows versus a large customer with millions, the
cached plan can be terrible for other values. Options include OPTION
(RECOMPILE) for that statement, OPTIMIZE FOR, splitting the query by
workload, better indexing and statistics, and Query Store plan forcing
as a tactical fix. Real-world example: an order-history procedure ran
instantly for most customers but timed out for a few enterprise accounts
after a plan was compiled for a tiny customer; Query Store showed two
plans for the same query, and a rewrite that branched on customer size
plus a better index solved it without restarting the server.

**Keywords:**
`what, is, parameter, sniffing, and, how, do, you, handle, it`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## sql-005 --- How would you write a query for the latest N rows per group, or find and remove duplicate rows?

**question_id:** `sql-005`\
**topic_id:** `sql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you write a query for the latest N rows per group, or find and
remove duplicate rows?

**Answer**

Use window functions such as ROW_NUMBER or RANK with PARTITION BY and
ORDER BY inside a CTE, and then filter on the row number. For
duplicates, number the rows within each duplicate key, review them, and
delete those with a number above one inside a transaction, after taking
a backup, and add a unique index so the problem cannot return.
Real-world example: a customer table imported from two CRMs had
duplicate emails; the team partitioned by lower-cased email, ordered by
last-updated date, kept the newest row, merged child records first and
then added a unique filtered index. The same ROW_NUMBER pattern returns
the latest three invoices per customer for a dashboard.

**Keywords:** `how, would, you, write, a, query, for, the, latest, n`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Transactions, Isolation and Concurrency

**topic_id:** `transactions`\
**priority:** `Core`\
**category:** `Interview`

## transactions-001 --- Explain SQL Server isolation levels.

**question_id:** `transactions-001`\
**topic_id:** `transactions`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain SQL Server isolation levels.

**Answer**

Read Uncommitted permits dirty reads. Read Committed prevents dirty
reads and is a common default. Repeatable Read protects rows already
read from concurrent modification. Serializable provides stronger range
protection. Snapshot uses row versions for a transaction-consistent
view, and Read Committed Snapshot can provide row-versioning semantics
for Read Committed. Higher consistency can introduce additional
contention or version-store cost, so the business requirement should
determine the choice. Real-world example: A bank's statement report
under default Read Committed blocked behind nightly updates, so the team
enabled Read Committed Snapshot so readers use row versions instead of
waiting, accepting higher tempdb version-store usage. A transfer that
checks a balance and then debits it needs stronger protection on that
statement, such as UPDLOCK, rather than raising the isolation level for
the whole database.

**Keywords:** `explain, sql, server, isolation, levels.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## transactions-002 --- How do you handle a transaction that updates SQL and publishes a message?

**question_id:** `transactions-002`\
**topic_id:** `transactions`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you handle a transaction that updates SQL and publishes a
message?

**Answer**

I normally avoid assuming a database transaction can atomically commit
an external broker operation. Instead, I use an outbox record written in
the same database transaction as the business change. A background
publisher then sends the outbox event to the broker. If publishing
fails, the event remains available for retry. Consumers are designed to
be idempotent because a crash after publishing but before marking the
outbox record complete can produce a duplicate. Real-world example: An
order service that saved an Order and then published OrderPlaced to
Service Bus lost events whenever the process crashed between the commit
and the publish, so the warehouse never heard about some orders. Writing
an Outbox row in the same transaction (MassTransit's EF Core outbox does
this) and publishing from a background dispatcher fixed it, and the
warehouse consumer de-duplicates by MessageId because duplicates remain
possible.

**Keywords:** `how, do, you, handle, a, transaction, that, updates`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## transactions-003 --- Deadlock versus blocking?

**question_id:** `transactions-003`\
**topic_id:** `transactions`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Deadlock versus blocking?

**Answer**

Blocking is when one transaction waits for another transaction to
release a resource. A deadlock is a cycle of waits where transactions
cannot progress. SQL Server detects deadlocks and chooses a victim.
Prevention includes short transactions, consistent resource access
order, appropriate indexing and avoiding unnecessary locks. Deadlock
graphs should be inspected to identify the actual statements and
resources rather than simply adding unlimited retries. Real-world
example: Two stored procedures, one updating Inventory then Orders and
the other Orders then Inventory, deadlocked under Black Friday load. The
deadlock graph showed the opposite lock order; making both touch tables
in the same order and adding an index that removed a scan-based lock
escalation eliminated most deadlocks, and a short retry on error 1205
covered the rest.

**Keywords:** `deadlock, versus, blocking`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## transactions-004 --- How do you prevent overselling inventory or double-booking under concurrent requests?

**question_id:** `transactions-004`\
**topic_id:** `transactions`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you prevent overselling inventory or double-booking under
concurrent requests?

**Answer**

Make the check and the update one atomic operation. Options include a
conditional update (UPDATE Stock SET Qty = Qty - 1 WHERE ProductId = @id
AND Qty is at least 1 and check rows affected), optimistic concurrency
with a rowversion, pessimistic locking with UPDLOCK for a short
transaction, or a reservation record with an expiry. Avoid reading the
quantity, checking in application code and writing back. Real-world
example: a ticketing site oversold a concert when two requests both read
1 seat remaining; the conditional update returned zero rows affected for
the loser, who got a sold-out response, and a 10-minute reservation row
with a background expiry handled carts abandoned at checkout.

**Keywords:**
`how, do, you, prevent, overselling, inventory, or, double-booking`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Redis and Caching

**topic_id:** `redis`\
**priority:** `Strong`\
**category:** `Interview`

## redis-001 --- Explain cache-aside.

**question_id:** `redis-001`\
**topic_id:** `redis`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain cache-aside.

**Answer**

The application first checks the cache. On a miss it reads the source of
truth, returns the result and populates the cache. On writes, the
application updates the source of truth and invalidates or refreshes
relevant keys. Cache-aside is simple but makes invalidation and
consistency application responsibilities. TTLs, versioned keys and
explicit invalidation policies help control staleness. Real-world
example: A product-detail API caches the product JSON in Redis with a
ten-minute TTL: a miss loads from SQL and sets the key, and when a
merchandiser changes a price the service deletes the key so customers do
not see a stale price. Stack Overflow has publicly described using Redis
heavily in front of SQL Server for hot pages.

**Keywords:** `explain, cache-aside.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## redis-002 --- What is cache stampede and how do you prevent it?

**question_id:** `redis-002`\
**topic_id:** `redis`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is cache stampede and how do you prevent it?

**Answer**

A stampede occurs when a popular key expires and many requests
simultaneously miss the cache and hit the database. Mitigations include
request coalescing, distributed locking, stale-while-revalidate,
background refresh, prewarming and randomized TTLs. In a multi-instance
application, a local lock is not enough because different instances can
miss simultaneously. The solution must also define what happens if Redis
is unavailable. Real-world example: A flash-sale home page cached its
top-deals list for 60 seconds; when it expired thousands of requests hit
SQL together and database CPU spiked. Facebook's memcache paper
describes leases to stop this thundering herd; in .NET the equivalent is
a per-key lock plus jittered TTLs, or HybridCache (.NET 9), which has
built-in stampede protection.

**Keywords:** `what, is, cache, stampede, and, how, do, you`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## redis-003 --- When should you not use Redis?

**question_id:** `redis-003`\
**topic_id:** `redis`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When should you not use Redis?

**Answer**

Redis is not automatically beneficial. If a query is already cheap, data
changes too frequently, cache hit rates will be low, or invalidation is
extremely complex, Redis may add more operational complexity than value.
I introduce it when measured latency/database load justifies caching and
the business can tolerate the chosen consistency model. I also avoid
making Redis the source of truth for relational business data without a
very deliberate design. Real-world example: A team cached a
customer-search query whose results changed every few seconds and which
a covering index already served in a few milliseconds; the hit rate was
low and invalidation bugs appeared, so they removed the cache. An
expensive pricing calculation with a high read-to-write ratio, on the
other hand, justified Redis immediately.

**Keywords:** `when, should, you, not, use, redis`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## redis-004 --- What Redis data structures and features should a .NET developer know, and how do persistence and eviction work?

**question_id:** `redis-004`\
**topic_id:** `redis`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What Redis data structures and features should a .NET developer know,
and how do persistence and eviction work?

**Answer**

Know strings, hashes, lists, sets, sorted sets, streams, pub/sub, key
expiry and atomic operations through INCR or Lua scripts. Redis
persistence options are RDB snapshots and AOF logging, while Azure Cache
for Redis offers tiers with replication; when memory is full the
eviction policy (for example allkeys-lru or volatile-ttl) decides what
disappears, so a cache must tolerate misses. Real-world example: a
gaming leaderboard uses a sorted set where ZADD updates a score and
ZREVRANGE returns the top 100 in milliseconds; a login throttle uses
INCR with a 60-second expiry; and a session cache that was configured
with noeviction started rejecting writes until the policy and memory
size were corrected.

**Keywords:**
`what, redis, data, structures, and, features, should, a, .net`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Microservices and Distributed Systems

**topic_id:** `microservices`\
**priority:** `Core`\
**category:** `Interview`

## microservices-001 --- How do you decide microservice boundaries?

**question_id:** `microservices-001`\
**topic_id:** `microservices`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you decide microservice boundaries?

**Answer**

I start with business capabilities and bounded contexts rather than
tables or technical layers. A good service has high internal cohesion,
owns meaningful business rules and has a reasonable data boundary. I
consider business ownership, change frequency, transaction boundaries,
scaling characteristics, security and team ownership. Too many services
create deployment, networking and observability complexity, so a modular
monolith can be the better starting point. Real-world example: In a
logistics platform, Shipment Tracking, Billing and Carrier Rate Shopping
are separate bounded contexts with different change rates and owners,
whereas splitting Customer and Address tables into separate services
creates chatty calls and distributed joins. Segment publicly described
moving from many microservices back to a monolith in 2018 because the
operational burden outweighed the benefit.

**Keywords:** `how, do, you, decide, microservice, boundaries`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## microservices-002 --- How do you handle failure between microservices?

**question_id:** `microservices-002`\
**topic_id:** `microservices`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you handle failure between microservices?

**Answer**

I assume remote calls fail. I use bounded timeouts, retries only for
transient failures, exponential backoff with jitter, circuit breakers
where useful and explicit fallback behavior when meaningful. I
distinguish transient infrastructure failures from permanent business
errors. Asynchronous messaging can decouple availability. Every
retryable operation needs idempotency consideration because retrying a
non-idempotent operation can duplicate business effects. Real-world
example: Netflix popularized circuit breakers (Hystrix) so a failing
recommendations service degrades to a generic list rather than breaking
the whole page. A checkout service calling a tax provider might use a
two-second timeout, two retries with jitter on 503 only, a fallback to a
cached tax table, and an idempotency key on the call so a retry cannot
double count.

**Keywords:** `how, do, you, handle, failure, between, microservices`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## microservices-003 --- What is eventual consistency?

**question_id:** `microservices-003`\
**topic_id:** `microservices`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is eventual consistency?

**Answer**

Eventual consistency means distributed components can temporarily
observe different states but converge when successful propagation
completes. For example, an order can be committed first and inventory,
billing and notification can react asynchronously. This improves
decoupling and availability but requires explicit handling of pending
states, duplicates, failures and reconciliation. Strong consistency
should be used where business rules genuinely require it. Real-world
example: After placing an order, e-commerce sites typically confirm
immediately while inventory, payment capture and the confirmation email
complete asynchronously; the order sits in Pending until events finish,
and a failed payment cancels it and releases stock. A bank's core ledger
needs strong consistency, while its recent-activity notification feed
can lag by seconds.

**Keywords:** `what, is, eventual, consistency`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## microservices-004 --- What is a distributed monolith, and how do services query data owned by other services?

**question_id:** `microservices-004`\
**topic_id:** `microservices`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a distributed monolith, and how do services query data owned by
other services?

**Answer**

A distributed monolith has many deployable services that must be
released together, share a database or call each other synchronously in
long chains, so it has the costs of microservices without their
independence. Each service should own its data; others get it through
APIs, API composition in a gateway or backend-for-frontend, events that
populate a local read model, or a reporting store fed by change data
capture. Real-world example: an e-commerce team had 12 services sharing
one SQL database and needed all of them redeployed for a schema change;
they gave Orders and Inventory their own schemas, replaced cross-service
joins with OrderPlaced events feeding a local read model, and measured
independent deploy frequency as the success signal.

**Keywords:**
`what, is, a, distributed, monolith,, and, how, do, services, query`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- RabbitMQ, MassTransit and Messaging

**topic_id:** `messaging`\
**priority:** `Strong`\
**category:** `Interview`

## messaging-001 --- Queue versus topic?

**question_id:** `messaging-001`\
**topic_id:** `messaging`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Queue versus topic?

**Answer**

A queue generally represents work processed by competing consumers,
while a topic/pub-sub model distributes an event to independent
subscribers. 'Process this job' is naturally queue-oriented; 'an order
was created and interested systems may react' is event-oriented.
RabbitMQ and Azure Service Bus expose different implementations of these
concepts, but the underlying messaging semantics are more important than
memorizing vendor terminology. Real-world example: In a hiring platform,
ResumeParseRequested goes to a queue so exactly one of several parser
workers handles each message, while CandidateHired is published to a
topic with separate subscriptions for payroll, onboarding and analytics,
each receiving its own copy.

**Keywords:** `queue, versus, topic`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## messaging-002 --- Why must consumers be idempotent with at-least-once delivery?

**question_id:** `messaging-002`\
**topic_id:** `messaging`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Why must consumers be idempotent with at-least-once delivery?

**Answer**

At-least-once delivery prioritizes not losing messages but permits
redelivery. A consumer can successfully perform its business operation
and crash before acknowledging the message, causing the broker to
deliver it again. The consumer should therefore detect duplicate message
or business identifiers, often using a durable processed-message record
or unique constraint. Exactly-once business behavior is usually achieved
through idempotent processing rather than assuming the transport
provides perfect exactly-once execution. Real-world example: A payroll
consumer wrote the salary record and crashed before acknowledging, the
broker redelivered, and employees were paid twice until a
ProcessedMessages table with a unique MessageId was written in the same
transaction. Azure Service Bus duplicate detection helps on the sending
side, but consumer-side idempotency is still required.

**Keywords:**
`why, must, consumers, be, idempotent, with, at-least-once, delivery`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## messaging-003 --- How should retries and dead-letter queues work?

**question_id:** `messaging-003`\
**topic_id:** `messaging`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How should retries and dead-letter queues work?

**Answer**

Transient failures can be retried with bounded attempts and exponential
backoff. Permanent validation errors should not be retried indefinitely.
Once a retry limit is exceeded, the message can move to a dead-letter
queue for inspection and controlled replay. DLQs require monitoring,
ownership and replay procedures. Poison messages must not continually
cycle through the main queue and consume all consumer capacity.
Real-world example: In an e-commerce order pipeline a message with a
malformed address failed validation every time and, with unlimited
retries, blocked the queue. With a maximum delivery count of five,
exponential backoff, a dead-letter queue, an alert and a replay tool,
support fixed the data and replayed the message. Azure Service Bus
dead-letters automatically after MaxDeliveryCount, and RabbitMQ uses
dead-letter exchanges.

**Keywords:** `how, should, retries, and, dead-letter, queues, work`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## messaging-004 --- Explain Kafka fundamentals: topics, partitions, consumer groups, offsets and ordering.

**question_id:** `messaging-004`\
**topic_id:** `messaging`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Kafka fundamentals: topics, partitions, consumer groups, offsets
and ordering.

**Answer**

A Kafka topic is split into partitions, each an ordered, append-only
log. Ordering is guaranteed only within a partition, so messages that
must stay ordered share a partition key such as an order ID. Consumers
in a consumer group divide the partitions among themselves and track
their position as an offset, so parallelism is capped by the partition
count. Retention keeps messages for a period regardless of consumption,
which enables replay. Real-world example: LinkedIn created Kafka for
activity-stream data; in a retail platform, order events keyed by
orderId keep each order's events in sequence, and a new fraud-detection
service can start from the earliest offset to rebuild its view of the
last 7 days without bothering the producers.

**Keywords:**
`explain, kafka, fundamentals:, topics,, partitions,, consumer`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## messaging-005 --- Which Azure Service Bus features matter in production: sessions, duplicate detection, peek-lock and scheduled messages?

**question_id:** `messaging-005`\
**topic_id:** `messaging`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Which Azure Service Bus features matter in production: sessions,
duplicate detection, peek-lock and scheduled messages?

**Answer**

Peek-lock lets a consumer receive a message, process it and then
complete or abandon it, so a crash returns the message to the queue.
Sessions guarantee ordered, grouped processing for a session ID,
duplicate detection drops messages with the same MessageId inside a time
window, and scheduled messages deliver later. Dead-letter queues, TTL
and max delivery count control poison messages. Real-world example: a
loan-processing system used the loan ID as session ID so documents for
one loan were handled in order by one consumer, set a lock duration
longer than the longest processing time to avoid duplicate delivery, and
used scheduled messages to send a payment reminder 3 days before the due
date.

**Keywords:**
`which, azure, service, bus, features, matter, in, production:`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Microsoft Orleans and Actor Model

**topic_id:** `orleans`\
**priority:** `Strong`\
**category:** `Interview`

## orleans-001 --- What problem does Orleans solve?

**question_id:** `orleans-001`\
**topic_id:** `orleans`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What problem does Orleans solve?

**Answer**

Orleans provides an actor-oriented model where logical actors called
grains encapsulate state and behavior. Applications address grains by
identity while Orleans manages distribution, activation and placement.
This is useful for large numbers of independent stateful entities such
as devices, sessions or workflow instances. It is not simply an
alternative HTTP framework; its value is the distributed stateful
programming model. Real-world example: Orleans came from Microsoft
Research, and the Halo 4 and Halo 5 cloud services (such as presence and
statistics) have been publicly described as running on it, with players
and game sessions modeled as grains. A similar fit is an IoT platform
where each of a million devices is a grain holding its latest state and
alert rules.

**Keywords:** `what, problem, does, orleans, solve`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## orleans-002 --- How does Orleans handle concurrency?

**question_id:** `orleans-002`\
**topic_id:** `orleans`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How does Orleans handle concurrency?

**Answer**

Orleans provides an actor-style execution model that simplifies
reasoning about state inside a grain by coordinating calls according to
its execution model. This reduces the need for ordinary
application-level locking around grain state. However, external systems
such as SQL and Redis have independent concurrency semantics. A senior
developer must understand persistence, activation/deactivation and
reentrancy rather than assuming Orleans makes every external operation
atomic. Real-world example: A shopping-cart grain keyed by cart ID
processes AddItem calls one at a time, so no lock is needed around its
in-memory item list. If that grain also writes to SQL, a client retry
after a timeout can still duplicate the write, so an idempotency key is
needed. Marking a method reentrant improves throughput for read-heavy
calls but brings back interleaving that must be reasoned about.

**Keywords:** `how, does, orleans, handle, concurrency`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## orleans-003 --- When would you choose Orleans instead of conventional microservices?

**question_id:** `orleans-003`\
**topic_id:** `orleans`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When would you choose Orleans instead of conventional microservices?

**Answer**

I would consider Orleans when the domain naturally consists of many
independent stateful entities and the actor abstraction simplifies the
problem. For conventional stateless CRUD APIs, standard ASP.NET Core
services may be simpler. The choice depends on domain shape,
persistence, scaling, team expertise and operational maturity. I would
not introduce Orleans merely because it is technically interesting.
Real-world example: An online-presence or multiplayer feature with
millions of small independent entities fits Orleans, whereas an HR
leave-approval CRUD application is better as plain ASP.NET Core and SQL.
A typical mistake is adopting Orleans for a simple reporting API and
then paying for silo operations and persistence design with no benefit.

**Keywords:**
`when, would, you, choose, orleans, instead, of, conventional`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- GraphQL, SignalR and WebSockets

**topic_id:** `graphql`\
**priority:** `Strong`\
**category:** `Interview`

## graphql-001 --- GraphQL versus REST?

**question_id:** `graphql-001`\
**topic_id:** `graphql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

GraphQL versus REST?

**Answer**

REST provides resource-oriented endpoints and conventional HTTP
semantics and is a strong default for many public APIs. GraphQL provides
a typed schema and lets clients request the fields they need, which is
useful for complex client data requirements. GraphQL introduces resolver
complexity, N+1 risks, query-depth/complexity concerns, field-level
authorization and more involved caching. The choice should follow client
and domain requirements. Real-world example: Facebook created GraphQL to
avoid over-fetching on slow mobile networks for its news feed, and
GitHub offers both REST and a GraphQL API. A public payments API with
simple resources is usually easier to cache, secure and document with
REST and OpenAPI, while a customer dashboard needing cases, tasks and
documents in one round trip suits GraphQL.

**Keywords:** `graphql, versus, rest`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## graphql-002 --- How do you solve GraphQL N+1?

**question_id:** `graphql-002`\
**topic_id:** `graphql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you solve GraphQL N+1?

**Answer**

If a query requests many parent objects and each resolver independently
loads related data, the server can perform one query plus N related
queries. DataLoader batches related IDs during request execution so the
backend can retrieve them in fewer queries. Authorization must still be
applied correctly. DataLoader is a batching mechanism, not a replacement
for good database modeling and query design. Real-world example: A query
for 50 cases with their assignee names triggered 51 SQL calls because
the Assignee resolver loaded users one at a time; with HotChocolate's
DataLoader the assignee IDs were collected during the request and
fetched with a single WHERE IN query. Field-level authorization still
ran per case so restricted names stayed hidden.

**Keywords:** `how, do, you, solve, graphql, n+1`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## graphql-003 --- SignalR versus raw WebSockets?

**question_id:** `graphql-003`\
**topic_id:** `graphql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

SignalR versus raw WebSockets?

**Answer**

WebSockets are a bidirectional protocol for persistent connections.
SignalR is a higher-level .NET real-time framework that provides hubs,
connection management and messaging abstractions and can use WebSockets
when appropriate. SignalR is usually easier for .NET applications that
need real-time business messaging. At scale, connection distribution and
cross-instance message delivery must be designed explicitly. Real-world
example: A live ticket-status board or trading dashboard uses SignalR to
push updates. With three web instances behind a load balancer, a user
connected to instance A did not receive messages sent through instance B
until Azure SignalR Service or a Redis backplane was added, which is the
usual scale-out surprise.

**Keywords:** `signalr, versus, raw, websockets`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## graphql-004 --- How do you secure a GraphQL API against abusive queries?

**question_id:** `graphql-004`\
**topic_id:** `graphql`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you secure a GraphQL API against abusive queries?

**Answer**

Limit query depth and complexity, set timeouts and pagination limits,
use persisted or allow-listed queries for first-party clients, disable
introspection and verbose errors in production where appropriate,
enforce authentication and field-level authorization, and rate-limit by
cost rather than request count. Real-world example: a public GraphQL API
for a marketplace was brought down by a deeply nested query asking for
orders, each with buyer, each with orders again; adding a maximum depth,
a cost budget per request and pagination caps on every list field
stopped the abuse, and persisted queries removed arbitrary queries from
the mobile app entirely.

**Keywords:**
`how, do, you, secure, a, graphql, api, against, abusive, queries`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## graphql-005 --- How do you scale SignalR to many users and multiple servers?

**question_id:** `graphql-005`\
**topic_id:** `graphql`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you scale SignalR to many users and multiple servers?

**Answer**

Each client keeps a persistent connection to one server, so messages
sent from another instance must be distributed through a backplane such
as Redis or, more simply, a managed service such as Azure SignalR
Service, which also offloads connections. Use WebSockets where possible,
handle reconnection and message loss on the client, keep hub methods
light, send to groups rather than loops over connections and monitor
connection counts. Real-world example: a live auction site with 50,000
concurrent bidders moved from self-hosted SignalR on four VMs to Azure
SignalR Service, which removed sticky-session issues and let the app
servers scale independently, while bid persistence stayed in SQL with
the hub only broadcasting results.

**Keywords:**
`how, do, you, scale, signalr, to, many, users, and, multiple`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Angular, React and Frontend Engineering

**topic_id:** `frontend`\
**priority:** `Strong`\
**category:** `Interview`

## frontend-001 --- How do you optimize a frontend for a very large dataset?

**question_id:** `frontend-001`\
**topic_id:** `frontend`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you optimize a frontend for a very large dataset?

**Answer**

The first optimization is to avoid downloading unnecessary data: use
server-side filtering, sorting and pagination. On the browser, use
virtualization for large visible lists, lazy loading/code splitting,
efficient state updates and debounced search. Angular applications
should use appropriate change-detection strategies; React applications
should avoid unnecessary renders and use memoization selectively. I
measure browser performance rather than applying optimization patterns
blindly. Real-world example: An admin grid that loaded two million
transactions into the browser froze tabs. The fix was server-side
paging, sorting and filtering through the API, a virtual-scroll viewport
(Angular CDK or react-window) that renders only visible rows, and a
debounced search box. A browser performance profile showed that
re-rendering, not data size, was the main cost.

**Keywords:** `how, do, you, optimize, a, frontend, for, a`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## frontend-002 --- Explain switchMap versus mergeMap in RxJS.

**question_id:** `frontend-002`\
**topic_id:** `frontend`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain switchMap versus mergeMap in RxJS.

**Answer**

switchMap switches to the newest inner observable and unsubscribes from
the previous one, making it useful for typeahead search where stale
requests should not win. mergeMap subscribes to inner observables
concurrently and allows all of them to complete, making it appropriate
when operations should proceed independently. The choice is about
concurrency semantics, not simply performance. Real-world example: A
customer-name typeahead should use switchMap so that when the user types
jo and then john, the first HTTP request is cancelled and a slow
response for jo cannot overwrite the results for john. A save-all button
that sends independent PUTs can use mergeMap with a concurrency limit,
and exhaustMap suits a Pay button that must ignore double clicks.

**Keywords:** `explain, switchmap, versus, mergemap, in, rxjs.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## frontend-003 --- When do you need NgRx or Redux-style state management?

**question_id:** `frontend-003`\
**topic_id:** `frontend`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When do you need NgRx or Redux-style state management?

**Answer**

Local component state is usually best when state has one consumer.
Shared service state can be enough for smaller applications. A
centralized store becomes useful when many components share complex
state, derived state, event history, caching or predictable state
transitions. I would not introduce NgRx solely because an application is
large; the additional concepts and boilerplate need to solve a real
coordination problem. Real-world example: A trading screen sharing live
quotes, filters and a watchlist among fifteen components benefited from
NgRx selectors and effects and from replayable state in Redux DevTools,
while a settings form used only local component state. Many teams now
use NgRx SignalStore or React Query for server state instead of a full
Redux setup.

**Keywords:** `when, do, you, need, ngrx, or, redux-style, state`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

------------------------------------------------------------------------

## frontend-004 --- Where should a single-page app store tokens, and what is the backend-for-frontend pattern?

**question_id:** `frontend-004`\
**topic_id:** `frontend`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Where should a single-page app store tokens, and what is the
backend-for-frontend pattern?

**Answer**

Storing access or refresh tokens in localStorage exposes them to any
XSS. A safer approach is a backend-for-frontend: a small server
component completes the OIDC code flow, keeps tokens server-side and
gives the browser only an HttpOnly, Secure, SameSite session cookie,
then forwards API calls with the token attached. This needs CSRF
protection but removes tokens from JavaScript. Real-world example: a
banking portal replaced a React app that kept refresh tokens in
localStorage with a .NET BFF using YARP and cookie authentication after
a security review flagged the XSS exposure; the SPA now only talks to
same-origin endpoints and never sees a token.

**Keywords:**
`where, should, a, single-page, app, store, tokens,, and, what, is`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Azure Architecture

**topic_id:** `azure`\
**priority:** `Core`\
**category:** `Interview`

## azure-001 --- App Service vs Azure Functions vs AKS?

**question_id:** `azure-001`\
**topic_id:** `azure`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

App Service vs Azure Functions vs AKS?

**Answer**

App Service is a managed platform for web applications and APIs and is
often the simplest choice for conventional HTTP workloads. Functions are
useful for event-driven or serverless execution. AKS is appropriate when
Kubernetes orchestration, container scheduling, service networking or
platform control justifies its operational complexity. I choose the
simplest platform that satisfies scaling, networking, deployment and
workload requirements. Real-world example: A line-of-business API with
predictable traffic runs on App Service with deployment slots; a
thumbnail generator triggered by Blob uploads is an Azure Function; and
a platform with forty microservices, custom network policies and
sidecars may justify AKS. A team of four running three APIs would
usually be better served by App Service or Container Apps than by
operating Kubernetes.

**Keywords:** `app, service, vs, azure, functions, vs, aks`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## azure-002 --- Explain Managed Identity.

**question_id:** `azure-002`\
**topic_id:** `azure`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Managed Identity.

**Answer**

Managed Identity gives an Azure resource an Entra-backed workload
identity so the application can authenticate to supported Azure
resources without storing a client secret in configuration. The identity
receives only the required permissions through RBAC or resource-specific
access control. This reduces secret rotation and leakage risk and
supports least-privilege service-to-service authentication. Real-world
example: Instead of a SQL password in appsettings, an App Service has a
system-assigned managed identity that is a database user in Azure SQL,
with Key Vault access through an RBAC role. Connection strings committed
to repositories are a common cause of breaches; with managed identity
there is no password to leak or rotate.

**Keywords:** `explain, managed, identity.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## azure-003 --- Design a secure Azure architecture for a .NET API.

**question_id:** `azure-003`\
**topic_id:** `azure`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Design a secure Azure architecture for a .NET API.

**Answer**

A typical design can place Front Door/WAF or an appropriate gateway at
the edge, APIM where API-management capabilities are required, and the
.NET service on App Service or AKS. Data services such as Azure SQL and
Redis should use appropriate private networking where required. Entra ID
handles identity, Managed Identity handles workload authentication, Key
Vault protects secrets/certificates, and Azure Monitor/Application
Insights/OpenTelemetry provide observability. Backup, disaster recovery,
scaling and rollback are part of the architecture, not afterthoughts.
Real-world example: For a healthcare patient-portal API: Front Door with
WAF at the edge, API Management validating Entra ID tokens, App Service
integrated with a VNet, Azure SQL reachable only through a private
endpoint, secrets in Key Vault via managed identity, diagnostics in Log
Analytics, geo-redundant backups and a rehearsed failover runbook.
Regulated workloads such as HIPAA or SOC 2 usually require exactly this
isolation and auditing.

**Keywords:**
`design, a, secure, azure, architecture, for, a, .net, api.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## azure-004 --- Compare Azure Service Bus, Event Grid, Event Hubs and Storage Queues.

**question_id:** `azure-004`\
**topic_id:** `azure`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Compare Azure Service Bus, Event Grid, Event Hubs and Storage Queues.

**Answer**

Service Bus is an enterprise message broker with queues, topics,
sessions, dead-lettering and transactions for commands and workflows.
Event Grid is a lightweight event-routing service for reactive
notifications such as a blob being created. Event Hubs ingests very
high-volume event streams and has a Kafka-compatible endpoint. Storage
Queues are simple and cheap queues without advanced features. Real-world
example: an insurer uses Service Bus for ClaimSubmitted workflows
needing retries and DLQ, Event Grid to trigger a virus scan when a
document lands in Blob Storage, and Event Hubs to ingest telematics from
a million vehicles for analytics.

**Keywords:**
`compare, azure, service, bus,, event, grid,, event, hubs, and`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## azure-005 --- How do you design high availability and disaster recovery for Azure SQL and the application tier?

**question_id:** `azure-005`\
**topic_id:** `azure`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you design high availability and disaster recovery for Azure SQL
and the application tier?

**Answer**

Start with RPO (acceptable data loss) and RTO (acceptable downtime). Use
zone-redundant configurations for in-region failures, auto-failover
groups with a readable secondary region for regional disasters,
geo-redundant backups, and stateless app instances deployed in two
regions behind Front Door or Traffic Manager. Rehearse failover and
document the runbook, since untested DR does not work. Real-world
example: a payments company set an RPO of 5 seconds and RTO of 15
minutes, used an auto-failover group with a secondary in a paired
region, ran a half-yearly failover drill and discovered during the first
drill that a hard-coded connection string pointed at the primary server
instead of the failover group listener.

**Keywords:**
`how, do, you, design, high, availability, and, disaster, recovery`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## azure-006 --- How do Azure Functions hosting plans differ, and when would you use Durable Functions?

**question_id:** `azure-006`\
**topic_id:** `azure`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do Azure Functions hosting plans differ, and when would you use
Durable Functions?

**Answer**

The Consumption plan scales to zero and bills per execution but has cold
starts, Flex Consumption and Premium reduce cold starts and add VNet
integration, and a Dedicated plan runs on App Service capacity. Durable
Functions add orchestrations for long-running, stateful workflows with
checkpointing, fan-out and fan-in, timers and human-approval waits.
Real-world example: an onboarding workflow that creates an account,
waits up to 7 days for a manager's approval and then provisions licenses
was written as a Durable orchestration instead of polling a database,
and the team chose Premium because the API-triggered functions could not
tolerate cold-start latency.

**Keywords:**
`how, do, azure, functions, hosting, plans, differ,, and, when, would`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- AWS and Multi-Cloud

**topic_id:** `aws`\
**priority:** `Useful`\
**category:** `Interview`

## aws-001 --- Map common Azure services to AWS.

**question_id:** `aws-001`\
**topic_id:** `aws`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Map common Azure services to AWS.

**Answer**

Conceptually, App Service maps to managed application hosting, Functions
to Lambda, AKS to EKS, Blob Storage to S3, VNet to VPC, Azure SQL to
managed relational database offerings, Service Bus to AWS messaging
services such as SQS/SNS depending on semantics, Key Vault to Secrets
Manager/KMS-related capabilities, and Application Insights to CloudWatch
plus tracing capabilities. These are conceptual mappings rather than
exact replacements. Real-world example: A team moving a .NET order
service from Azure to AWS maps App Service to ECS or Elastic Beanstalk,
Service Bus topics to SNS plus SQS, Blob Storage to S3 and Managed
Identity to IAM roles. Service Bus sessions and scheduled messages have
no exact SQS equivalent and required redesign, which shows the mappings
are only approximate.

**Keywords:** `map, common, azure, services, to, aws.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## aws-002 --- What are the major challenges of multi-cloud?

**question_id:** `aws-002`\
**topic_id:** `aws`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are the major challenges of multi-cloud?

**Answer**

Different clouds have different identity, networking, managed-service,
observability and deployment models. Data movement and egress cost can
be significant. Operating the same workload across clouds also increases
skills and testing requirements. I would only adopt multi-cloud where
business, regulatory, resilience or strategic requirements justify the
complexity. Real-world example: Most companies that describe themselves
as multi-cloud actually run each workload on one cloud, for example
analytics on one provider and the application on another. Running the
same stateful system active-active across two clouds adds egress
charges, duplicate tooling and skills; it is usually justified only by
regulation, an acquisition or a strategic resilience requirement.

**Keywords:** `what, are, the, major, challenges, of, multi-cloud`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## aws-003 --- What does cloud-native mean?

**question_id:** `aws-003`\
**topic_id:** `aws`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What does cloud-native mean?

**Answer**

Cloud-native means designing for elastic scaling, automation, managed
capabilities, resilience, observable operation and automated delivery.
Merely moving an IIS application to an Azure VM does not make it
cloud-native. A cloud-native .NET application is commonly stateless
where practical, externally configured, horizontally scalable,
observable and resilient to dependency failures. Real-world example:
Lifting a Windows IIS app onto a VM keeps manual patching, manual
deployment and vertical scaling, so it is hosting rather than
cloud-native. Rebuilding it as a containerized ASP.NET Core API with
managed SQL, autoscaling and CI/CD is cloud-native. Netflix's move to
AWS, which involved re-architecting for the cloud rather than just
rehosting, is the well-known example.

**Keywords:** `what, does, cloud-native, mean`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

# TOPIC --- Docker

**topic_id:** `docker`\
**priority:** `Strong`\
**category:** `Interview`

## docker-001 --- Explain a production Dockerfile for .NET.

**question_id:** `docker-001`\
**topic_id:** `docker`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain a production Dockerfile for .NET.

**Answer**

Use a multi-stage build: an SDK image compiles and publishes the
application, while a smaller ASP.NET runtime image runs it. This reduces
the final image size and attack surface. I also consider non-root
execution, controlled base-image versions, vulnerability scanning,
.dockerignore, health checks and externalized configuration. Real-world
example: A typical .NET API Dockerfile copies the csproj first and
restores in its own layer so CI caches packages, publishes with the SDK
image, and then copies the output into the aspnet runtime or chiseled
image and runs as a non-root user. The final image is a fraction of the
SDK image's size and has far fewer packages for a scanner to flag.

**Keywords:** `explain, a, production, dockerfile, for, .net.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## docker-002 --- Image versus container?

**question_id:** `docker-002`\
**topic_id:** `docker`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Image versus container?

**Answer**

An image is an immutable package containing application files and
dependencies. A container is a running instance of that image with
runtime state and a writable layer. Multiple containers can run from one
image. Persistent business data should normally live outside the
container in a durable storage system. Real-world example: In CI, one
image tagged with the commit SHA is promoted from test to staging to
production. If a container running it is killed, a new container starts
from the same image, so anything the app wrote inside it, such as
uploaded files or a SQLite database, is lost unless a volume or storage
account is used.

**Keywords:** `image, versus, container`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## docker-003 --- Container works locally but fails in production. How do you troubleshoot?

**question_id:** `docker-003`\
**topic_id:** `docker`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Container works locally but fails in production. How do you
troubleshoot?

**Answer**

Compare the exact production image and environment. Inspect
configuration, ports, DNS, network access, mounted volumes, permissions,
health checks, CPU/memory limits, runtime versions and external
dependencies. Check container and application logs. Reproduce the
production image locally where possible. Do not debug a different image
and assume the findings apply. Real-world example: An API worked on a
developer machine but crashed in the cluster because an environment
variable for the connection string was missing and the non-root
container user could not write to the log folder. Running the exact
production image locally with the production environment file reproduced
it in minutes. Another common culprit is a container memory limit
causing OOMKilled while the laptop had plenty of RAM.

**Keywords:**
`container, works, locally, but, fails, in, production., how, do, you`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

# TOPIC --- Kubernetes and AKS

**topic_id:** `kubernetes`\
**priority:** `Strong`\
**category:** `Interview`

## kubernetes-001 --- Explain Pod, Deployment and Service.

**question_id:** `kubernetes-001`\
**topic_id:** `kubernetes`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Pod, Deployment and Service.

**Answer**

A Pod is Kubernetes' basic execution unit and contains one or more
containers. A Deployment manages replicated stateless Pods and rolling
updates. A Service provides stable network access to selected Pods
because Pod IPs are ephemeral. A common path is Ingress -\> Service -\>
Deployment -\> Pods. Real-world example: A payments API runs as a
Deployment of three Pods; an Ingress routes the public hostname to a
ClusterIP Service that load-balances across those Pods. During a rolling
update Kubernetes starts new Pods and removes old ones, yet clients
never see Pod IPs, only the stable Service.

**Keywords:** `explain, pod,, deployment, and, service.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## kubernetes-002 --- Readiness versus liveness probe?

**question_id:** `kubernetes-002`\
**topic_id:** `kubernetes`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Readiness versus liveness probe?

**Answer**

Readiness answers whether a Pod should receive traffic. Liveness answers
whether the container should continue running. Readiness failure removes
a Pod from traffic without necessarily restarting it; repeated liveness
failure can cause a restart. Probes must be designed carefully because
an overly aggressive liveness check can turn a dependency outage into a
full application restart storm. Real-world example: A team's liveness
probe called an endpoint that checked SQL; during a short database
outage every Pod failed liveness and restarted in a loop, turning a
brief blip into a full outage. After the fix, liveness only checked that
the process was responsive and readiness checked dependencies, so Pods
were removed from traffic rather than killed.

**Keywords:** `readiness, versus, liveness, probe`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## kubernetes-003 --- How would you deploy a .NET API safely to AKS?

**question_id:** `kubernetes-003`\
**topic_id:** `kubernetes`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you deploy a .NET API safely to AKS?

**Answer**

Build and scan an immutable container image, push it to ACR, and deploy
through CI/CD with resource requests/limits, probes, configuration,
secrets, Service and Ingress. Use rolling or controlled canary
deployment and maintain rollback capability. Add logs, metrics, traces,
RBAC and image scanning. Verify database migrations are backward
compatible because old and new Pods can coexist during rollout.
Real-world example: A bank deployed a new API version to AKS with
maxUnavailable set to zero, readiness probes and a small canary share of
traffic. The release added a column using expand and contract: first a
nullable column, then the new code, then a backfill and a constraint
later, so old Pods kept working during the rollout and a rollback stayed
safe.

**Keywords:** `how, would, you, deploy, a, .net, api, safely, to, aks`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## kubernetes-004 --- Explain resource requests and limits, OOMKilled and CPU throttling for a .NET container.

**question_id:** `kubernetes-004`\
**topic_id:** `kubernetes`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain resource requests and limits, OOMKilled and CPU throttling for a
.NET container.

**Answer**

Requests are what the scheduler reserves; limits are the ceiling.
Exceeding the memory limit gets the container OOMKilled, while exceeding
a CPU limit only throttles it, which shows up as latency. The .NET
runtime reads container limits to size the GC heap and thread pool, so a
very low CPU limit can cause slow thread-pool growth and a tight memory
limit can cause frequent GCs. Real-world example: an API with a 256 MB
limit was repeatedly OOMKilled during peak because the working set
reached 300 MB; the team profiled memory, raised the limit to 512 MB,
set the request near typical use and replaced a 200m CPU limit that was
causing p99 spikes with a larger request and no CPU limit.

**Keywords:**
`explain, resource, requests, and, limits,, oomkilled, and, cpu`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## kubernetes-005 --- A Pod is in CrashLoopBackOff or ImagePullBackOff. How do you troubleshoot it?

**question_id:** `kubernetes-005`\
**topic_id:** `kubernetes`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

A Pod is in CrashLoopBackOff or ImagePullBackOff. How do you
troubleshoot it?

**Answer**

For CrashLoopBackOff, run kubectl describe pod to see events and exit
codes, kubectl logs with the previous flag to read the crashed
container's output, and check configuration, secrets, probes, resource
limits and startup dependencies. For ImagePullBackOff, check the image
name and tag, registry credentials or the AKS-to-ACR attachment, and
network access. Real-world example: a release crashed on startup with
exit code 139 and no logs; kubectl describe showed an OOMKilled event,
and another team's ImagePullBackOff was a pipeline pushing tag 1.4.2
while the manifest referenced 1.4.20, which no registry search would
have found without comparing the exact tag.

**Keywords:**
`a, pod, is, in, crashloopbackoff, or, imagepullbackoff., how, do`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- CI/CD and DevOps

**topic_id:** `devops`\
**priority:** `Core`\
**category:** `Interview`

## devops-001 --- Describe a production CI/CD pipeline.

**question_id:** `devops-001`\
**topic_id:** `devops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Describe a production CI/CD pipeline.

**Answer**

A mature pipeline is commit -\> pull request/review -\> build -\> unit
tests -\> static/security checks -\> package -\> Docker build -\> image
scan -\> registry -\> deployment -\> integration tests -\> staging -\>
production -\> monitoring/rollback. The same immutable artifact should
be promoted rather than rebuilding different code for production.
Real-world example: In Azure DevOps, a pull request triggers build,
xUnit tests and a SonarQube quality gate; a merge to main builds a
Docker image tagged with the commit, scans it with Trivy, pushes it to
ACR and deploys to staging, runs smoke tests and then waits for approval
before production. Because the same image is promoted, what was tested
in staging is what runs in production.

**Keywords:** `describe, a, production, ci/cd, pipeline.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## devops-002 --- Blue/green versus canary?

**question_id:** `devops-002`\
**topic_id:** `devops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Blue/green versus canary?

**Answer**

Blue/green keeps old and new environments available and switches traffic
between them, making rollback straightforward if the old environment
remains intact. Canary gradually exposes a small percentage of traffic
to the new version and increases it if telemetry remains healthy. Canary
reduces blast radius; blue/green can be simpler if duplicate
environments are affordable. Real-world example: A retailer swaps App
Service slots for a Sunday release so rollback is another swap, while a
streaming service might expose a new recommendation algorithm to one
percent of users, watch error rates and widen gradually. Knight
Capital's loss of about USD 440 million in 45 minutes in 2012, after a
deployment reached only some servers, is the cautionary tale for risky,
non-gradual releases.

**Keywords:** `blue/green, versus, canary`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## devops-003 --- What is Infrastructure as Code?

**question_id:** `devops-003`\
**topic_id:** `devops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is Infrastructure as Code?

**Answer**

IaC describes infrastructure declaratively in version-controlled files
using tools such as Bicep or Terraform. It provides repeatability,
reviewability, automation and reduced configuration drift. It also
introduces state and lifecycle concerns, so infrastructure changes
should be reviewed and promoted through controlled pipelines. Real-world
example: With Bicep or Terraform in Git, a team can rebuild a complete
test environment (VNet, App Service, SQL, Key Vault) from a pipeline and
see exactly what a pull request will change. Without IaC, a portal quick
fix to a production network rule typically creates drift that surfaces
as an outage during the next disaster-recovery drill.

**Keywords:** `what, is, infrastructure, as, code`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## devops-004 --- What is trunk-based development, and how do feature flags enable continuous delivery?

**question_id:** `devops-004`\
**topic_id:** `devops`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is trunk-based development, and how do feature flags enable
continuous delivery?

**Answer**

Trunk-based development keeps short-lived branches (hours to a couple of
days) merged to main frequently, which avoids long-lived branch merge
pain and keeps CI meaningful. Unfinished features are hidden behind
feature flags so code can be deployed without being released, and flags
enable gradual rollout and instant disable. Flags need an owner and
removal date so they do not become permanent complexity. Real-world
example: a team on GitFlow spent two days per release merging branches;
moving to trunk-based with LaunchDarkly or Azure App Configuration flags
let them ship daily, enable a new checkout for 5 percent of users and
turn it off in seconds when error rates rose.

**Keywords:**
`what, is, trunk-based, development,, and, how, do, feature, flags`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## devops-005 --- How do you secure the software supply chain and CI/CD pipeline?

**question_id:** `devops-005`\
**topic_id:** `devops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you secure the software supply chain and CI/CD pipeline?

**Answer**

Pin and audit dependencies (NuGet audit, Dependabot, SCA tools),
generate an SBOM, scan source (SAST), dependencies and container images,
sign artifacts, use short-lived credentials such as OIDC federation
instead of stored secrets, restrict who can change pipelines and protect
main with reviews. Real-world examples: the 2020 SolarWinds attack
inserted malicious code through the build process, and the 2021
Log4Shell vulnerability showed how a transitive dependency can expose
thousands of applications; a team that kept an SBOM could list affected
services within hours, while others searched repositories manually for
days.

**Keywords:**
`how, do, you, secure, the, software, supply, chain, and, ci/cd`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Authentication, OAuth2, OIDC and JWT

**topic_id:** `security`\
**priority:** `Core`\
**category:** `Interview`

## security-001 --- Authentication versus authorization?

**question_id:** `security-001`\
**topic_id:** `security`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Authentication versus authorization?

**Answer**

Authentication answers who the caller is. Authorization determines what
that authenticated identity can do. A token can carry claims used by
authorization, but the token format itself is not the authorization
system. In ASP.NET Core, authentication establishes the user principal
and authorization policies evaluate roles, claims or scopes. Real-world
example: A user signs in with Entra ID (authentication); a policy
requires the cases.approve scope and membership in the supervisors group
(authorization). An API that validated the token but never checked that
the case belonged to the caller's tenant had an authorization bug, which
falls under Broken Access Control, the top item in the OWASP Top 10
(2021).

**Keywords:** `authentication, versus, authorization`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## security-002 --- OAuth2 versus OpenID Connect?

**question_id:** `security-002`\
**topic_id:** `security`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

OAuth2 versus OpenID Connect?

**Answer**

OAuth2 is an authorization framework for obtaining access to protected
resources. OpenID Connect adds an identity layer on top of OAuth2 and
introduces the ID token and standardized identity information.
Authorization Code with PKCE is commonly used for interactive clients,
while Client Credentials is appropriate for service-to-service access
without an end user. Real-world example: A React SPA signing in
employees through Entra ID uses Authorization Code with PKCE, receives
an ID token to display the user's name and an access token for the API,
while a nightly reporting service calling the same API uses Client
Credentials with a certificate and no user. Signing in with Google is
OpenID Connect, whereas letting a third-party app read your Drive files
is OAuth2 scopes.

**Keywords:** `oauth2, versus, openid, connect`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## security-003 --- Access token versus refresh token versus ID token?

**question_id:** `security-003`\
**topic_id:** `security`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Access token versus refresh token versus ID token?

**Answer**

An access token is intended for a protected resource/API. An ID token
communicates authentication/identity information to the client in OIDC.
A refresh token can be exchanged for a new access token according to
provider policy. Refresh tokens require strong protection because they
can represent a longer-lived ability to obtain access tokens. Real-world
example: The SPA sends the access token whose audience is the Orders
API, and the API must reject an ID token meant for the client. A mobile
banking app stores its refresh token in the operating system's secure
store and rotates it; if a refresh token is stolen the attacker can keep
minting access tokens, which is why rotation and revocation matter.

**Keywords:** `access, token, versus, refresh, token, versus, id, token`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## security-004 --- How do you design authorization in ASP.NET Core: roles, claims, policies and resource-based checks?

**question_id:** `security-004`\
**topic_id:** `security`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you design authorization in ASP.NET Core: roles, claims, policies
and resource-based checks?

**Answer**

Roles are coarse, claims carry attributes, and policies combine
requirements in code. Resource-based authorization
(IAuthorizationService with the loaded resource) decides on a specific
object, such as whether a user can edit this case. Keep permissions in a
central place, check authorization on the server for every request and
prefer deny by default. Real-world example: a case-management app with
roles Admin and Caseworker discovered that a Caseworker could open any
case by changing the ID in the URL (an IDOR); adding a resource-based
handler that checked the caller's office and assignment closed it, and a
policy tied to a cases.approve scope controlled the approval endpoint.

**Keywords:**
`how, do, you, design, authorization, in, asp.net, core:, roles,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## security-005 --- What are common JWT validation mistakes and how do you handle revocation?

**question_id:** `security-005`\
**topic_id:** `security`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are common JWT validation mistakes and how do you handle
revocation?

**Answer**

Validate signature, issuer, audience, expiry and not-before with an
allowed algorithm list and a small clock skew; never accept alg none or
trust unsigned claims; fetch signing keys from the issuer's metadata and
handle key rotation. JWTs cannot be revoked once issued, so use short
lifetimes, refresh-token rotation, a deny list for emergencies or token
introspection for high-risk systems. Real-world example: an API accepted
any valid token from the shared tenant because audience validation was
disabled, so a token meant for a different internal app worked; enabling
audience and issuer checks and cutting the access-token lifetime to 10
minutes fixed it, and a disabled employee's tokens were blocked by a
short-lived cache of revoked sessions.

**Keywords:**
`what, are, common, jwt, validation, mistakes, and, how, do, you`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## security-006 --- How do you design authentication and tenant isolation in a multi-tenant SaaS application?

**question_id:** `security-006`\
**topic_id:** `security`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you design authentication and tenant isolation in a multi-tenant
SaaS application?

**Answer**

Resolve the tenant from the token, domain or header, and then enforce it
everywhere: global EF query filters on TenantId, row-level security in
the database, tenant-scoped cache keys and storage paths, and tests that
try cross-tenant access. Decide between a shared database with a tenant
column, schema per tenant or database per tenant according to isolation,
cost and noisy-neighbor needs, and consider federated sign-in with each
customer's identity provider. Real-world example: a legal-tech vendor
found that a cache key without a TenantId returned one law firm's search
results to another; after adding a tenant prefix to every key, SQL
row-level security as a second safety net and an automated cross-tenant
test in CI, the leak class was closed.

**Keywords:**
`how, do, you, design, authentication, and, tenant, isolation, in, a`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Application Security and OWASP

**topic_id:** `appsec`\
**priority:** `Core`\
**category:** `Interview`

## appsec-001 --- Explain CORS, CSRF and XSS.

**question_id:** `appsec-001`\
**topic_id:** `appsec`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain CORS, CSRF and XSS.

**Answer**

CORS controls which browser origins can make cross-origin requests; it
is not an API authentication mechanism. CSRF abuses automatically
supplied browser credentials, often cookies, to cause unwanted state
changes; anti-CSRF tokens and appropriate cookie policies are common
defenses. XSS executes attacker-controlled script in a victim's browser;
output encoding, safe templating and content-security controls help
prevent or limit it. Real-world example: A marketing site at one origin
calling an API at another needs CORS configured for that origin only;
reflecting any Origin header back with credentials allowed is a common
misconfiguration. A banking app using cookie authentication without
anti-forgery tokens or SameSite let an attacker's page post a transfer
(CSRF), while a comment box that rendered unencoded HTML let scripts
steal sessions, as in the 2005 Samy worm on MySpace.

**Keywords:** `explain, cors,, csrf, and, xss.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## appsec-002 --- How do you prevent SQL injection?

**question_id:** `appsec-002`\
**topic_id:** `appsec`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you prevent SQL injection?

**Answer**

Use parameterized queries. EF Core LINQ normally parameterizes values
when used correctly, and raw SQL should use parameterized APIs rather
than string concatenation. Additional controls include least-privilege
database permissions, validation, secure error handling and monitoring.
Stored procedures are not automatically safe if they dynamically
concatenate untrusted input. Real-world example: The 2008 Heartland
Payment Systems breach and the 2015 TalkTalk breach in the UK involved
SQL injection. In .NET, FromSqlInterpolated parameterizes values while
FromSqlRaw with a concatenated search term does not, and a legacy ORDER
BY built from a sortColumn parameter needs an allowlist because column
names cannot be parameters.

**Keywords:** `how, do, you, prevent, sql, injection`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## appsec-003 --- What is SSRF?

**question_id:** `appsec-003`\
**topic_id:** `appsec`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is SSRF?

**Answer**

Server-Side Request Forgery occurs when an attacker can cause the
backend to make requests to destinations the attacker should not
control, potentially reaching internal services. Defenses include
destination allowlists, scheme/host validation, restrictions on private
address ranges where appropriate, redirect controls and outbound network
policies. A URL-fetching component may need isolation when arbitrary
external destinations are a business requirement. Real-world example:
The 2019 Capital One breach involved SSRF against a misconfigured web
application firewall to reach the AWS instance metadata service and
obtain temporary credentials. An import-profile-picture-from-URL or
webhook-test feature in a SaaS app is a typical entry point; defenses
include resolving DNS and blocking private ranges and metadata addresses
such as 169.254.169.254, and using IMDSv2 on AWS.

**Keywords:** `what, is, ssrf`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## appsec-004 --- What are IDOR and mass assignment, and how do you prevent them?

**question_id:** `appsec-004`\
**topic_id:** `appsec`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are IDOR and mass assignment, and how do you prevent them?

**Answer**

Insecure Direct Object Reference happens when a caller can access
another user's object by changing an identifier because the server does
not verify ownership. Mass assignment (overposting) happens when model
binding lets a client set properties it should not, such as IsAdmin or
Price. Prevent them with server-side ownership checks, DTOs that expose
only allowed fields, and not binding entities directly from requests.
Real-world example: a mobile app's GET /invoices/1001 returned any
invoice by incrementing the number, and a profile-update endpoint bound
the User entity directly so a client added role equals admin to the
JSON; both fixes were an ownership check and an UpdateProfileRequest
DTO. Both fall under OWASP's top category, Broken Access Control.

**Keywords:**
`what, are, idor, and, mass, assignment,, and, how, do, you`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Observability and Production Engineering

**topic_id:** `observability`\
**priority:** `Strong`\
**category:** `Interview`

## observability-001 --- Logs versus metrics versus traces?

**question_id:** `observability-001`\
**topic_id:** `observability`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Logs versus metrics versus traces?

**Answer**

Logs record detailed events, metrics provide numerical time-series
measurements, and traces follow an operation across distributed
components. Logs answer what happened, metrics show how much/how
often/how quickly, and traces show where time or failure occurred.
Correlation IDs and trace IDs connect diagnostic information across
services. Real-world example: A customer reports that checkout failed at
10:42. Metrics show the checkout error rate jumped at 10:41, the
distributed trace shows 4.8 seconds spent in the tax-service call, and
the logs for that trace ID show a SQL timeout in that service. No single
signal would have located the cause.

**Keywords:** `logs, versus, metrics, versus, traces`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## observability-002 --- API latency suddenly increased. How do you investigate?

**question_id:** `observability-002`\
**topic_id:** `observability`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

API latency suddenly increased. How do you investigate?

**Answer**

Start with scope: endpoint, tenant, region and time window. Inspect
p95/p99 latency, error rate, throughput, CPU/memory, database latency,
dependency latency, connection pools, thread-pool behavior, queue depth
and recent changes. Distributed traces can identify whether time is
being spent in SQL, HTTP dependencies, application code or messaging.
Fix the measured bottleneck. Real-world example: After a release, p99 on
GET /orders rose from 300 ms to 3 seconds while CPU stayed low. The
trace showed time in a new N+1 EF query and waits for connection-pool
slots, correlated with a deployment annotation on the dashboard;
rollback restored latency and the fix added a projection and a
regression test. Average latency would have hidden the tail.

**Keywords:**
`api, latency, suddenly, increased., how, do, you, investigate`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## observability-003 --- What are SLI, SLO, SLA and error budget?

**question_id:** `observability-003`\
**topic_id:** `observability`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are SLI, SLO, SLA and error budget?

**Answer**

An SLI is a measured service indicator such as successful-request
percentage or latency. An SLO is the engineering target for that
indicator. An SLA is a contractual/business commitment. The error budget
is the amount of unreliability allowed by the SLO. This provides a
quantitative way to balance feature delivery and reliability. Real-world
example: A booking API defines its SLI as the percentage of requests
that succeed in under 500 ms, an SLO of 99.9 percent over 30 days (about
43 minutes of error budget), and a customer SLA of 99.5 percent with
service credits. When a risky migration burned half the monthly budget
in one day, the team paused feature releases, as Google's SRE practice
recommends.

**Keywords:** `what, are, sli,, slo,, sla, and, error, budget`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## observability-004 --- How do you implement structured logging and distributed tracing across services and messages in .NET?

**question_id:** `observability-004`\
**topic_id:** `observability`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you implement structured logging and distributed tracing across
services and messages in .NET?

**Answer**

Use structured logging (Serilog or Microsoft.Extensions.Logging with
message templates) so fields are searchable, include trace and
correlation IDs in a log scope, avoid logging secrets and personal data,
and set sampling and retention to control cost. OpenTelemetry propagates
the W3C traceparent header across HTTP calls and can carry context in
message headers so a trace continues through a queue. Real-world
example: after adding OpenTelemetry with the MassTransit and HttpClient
instrumentation, a single trace showed an API call, the Service Bus
message and the consumer's SQL query, which exposed a 6-second consumer
delay that had previously looked like an API problem; a log line that
accidentally printed a full request body with card data was removed
after a log review.

**Keywords:**
`how, do, you, implement, structured, logging, and, distributed`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## observability-005 --- How do you design alerting that avoids alert fatigue?

**question_id:** `observability-005`\
**topic_id:** `observability`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you design alerting that avoids alert fatigue?

**Answer**

Alert on symptoms users feel (error rate, latency, availability,
saturation) rather than every internal cause, tie alerts to SLOs with
burn-rate thresholds, route by severity, attach runbooks and dashboards,
and review noisy alerts regularly. Page only when a human must act now.
Real-world example: a team paged on-call for every CPU spike above 80
percent and learned to ignore pages; replacing them with two alerts, one
for 5xx rate burning the monthly error budget quickly and one for p99
latency above target for 10 minutes, cut pages sharply and made the
remaining ones actionable.

**Keywords:**
`how, do, you, design, alerting, that, avoids, alert, fatigue`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Testing Strategy

**topic_id:** `testing`\
**priority:** `Strong`\
**category:** `Interview`

## testing-001 --- Unit versus integration versus end-to-end testing?

**question_id:** `testing-001`\
**topic_id:** `testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Unit versus integration versus end-to-end testing?

**Answer**

Unit tests isolate a small unit and are fast. Integration tests verify
multiple real components such as API plus database or broker. End-to-end
tests exercise complete business flows, often through a browser. A
healthy strategy uses many fast tests and fewer broad tests, with the
exact balance determined by the system. Real-world example: A
tax-calculator class gets hundreds of unit tests that run in
milliseconds; an integration test starts the API against a real SQL
container to prove the EF mappings and migrations work; and a handful of
Playwright tests cover register, pay and receive receipt. Teams that
rely mostly on slow browser tests (the ice-cream-cone anti-pattern) end
up with flaky, slow pipelines.

**Keywords:** `unit, versus, integration, versus, end-to-end, testing`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## testing-002 --- How do you implement ASP.NET Core integration tests?

**question_id:** `testing-002`\
**topic_id:** `testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you implement ASP.NET Core integration tests?

**Answer**

WebApplicationFactory can host the application in a test environment and
let tests send real HTTP requests through the pipeline. Testcontainers
can provide disposable real databases or brokers. Tests can verify
routing, serialization, authentication, persistence and integration
behavior that mocks cannot prove. Real-world example: A
WebApplicationFactory test replaces the real JWT scheme with a test
authentication handler, uses Testcontainers for SQL Server, calls POST
/orders and asserts a 201 and the row in the database. Tests like this
routinely catch problems mocks cannot, such as a missing enum-to-string
JSON converter or a wrong EF column mapping.

**Keywords:**
`how, do, you, implement, asp.net, core, integration, tests`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## testing-003 --- What makes a good unit test?

**question_id:** `testing-003`\
**topic_id:** `testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What makes a good unit test?

**Answer**

It is deterministic, focused, readable and verifies behavior rather than
fragile implementation details. Arrange/Act/Assert is a useful
structure. Async code should be awaited, not blocked. Parameterized
tests help cover input variations. Mocking should be purposeful rather
than turning every dependency into a mock simply to achieve an
artificial unit-test count. Real-world example: A discount test is named
by scenario and outcome (gold customer with an order over 100 gets 10
percent), uses a fake clock so it does not depend on today's date, and
asserts the returned price rather than checking that a private method
was called. Tests that asserted exact call counts on mocks broke on
every refactor and were eventually deleted.

**Keywords:** `what, makes, a, good, unit, test`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## testing-004 --- What is contract testing and when is it better than end-to-end tests?

**question_id:** `testing-004`\
**topic_id:** `testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is contract testing and when is it better than end-to-end tests?

**Answer**

Contract testing verifies that a consumer's expectations of an API match
what the provider delivers, usually with a tool such as Pact, without
deploying both services together. Consumers publish contracts, and
providers run them in CI so breaking changes fail before release. It is
faster and more reliable than shared end-to-end environments for
microservices. Real-world example: a billing service renamed a field
from customerId to accountId and broke the invoicing service in
production because no one tested the pair; after adopting Pact, the
provider build failed on the same rename, and the team replaced a slow,
flaky 90-minute end-to-end suite for these interactions.

**Keywords:**
`what, is, contract, testing, and, when, is, it, better, than`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## testing-005 --- How do you do load and performance testing for a .NET API?

**question_id:** `testing-005`\
**topic_id:** `testing`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you do load and performance testing for a .NET API?

**Answer**

Define realistic workloads and goals first (users, request mix, latency
percentiles, error budget), use a production-like environment and data
volume, and run load, stress, spike and soak tests with tools such as
k6, JMeter, Azure Load Testing or NBomber. Watch the whole system, not
just the API: database, connection pools, dependencies and autoscaling.
Run tests in CI for regressions. Real-world example: before a sale an
e-commerce team load-tested 5 times expected traffic, found SQL
connection-pool exhaustion at about 60 percent of the target and a cache
stampede on the home page, and fixed both; a soak test over 8 hours also
exposed a slow memory leak that short tests had missed.

**Keywords:**
`how, do, you, do, load, and, performance, testing, for, a`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Clean Architecture, SOLID and Design Patterns

**topic_id:** `architecture`\
**priority:** `Core`\
**category:** `Interview`

## architecture-001 --- Explain SOLID in practical terms.

**question_id:** `architecture-001`\
**topic_id:** `architecture`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain SOLID in practical terms.

**Answer**

Single Responsibility keeps responsibilities focused. Open/Closed
encourages extension without repeatedly modifying stable code. Liskov
Substitution requires implementations to preserve abstraction behavior.
Interface Segregation avoids forcing clients to depend on unused
members. Dependency Inversion keeps high-level logic independent of
concrete infrastructure. These are design heuristics, not a mandate to
create an interface for every class. Real-world example: A claims
service had a 3,000-line ClaimManager mixing validation, SQL, email and
PDF generation, so changing an email template required retesting claim
rules (a Single Responsibility violation). Extracting
INotificationSender and IClaimRepository let the rules be unit-tested
with fakes and let the team swap SendGrid for Azure Communication
Services without touching them.

**Keywords:** `explain, solid, in, practical, terms.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## architecture-002 --- Explain Factory, Strategy, Decorator and Adapter.

**question_id:** `architecture-002`\
**topic_id:** `architecture`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Factory, Strategy, Decorator and Adapter.

**Answer**

Factory encapsulates object creation. Strategy represents
interchangeable algorithms or policies. Decorator wraps an object to add
behavior without changing it. Adapter converts one interface to another
expected by a client. The important senior-level skill is recognizing
the underlying design problem and selecting the simplest solution rather
than forcing a named pattern. Real-world example: Factory: choosing a
carrier client such as FedEx or UPS from a shipment's carrier code.
Strategy: country-specific tax or shipping-fee rules selected by key.
Decorator: wrapping an IPaymentGateway with logging, retry and caching
decorators, which libraries like Scrutor make easy in .NET DI. Adapter:
putting a legacy SOAP credit-check service behind a modern ICreditCheck
interface.

**Keywords:** `explain, factory,, strategy,, decorator, and, adapter.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## architecture-003 --- Explain Clean Architecture.

**question_id:** `architecture-003`\
**topic_id:** `architecture`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Clean Architecture.

**Answer**

Clean Architecture separates business rules from infrastructure and
delivery mechanisms. Dependencies should point toward stable business
logic. For example, application code can depend on an abstraction for
persistence while Infrastructure implements it with EF Core. The goal is
testability and controlled coupling, not creating an excessive number of
projects or pass-through abstractions. Real-world example: In an Order
service the Domain and Application layers define IOrderRepository and
know nothing about EF Core or HTTP, while Infrastructure implements it,
so moving from SQL Server to PostgreSQL touched only Infrastructure.
Over-applied to a simple CRUD admin tool, the same structure becomes
five projects of pass-through classes, which is waste.

**Keywords:** `explain, clean, architecture.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## architecture-004 --- Is the Repository and Unit of Work pattern needed on top of EF Core, and what about MediatR?

**question_id:** `architecture-004`\
**topic_id:** `architecture`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Is the Repository and Unit of Work pattern needed on top of EF Core, and
what about MediatR?

**Answer**

DbContext already implements repository and unit-of-work behavior, so a
generic repository over it often adds no value and hides useful EF
features. A repository is worth it when it expresses domain-specific
queries or aggregate persistence and isolates infrastructure. Mediator
libraries help with vertical slices and pipeline behaviors but add
indirection, and some libraries have moved to commercial licensing, so
evaluate cost and need. Real-world example: a team with a generic
IRepository of T wrapping DbContext still needed to write raw queries
and Include chains, spreading EF details through the services; replacing
it with focused query classes and an aggregate-specific IOrderRepository
reduced code and made tests clearer.

**Keywords:**
`is, the, repository, and, unit, of, work, pattern, needed, on`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## architecture-005 --- What are the twelve-factor app principles and common architecture anti-patterns to avoid?

**question_id:** `architecture-005`\
**topic_id:** `architecture`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are the twelve-factor app principles and common architecture
anti-patterns to avoid?

**Answer**

Twelve-factor guidance includes one codebase, explicit dependencies,
configuration in the environment, backing services as attached
resources, stateless processes, port binding, disposability, dev and
prod parity and logs as event streams. Common anti-patterns are the god
class, anemic domain model, shared database between services, premature
abstraction, golden hammer technology choices and big-bang rewrites.
Real-world example: an app storing user sessions and uploaded files on
local disk broke when it scaled to three instances; moving sessions to
Redis, uploads to Blob Storage and settings to environment variables
made it horizontally scalable and let Kubernetes restart instances
freely.

**Keywords:**
`what, are, the, twelve-factor, app, principles, and, common`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- CQRS, DDD, Saga and Event-Driven Architecture

**topic_id:** `ddd`\
**priority:** `Strong`\
**category:** `Interview`

## ddd-001 --- What is CQRS?

**question_id:** `ddd-001`\
**topic_id:** `ddd`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is CQRS?

**Answer**

CQRS separates command-side state changes from query-side reads.
Commands enforce business rules and change state; queries are optimized
for retrieval. CQRS does not require two databases and does not
automatically mean event sourcing. It is useful when read/write
workloads or business complexity justify separate models. Real-world
example: A retail order system uses an EF Core command model with
business rules for PlaceOrder and a denormalized read model (a SQL view,
or a document store) for the My Orders screen, updated through events;
no event sourcing is involved. Banks use event sourcing for ledgers
where an auditable history matters, but that is a separate decision from
CQRS.

**Keywords:** `what, is, cqrs`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## ddd-002 --- Explain Saga.

**question_id:** `ddd-002`\
**topic_id:** `ddd`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain Saga.

**Answer**

A Saga coordinates a business workflow spanning multiple services
without one global database transaction. If one step fails, compensating
actions can move the system toward an acceptable state. Sagas can be
orchestrated by a coordinator or choreographed through events. Each step
should be idempotent and compensation failure must be handled
explicitly. Real-world example: A travel-booking saga reserves a flight,
then a hotel, then charges the card; if the hotel step fails it cancels
the flight reservation and releases the payment hold as compensations.
In MassTransit this is a state-machine saga with its state persisted in
SQL, and the airline's cancel call itself needs retries and idempotency.

**Keywords:** `explain, saga.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## ddd-003 --- What is a bounded context?

**question_id:** `ddd-003`\
**topic_id:** `ddd`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a bounded context?

**Answer**

A bounded context defines the boundary within which a domain model and
terminology have a particular meaning. The same business term can
legitimately have different representations in different contexts.
Bounded contexts reduce accidental coupling and help determine
service/module boundaries. DDD should be applied where domain complexity
warrants it rather than for simple CRUD applications. Real-world
example: In an e-commerce company, Product means a catalog entry with
images in Catalog, a stock-keeping unit with quantities in Inventory and
a priced line item in Billing. Forcing one shared Product class across
all three created coupling where every change needed every team; each
context owning its own model and exchanging events or APIs removed that.

**Keywords:** `what, is, a, bounded, context`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## ddd-004 --- What is event sourcing and what are its trade-offs?

**question_id:** `ddd-004`\
**topic_id:** `ddd`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is event sourcing and what are its trade-offs?

**Answer**

Event sourcing stores the sequence of domain events as the source of
truth and rebuilds current state by replaying them, often with
snapshots. It gives a complete audit trail, temporal queries and natural
integration events, but adds complexity: event versioning, eventual
consistent read models, harder ad-hoc querying and a learning curve. Use
it where history is a business requirement. Real-world example: a
trading ledger records Deposited and Withdrawn events so auditors can
reconstruct any balance at any moment, while a product catalog used
plain CRUD because nobody needs its history; a team that event-sourced
everything spent months managing schema changes for events that already
existed in production.

**Keywords:**
`what, is, event, sourcing, and, what, are, its, trade-offs`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## ddd-005 --- How do you design aggregates, and what is the difference between domain events and integration events?

**question_id:** `ddd-005`\
**topic_id:** `ddd`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you design aggregates, and what is the difference between domain
events and integration events?

**Answer**

An aggregate is a consistency boundary with a root that enforces
invariants; keep aggregates small, reference other aggregates by ID, and
change one aggregate per transaction. Domain events are raised inside a
bounded context to trigger side effects; integration events are
published across contexts as stable contracts, often through an outbox.
Real-world example: an Order aggregate owns its OrderLines and enforces
a maximum total, while the Customer is referenced by CustomerId;
OrderPlaced is a domain event that updates loyalty points in-process and
is translated into a versioned OrderPlacedIntegrationEvent for Shipping,
so internal refactoring does not break other teams.

**Keywords:**
`how, do, you, design, aggregates,, and, what, is, the, difference`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- System Design and Scalability

**topic_id:** `system-design`\
**priority:** `Core`\
**category:** `Interview`

## system-design-001 --- Design a .NET API capable of very high traffic.

**question_id:** `system-design-001`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Design a .NET API capable of very high traffic.

**Answer**

First clarify traffic shape and latency requirements. A generic
architecture can use an edge layer, API gateway, horizontally scaled
stateless .NET instances, Redis where justified, SQL/NoSQL, and a
message broker for asynchronous work. The database is often the limiting
resource, so query/index optimization, connection capacity, read scaling
and partitioning need consideration. Rate limiting, backpressure,
observability, autoscaling and failure isolation complete the design.
Real-world example: IRCTC's Tatkal rush and Flipkart's big sale events
illustrate the traffic shape such designs must survive: a virtual
waiting room or queue at the edge, a CDN for static content, autoscaled
stateless API instances, Redis for hot reads and strict rate limits.
Stack Overflow, by contrast, has publicly described serving huge traffic
from a small number of well-tuned servers, showing that efficiency
matters before scale-out.

**Keywords:** `design, a, .net, api, capable, of, very, high, traffic.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## system-design-002 --- Horizontal versus vertical scaling?

**question_id:** `system-design-002`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Horizontal versus vertical scaling?

**Answer**

Vertical scaling increases resources on one instance; horizontal scaling
adds instances. Stateless APIs are usually easier to scale horizontally
because requests can be distributed across instances. Databases are
harder because consistency and transaction requirements complicate
distribution. Scaling should follow the bottleneck instead of applying
the same strategy to every component. Real-world example: A stateless
catalog API is scaled horizontally from 3 to 30 Pods before a sale, but
the single SQL primary becomes the bottleneck, so the team adds read
replicas and caching and later partitions the heaviest tables by tenant.
Moving to a larger Azure SQL tier is the quick vertical fix for a
stateful database, but it has a ceiling.

**Keywords:** `horizontal, versus, vertical, scaling`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## system-design-003 --- Explain CAP theorem correctly.

**question_id:** `system-design-003`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain CAP theorem correctly.

**Answer**

CAP describes a trade-off during a network partition: a distributed
system cannot simultaneously guarantee both strong consistency and
availability in the strict CAP framing while the partition persists.
Partition tolerance is generally unavoidable in distributed systems, so
the practical choice is how the system behaves during partitions. CAP is
not simply a permanent 'pick any two' rule. Real-world example: GitHub's
October 2018 incident began with a very brief network partition between
its US East Coast data center and its East Coast hub; MySQL clusters
failed over to the West Coast and the two sides diverged, and restoring
consistent data took about a day. A bank's ledger chooses consistency
and rejects writes during a partition, while a social feed chooses
availability and shows slightly stale data.

**Keywords:** `explain, cap, theorem, correctly.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## system-design-004 --- Design a URL shortener.

**question_id:** `system-design-004`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Design a URL shortener.

**Answer**

Clarify scale (for example 100 million new URLs per month and a 100 to 1
read to write ratio). Generate a short unique code, using a counter or
distributed ID service encoded in base62 or a random code with a
collision check, store the mapping in a key-value or SQL store, and
serve redirects through a CDN and cache because reads dominate. Add
expiry, analytics through asynchronous events, abuse and malware checks
and rate limiting. Real-world example: Bitly-style services use a 301 or
302 redirect and aggregate click counts asynchronously through a queue
so the redirect path stays within milliseconds; a hot link that goes
viral is served from the cache and CDN rather than the database.

**Keywords:** `design, a, url, shortener.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## system-design-005 --- Design a notification system for email, SMS and push.

**question_id:** `system-design-005`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Design a notification system for email, SMS and push.

**Answer**

Accept notification requests through an API or events, store them with
an idempotency key, put them on queues per channel, and use workers that
apply user preferences, templates, rate limits and provider-specific
retries. Handle provider failover, delivery status callbacks,
dead-letter queues and opt-outs. Real-world example: an e-commerce
order-shipped message goes to a topic, the email worker uses SendGrid
with a fallback provider, SMS is throttled per country, push uses FCM
and APNs, and marketing emails go through a separate lower-priority
queue so a campaign to 5 million users cannot delay one-time passwords.

**Keywords:**
`design, a, notification, system, for, email,, sms, and, push.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## system-design-006 --- Design a flash-sale or ticket-booking system.

**question_id:** `system-design-006`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Design a flash-sale or ticket-booking system.

**Answer**

The main problems are a huge burst of traffic and contention on a small
amount of inventory. Use a virtual waiting room or queue at the edge,
cache static content, make inventory reservation atomic with short
expiring holds, process payment asynchronously with idempotency, protect
the database with rate limits and keep strong consistency only where
overselling matters. Real-world example: in large Indian sale events and
railway Tatkal windows, systems queue users and limit concurrent buyers;
a design that lets every request hit a single inventory row creates lock
contention, while pre-allocated stock buckets or a Redis counter
combined with a durable reservation record scale better.

**Keywords:** `design, a, flash-sale, or, ticket-booking, system.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## system-design-007 --- How would you do a back-of-the-envelope capacity estimate for a system?

**question_id:** `system-design-007`\
**topic_id:** `system-design`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you do a back-of-the-envelope capacity estimate for a system?

**Answer**

Convert business numbers into rates and sizes: daily users times actions
gives requests per day, divide by 86,400 for average requests per
second, multiply by a peak factor (often 3 to 10), and estimate payload
size and storage growth. Then compare with what one instance or database
can handle to size the system and find bottlenecks. State assumptions
and refine them. Real-world example: 2 million daily users making 20
requests each is 40 million requests per day, about 460 per second on
average and perhaps 2,000 at peak; with 10 KB responses that is about 20
MB per second outbound, which suggests a handful of API instances and a
database or cache design that can serve the read share.

**Keywords:**
`how, would, you, do, a, back-of-the-envelope, capacity, estimate`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Performance Engineering

**topic_id:** `performance`\
**priority:** `Strong`\
**category:** `Interview`

## performance-001 --- How do you systematically optimize a slow .NET application?

**question_id:** `performance-001`\
**topic_id:** `performance`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you systematically optimize a slow .NET application?

**Answer**

Measure first. Establish the affected workflow, load and latency
percentile, then determine whether the bottleneck is CPU, memory, I/O,
SQL, network or a dependency. Use traces, metrics, logs and profiling.
Common fixes include better SQL/indexes, fewer round trips, projection,
caching, async I/O, batching and reduced allocation. Re-test after the
change; an optimization without measurement is speculation. Real-world
example: A quote-generation API had a four-second p95. Application
Insights and dotnet-trace showed most of the time in one SQL query and
in serializing a large object graph, not in slow C#. A covering index
and a trimmed DTO delivered the main gain, and BenchmarkDotNet was used
only for the final hot path; micro-optimizing the C# first would have
changed nothing.

**Keywords:**
`how, do, you, systematically, optimize, a, slow, .net, application`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## performance-002 --- What is thread-pool starvation?

**question_id:** `performance-002`\
**topic_id:** `performance`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is thread-pool starvation?

**Answer**

Thread-pool starvation occurs when worker threads are occupied by
blocking work while more work waits for available threads. Common causes
include synchronous blocking on async operations with Result/Wait and
long-running synchronous work in request paths. The result can be severe
latency even without maximum CPU. Remove unnecessary blocking and use
asynchronous I/O where supported. Real-world example: An ASP.NET Core
API calling a third-party service with GetAwaiter().GetResult() ran fine
in testing, but under load the thread pool injected threads slowly,
requests queued and latency rose to many seconds with CPU near idle.
dotnet-counters showed a growing ThreadPool queue length, and making the
call async end to end fixed it.

**Keywords:** `what, is, thread-pool, starvation`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## performance-003 --- How do you optimize a CPU-heavy API?

**question_id:** `performance-003`\
**topic_id:** `performance`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you optimize a CPU-heavy API?

**Answer**

Profile before changing code. Identify expensive algorithms,
serialization, repeated computations, allocations/GC and CPU-heavy
business logic. Improve algorithmic complexity or remove redundant work
first. If the workload is genuinely CPU-bound and horizontally scalable,
adding instances can increase throughput. Caching reusable computations
can also help. Real-world example: A report-rendering API was CPU-bound;
profiling showed repeated Regex construction and serializing the same
data many times. Using a static or source-generated Regex, caching
rendered templates and moving heavy jobs to a queue-fed worker pool
improved throughput, and scale-out was then driven by KEDA on queue
length rather than guesswork.

**Keywords:** `how, do, you, optimize, a, cpu-heavy, api`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## performance-004 --- How do you diagnose a memory leak or high memory usage in a .NET application?

**question_id:** `performance-004`\
**topic_id:** `performance`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you diagnose a memory leak or high memory usage in a .NET
application?

**Answer**

Confirm the trend with metrics, then capture evidence: dotnet-counters
for GC and heap size, dotnet-gcdump or dotnet-dump to compare object
counts between two points, and a profiler or Visual Studio snapshot
analysis. Typical causes are static collections, event handlers never
unsubscribed, unbounded caches, undisposed objects and large object heap
fragmentation. Real-world example: an API's memory climbed until the Pod
was OOMKilled each day; two gcdumps hours apart showed millions of
growing strings held by a static Dictionary used as a cache with no
expiry, and replacing it with a size-limited MemoryCache with expiration
flattened the graph.

**Keywords:**
`how, do, you, diagnose, a, memory, leak, or, high, memory`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## performance-005 --- How do you reduce allocations and GC pressure in hot paths?

**question_id:** `performance-005`\
**topic_id:** `performance`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you reduce allocations and GC pressure in hot paths?

**Answer**

Measure with BenchmarkDotNet and allocation profilers first. Then avoid
unnecessary LINQ and boxing in hot loops, reuse buffers through
ArrayPool, use Span and Memory for slicing without copying, use
StringBuilder or string.Create instead of repeated concatenation, pool
expensive objects and prefer struct types only when they are small and
not boxed. Real-world example: a log-ingestion service parsing millions
of lines per minute spent 30 percent of CPU in GC because every line was
split into new strings; parsing with ReadOnlySpan of char and renting
buffers from ArrayPool cut allocations dramatically and removed the
latency spikes caused by gen-2 collections.

**Keywords:**
`how, do, you, reduce, allocations, and, gc, pressure, in, hot`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Resilience, Rate Limiting and Backpressure

**topic_id:** `resilience`\
**priority:** `Strong`\
**category:** `Interview`

## resilience-001 --- Explain timeout, retry and circuit breaker.

**question_id:** `resilience-001`\
**topic_id:** `resilience`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain timeout, retry and circuit breaker.

**Answer**

Timeout bounds how long an operation waits. Retry attempts a failed
operation again when the failure is likely transient. Circuit breaker
temporarily stops calls to an unhealthy dependency after repeated
failures. They must be designed together: retries increase load, so they
need bounded attempts, backoff and appropriate timeouts. Real-world
example: A checkout calling a shipping-rate API sets a two-second
timeout, retries twice on 503 with jittered exponential backoff and
opens a circuit after half the calls fail within 30 seconds. Amazon's
Builders' Library explains why jitter prevents synchronized retry
storms, and Microsoft.Extensions.Http.Resilience (built on Polly)
provides these policies in .NET.

**Keywords:** `explain, timeout,, retry, and, circuit, breaker.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## resilience-002 --- What is backpressure?

**question_id:** `resilience-002`\
**topic_id:** `resilience`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is backpressure?

**Answer**

Backpressure prevents a producer from overwhelming a slower consumer. In
an API-to-queue-to-worker architecture, the queue can absorb bursts but
cannot grow indefinitely. The system needs bounded capacity, consumer
scaling, rate limits and controlled rejection/degradation. Without
backpressure, overload can cascade into memory exhaustion and dependency
failure. Real-world example: A ticket-sales API accepted bursts of
50,000 requests into a queue while consumers handled 2,000 per second;
unbounded, the broker's memory filled. With bounded queues, 429
responses or a waiting-room page for the excess, and autoscaled
consumers, the system degraded predictably. In-process, a bounded
System.Threading.Channels channel applies the same idea.

**Keywords:** `what, is, backpressure`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## resilience-003 --- How would you implement distributed API rate limiting?

**question_id:** `resilience-003`\
**topic_id:** `resilience`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you implement distributed API rate limiting?

**Answer**

Choose the limiting key---user, tenant, API key, IP or endpoint---based
on the business requirement. Token bucket and sliding-window algorithms
are common choices. In a multi-instance deployment, local counters
cannot enforce a global limit reliably; use an appropriate distributed
store or gateway. Return HTTP 429 and expose useful retry guidance when
appropriate. Real-world example: A SaaS API limits each tenant to 100
requests per second with a token bucket; with five API instances, local
counters would allow five times the limit, so the counter lives in
Redis, in API Management or in a gateway. GitHub and Stripe publish
rate-limit headers, and a 429 with Retry-After helps well-behaved
clients back off.

**Keywords:**
`how, would, you, implement, distributed, api, rate, limiting`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## resilience-004 --- What is the bulkhead pattern and how do you use Polly or Microsoft.Extensions.Http.Resilience?

**question_id:** `resilience-004`\
**topic_id:** `resilience`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the bulkhead pattern and how do you use Polly or
Microsoft.Extensions.Http.Resilience?

**Answer**

A bulkhead isolates resources so one failing dependency cannot consume
everything, for example separate connection pools, thread or concurrency
limits, queues or even separate deployments per dependency or tenant.
Polly strategies and the resilience handler combine timeout, retry,
circuit breaker, rate limiter and hedging in a pipeline. Real-world
example: a retail API used one shared HTTP client for recommendations
and payments; when recommendations hung, all connections were busy and
payments failed too. Separate typed clients with their own concurrency
limits and timeouts kept payments working while recommendations degraded
to a default list.

**Keywords:** `what, is, the, bulkhead, pattern, and, how, do, you, use`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## resilience-005 --- How do you plan disaster recovery and test resilience with chaos engineering?

**question_id:** `resilience-005`\
**topic_id:** `resilience`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you plan disaster recovery and test resilience with chaos
engineering?

**Answer**

Define RPO and RTO per system, pick a strategy (backup and restore,
pilot light, warm standby, active-active) by cost versus tolerance,
automate infrastructure so a region can be rebuilt, and test regularly.
Chaos engineering injects controlled failures such as killed Pods,
latency or a dependency outage to verify assumptions. Real-world
example: Netflix popularized Chaos Monkey to terminate instances in
production so services would be built to tolerate loss, and a bank that
ran a game day by blocking its payment-gateway endpoint in staging
discovered that the app retried indefinitely and filled its queue, a bug
fixed before it could occur in production.

**Keywords:**
`how, do, you, plan, disaster, recovery, and, test, resilience, with`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Background Services and Async Processing

**topic_id:** `background`\
**priority:** `Strong`\
**category:** `Interview`

## background-001 --- BackgroundService versus Azure Function versus message consumer?

**question_id:** `background-001`\
**topic_id:** `background`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

BackgroundService versus Azure Function versus message consumer?

**Answer**

BackgroundService is useful for work hosted with an ASP.NET Core
process, but important work stored only in process memory can be lost
during restart. Functions fit event-driven/serverless triggers. Durable
message consumers are appropriate when work must survive application
restarts and be retried. The choice depends on durability, scaling,
trigger model and operational requirements. Real-world example: A
BackgroundService sending welcome emails from an in-memory queue lost
emails when its Pod restarted during a deployment; moving to Service Bus
with a durable consumer made the work retriable. A nightly cleanup of
old temp files is fine as a timer-triggered Function or hosted service
because it can simply run again.

**Keywords:**
`backgroundservice, versus, azure, function, versus, message, consumer`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## background-002 --- How do you implement graceful shutdown?

**question_id:** `background-002`\
**topic_id:** `background`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you implement graceful shutdown?

**Answer**

Stop accepting new work, signal cancellation, allow safe in-flight
operations to complete within a bounded shutdown period, and avoid
acknowledging durable messages until processing is successful. In
Kubernetes, readiness should be withdrawn before termination so traffic
drains. Long-running jobs should be resumable or safely retryable.
Real-world example: During a Kubernetes rolling update the Pod receives
SIGTERM; the app reports not ready, finishes in-flight
invoice-generation jobs within terminationGracePeriodSeconds and does
not complete the Service Bus message until the invoice is stored, so a
killed Pod causes redelivery rather than lost work. In .NET,
IHostApplicationLifetime and HostOptions.ShutdownTimeout govern this.

**Keywords:** `how, do, you, implement, graceful, shutdown`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## background-003 --- Explain CancellationToken propagation.

**question_id:** `background-003`\
**topic_id:** `background`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain CancellationToken propagation.

**Answer**

CancellationToken is cooperative cancellation. A caller signals
cancellation and methods check it or pass it into APIs such as
database/HTTP operations. The token should propagate through layers
rather than being swallowed. Request cancellation can stop unnecessary
downstream work after a client disconnects. Cancellation is not the same
as forcibly terminating a thread. Real-world example: A search endpoint
forwards HttpContext.RequestAborted to EF Core and an HttpClient call,
so when the user closes the tab the SQL query is cancelled instead of
burning CPU. Repositories that did not pass the token down kept long
reports running long after clients left. In a worker, linking the
stopping token with a timeout CancellationTokenSource gives each job a
deadline.

**Keywords:** `explain, cancellationtoken, propagation.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## background-004 --- How do you run scheduled jobs reliably in a scaled-out environment with Hangfire, Quartz or Azure Functions?

**question_id:** `background-004`\
**topic_id:** `background`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you run scheduled jobs reliably in a scaled-out environment with
Hangfire, Quartz or Azure Functions?

**Answer**

When several instances run the same scheduler, a job may execute
multiple times unless there is coordination. Hangfire and Quartz persist
jobs in a store and use locks so only one node runs each job; Azure
Functions timer triggers use a storage lease for single execution;
Kubernetes CronJobs run one Pod per schedule. Jobs should still be
idempotent and resumable, with monitoring for missed or failed runs.
Real-world example: a nightly billing job ran on three web instances
using a naive timer and invoiced customers three times; moving it to
Hangfire with a SQL-backed distributed lock and an idempotency check on
invoice period fixed it, and a dashboard alert now fires if the job does
not complete by 3 a.m.

**Keywords:**
`how, do, you, run, scheduled, jobs, reliably, in, a, scaled-out`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Legacy .NET and Modernization

**topic_id:** `legacy`\
**priority:** `Legacy/Specialized`\
**category:** `Interview`

## legacy-001 --- How would you modernize a large Web Forms application?

**question_id:** `legacy-001`\
**topic_id:** `legacy`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you modernize a large Web Forms application?

**Answer**

I would avoid an immediate rewrite. First inventory modules,
dependencies, business rules, integrations and risk. Add
characterization tests around critical behavior, then identify seams for
incremental extraction. A Strangler Fig approach can route selected
functionality to ASP.NET Core while the old system continues to serve
the remainder. An anti-corruption layer can translate between legacy and
modern models. Real-world example: A vendor with a large Web Forms
system can run a Strangler Fig migration: YARP or IIS URL rewriting
routes the documents API to a new ASP.NET Core service while other pages
stay in Web Forms, and a shared cookie or token bridge lets users move
between old and new screens. Characterization tests capture existing
behavior first, so the new module can be compared with the old one.

**Keywords:**
`how, would, you, modernize, a, large, web, forms, application`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## legacy-002 --- WCF versus ASP.NET Core Web API migration?

**question_id:** `legacy-002`\
**topic_id:** `legacy`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

WCF versus ASP.NET Core Web API migration?

**Answer**

First identify WCF contracts, bindings and non-HTTP behavior.
HTTP-oriented services may migrate to ASP.NET Core APIs, while
specialized messaging behavior may require another target architecture.
Use adapters/facades and contract tests, migrate clients incrementally
and monitor parity. Preserve business behavior while improving security,
observability and deployment. Real-world example: A bank's WCF service
using wsHttpBinding with message security and transactions could not be
moved one-to-one; the team exposed an ASP.NET Core API (or used CoreWCF,
an open-source project Microsoft supports, for contract compatibility)
and ran contract tests comparing old and new responses while clients
migrated gradually.

**Keywords:** `wcf, versus, asp.net, core, web, api, migration`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## legacy-003 --- Rehost, replatform, refactor, rewrite or retire?

**question_id:** `legacy-003`\
**topic_id:** `legacy`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Rehost, replatform, refactor, rewrite or retire?

**Answer**

Rehost moves with minimal changes. Replatform makes limited changes to
use a better platform. Refactor changes internal architecture while
retaining the product. Rewrite creates a new implementation and carries
substantial functional/migration risk. Retire removes unnecessary
functionality. The decision should consider business value, security,
operational cost, technical risk and expected lifespan---not simply how
old the code is. Real-world example: A manufacturer rehosted a Windows
application to Azure VMs in weeks to exit a data center, replatformed
the database to Azure SQL Managed Instance, refactored the order module
into a service, retired an unused reporting module and rewrote only the
customer portal. The big-bang rewrite is the usual failure; Netscape's
rewrite, described in Joel Spolsky's well-known essay, is the cautionary
tale.

**Keywords:** `rehost,, replatform,, refactor,, rewrite, or, retire`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## legacy-004 --- How do you migrate a .NET Framework application to modern .NET?

**question_id:** `legacy-004`\
**topic_id:** `legacy`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you migrate a .NET Framework application to modern .NET?

**Answer**

Inventory dependencies, run the .NET Upgrade Assistant and API
analyzers, find System.Web, WCF, Web Forms and other unsupported pieces,
upgrade shared libraries first by targeting .NET Standard or
multi-targeting, then move the application incrementally, often with a
reverse proxy such as YARP or the incremental System.Web adapters. Add
tests before changing behavior and plan hosting, authentication and
configuration changes. Real-world example: a company with a 15-year-old
MVC 5 app on .NET Framework 4.8 moved shared domain libraries to
multi-target net48 and net8.0, then migrated controllers area by area
behind YARP, which allowed releases to continue and cut risk compared
with a single cutover weekend.

**Keywords:**
`how, do, you, migrate, a, .net, framework, application, to, modern`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## legacy-005 --- How do you remediate vulnerable NuGet packages in a legacy .NET Framework 4.8 solution?

**question_id:** `legacy-005`\
**topic_id:** `legacy`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you remediate vulnerable NuGet packages in a legacy .NET
Framework 4.8 solution?

**Answer**

Identify the issues with tooling (NuGet audit warnings, dotnet list
package --vulnerable --include-transitive, Dependabot or a software
composition scanner), decide which direct or transitive package needs
upgrading, and migrate packages.config to PackageReference where
possible for better transitive control. Update, fix binding redirects,
run regression tests and verify the deployed bin output, since .NET
Framework can fail at runtime with assembly version conflicts.
Real-world example: a CVE in System.Text.Encodings.Web arrived
transitively through another library; the team added a direct reference
to the patched version, reviewed the generated binding redirects in
web.config, ran the full regression suite in staging and found one
assembly-load error that only appeared at runtime, before it reached
production.

**Keywords:**
`how, do, you, remediate, vulnerable, nuget, packages, in, a, legacy`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- SSRS, SSIS, Power BI and SharePoint

**topic_id:** `enterprise`\
**priority:** `Useful`\
**category:** `Interview`

## enterprise-001 --- How would you migrate SSRS reporting to Power BI?

**question_id:** `enterprise-001`\
**topic_id:** `enterprise`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you migrate SSRS reporting to Power BI?

**Answer**

Inventory reports, users, schedules, data sources, parameters and
security. Retire unused reports, recreate analytical dashboards in Power
BI, and retain document-style reporting where it remains appropriate.
Validate business calculations, security and performance, not just
visual appearance. Migrate incrementally and measure adoption.
Real-world example: A finance team with 400 SSRS reports found 150 had
not been run in 12 months and retired them, moved interactive dashboards
to Power BI with row-level security, and kept pixel-perfect statutory
invoices in paginated reports. Validation compared totals for the same
period between old and new and uncovered a time-zone difference in one
calculation.

**Keywords:** `how, would, you, migrate, ssrs, reporting, to, power, bi`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## enterprise-002 --- What makes an ETL pipeline reliable?

**question_id:** `enterprise-002`\
**topic_id:** `enterprise`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What makes an ETL pipeline reliable?

**Answer**

A reliable ETL pipeline validates data, supports incremental processing,
handles errors, maintains checkpoints and can restart safely. It should
provide reconciliation, monitoring and lineage. Idempotent batch
processing is important so retries do not corrupt the destination. For
large sources, incremental extraction is usually preferable to
repeatedly processing the entire dataset. Real-world example: A nightly
import of 20 million vendor transactions uses a watermark for
incremental extraction, loads into a staging table, validates, and then
MERGEs into the warehouse in one transaction, so a rerun after a failure
gives the same result; a reconciliation report compares row counts and
totals with the source.

**Keywords:** `what, makes, an, etl, pipeline, reliable`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## enterprise-003 --- What should a .NET developer know about SharePoint integration?

**question_id:** `enterprise-003`\
**topic_id:** `enterprise`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What should a .NET developer know about SharePoint integration?

**Answer**

Understand supported APIs, authentication, permissions, document
metadata, versioning, concurrency and Microsoft 365 integration. Keep
SharePoint-specific logic behind an integration boundary so the rest of
the application is not coupled to implementation details. Sensitive
documents require strict authorization and auditing. Real-world example:
A contract-management app stores PDFs in SharePoint Online through
Microsoft Graph with app-only permissions limited to specific sites,
keeps SharePoint behind an IDocumentStore interface, handles throttling
(HTTP 429 with Retry-After) and logs every access for audit. A classic
pitfall is hitting the 5,000-item list view threshold with unfiltered
list queries.

**Keywords:**
`what, should, a, .net, developer, know, about, sharepoint, integration`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

# TOPIC --- AI-Assisted Development, RAG and MCP

**topic_id:** `ai`\
**priority:** `Strong`\
**category:** `Interview`

## ai-001 --- How should a senior developer use AI coding assistants?

**question_id:** `ai-001`\
**topic_id:** `ai`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How should a senior developer use AI coding assistants?

**Answer**

Treat AI as a productivity layer, not an authority. Provide precise
requirements and repository context, generate or refactor, then review,
test, security-check and benchmark where relevant. Be especially
cautious with authentication, authorization, concurrency, financial
logic, SQL and infrastructure. The developer remains responsible for
correctness, maintainability and production behavior. Real-world
example: A developer asks Copilot or Claude Code to scaffold a
controller and its tests, and reviewers still check authorization, SQL
parameterization and edge cases, because assistants can suggest insecure
patterns; teams add SAST and mandatory review. Samsung's 2023
restriction on ChatGPT after employees pasted proprietary code shows the
data-leak side that policies must cover.

**Keywords:**
`how, should, a, senior, developer, use, ai, coding, assistants`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## ai-002 --- Explain RAG.

**question_id:** `ai-002`\
**topic_id:** `ai`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain RAG.

**Answer**

Retrieval-Augmented Generation retrieves relevant enterprise information
and supplies it as context to an LLM. A typical pipeline is user query
-\> embedding/search -\> authorized documents -\> context construction
-\> model -\> response. Production RAG needs ingestion, chunking,
retrieval quality, access control, evaluation and observability.
Authorization must be enforced during retrieval so a model cannot expose
documents the user cannot access. Real-world example: An internal HR
assistant retrieves policy documents chunked into Azure AI Search
(hybrid vector and keyword), filters results by the caller's group
(security trimming) before sending context to Azure OpenAI, and shows
citations. Without trimming, an employee could receive confidential
compensation documents in an answer.

**Keywords:** `explain, rag.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## ai-003 --- What is MCP?

**question_id:** `ai-003`\
**topic_id:** `ai`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is MCP?

**Answer**

Model Context Protocol provides a standardized way for AI systems to
interact with external tools and data sources. It can connect an agent
to repositories, work tracking, documentation or other controlled
capabilities. Security remains critical: tools need least privilege,
authentication, authorization, auditing and safe execution boundaries.
An agent that can deploy or modify production should have much stronger
controls than a read-only assistant. Real-world example: An Azure DevOps
MCP server lets an agent read a work item and its linked repository;
read-only scopes are low risk, while a tool that can run SQL or trigger
deployments needs approvals and audit logs. Prompt injection hidden in a
ticket description, such as an instruction to reveal secrets, is a
practical attack path against agents that trust tool output.

**Keywords:** `what, is, mcp`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## ai-004 --- What is prompt injection and how do you secure an LLM-powered application?

**question_id:** `ai-004`\
**topic_id:** `ai`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is prompt injection and how do you secure an LLM-powered
application?

**Answer**

Prompt injection is when untrusted text, such as a user message, web
page or document, contains instructions that override the application's
intent. Defend with least-privilege tools, separating trusted
instructions from untrusted data, input and output validation, human
approval for risky actions, content filtering, logging and no secrets in
prompts. Treat model output as untrusted input. Real-world example: a
support chatbot with access to a refund tool was told in a customer
message to ignore its rules and issue refunds; restricting the tool to
amounts under a limit, requiring human approval above it and verifying
order ownership on the server removed the risk. The OWASP Top 10 for LLM
Applications lists this as a top risk.

**Keywords:**
`what, is, prompt, injection, and, how, do, you, secure, an`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## ai-005 --- How would you integrate Azure OpenAI or another LLM API into a .NET application in production?

**question_id:** `ai-005`\
**topic_id:** `ai`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you integrate Azure OpenAI or another LLM API into a .NET
application in production?

**Answer**

Use an abstraction such as Microsoft.Extensions.AI or Semantic Kernel,
authenticate with managed identity, keep prompts versioned, stream
responses, set timeouts, retries and token limits, cache where
appropriate, handle rate limits (429) and content-safety results, and
log usage and cost. Evaluate quality with test sets, not only manual
checks, and design for model changes. Real-world example: a
document-summary feature behind a queue handled burst traffic with
per-tenant token quotas, fell back to a smaller model on 429s, stored
prompt and model version with each result and had a regression test set
of 200 sample documents run in CI whenever the prompt changed.

**Keywords:**
`how, would, you, integrate, azure, openai, or, another, llm, api`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- IIS, Windows Hosting and Production Troubleshooting

**topic_id:** `iis`\
**priority:** `Legacy/Specialized`\
**category:** `Interview`

## iis-001 --- How does IIS hosting differ from ASP.NET Core hosting?

**question_id:** `iis-001`\
**topic_id:** `iis`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How does IIS hosting differ from ASP.NET Core hosting?

**Answer**

Traditional ASP.NET applications are deeply integrated with IIS hosting.
ASP.NET Core uses its own web server, Kestrel, and can run behind IIS as
a reverse proxy or with supported hosting integration. For legacy
enterprise systems, understanding application pools, bindings,
recycling, permissions and deployment behavior remains valuable.
Real-world example: A Web Forms app on IIS works with Windows
authentication and the app pool identity connecting to SQL Server, while
an ASP.NET Core API on the same server runs in-process through the
ASP.NET Core Module. A common deployment failure is a missing hosting
bundle, which appears as HTTP 500.19 or 502.5 errors.

**Keywords:**
`how, does, iis, hosting, differ, from, asp.net, core, hosting`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## iis-002 --- An IIS application becomes slow over time but is fast after restart. What do you investigate?

**question_id:** `iis-002`\
**topic_id:** `iis`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

An IIS application becomes slow over time but is fast after restart.
What do you investigate?

**Answer**

Look for resource accumulation: memory retention, unbounded caches,
connection leaks, thread-pool starvation, long-running requests,
file/socket leaks or growing queues. Compare telemetry before and after
restart and capture diagnostics during degradation. Restarting may
mitigate symptoms but should not be treated as the root-cause fix.
Real-world example: A legacy app slowed over several days until the
nightly app pool recycle; a memory dump analyzed with dotnet-dump or
WinDbg showed millions of retained objects in a static Dictionary cache
with no expiry, plus unclosed SqlDataReaders. The scheduled recycle was
the stopgap, and the real fix replaced the cache with a size-limited
MemoryCache.

**Keywords:**
`an, iis, application, becomes, slow, over, time, but, is, fast`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## iis-003 --- What causes database connection exhaustion?

**question_id:** `iis-003`\
**topic_id:** `iis`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What causes database connection exhaustion?

**Answer**

Connections can be held too long by slow queries, excessive concurrency,
incorrect disposal, blocked transactions or an undersized pool. Scaling
from one to many API instances can multiply the aggregate number of
connections against SQL. Increasing the pool blindly can worsen database
overload, so investigate query duration, connection usage, database
capacity and application concurrency first. Real-world example: After
scaling an API from 2 to 20 instances, SQL Server ran out of connections
because each instance had a Max Pool Size of 100; the root cause was a
report holding a connection for 30 seconds inside a transaction while
awaiting an external call. Shortening the transaction and capping pool
size per instance fixed it; the classic symptom is the error saying the
timeout expired while obtaining a connection from the pool.

**Keywords:** `what, causes, database, connection, exhaustion`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## iis-004 --- How do you diagnose high CPU or hangs in a w3wp process?

**question_id:** `iis-004`\
**topic_id:** `iis`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you diagnose high CPU or hangs in a w3wp process?

**Answer**

Identify whether CPU is in managed code, native code or the GC; capture
dumps or traces during the problem with procdump, dotnet-dump, PerfView
or Application Insights Profiler, then analyze stacks for hot methods,
lock contention or blocked threads. Check IIS logs, request queue
length, app pool recycling and thread-pool settings. Real-world example:
a legacy site hit 100 percent CPU every morning; three dumps taken 30
seconds apart showed many threads in a Regex evaluation on a
user-supplied search string with catastrophic backtracking, similar to
the 2019 Cloudflare outage caused by a regular expression; adding a
regex match timeout and simplifying the pattern ended the spikes.

**Keywords:** `how, do, you, diagnose, high, cpu, or, hangs, in, a`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## iis-005 --- What is the Kerberos double-hop problem and how do you solve it?

**question_id:** `iis-005`\
**topic_id:** `iis`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the Kerberos double-hop problem and how do you solve it?

**Answer**

With Windows authentication, a web server can impersonate the user to
reach resource A, but forwarding the same identity to a second server
such as SQL Server usually fails because delegation is not permitted;
the result is anonymous logon or access denied. Fixes include Kerberos
constrained delegation (preferably resource-based), using a service
account or managed identity with a trusted-subsystem model, or passing
identity as claims. Real-world example: an intranet app worked locally
but returned login failed for NT AUTHORITY ANONYMOUS LOGON in production
when it queried a remote SQL Server on behalf of users; the team
configured SPNs and constrained delegation for the app pool account, and
later redesigned the app to use a service identity with user
authorization inside the application.

**Keywords:**
`what, is, the, kerberos, double-hop, problem, and, how, do, you`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Code Review, Mentoring and Architecture Decisions

**topic_id:** `leadership`\
**priority:** `Strong`\
**category:** `Interview`

## leadership-001 --- What do you look for in a senior-level code review?

**question_id:** `leadership-001`\
**topic_id:** `leadership`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What do you look for in a senior-level code review?

**Answer**

I check correctness, architecture, security, performance, concurrency,
reliability, observability, testing and operational impact. I
distinguish blockers from preferences and explain the principle behind
important comments. A good review improves the system and teaches
reusable engineering practices rather than becoming a personal style
argument. Real-world example: In a pull request adding an endpoint, a
senior reviewer flags blockers (a missing tenant check, an N+1 query, no
cancellation token), marks style nits as optional and links the team's
API guidelines. Google's published engineering practices say reviewers
should favor approving a change that definitely improves overall code
health even if it is not perfect.

**Keywords:**
`what, do, you, look, for, in, a, senior-level, code, review`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## leadership-002 --- How do you make an architecture decision when no option is perfect?

**question_id:** `leadership-002`\
**topic_id:** `leadership`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you make an architecture decision when no option is perfect?

**Answer**

Start with requirements and constraints, define decision criteria,
compare alternatives and document trade-offs. Criteria may include
reliability, scalability, security, cost, delivery time, operational
complexity and team capability. Record the decision and assumptions in
an ADR. Architecture is about choosing the best trade-off for the
business, not selecting the most fashionable technology. Real-world
example: Choosing between Kafka and Azure Service Bus for order events,
a team wrote an ADR scoring replay needs, operational skills, cost and
Azure integration, chose Service Bus and set a trigger to revisit if
analytics replay became a requirement. Amazon's two-way-door versus
one-way-door framing helps decide how much analysis a decision deserves.

**Keywords:**
`how, do, you, make, an, architecture, decision, when, no, option`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## leadership-003 --- How do you mentor developers without becoming a bottleneck?

**question_id:** `leadership-003`\
**topic_id:** `leadership`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you mentor developers without becoming a bottleneck?

**Answer**

Use a progression of explain -\> pair -\> review -\> delegate -\> trust.
Establish standards and examples, automate basic checks, and let
developers own increasingly difficult decisions. The goal is to increase
team capability rather than making every change dependent on the lead.
Mentoring should improve both technical skill and engineering judgment.
Real-world example: A lead pairs with a mid-level developer on the first
saga implementation, reviews their next design document, then lets them
present the ADR and own the rollout, while checklists, templates and a
CI analyzer remove repetitive review comments. A lead who approves every
pull request becomes the release bottleneck.

**Keywords:**
`how, do, you, mentor, developers, without, becoming, a, bottleneck`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

# TOPIC --- High-Value Senior Comparisons

**topic_id:** `comparisons`\
**priority:** `Core`\
**category:** `Interview`

## comparisons-001 --- EF Core versus Dapper?

**question_id:** `comparisons-001`\
**topic_id:** `comparisons`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

EF Core versus Dapper?

**Answer**

EF Core is a full ORM providing LINQ, change tracking, relationship
mapping and migrations. Dapper is a lightweight mapper around SQL and
gives direct control over SQL. EF Core is productive for domain-heavy
applications; Dapper is useful for SQL-centric or carefully optimized
read paths. Both can coexist when there is a measured reason, but
multiple data-access approaches increase complexity. Real-world example:
Dapper was created at Stack Overflow to make SQL-heavy read paths fast;
many systems use EF Core for write-side aggregates and migrations and
Dapper or a stored procedure for a complex reporting query. EF Core 7
added ExecuteUpdate and ExecuteDelete, which narrowed the gap for bulk
operations.

**Keywords:** `ef, core, versus, dapper`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## comparisons-002 --- RabbitMQ versus Kafka versus Azure Service Bus?

**question_id:** `comparisons-002`\
**topic_id:** `comparisons`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

RabbitMQ versus Kafka versus Azure Service Bus?

**Answer**

RabbitMQ is a flexible broker with rich routing and messaging patterns.
Kafka is a distributed event-streaming platform optimized for durable
high-throughput streams, partitions and replay. Azure Service Bus is a
managed enterprise messaging service with queues/topics, dead-lettering
and Azure integration. Choose based on delivery semantics, ordering,
replay, throughput, retention and operational model. Real-world example:
LinkedIn created Kafka for high-volume activity feeds and metrics; an
order workflow needing retries, dead-lettering and per-message
processing on Azure fits Service Bus; a task-routing system with rich
routing keys in a self-hosted environment fits RabbitMQ. Kafka's replay
lets a new analytics consumer rebuild its state from historical events.

**Keywords:** `rabbitmq, versus, kafka, versus, azure, service, bus`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## comparisons-003 --- Monolith versus modular monolith versus microservices?

**question_id:** `comparisons-003`\
**topic_id:** `comparisons`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Monolith versus modular monolith versus microservices?

**Answer**

A monolith deploys as one application and can be tightly coupled. A
modular monolith remains one deployable unit but enforces strong
internal boundaries. Microservices provide independent deployment and
scaling but introduce distributed-system failure, networking,
consistency and observability problems. For many new systems, a modular
monolith is a safer starting point unless independent service boundaries
are justified. Real-world example: Shopify has publicly described
running a very large Rails application as a modular monolith with
enforced component boundaries rather than splitting it into hundreds of
services, while Amazon Prime Video's 2023 engineering article described
moving a video-quality monitoring component from distributed serverless
back into a single process to cut cost substantially.

**Keywords:**
`monolith, versus, modular, monolith, versus, microservices`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## comparisons-004 --- Abstract class versus interface in modern C#, and Task versus ValueTask?

**question_id:** `comparisons-004`\
**topic_id:** `comparisons`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Abstract class versus interface in modern C#, and Task versus ValueTask?

**Answer**

An interface defines a contract and supports multiple implementation,
and since C# 8 can include default members; an abstract class can hold
state, constructors and shared behavior but allows single inheritance.
Use interfaces for capabilities and abstractions that vary, and abstract
classes for shared base behavior. Task allocates an object; ValueTask
can avoid allocation when a result is often synchronously available but
must be awaited once and not reused casually. Real-world example: a
cache-backed GetPriceAsync that returns from memory 95 percent of the
time returned ValueTask to avoid allocations on a very hot path, while a
repository interface with several implementations stayed an interface so
unit tests could use fakes.

**Keywords:**
`abstract, class, versus, interface, in, modern, c#,, and, task`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Senior/Lead Production Scenarios

**topic_id:** `scenarios`\
**priority:** `Core`\
**category:** `Interview`

## scenarios-001 --- Production API intermittently returns 500. What is your approach?

**question_id:** `scenarios-001`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Production API intermittently returns 500. What is your approach?

**Answer**

Establish scope and impact, then correlate error logs, trace IDs,
exceptions, deployment changes, dependency failures and resource
saturation. Determine whether one endpoint, tenant, region or instance
is affected. Apply a safe mitigation if necessary, but continue
root-cause analysis. After fixing, add regression coverage and
monitoring to prevent recurrence. Real-world example: After a Tuesday
release, 2 percent of requests returned 500 for one tenant only.
Searching Application Insights by operation ID showed a
NullReferenceException on a new optional field that only that tenant
left empty; the team rolled forward with a null check, added a
regression test and an alert on exception rate per endpoint, and wrote a
short post-incident review.

**Keywords:**
`production, api, intermittently, returns, 500., what, is, your, approach`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## scenarios-002 --- RabbitMQ backlog keeps increasing. What do you investigate?

**question_id:** `scenarios-002`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

RabbitMQ backlog keeps increasing. What do you investigate?

**Answer**

Check arrival rate versus processing rate, consumer count, processing
latency, retries, DLQ growth, broker health, CPU/memory, prefetch and
downstream latency. If work is safely parallelizable, scale consumers,
but first check whether SQL or another dependency is saturated.
Otherwise scaling consumers can amplify the bottleneck. Real-world
example: A queue of invoice-generation messages grew from 1,000 to
500,000 during month-end; consumers were fully busy but SQL showed lock
waits from one heavy update. Adding consumers worsened blocking; the fix
was batching the update and adding an index, then scaling consumers to
the new limit and tuning prefetch.

**Keywords:**
`rabbitmq, backlog, keeps, increasing., what, do, you, investigate`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## scenarios-003 --- Kubernetes Pods are healthy but users receive 503. What could be wrong?

**question_id:** `scenarios-003`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Kubernetes Pods are healthy but users receive 503. What could be wrong?

**Answer**

Trace the request path Ingress -\> Service -\> endpoints -\> Pods -\>
container. Inspect Service selectors, endpoint membership, readiness,
ports, ingress routing, DNS, TLS and network policies. A running process
can still be unavailable to traffic. Gateway and application logs should
be correlated with traces. Real-world example: After a Helm change the
Service selector said app orders-api while the Pods were labeled app
orders; kubectl get endpoints showed no endpoints, so the Ingress
returned 503 even though the Pods were Running and Ready. Other common
causes are a mismatched targetPort or a wrong readiness path.

**Keywords:**
`kubernetes, pods, are, healthy, but, users, receive, 503., what, could`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## scenarios-004 --- Memory usage grows until a Pod is OOMKilled. How do you investigate and mitigate?

**question_id:** `scenarios-004`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Memory usage grows until a Pod is OOMKilled. How do you investigate and
mitigate?

**Answer**

Confirm the growth pattern in metrics, check whether it is a leak or
simply an undersized limit, compare requests and limits with the GC heap
size, and capture dumps or gcdumps before the restart. Mitigate with a
higher limit or an extra replica, then fix the root cause such as
unbounded caches, static collections, large payload buffering or
undisposed resources. Real-world example: an export endpoint loaded
entire result sets into a List and a MemoryStream before sending, so
three concurrent exports exceeded the limit; streaming rows directly to
the response and paginating the query kept memory flat and removed the
OOM events.

**Keywords:**
`memory, usage, grows, until, a, pod, is, oomkilled., how, do`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## scenarios-005 --- Customers report being charged twice. How do you investigate and prevent it?

**question_id:** `scenarios-005`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Customers report being charged twice. How do you investigate and prevent
it?

**Answer**

Check logs and the payment provider's records to see whether two
distinct requests or one retried request created the charges. Common
causes are client retries after timeouts, double submits, message
redelivery and consumers that are not idempotent. Refund affected
customers, add idempotency keys, unique constraints and a state machine
for payment attempts, and reconcile with the provider daily. Real-world
example: a mobile app retried a payment request after a slow response
while the first request was still processing, and the server lacked an
idempotency key; adding a key stored with a unique index, disabling the
Pay button after the first tap and a nightly reconciliation job against
the provider's settlement file closed the gap.

**Keywords:**
`customers, report, being, charged, twice., how, do, you, investigate`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## scenarios-006 --- Database CPU hits 100 percent right after a deployment. What do you do?

**question_id:** `scenarios-006`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Database CPU hits 100 percent right after a deployment. What do you do?

**Answer**

Stabilize first: roll back or disable the new feature through a flag if
the correlation is clear. Then find the top queries by CPU or reads with
Query Store or DMVs, compare execution plans before and after, and look
for missing indexes, N+1 queries, parameter sniffing, implicit
conversions or a new unbounded query. Fix, test under load and add
monitoring. Real-world example: after a release adding a search filter,
one EF query began scanning a 50-million-row table because the filter
used ToLower on the column; the team rolled back, rewrote the predicate
to use a case-insensitive collation with an index and added a
query-duration alert for that endpoint.

**Keywords:**
`database, cpu, hits, 100, percent, right, after, a, deployment.`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## scenarios-007 --- How would you migrate 500 million rows to a new schema or database with minimal downtime?

**question_id:** `scenarios-007`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you migrate 500 million rows to a new schema or database with
minimal downtime?

**Answer**

Plan an incremental migration: create the new structure, copy historical
data in batches or through bulk tools, capture ongoing changes with CDC,
triggers or dual writes, validate counts and checksums continuously, run
both paths in shadow mode, rehearse the cutover, keep a rollback plan
and then switch reads and finally writes. Keep batches small to avoid
lock and log growth. Real-world example: an insurer moving claims
history to a partitioned schema copied data in 100,000-row batches over
a week, used Change Tracking to sync changes, compared row counts and
hashes per partition and cut over in a 15-minute window, keeping the old
database read-only for 30 days as a fallback.

**Keywords:** `how, would, you, migrate, 500, million, rows, to, a, new`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Modern .NET, Memory and Concurrency

**topic_id:** `modern-dotnet`\
**priority:** `Core`\
**category:** `Interview`

## modern-dotnet-001 --- Minimal APIs versus controllers: when would you use each?

**question_id:** `modern-dotnet-001`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Minimal APIs versus controllers: when would you use each?

**Answer**

Minimal APIs define endpoints with lambdas or handler methods and route
groups, with less ceremony and lower overhead; controllers give
conventions, filters, model-binding features and a familiar structure
for large teams. Both share the same middleware, DI, authentication and
OpenAPI support, and endpoint filters cover many filter needs. Choose
based on team size, API complexity and consistency. Real-world example:
a team building 15 small internal microservices used minimal APIs with
route groups and endpoint filters for validation, while a 300-endpoint
customer-facing monolith kept controllers because its conventions,
attribute filters and existing tests made onboarding easier.

**Keywords:**
`minimal, apis, versus, controllers:, when, would, you, use, each`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## modern-dotnet-002 --- What are Native AOT and trimming, and when are they worth using?

**question_id:** `modern-dotnet-002`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are Native AOT and trimming, and when are they worth using?

**Answer**

Native AOT compiles the application ahead of time into a native
executable with fast startup and a small memory footprint, but it limits
runtime reflection and dynamic code, so libraries must be AOT-compatible
and source generators are used for JSON and DI-related needs. Trimming
removes unused code. They suit serverless, CLI tools and containers
where cold start and size matter, less so large reflection-heavy
applications. Real-world example: an Azure Function-style webhook
receiver and an AWS Lambda handler benefited from AOT because cold
starts dropped from seconds to milliseconds-level, while an EF Core and
plugin-heavy line-of-business app stayed on the normal runtime because
AOT compatibility would have cost more than it saved.

**Keywords:**
`what, are, native, aot, and, trimming,, and, when, are, they`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## modern-dotnet-003 --- What is .NET Aspire and what problem does it solve?

**question_id:** `modern-dotnet-003`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is .NET Aspire and what problem does it solve?

**Answer**

.NET Aspire is an opinionated stack for building observable, cloud-ready
distributed applications: an app host that models services and resources
(databases, caches, queues) for local orchestration, service defaults
for health checks, telemetry and resilience, and a developer dashboard
showing logs, traces and metrics. It simplifies local multi-service
development and can generate deployment manifests. It does not replace
Kubernetes or your production platform. Real-world example: a team with
five services, SQL, Redis and RabbitMQ replaced a README of 12 setup
steps and a docker-compose file with an Aspire app host, so a new
developer ran one project and saw distributed traces for the whole flow
in the dashboard.

**Keywords:**
`what, is, .net, aspire, and, what, problem, does, it, solve`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## modern-dotnet-004 --- How do you plan .NET version upgrades and choose between LTS and STS releases?

**question_id:** `modern-dotnet-004`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you plan .NET version upgrades and choose between LTS and STS
releases?

**Answer**

Microsoft releases a new .NET version every November; even-numbered
versions are LTS with three years of support, while STS versions get a
shorter window. Plan regular upgrades, keep dependencies current, run
the upgrade in CI early with analyzers and tests, and track
end-of-support dates because unsupported runtimes stop receiving
security patches. Real-world example: a company still running .NET Core
3.1 after its end of support failed a customer security audit; it then
adopted a yearly cadence of moving production services to the current
LTS, with a canary service upgraded first, and used Dependabot to keep
NuGet packages from falling behind.

**Keywords:**
`how, do, you, plan, .net, version, upgrades, and, choose, between`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## modern-dotnet-005 --- Explain how garbage collection works in .NET: generations, the large object heap, and Server versus Workstation GC.

**question_id:** `modern-dotnet-005`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain how garbage collection works in .NET: generations, the large
object heap, and Server versus Workstation GC.

**Answer**

The GC is generational: new objects go in generation 0, survivors move
to 1 and then 2, and most objects die young so gen-0 collections are
cheap. Objects of about 85,000 bytes or more go on the large object
heap, which is collected with gen 2 and can fragment. Server GC uses a
heap and thread per core and favors throughput, and Workstation GC
favors responsiveness for desktop apps; concurrent GC reduces pause
times. Real-world example: a service building large byte arrays for
every export triggered frequent gen-2 collections and latency spikes;
pooling the buffers with ArrayPool and streaming the data cut LOH
allocations, and p99 latency stabilized. Calling GC.Collect manually was
the previous, ineffective workaround.

**Keywords:**
`explain, how, garbage, collection, works, in, .net:, generations,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## modern-dotnet-006 --- Which synchronization primitives do you use in C#: lock, SemaphoreSlim, Interlocked, ConcurrentDictionary and Channels?

**question_id:** `modern-dotnet-006`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Which synchronization primitives do you use in C#: lock, SemaphoreSlim,
Interlocked, ConcurrentDictionary and Channels?

**Answer**

lock gives mutual exclusion for synchronous critical sections but cannot
be held across await; SemaphoreSlim can limit concurrency asynchronously
with WaitAsync; Interlocked performs atomic counters and swaps;
ConcurrentDictionary supports thread-safe reads and writes but compound
operations such as check-then-add need GetOrAdd carefully; Channels
provide async producer-consumer queues with optional bounds for
backpressure. Real-world example: a service calling a rate-limited
partner API used a SemaphoreSlim of 5 to cap concurrent calls, a Channel
with a bounded capacity to queue work from the HTTP layer to background
workers, and Interlocked counters for metrics, replacing a lock around
an await that had caused deadlocks.

**Keywords:**
`which, synchronization, primitives, do, you, use, in, c#:, lock,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## modern-dotnet-007 --- What do ConfigureAwait and SynchronizationContext do, and why did .Result cause deadlocks in classic ASP.NET?

**question_id:** `modern-dotnet-007`\
**topic_id:** `modern-dotnet`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What do ConfigureAwait and SynchronizationContext do, and why did
.Result cause deadlocks in classic ASP.NET?

**Answer**

A SynchronizationContext tells await where to resume. Classic ASP.NET
and UI apps have a context that allows one thread of work at a time per
request or UI thread, so blocking with .Result or .Wait on an async
method waits for the context while the continuation needs that same
context, producing a deadlock. ASP.NET Core has no such context, so the
deadlock disappears but blocking still starves threads. Library code
often uses ConfigureAwait(false) to avoid capturing a context.
Real-world example: a shared library used by both a legacy Web Forms app
and a new API hung only in the Web Forms app when a developer called
GetAwaiter().GetResult(); adding ConfigureAwait(false) in the library
and making the page handler async removed the hang.

**Keywords:**
`what, do, configureawait, and, synchronizationcontext, do,, and, why`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- NoSQL, Cosmos DB, PostgreSQL and Polyglot Persistence

**topic_id:** `data-stores`\
**priority:** `Strong`\
**category:** `Interview`

## data-stores-001 --- When would you choose NoSQL over a relational database, and what is polyglot persistence?

**question_id:** `data-stores-001`\
**topic_id:** `data-stores`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When would you choose NoSQL over a relational database, and what is
polyglot persistence?

**Answer**

Choose by access pattern and consistency need: relational databases suit
transactions, complex joins and evolving ad-hoc queries; document stores
suit aggregates read and written together; key-value stores suit fast
lookups; wide-column and time-series stores suit massive write volume;
search engines suit full-text relevance. Polyglot persistence means
using several stores, each for what it does best, at the cost of more
operations and consistency work. Real-world example: an e-commerce
platform keeps orders and payments in SQL Server, product catalog
documents and search in Elasticsearch or Azure AI Search, sessions and
carts in Redis and clickstream in a data lake; a team that put financial
ledgers in a document store without multi-document transactions later
had to rebuild reconciliation.

**Keywords:**
`when, would, you, choose, nosql, over, a, relational, database,, and`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## data-stores-002 --- How do you choose a partition key in Cosmos DB, and what are request units and consistency levels?

**question_id:** `data-stores-002`\
**topic_id:** `data-stores`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you choose a partition key in Cosmos DB, and what are request
units and consistency levels?

**Answer**

A partition key should have high cardinality and distribute both storage
and request load evenly, and most queries should include it to avoid
cross-partition fan-out. Throughput is provisioned or consumed as
request units (RUs), and each operation has an RU cost. Consistency
levels range from strong through bounded staleness, session, consistent
prefix to eventual, trading latency and availability for consistency;
session is the common default. Real-world example: an IoT platform
partitioned by tenantId and one large customer produced a hot partition
throttling with 429 errors; changing to a synthetic key of tenantId plus
deviceId and day spread the load, and queries by device remained
single-partition and cheap in RUs.

**Keywords:** `how, do, you, choose, a, partition, key, in, cosmos, db,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## data-stores-003 --- What should a SQL Server developer know when moving to PostgreSQL?

**question_id:** `data-stores-003`\
**topic_id:** `data-stores`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What should a SQL Server developer know when moving to PostgreSQL?

**Answer**

PostgreSQL uses MVCC with VACUUM for cleanup, has rich types (JSONB,
arrays, ranges), extensions such as PostGIS and pg_trgm, and different
syntax and behaviors: lowercase unquoted identifiers, case-sensitive
text comparison by default, no clustered index concept, sequences, and
different transaction and locking semantics. In .NET, use Npgsql and the
EF Core PostgreSQL provider; stored procedures and T-SQL features need
translation. Real-world example: a team migrating a multi-tenant SaaS
from SQL Server to PostgreSQL to reduce licensing cost used pgloader and
a schema conversion tool, then found that queries relying on
case-insensitive collation returned fewer rows until they used citext or
lower-cased comparisons, and that autovacuum tuning was needed for
high-churn tables.

**Keywords:**
`what, should, a, sql, server, developer, know, when, moving, to`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## data-stores-004 --- What are table partitioning and sharding, and how do you choose a shard key?

**question_id:** `data-stores-004`\
**topic_id:** `data-stores`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are table partitioning and sharding, and how do you choose a shard
key?

**Answer**

Partitioning splits a large table into parts within one database,
helping maintenance, archiving and some query pruning; sharding
distributes data across multiple database servers to scale writes and
storage. A shard key should distribute data and load evenly and keep
common queries within a shard; cross-shard transactions and joins become
hard, and resharding is costly. Real-world example: a SaaS with 10,000
tenants used database-level tenant sharding with a catalog database
mapping tenant to shard, moved a very large customer to its own shard
when it became a noisy neighbor, and used monthly partitions on an audit
table so old months could be switched out and archived instantly.

**Keywords:**
`what, are, table, partitioning, and, sharding,, and, how, do, you`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Behavioral and Situational Interviews

**topic_id:** `behavioral`\
**priority:** `Core`\
**category:** `Interview`

## behavioral-001 --- Tell me about a time you led a major technical initiative or migration. How do you answer using STAR?

**question_id:** `behavioral-001`\
**topic_id:** `behavioral`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Tell me about a time you led a major technical initiative or migration.
How do you answer using STAR?

**Answer**

Use Situation, Task, Action and Result: state the context and scale,
your specific responsibility, the decisions you made and why (including
trade-offs and alternatives considered), and measurable outcomes plus
lessons learned. Use I for your actions and we for the team, and show
influence beyond code. Real-world example answer: a 10-year developer
describes moving a legacy Web Forms module to ASP.NET Core with a
Strangler Fig approach: the situation was frequent production defects
and slow releases, the task was to extract the highest-risk module in
two quarters, the actions were characterization tests, a YARP routing
layer and a phased cutover, and the result was fewer defects, weekly
instead of monthly releases and a documented playbook the team reused.

**Keywords:** `tell, me, about, a, time, you, led, a, major, technical`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## behavioral-002 --- Describe a production incident you owned. What happened, what did you do and what changed afterward?

**question_id:** `behavioral-002`\
**topic_id:** `behavioral`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Describe a production incident you owned. What happened, what did you do
and what changed afterward?

**Answer**

Interviewers look for calm prioritization, communication, root-cause
thinking and learning. Describe detection, impact, mitigation first
(rollback or feature flag), then diagnosis with evidence, communication
to stakeholders, the permanent fix and the follow-ups such as alerts,
tests and a blameless postmortem. Avoid blaming individuals. Real-world
example answer: an API's p99 latency rose after a release; you rolled
back within 20 minutes, found an N+1 query through traces, added a
projection and a performance regression test, set an alert on the
endpoint's latency and shared a postmortem that led the team to require
query-count checks in code review.

**Keywords:**
`describe, a, production, incident, you, owned., what, happened,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## behavioral-003 --- Tell me about a time you disagreed with an architect, manager or stakeholder.

**question_id:** `behavioral-003`\
**topic_id:** `behavioral`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Tell me about a time you disagreed with an architect, manager or
stakeholder.

**Answer**

Show that you disagree respectfully with data, understand the other
side's constraints, propose options with trade-offs, escalate
appropriately and commit to the decision once made. The goal is a good
outcome for the business, not winning. Real-world example answer: a
stakeholder wanted to rewrite a reporting module in two weeks; you
prepared a short ADR comparing a rewrite, an incremental refactor and a
vendor product with estimates and risks, proposed a two-sprint spike to
test the riskiest assumption, accepted the stakeholder's choice of a
smaller scope and delivered it on time, which built trust for later
decisions.

**Keywords:**
`tell, me, about, a, time, you, disagreed, with, an, architect,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## behavioral-004 --- How do you balance technical debt against feature delivery, and how do you handle tight deadlines?

**question_id:** `behavioral-004`\
**topic_id:** `behavioral`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you balance technical debt against feature delivery, and how do
you handle tight deadlines?

**Answer**

Make debt visible and tied to business risk: track it in the backlog
with impact (incident frequency, delivery slowdown, security exposure),
reserve a regular share of capacity, and tackle debt alongside features
that touch the same code. For deadlines, negotiate scope rather than
quality, cut features not tests, communicate risks early and agree what
is out. Real-world example answer: a team lost two days per release to a
fragile deployment script, so the lead quantified the cost, secured 15
percent of each sprint for it and fixed it incrementally; before a
regulatory deadline the team shipped the mandatory fields first and
moved the nice-to-have reports to the next release, with the risk
documented.

**Keywords:**
`how, do, you, balance, technical, debt, against, feature, delivery,`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## behavioral-005 --- How do you explain a complex technical decision to non-technical stakeholders, and how do you handle an underperforming team member?

**question_id:** `behavioral-005`\
**topic_id:** `behavioral`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you explain a complex technical decision to non-technical
stakeholders, and how do you handle an underperforming team member?

**Answer**

For stakeholders, start with the business outcome, use plain language
and analogies, show options with cost, risk and timeline, and give a
clear recommendation. For an underperforming colleague, clarify
expectations privately, listen for causes, set specific goals and
support (pairing, smaller tasks, feedback), follow up regularly and
involve the manager if needed. Real-world example answer: explaining why
a database upgrade needed a maintenance window by comparing it to
repairing a bridge: closing it briefly avoids a collapse later; and with
a developer who repeatedly missed estimates, you discovered unclear
requirements, started pairing on estimation, and within two sprints the
estimates and confidence improved.

**Keywords:**
`how, do, you, explain, a, complex, technical, decision, to`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Low-Level Design and Live Coding Rounds

**topic_id:** `lld-coding`\
**priority:** `Strong`\
**category:** `Interview`

## lld-coding-001 --- How would you implement a thread-safe LRU cache in C#?

**question_id:** `lld-coding-001`\
**topic_id:** `lld-coding`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you implement a thread-safe LRU cache in C#?

**Answer**

Use a dictionary from key to a node plus a doubly linked list ordered by
recency, so get and put are O(1): on access move the node to the front,
on insert add at the front and evict the tail when over capacity.
Protect operations with a lock (the operations are short and
synchronous), or use a concurrent design if contention is high. Discuss
capacity, eviction callbacks, expiry and how it differs from
MemoryCache. Real-world example: a pricing service caches the 10,000
most recently requested currency-pair rates in a custom LRU to avoid
repeated vendor calls, while in production code most teams would use
MemoryCache with a size limit unless a specific policy is needed.

**Keywords:**
`how, would, you, implement, a, thread-safe, lru, cache, in, c#`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## lld-coding-002 --- How would you implement a token bucket rate limiter in C#?

**question_id:** `lld-coding-002`\
**topic_id:** `lld-coding`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you implement a token bucket rate limiter in C#?

**Answer**

Keep tokens, capacity, refill rate and last-refill timestamp per key. On
each request compute elapsed time, add tokens up to capacity, and allow
the request if at least one token is available, then decrement;
otherwise reject with a retry-after estimate. Make the update atomic
with a lock per key or Interlocked, use a monotonic clock such as
Stopwatch, inject the clock for testing and evict idle keys. In a
distributed system, move state to Redis with a Lua script. Real-world
example: a public API allows 100 requests per minute per API key with a
burst of 20, using in-process buckets per instance behind a gateway
first and Redis once multiple instances made local counts inaccurate.

**Keywords:**
`how, would, you, implement, a, token, bucket, rate, limiter, in`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## lld-coding-003 --- How do you approach a low-level design problem such as a parking lot, elevator system or booking system?

**question_id:** `lld-coding-003`\
**topic_id:** `lld-coding`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you approach a low-level design problem such as a parking lot,
elevator system or booking system?

**Answer**

Clarify requirements and constraints, identify entities and
relationships, define responsibilities and interfaces, then apply
patterns only where they solve a real problem, such as Strategy for
pricing or allocation, State for lifecycle and Factory for creation.
Consider concurrency, extensibility, persistence and testing, and walk
through the main flows. Real-world example: for a parking lot you define
ParkingLot, Level, Spot (with types), Vehicle, Ticket and a
PricingStrategy; spot allocation is a strategy (nearest free or by
type), entry and exit flows generate and close tickets, concurrent entry
is protected by an atomic spot reservation, and adding electric-vehicle
spots needs a new spot type rather than a rewrite.

**Keywords:**
`how, do, you, approach, a, low-level, design, problem, such, as`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

## lld-coding-004 --- How would you implement retry with exponential backoff and jitter, and a producer-consumer pipeline, in C#?

**question_id:** `lld-coding-004`\
**topic_id:** `lld-coding`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How would you implement retry with exponential backoff and jitter, and a
producer-consumer pipeline, in C#?

**Answer**

For retry, loop up to a maximum attempts, catch only transient
exceptions, wait for a delay such as base times two to the power of the
attempt with random jitter, honor a CancellationToken and rethrow after
the last attempt; in production prefer a library like Polly. For a
producer-consumer pipeline, use a bounded Channel: producers write
asynchronously and wait when full, consumers read with ReadAllAsync and
process with a limited degree of parallelism, and completion is signaled
with Complete. Real-world example: an email sender retries SMTP timeouts
three times with jitter and puts permanent failures into a dead-letter
table, while an import service reads rows into a bounded channel of
1,000 items so a fast reader cannot overwhelm the slower database
writer.

**Keywords:**
`how, would, you, implement, retry, with, exponential, backoff, and`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

# TOPIC --- Rapid-Fire Questions

**topic_id:** `rapid-fire`\
**priority:** `Core`\
**category:** `Interview`

## rapid-fire-001 --- What is dependency injection?

**question_id:** `rapid-fire-001`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is dependency injection?

**Answer**

A technique where an object's dependencies are supplied from outside
rather than constructed internally. It reduces coupling and improves
testing and configurability. Example: ASP.NET Core injects ILogger and
IOrderRepository into a controller so tests can pass fakes.

**Keywords:** `what, is, dependency, injection`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-002 --- What is deferred execution in LINQ?

**question_id:** `rapid-fire-002`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is deferred execution in LINQ?

**Answer**

The query is defined without immediately executing it. Execution occurs
when the sequence is enumerated or materialized, such as with foreach or
ToList. Example: Defining db.Orders.Where(...) runs nothing until
ToListAsync or a foreach, so the SQL reflects the data at enumeration
time.

**Keywords:** `what, is, deferred, execution, in, linq`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-003 --- What is a deadlock?

**question_id:** `rapid-fire-003`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a deadlock?

**Answer**

A cycle of waiting where concurrent operations hold resources needed by
each other and cannot progress. SQL Server detects and resolves
deadlocks by selecting a victim. Example: Two transactions update Orders
then Inventory and Inventory then Orders; SQL Server kills one with
error 1205.

**Keywords:** `what, is, a, deadlock`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-004 --- What is idempotency?

**question_id:** `rapid-fire-004`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is idempotency?

**Answer**

Repeating an operation does not create additional unintended business
effects. It is essential for safe retries and at-least-once message
processing. Example: Stripe's Idempotency-Key header, or a PUT that sets
an order status to Shipped, can be repeated safely.

**Keywords:** `what, is, idempotency`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-005 --- What is an API gateway?

**question_id:** `rapid-fire-005`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is an API gateway?

**Answer**

A controlled entry point that can provide routing and cross-cutting API
concerns such as authentication integration, throttling,
transformations, caching and observability. Example: Azure API
Management validating JWTs, applying rate limits and routing to
different services; Kong, Ocelot and YARP are alternatives.

**Keywords:** `what, is, an, api, gateway`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-006 --- What is OpenTelemetry?

**question_id:** `rapid-fire-006`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is OpenTelemetry?

**Answer**

A vendor-neutral framework for producing and exporting telemetry such as
traces, metrics and logs. Example: A .NET service exports traces to
Jaeger today and Azure Monitor tomorrow by changing only the exporter.

**Keywords:** `what, is, opentelemetry`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-007 --- What is a correlation ID?

**question_id:** `rapid-fire-007`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a correlation ID?

**Answer**

An identifier propagated across related operations so logs and
diagnostic records can be associated with the same business/request
flow. Example: A gateway generates X-Correlation-ID and every service
logs it, so support can search one ID across systems.

**Keywords:** `what, is, a, correlation, id`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-008 --- What is a health check?

**question_id:** `rapid-fire-008`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a health check?

**Answer**

A signal about application or dependency health for an operational
purpose. Readiness and liveness should answer different questions.
Example: A live endpoint returns 200 if the process runs, while a ready
endpoint also checks SQL and Service Bus before traffic arrives.

**Keywords:** `what, is, a, health, check`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-009 --- What is HPA?

**question_id:** `rapid-fire-009`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is HPA?

**Answer**

Kubernetes Horizontal Pod Autoscaler adjusts the number of Pod replicas
based on configured metrics. Example: Scale an orders API from 3 to 20
Pods when average CPU passes 70 percent, while KEDA scales queue workers
on queue length.

**Keywords:** `what, is, hpa`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-010 --- What is a circuit breaker?

**question_id:** `rapid-fire-010`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a circuit breaker?

**Answer**

A resilience mechanism that temporarily stops calls to an unhealthy
dependency after repeated failures, allowing recovery and preventing
continued load. Example: When a credit-check API fails half its calls,
the breaker opens for 30 seconds and the loan app shows check pending
instead of hanging.

**Keywords:** `what, is, a, circuit, breaker`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-011 --- What is the difference between Task.WhenAll and awaiting tasks sequentially?

**question_id:** `rapid-fire-011`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between Task.WhenAll and awaiting tasks
sequentially?

**Answer**

WhenAll starts operations concurrently and waits for all of them, while
sequential awaits run one after another. Example: fetching a customer,
orders and invoices from three independent services with WhenAll takes
the time of the slowest call instead of the sum; limit concurrency when
calling a rate-limited dependency.

**Keywords:**
`what, is, the, difference, between, task.whenall, and, awaiting`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-012 --- What is the N+1 problem in one sentence?

**question_id:** `rapid-fire-012`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the N+1 problem in one sentence?

**Answer**

One query for parents plus one additional query per parent for related
data. Example: listing 100 orders and lazily loading each customer
produces 101 queries instead of one join or projection.

**Keywords:** `what, is, the, n+1, problem, in, one, sentence`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-013 --- What is the outbox pattern?

**question_id:** `rapid-fire-013`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the outbox pattern?

**Answer**

Storing an event in the same database transaction as the business change
and publishing it afterward from a background process, so the database
and broker do not diverge. Example: saving an Order and an OrderPlaced
outbox row together before a dispatcher sends it to Service Bus.

**Keywords:** `what, is, the, outbox, pattern`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-014 --- What is the difference between authentication and authorization in one line each?

**question_id:** `rapid-fire-014`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between authentication and authorization in one
line each?

**Answer**

Authentication verifies who you are; authorization decides what you may
do. Example: logging in with Entra ID is authentication, while being
allowed to approve an invoice only if you hold the approver role is
authorization.

**Keywords:** `what, is, the, difference, between, authentication, and`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-015 --- What is a cache stampede?

**question_id:** `rapid-fire-015`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a cache stampede?

**Answer**

Many requests simultaneously rebuild an expired or missing cache entry
and overload the source. Example: a home-page cache expiring at midnight
during a sale sends thousands of identical queries to SQL; a per-key
lock or randomized TTL prevents it.

**Keywords:** `what, is, a, cache, stampede`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-016 --- What is the difference between a process, a thread and a Task?

**question_id:** `rapid-fire-016`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between a process, a thread and a Task?

**Answer**

A process is an isolated running program, a thread is an execution path
within it, and a Task is a higher-level abstraction for asynchronous
work that may or may not use a dedicated thread. Example: awaiting an
HTTP call uses no thread while waiting, but a CPU-heavy Task.Run uses a
thread-pool thread.

**Keywords:**
`what, is, the, difference, between, a, process,, a, thread, and`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-017 --- What does the CAP theorem say about partitions?

**question_id:** `rapid-fire-017`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What does the CAP theorem say about partitions?

**Answer**

During a network partition a distributed system must choose between
consistency and availability. Example: a bank ledger rejects writes on
the minority side to stay consistent, while a social feed keeps serving
possibly stale data.

**Keywords:** `what, does, the, cap, theorem, say, about, partitions`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-018 --- What is eventual consistency?

**question_id:** `rapid-fire-018`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is eventual consistency?

**Answer**

Replicas or services may differ temporarily but converge when updates
propagate. Example: an order is accepted immediately and the inventory
and email systems update a few seconds later through events.

**Keywords:** `what, is, eventual, consistency`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-019 --- What is a dead-letter queue?

**question_id:** `rapid-fire-019`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a dead-letter queue?

**Answer**

A queue holding messages that could not be processed successfully after
retries or that expired. Example: an order message with invalid data
lands in the DLQ after five attempts so support can fix and replay it.

**Keywords:** `what, is, a, dead-letter, queue`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-020 --- What is the strangler fig pattern?

**question_id:** `rapid-fire-020`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the strangler fig pattern?

**Answer**

Incrementally replacing a legacy system by routing selected
functionality to new components until the old system can be retired.
Example: routing the documents API to a new ASP.NET Core service while
Web Forms pages continue to serve the rest.

**Keywords:** `what, is, the, strangler, fig, pattern`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-021 --- What is a rowversion or concurrency token?

**question_id:** `rapid-fire-021`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is a rowversion or concurrency token?

**Answer**

A column or value that changes on every update and is used to detect
conflicting edits. Example: two users edit the same case record and the
second save fails with a concurrency exception instead of overwriting
the first.

**Keywords:** `what, is, a, rowversion, or, concurrency, token`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-022 --- What is Infrastructure as Code drift?

**question_id:** `rapid-fire-022`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is Infrastructure as Code drift?

**Answer**

When the real environment differs from what the code describes, usually
after manual changes. Example: someone opens a firewall port in the
portal and the next Terraform plan shows an unexpected difference or the
change is silently lost.

**Keywords:** `what, is, infrastructure, as, code, drift`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-023 --- What is the difference between a liveness and a readiness probe in one sentence?

**question_id:** `rapid-fire-023`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between a liveness and a readiness probe in one
sentence?

**Answer**

Liveness asks whether the container should be restarted, readiness asks
whether it should receive traffic. Example: a Pod warming its cache is
alive but not ready.

**Keywords:**
`what, is, the, difference, between, a, liveness, and, a, readiness`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-024 --- What is p99 latency and why use it?

**question_id:** `rapid-fire-024`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is p99 latency and why use it?

**Answer**

The latency under which 99 percent of requests complete, showing tail
behavior that averages hide. Example: an average of 200 ms can coexist
with a p99 of 4 seconds that frustrates one in a hundred customers.

**Keywords:** `what, is, p99, latency, and, why, use, it`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

## rapid-fire-025 --- What is PKCE?

**question_id:** `rapid-fire-025`\
**topic_id:** `rapid-fire`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is PKCE?

**Answer**

Proof Key for Code Exchange is an OAuth extension where the client
proves it started the authorization code flow, protecting against
intercepted codes. Example: a single-page or mobile app that cannot keep
a client secret uses it with Authorization Code flow.

**Keywords:** `what, is, pkce`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.
