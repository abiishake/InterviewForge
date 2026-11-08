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

## csharp-005 --- How do generics work in C#, and what are covariance, contravariance and generic constraints?

**question_id:** `csharp-005`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do generics work in C#, and what are covariance, contravariance and generic constraints?

**Answer**

Generics in .NET are reified: the runtime keeps the real type argument, so `List<int>` stores ints without boxing and `typeof(T)` works, unlike Java's type erasure. Constraints (`where T : class, new(), IComparable<T>`, `notnull`, `unmanaged`, static abstract interface members) tell the compiler what operations are legal. Variance applies only to interfaces and delegates: `out T` (covariance) lets `IEnumerable<Dog>` be used as `IEnumerable<Animal>` because T is only returned; `in T` (contravariance) lets `Action<Animal>` be used as `Action<Dog>` because T is only consumed. Arrays are covariant too but unsafely, which throws `ArrayTypeMismatchException` at runtime. Example: a repository `IReadRepository<out TEntity>` can be injected where a base-entity reader is expected, while `IValidator<in TCommand>` lets one validator for a base command validate derived commands.

**Keywords:** `generics, reified, constraints, covariance, contravariance, out, in, boxing`

**Follow-ups:**

-   Why is List<T> not covariant?
-   What does the unmanaged constraint allow?
-   How do generic static abstract members enable generic math?

## csharp-006 --- How do delegates and events work, and how can events cause memory leaks?

**question_id:** `csharp-006`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do delegates and events work, and how can events cause memory leaks?

**Answer**

A delegate is a type-safe object holding a reference to a method plus its target instance; `Func`, `Action` and `Predicate` cover most needs. An `event` is a delegate field with restricted access: outside code can only subscribe or unsubscribe, not invoke or overwrite it. The publisher's invocation list holds a strong reference to every subscriber, so a long-lived publisher (a static event, a singleton service, a message bus) keeps short-lived subscribers alive forever if they never unsubscribe. Example: a WPF or Blazor component that subscribes to a singleton `NotificationService.Changed` and is never unsubscribed leaks every page instance ever opened. Fixes: unsubscribe in `Dispose`, use weak events or `WeakReference`, or prefer `IObservable`, channels or a message bus with explicit lifetimes. Also copy-and-null-check or use `handler?.Invoke(...)` to stay thread-safe.

**Keywords:** `delegates, events, Func, Action, memory leak, unsubscribe, weak reference, invocation list`

**Follow-ups:**

-   How would you find this leak with a memory dump?
-   Why does a lambda subscription make unsubscribing hard?
-   What is the difference between an event and a public delegate field?

## csharp-007 --- Explain LINQ deferred execution and the common pitfalls it causes.

**question_id:** `csharp-007`\
**topic_id:** `csharp`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain LINQ deferred execution and the common pitfalls it causes.

**Answer**

Most LINQ operators such as `Where`, `Select` and `OrderBy` do not run when written; they build a pipeline that runs when you enumerate it with `foreach`, `ToList`, `Count`, `First` and similar. This lets queries compose lazily and stop early, but it causes pitfalls. Enumerating twice runs the work twice, and the source may have changed in between. Capturing a loop variable or a mutable local means the query sees the value at enumeration time, not at definition time. Returning a lazy query from a method that holds a `using` resource or a `DbContext` fails because the resource is disposed before enumeration. Multiple enumeration of an expensive query, for example one that calls an API per element, is a classic bug. Example: `var active = users.Where(u => u.IsActive);` followed by adding a user and calling `active.Count()` includes the new user. Materialize with `ToList()` deliberately when you need a snapshot.

**Keywords:** `LINQ, deferred execution, lazy, ToList, multiple enumeration, closure, yield`

**Follow-ups:**

-   Which operators are streaming and which buffer the whole input?
-   How does yield return implement lazy sequences?
-   Why does Count() on IEnumerable sometimes not enumerate?

## csharp-008 --- What are Span<T>, Memory<T> and ref structs, and when do they matter?

**question_id:** `csharp-008`\
**topic_id:** `csharp`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are Span<T>, Memory<T> and ref structs, and when do they matter?

**Answer**

`Span<T>` is a ref struct that is a typed, bounds-checked window over contiguous memory (an array segment, stack memory from `stackalloc`, or native memory) with no allocation. Because it can point at the stack, it must live on the stack itself: it cannot be a field of a class, be boxed, cross an `await` or be captured in a lambda. `Memory<T>` is the heap-friendly counterpart that can be stored and used in async code, and you call `.Span` to work on it synchronously. They matter in hot paths such as parsers, protocol readers and string slicing where `Substring` would allocate a new string per token. Example: parsing a CSV line with `ReadOnlySpan<char>` and `int.Parse(span)` avoids thousands of temporary strings per second. Measure with BenchmarkDotNet first; for ordinary business code the added complexity is not worth it.

**Keywords:** `Span, Memory, ref struct, stackalloc, allocation, slicing, ReadOnlySpan, BenchmarkDotNet`

**Follow-ups:**

-   Why can't Span<T> be used across await?
-   How do you pool large buffers (ArrayPool, MemoryPool)?
-   What is a readonly ref struct?

## csharp-009 --- What do pattern matching and nullable reference types add to modern C#?

**question_id:** `csharp-009`\
**topic_id:** `csharp`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What do pattern matching and nullable reference types add to modern C#?

**Answer**

Pattern matching lets `is` and `switch` expressions test shape and value together: type, property (`{ Status: Paid }`), relational (`> 100`), list and logical (`and`, `or`, `not`) patterns, with the compiler checking exhaustiveness for switch expressions. It replaces long if/else chains and casts with declarative rules. Nullable reference types (NRT) make nullability part of the type system: `string` means not null and `string?` means may be null, and the compiler warns on possible null dereferences. NRT does not change runtime behavior, so data from JSON, EF or external callers can still be null and needs validation at boundaries. Example: `order switch { { Total: > 1000, Customer.IsVip: true } => Discount.Large, { Total: > 1000 } => Discount.Standard, _ => Discount.None }`. Turn warnings into errors for new projects and use `required` members and `ArgumentNullException.ThrowIfNull` at public boundaries.

**Keywords:** `pattern matching, switch expression, nullable reference types, required, null, exhaustive`

**Follow-ups:**

-   What is the null-forgiving operator and when is it a smell?
-   How do NRT annotations work with EF Core?
-   What is a list pattern?

## csharp-010 --- Explain IDisposable, IAsyncDisposable, finalizers and the dispose pattern.

**question_id:** `csharp-010`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain IDisposable, IAsyncDisposable, finalizers and the dispose pattern.

**Answer**

The garbage collector reclaims managed memory but not unmanaged resources such as file handles, sockets, database connections or native memory. `IDisposable.Dispose` is the deterministic release point, used with `using`. A finalizer (`~Type`) is only a safety net: it runs non-deterministically on the finalizer thread, delays collection of the object by a GC generation, and should exist only if the type directly owns an unmanaged handle (prefer wrapping it in a `SafeHandle`). The full dispose pattern has `Dispose(bool disposing)` and `GC.SuppressFinalize(this)`; sealed classes without unmanaged fields need only a simple `Dispose`. `IAsyncDisposable` with `await using` is for resources whose cleanup is asynchronous, such as flushing a stream or closing a connection. Example: forgetting to dispose `HttpResponseMessage` or a `SqlDataReader` keeps connections out of the pool until it is exhausted and requests start timing out.

**Keywords:** `IDisposable, IAsyncDisposable, finalizer, SafeHandle, using, dispose pattern, SuppressFinalize`

**Follow-ups:**

-   What happens if Dispose is called twice?
-   Who disposes objects created by the DI container?
-   Why are finalizers expensive?

## csharp-011 --- Why are strings immutable in .NET, and when should you use StringBuilder, interning or culture-aware comparison?

**question_id:** `csharp-011`\
**topic_id:** `csharp`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Why are strings immutable in .NET, and when should you use StringBuilder, interning or culture-aware comparison?

**Answer**

Strings are immutable so they are safe to share across threads, safe as dictionary keys (the hash never changes) and cheap to cache or intern. The cost is that every concatenation creates a new object, so building a string in a loop is O(n squared) in copying; `StringBuilder` (or `string.Join`, `string.Create`) avoids that for many appends, while a handful of concatenations is fine because the compiler optimizes them. Interning keeps one instance per distinct literal and is rarely worth manual use. Comparison matters more in practice: `==` and `Equals` are ordinal by default, but `Compare`, `StartsWith`, `ToUpper` and `IndexOf` can be culture-sensitive. Use `StringComparison.OrdinalIgnoreCase` for identifiers and keys, and culture-aware comparison only for user-visible sorting. Example: the Turkish culture lowercases `I` to a dotless `ı`, which breaks `ToLower() == "file"` checks.

**Keywords:** `string, immutable, StringBuilder, interning, ordinal, culture, StringComparison`

**Follow-ups:**

-   What is the Turkish-I problem?
-   How do string interpolation handlers reduce allocations?
-   When is string.Create useful?

## csharp-012 --- How do Equals, GetHashCode and == interact, and what goes wrong when they are inconsistent?

**question_id:** `csharp-012`\
**topic_id:** `csharp`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do Equals, GetHashCode and == interact, and what goes wrong when they are inconsistent?

**Answer**

Hash-based collections (`Dictionary`, `HashSet`) first call `GetHashCode` to pick a bucket and then `Equals` to confirm a match, so the contract is: equal objects must return equal hash codes, and a hash code must not change while the object is a key. Classes default to reference equality; structs default to field-by-field value equality via reflection, which is slow, so override or use `record struct`. Records generate value equality for you. If you override `Equals` without `GetHashCode`, lookups silently fail or duplicates appear. Example: using a mutable `Customer` class as a dictionary key and then changing its `Id` makes the entry unreachable because it sits in the old bucket. Use immutable key types, `HashCode.Combine`, and override `==` consistently or not at all.

**Keywords:** `Equals, GetHashCode, equality, dictionary key, record, reference equality, HashCode.Combine`

**Follow-ups:**

-   What is IEquatable<T> for?
-   Why is default struct equality slow?
-   How does EF Core use equality for tracked entities?

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

## aspnet-core-006 --- How do model binding, validation and ProblemDetails work in ASP.NET Core APIs?

**question_id:** `aspnet-core-006`\
**topic_id:** `aspnet-core`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do model binding, validation and ProblemDetails work in ASP.NET Core APIs?

**Answer**

Model binding maps request data (route, query string, headers, body) to action parameters using sources such as `[FromRoute]`, `[FromQuery]`, `[FromBody]` and `[FromServices]`. In controllers with `[ApiController]`, binding failures and validation errors automatically return HTTP 400 with a `ValidationProblemDetails` body, and body parameters are inferred. Validation comes from data annotations (`[Required]`, `[Range]`), `IValidatableObject`, or FluentValidation for richer rules; minimal APIs need explicit validation or a filter. Return errors in the RFC 9457 ProblemDetails shape (`type`, `title`, `status`, `detail`, `errors`) with a consistent `traceId`, and register `AddProblemDetails()` plus an exception handler so unhandled exceptions follow the same format. Never expose stack traces in production. Example: a client receives `{ "status": 400, "errors": { "email": ["Invalid format"] } }` and maps each error to a form field. Validate at the boundary and also enforce business rules in the domain.

**Keywords:** `model binding, validation, ProblemDetails, ApiController, FluentValidation, FromBody, 400`

**Follow-ups:**

-   Where does validation belong: DTO or domain?
-   How do you validate in minimal APIs?
-   How do you stop over-posting?

## aspnet-core-007 --- What is the difference between middleware, filters and endpoint handlers, and where do cross-cutting concerns go?

**question_id:** `aspnet-core-007`\
**topic_id:** `aspnet-core`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between middleware, filters and endpoint handlers, and where do cross-cutting concerns go?

**Answer**

Middleware runs for every request in the pipeline, before routing resolves an endpoint (for example exception handling, HTTPS redirection, CORS, authentication, logging), and sees only `HttpContext`. MVC filters (authorization, resource, action, exception, result) run inside the MVC or endpoint stage, so they know the selected action, bound arguments and result, which makes them right for concerns tied to controllers such as validation, caching headers or wrapping results. Minimal API endpoint filters play the same role for minimal endpoints. Order matters in middleware: exception handler first, then HTTPS, static files, routing, CORS, authentication, authorization, then endpoints. Choose middleware for global, framework-level concerns and filters for per-endpoint behavior that needs action context. Example: a correlation-id middleware stamps every request, while an `[Idempotent]` filter reads a header and short-circuits only the endpoints that are marked.

**Keywords:** `middleware, filters, pipeline order, endpoint filter, cross-cutting, HttpContext, authorization filter`

**Follow-ups:**

-   What does short-circuiting mean?
-   Why must authentication come before authorization?
-   Can filters use dependency injection?

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

## ef-core-006 --- What are eager, lazy and explicit loading in EF Core, and how do you choose?

**question_id:** `ef-core-006`\
**topic_id:** `ef-core`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are eager, lazy and explicit loading in EF Core, and how do you choose?

**Answer**

Eager loading uses `Include`/`ThenInclude` to fetch related data in the same query, so it is predictable and avoids extra round trips but can produce large joined result sets (use `AsSplitQuery` to avoid cartesian explosion). Lazy loading (proxies or `ILazyLoader`) fetches related data on first property access, which is convenient but hides queries and is the usual source of N+1 problems and failures after the context is disposed. Explicit loading (`Entry(x).Collection(...).LoadAsync()`) fetches related data on demand under your control. For read endpoints, prefer projection with `Select` into a DTO so only the needed columns come back and no tracking is needed. Example: an order list page selects `OrderId`, `Total` and `CustomerName` directly rather than loading full `Order` graphs. Default to eager loading or projection, avoid lazy loading in web APIs, and check the generated SQL.

**Keywords:** `Include, lazy loading, explicit loading, projection, AsSplitQuery, N+1, cartesian explosion`

**Follow-ups:**

-   When does AsSplitQuery hurt?
-   Why is lazy loading risky with serialization?
-   How do you log generated SQL?

## ef-core-007 --- How do value converters, owned types, global query filters and shadow properties help model a domain?

**question_id:** `ef-core-007`\
**topic_id:** `ef-core`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do value converters, owned types, global query filters and shadow properties help model a domain?

**Answer**

Value converters translate between a .NET type and a database type, for example storing an enum as a string, a strongly typed `OrderId` as a Guid, or an encrypted value, which supports value objects and primitive-obsession fixes. Owned types (`OwnsOne`/`OwnsMany`) map value objects such as `Address` or `Money` into the owner's table (or a separate table) without their own identity. Global query filters apply a predicate to every query for an entity, commonly for soft delete (`!IsDeleted`) and multi-tenancy (`TenantId == currentTenant`); they can be bypassed with `IgnoreQueryFilters()`, which needs care in admin code, and they interact with required navigations and `Include`. Shadow properties exist in the model and database but not on the class, useful for audit columns like `LastModifiedAt` set in `SaveChanges`. Example: a multi-tenant SaaS filter on `TenantId` prevents forgotten `Where` clauses from leaking data across tenants. Test filters explicitly, and remember they do not apply to raw SQL.

**Keywords:** `value converter, owned type, global query filter, shadow property, soft delete, multi-tenant, IgnoreQueryFilters`

**Follow-ups:**

-   Why is a query filter not a security boundary on its own?
-   How do you index a soft-delete filter?
-   How do owned collections map?

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

## sql-006 --- Explain the SQL join types and when window functions are better than self-joins or subqueries.

**question_id:** `sql-006`\
**topic_id:** `sql`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Explain the SQL join types and when window functions are better than self-joins or subqueries.

**Answer**

`INNER JOIN` returns only matching rows; `LEFT JOIN` keeps all rows from the left side with NULLs where there is no match (use it to find missing children with `WHERE right.Id IS NULL`); `RIGHT` and `FULL OUTER` are the symmetric and union variants; `CROSS JOIN` produces the Cartesian product, and `CROSS APPLY` runs a correlated table expression per row. Put conditions on the right table of a LEFT JOIN in the `ON` clause, not the `WHERE`, or you silently turn it into an inner join. Window functions compute over a set of related rows without collapsing them: `ROW_NUMBER`, `RANK`, `DENSE_RANK` for ranking, `LAG`/`LEAD` for previous and next values, and `SUM() OVER (PARTITION BY ... ORDER BY ...)` for running totals. They replace self-joins and correlated subqueries that scan the table repeatedly. Example: a running balance per account is `SUM(Amount) OVER (PARTITION BY AccountId ORDER BY PostedAt)`, in a single pass with a supporting index.

**Keywords:** `JOIN, LEFT JOIN, CROSS APPLY, window function, ROW_NUMBER, LAG, PARTITION BY, running total`

**Follow-ups:**

-   RANK versus DENSE_RANK versus ROW_NUMBER?
-   Why does a WHERE on a left-joined table change the result?
-   What frame does a running SUM use by default?

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

## orleans-004 --- How does grain persistence work in Orleans, and what can go wrong?

**question_id:** `orleans-004`\
**topic_id:** `orleans`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How does grain persistence work in Orleans, and what can go wrong?

**Answer**

Grains keep state in memory while activated, and persistence lets that state survive deactivation and silo restarts. You declare `IPersistentState<T>` (or inherit legacy `Grain<T>`), configure a named storage provider (Azure Table or Blob, ADO.NET, Cosmos DB, Redis), then call `ReadStateAsync` on activation and `WriteStateAsync` after changes. Orleans does not write automatically, so forgetting `WriteStateAsync` loses changes, and calling it on every change creates a hot write path. Storage uses ETags for optimistic concurrency, so an `InconsistentStateException` can occur if two activations briefly coexist, for example during a network partition. Keep state small and treat grains as the owner of a single entity. Example: a `ShoppingCartGrain` persists its items when they change, while rarely-needed analytics data lives in a separate store. Version your state classes carefully because old serialized data must still deserialize after a deployment.

**Keywords:** `Orleans, IPersistentState, WriteStateAsync, ETag, storage provider, InconsistentStateException`

**Follow-ups:**

-   When would you use event sourcing with Orleans instead?
-   How do you migrate state schemas?
-   Should every grain persist state?

## orleans-005 --- What is the Orleans grain lifecycle, and when do you use timers versus reminders?

**question_id:** `orleans-005`\
**topic_id:** `orleans`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the Orleans grain lifecycle, and when do you use timers versus reminders?

**Answer**

A grain activation is created on demand when the first call arrives, runs `OnActivateAsync`, serves calls one at a time, and is deactivated after an idle period (or when the silo shuts down or memory pressure forces it), running `OnDeactivateAsync`. Because deactivation is not guaranteed to run on a crash, never rely on it for essential cleanup. Timers (`RegisterTimer`) are in-memory and per activation: they stop when the grain deactivates and are for frequent, short-lived work, and they do not keep a grain alive by themselves. Reminders are persistent and cluster-managed: they fire even if the grain is not currently activated (reactivating it), survive restarts, and are meant for low-frequency work, at roughly minute granularity or longer. Example: a subscription grain uses a reminder to check renewal daily, and a timer to flush a small in-memory buffer every few seconds.

**Keywords:** `grain lifecycle, activation, deactivation, timer, reminder, OnActivateAsync, idle`

**Follow-ups:**

-   Can a reminder run twice?
-   Why not use reminders for sub-second work?
-   How do you keep a grain alive?

## orleans-006 --- How does an Orleans cluster handle membership, placement and hot grains?

**question_id:** `orleans-006`\
**topic_id:** `orleans`\
**difficulty:** `Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How does an Orleans cluster handle membership, placement and hot grains?

**Answer**

Silos join a cluster through a membership table (Azure Table, SQL, Consul and so on) and monitor each other with heartbeats; a silo that stops responding is voted dead and its grain activations are recreated elsewhere on the next call. A grain's identity maps to an activation through a distributed directory, and placement strategies decide where a new activation goes: random (default), prefer-local, hash-based, resource-optimized (CPU and memory aware) or custom. A single grain processes one request at a time, so a hot grain (one very popular entity, such as a global counter) becomes a bottleneck regardless of cluster size. Mitigations: shard the key (many counter grains aggregated periodically), mark pure reads as `[ReadOnly]` or `[Reentrant]` where safe, use stateless workers for CPU-bound work, and batch updates. Example: a global leaderboard grain is split into per-region grains that report to an aggregator.

**Keywords:** `membership, silo, placement, directory, hot grain, StatelessWorker, Reentrant, sharding`

**Follow-ups:**

-   What happens to in-flight calls when a silo dies?
-   When is a StatelessWorker appropriate?
-   How do you roll out a new grain version?

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

## graphql-006 --- When would you choose gRPC over REST, and what are its streaming modes?

**question_id:** `graphql-006`\
**topic_id:** `graphql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When would you choose gRPC over REST, and what are its streaming modes?

**Answer**

gRPC uses HTTP/2 and Protocol Buffers with a contract-first `.proto` file that generates strongly typed clients and servers. Its binary encoding and multiplexed connections make it faster and more compact than JSON over HTTP/1.1, and it has built-in deadlines, cancellation, metadata and four call types: unary, server streaming, client streaming and bidirectional streaming. It is a strong fit for internal service-to-service calls, polyglot environments and low-latency or streaming workloads. REST is better for public APIs, browser clients (browsers cannot call native gRPC without gRPC-Web), caching with HTTP semantics, and easy debugging with curl. Example: an order service calls an inventory service over gRPC unary calls with a 500 ms deadline, while a pricing service streams live price updates to dashboards using server streaming. Evolve `.proto` files by only adding fields with new numbers, never renumbering or reusing them.

**Keywords:** `gRPC, Protocol Buffers, HTTP/2, streaming, deadline, proto, gRPC-Web, contract-first`

**Follow-ups:**

-   How do you version a proto contract?
-   What do deadlines add over timeouts?
-   Why is gRPC awkward for browsers?

## graphql-007 --- What challenges come with gRPC in ASP.NET Core and Kubernetes, and how are they solved?

**question_id:** `graphql-007`\
**topic_id:** `graphql`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What challenges come with gRPC in ASP.NET Core and Kubernetes, and how are they solved?

**Answer**

Because gRPC reuses one long-lived HTTP/2 connection with many multiplexed calls, a Layer-4 load balancer or a Kubernetes ClusterIP Service balances connections, not requests, so all calls from one client land on one pod. Fixes: use a Layer-7 (HTTP/2-aware) proxy or mesh such as Envoy, Linkerd, Istio or YARP, use a headless service with client-side load balancing, or configure the client with multiple connections. Other practical points: ASP.NET Core gRPC needs HTTP/2 with TLS (Kestrel endpoint configuration), set deadlines on every client call and propagate cancellation, use interceptors for logging, auth and retries, and configure retry policies through the service config only for idempotent calls. Use health checking (`grpc.health.v1`) for probes and `gRPC-Web` or JSON transcoding for browser and REST clients. Example: after scaling an API to six pods, only one pod handled traffic until a Linkerd sidecar enabled per-request balancing.

**Keywords:** `gRPC, HTTP/2, load balancing, headless service, Envoy, interceptor, deadline, Kestrel, JSON transcoding`

**Follow-ups:**

-   How do you secure gRPC with mTLS?
-   Why do retries need idempotency?
-   What is gRPC JSON transcoding?

## graphql-008 --- How do you version and evolve a GraphQL schema without breaking clients?

**question_id:** `graphql-008`\
**topic_id:** `graphql`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you version and evolve a GraphQL schema without breaking clients?

**Answer**

GraphQL avoids URL versioning by evolving a single schema continuously. Additive changes are safe: new fields, types and optional arguments do not break existing queries because clients only request what they name. For removals, mark the field `@deprecated(reason: "...")`, monitor usage through operation tracing or a schema registry, and remove it only when no active client uses it. Avoid breaking changes such as making a nullable field non-null, changing a type, or adding required arguments. Make fields nullable by default where partial failure is plausible so one failing resolver does not null out the parent, and use dedicated payload and input types for mutations so they can grow. Example: replacing `name` with `fullName` is done by adding `fullName`, deprecating `name`, checking for zero traffic over a release cycle, then deleting it. Tools such as schema checks in CI and persisted queries make this safe at scale.

**Keywords:** `GraphQL, schema evolution, deprecated, breaking change, nullable, persisted queries, schema registry`

**Follow-ups:**

-   How do you detect unused fields?
-   Why are mutation payload types recommended?
-   What is schema stitching versus federation?

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

## frontend-005 --- How do Blazor Server, Blazor WebAssembly and the .NET 8 unified model differ?

**question_id:** `frontend-005`\
**topic_id:** `frontend`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do Blazor Server, Blazor WebAssembly and the .NET 8 unified model differ?

**Answer**

Blazor lets you write interactive web UI in C# with Razor components. Blazor Server runs components on the server and sends UI diffs to the browser over a SignalR connection: fast startup, small download and direct access to server resources, but every interaction has network latency, the server holds per-user circuit state in memory, and a dropped connection interrupts the user. Blazor WebAssembly downloads the .NET runtime and app to the browser and runs there: no persistent connection, works offline and offloads server CPU, but a larger first download and anything sensitive must be behind an API. .NET 8 unified these with render modes per component or page: static server-side rendering, interactive Server, interactive WebAssembly, or Auto (starts on Server, then switches to WebAssembly). Example: a mostly static marketing and docs site uses static SSR with a few interactive components, while an internal admin tool uses interactive Server for quick development. Choose based on latency, scale, offline needs and team skills.

**Keywords:** `Blazor, WebAssembly, Server, SignalR circuit, render modes, static SSR, Auto, Razor components`

**Follow-ups:**

-   How many concurrent users can a Blazor Server instance hold?
-   How do you secure a WebAssembly app?
-   What is prerendering?

## frontend-006 --- How do Angular change detection, OnPush and signals improve performance?

**question_id:** `frontend-006`\
**topic_id:** `frontend`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do Angular change detection, OnPush and signals improve performance?

**Answer**

By default Angular (with Zone.js) checks every component in the tree after any async event such as a click, timer or HTTP response, which is simple but wasteful in large screens. `ChangeDetectionStrategy.OnPush` limits a component's checks to when an input reference changes, an event fires in that component or its children, an `async` pipe emits, or `markForCheck` is called. This works best with immutable data and observables, since mutating an object in place will not trigger an update. Signals add fine-grained reactivity: a template reads a signal, Angular tracks that dependency, and only the affected views refresh; `computed` derives values and `effect` runs side effects, and signals are enabling zoneless change detection. Also use `trackBy` (or `track` in the new control flow) in `@for`, lazy-load routes, and defer heavy blocks with `@defer`. Example: a table of 5,000 rows that re-rendered on every keystroke stops doing so with OnPush, immutable row updates and a tracking function.

**Keywords:** `Angular, change detection, OnPush, signals, computed, zoneless, trackBy, @defer`

**Follow-ups:**

-   Why does OnPush not update when I mutate an array?
-   Signals versus RxJS: when to use each?
-   How do you profile Angular rendering?

## frontend-007 --- What are Core Web Vitals and how do you improve them for a single-page application?

**question_id:** `frontend-007`\
**topic_id:** `frontend`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are Core Web Vitals and how do you improve them for a single-page application?

**Answer**

Core Web Vitals are Google's user-centered performance metrics: Largest Contentful Paint (LCP, loading, target under 2.5 s), Interaction to Next Paint (INP, responsiveness, target under 200 ms) and Cumulative Layout Shift (CLS, visual stability, target under 0.1). Improve LCP by shrinking and caching the critical bundle, compressing assets with Brotli, serving through a CDN, preloading the hero image, using modern image formats with correct dimensions, and server-side rendering or prerendering the first view. Improve INP by splitting long tasks, avoiding heavy synchronous work on the main thread, debouncing handlers and moving computation to web workers. Improve CLS by reserving space for images, ads and async content with explicit width and height, and avoiding late font swaps. Measure with Lighthouse in lab conditions and real-user monitoring in the field, because field data is what counts. Example: lazy-loading the charting library cut the initial bundle by 300 KB and moved LCP from 4 s to 2 s.

**Keywords:** `Core Web Vitals, LCP, INP, CLS, lazy loading, CDN, bundle size, Lighthouse, RUM`

**Follow-ups:**

-   Lab data versus field data?
-   How does code splitting help?
-   What causes layout shift?

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

## aws-004 --- How do IAM roles and policies work in AWS compared with Azure managed identities and RBAC?

**question_id:** `aws-004`\
**topic_id:** `aws`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do IAM roles and policies work in AWS compared with Azure managed identities and RBAC?

**Answer**

In AWS, IAM identities (users, groups, roles) get permissions from JSON policies that allow or deny actions on resources, with an explicit deny always winning and everything denied by default. Workloads should not use long-lived access keys; they assume an IAM role and receive short-lived credentials, such as an EC2 instance profile, an ECS task role, an EKS IAM role for service accounts (IRSA or Pod Identity) or a Lambda execution role. The closest Azure equivalents are managed identities plus Azure RBAC role assignments, with Entra ID as the identity provider. Differences: AWS policies attach to identities or resources (bucket and queue policies) and use conditions heavily, and cross-account access uses role assumption through STS. Example: a .NET API on ECS reads one S3 bucket and one SQS queue using a task role scoped to exactly those ARNs, with no keys in configuration. Apply least privilege and review with IAM Access Analyzer.

**Keywords:** `IAM, role, policy, STS, assume role, least privilege, IRSA, managed identity`

**Follow-ups:**

-   How does an explicit deny interact with allows?
-   How would you grant cross-account access?
-   Why avoid long-lived access keys?

## aws-005 --- Which AWS messaging and storage services map to Azure Service Bus, Storage Queues, Event Grid and Blob Storage?

**question_id:** `aws-005`\
**topic_id:** `aws`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Which AWS messaging and storage services map to Azure Service Bus, Storage Queues, Event Grid and Blob Storage?

**Answer**

SQS is the queue service (standard queues are at-least-once with best-effort ordering; FIFO queues give ordering and deduplication), closest to Service Bus queues or Storage Queues. SNS is pub/sub fan-out, similar to Service Bus topics; the common SNS-to-SQS fan-out gives each consumer its own queue. EventBridge is the event bus with rule-based routing and SaaS integrations, comparable to Event Grid. Kinesis Data Streams (and Amazon MSK for Kafka) compare to Event Hubs. S3 is object storage, equivalent to Blob Storage, with storage classes, lifecycle rules, versioning and pre-signed URLs similar to SAS tokens. Example: an order service publishes `OrderPlaced` to SNS, which fans out to separate SQS queues for billing, inventory and email, each with its own dead-letter queue. Mapping the concepts is useful, but check semantic differences such as delivery guarantees, ordering and maximum message size.

**Keywords:** `SQS, SNS, EventBridge, Kinesis, S3, fan-out, dead-letter queue, pre-signed URL`

**Follow-ups:**

-   SQS standard versus FIFO?
-   What is the visibility timeout?
-   When would you choose Kinesis over SQS?

## aws-006 --- What are AWS Lambda cold starts, limits and best practices for .NET?

**question_id:** `aws-006`\
**topic_id:** `aws`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are AWS Lambda cold starts, limits and best practices for .NET?

**Answer**

A cold start is the extra latency when Lambda creates a new execution environment, downloads your code, starts the runtime and runs initialization before the first request. .NET cold starts are noticeable because of JIT and assembly loading. Mitigations: Native AOT or ReadyToRun compilation, smaller packages, trimming, doing expensive setup in static initializers (reused across warm invocations), provisioned concurrency for latency-critical paths, and SnapStart where supported. Key limits include a 15 minute maximum duration, memory from 128 MB to 10 GB (CPU scales with memory), a payload cap of 6 MB synchronous, and account-level concurrency limits. Because the environment can be frozen between calls, do not rely on background threads or in-memory state for correctness. Example: an API Gateway to Lambda endpoint that shows 2 second first-call latency can be brought under 300 ms with Native AOT and more memory. Use Lambda for spiky or event-driven work; steady high traffic is often cheaper on containers.

**Keywords:** `Lambda, cold start, provisioned concurrency, Native AOT, SnapStart, concurrency, timeout`

**Follow-ups:**

-   Why does more memory sometimes make Lambda cheaper?
-   How do you handle partial batch failure from SQS?
-   How do you reuse database connections safely?

## aws-007 --- How do RDS, Aurora and DynamoDB differ, and how does a VPC keep them private?

**question_id:** `aws-007`\
**topic_id:** `aws`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do RDS, Aurora and DynamoDB differ, and how does a VPC keep them private?

**Answer**

RDS runs managed relational engines (SQL Server, PostgreSQL, MySQL) with backups, patching, Multi-AZ failover and read replicas. Aurora is AWS's cloud-native MySQL/PostgreSQL-compatible engine with shared distributed storage, fast failover, more read replicas and optional serverless scaling. DynamoDB is a serverless key-value and document store with single-digit-millisecond latency; you model data around access patterns, choose partition and sort keys carefully to avoid hot partitions, and use secondary indexes, but you give up ad hoc joins. A VPC is your private network: databases belong in private subnets with no public IP, security groups (stateful, per resource) allow only the application tier, network ACLs add stateless subnet rules, and VPC endpoints let services reach S3 or DynamoDB without internet exposure. Example: ECS tasks in private subnets connect to Aurora through a security group that allows port 5432 only from the task's security group.

**Keywords:** `RDS, Aurora, DynamoDB, VPC, security group, private subnet, Multi-AZ, hot partition`

**Follow-ups:**

-   When is DynamoDB a poor choice?
-   Security group versus network ACL?
-   How does Multi-AZ differ from a read replica?

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

## docker-004 --- How do multi-stage builds, layer caching and .dockerignore speed up and shrink .NET images?

**question_id:** `docker-004`\
**topic_id:** `docker`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do multi-stage builds, layer caching and .dockerignore speed up and shrink .NET images?

**Answer**

A multi-stage Dockerfile builds in a heavy SDK image and copies only the published output into a small ASP.NET runtime image, so compilers and source code never ship. Each instruction creates a cached layer, and a layer is rebuilt only if it or any earlier layer changed. Copy the `.csproj` files and run `dotnet restore` first, then copy the source and publish, so NuGet restore stays cached until dependencies change. A `.dockerignore` excluding `bin`, `obj`, `.git` and `node_modules` shrinks the build context and stops stale artifacts from busting the cache. Example: this typically cuts an image from over 700 MB to roughly 100-200 MB and a no-change rebuild from minutes to seconds. In CI, use BuildKit cache mounts or a registry cache so clean agents also benefit.

**Keywords:** `multi-stage, layer cache, dockerignore, restore, sdk image, runtime image, BuildKit`

**Follow-ups:**

-   Why copy csproj files before the source?
-   How do you pass a NuGet feed credential without leaking it into a layer?
-   What is the difference between ENTRYPOINT and CMD?

## docker-005 --- How do Docker volumes, networks and Compose work together for a local .NET stack?

**question_id:** `docker-005`\
**topic_id:** `docker`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do Docker volumes, networks and Compose work together for a local .NET stack?

**Answer**

Containers have an ephemeral writable layer, so data that must survive restarts goes in a named volume (managed by Docker) or a bind mount (a host path, handy for source during development). Containers on the same user-defined network resolve each other by service name through Docker's built-in DNS, so the API connects to `Host=db` rather than an IP, and only ports you publish with `ports:` are reachable from the host. Docker Compose declares the whole stack (API, SQL Server or PostgreSQL, Redis, a message broker) in one YAML file with environment variables, health checks and `depends_on` with `condition: service_healthy` so the API waits for the database to be ready, not merely started. Example: a SQL Server data volume lets you recreate the container without losing the dev database. Compose is for local and small deployments; production orchestration uses Kubernetes or a managed service.

**Keywords:** `volume, bind mount, network, compose, depends_on, healthcheck, service name, DNS`

**Follow-ups:**

-   Why is depends_on not enough on its own?
-   How do you persist SQL Server data in Docker?
-   Which ports should not be published?

## docker-006 --- How do you harden a container image and runtime for security?

**question_id:** `docker-006`\
**topic_id:** `docker`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you harden a container image and runtime for security?

**Answer**

Start with a minimal base: the official `aspnet` runtime image, a Chiseled (distroless-style) Ubuntu image or Alpine, which reduce the attack surface and vulnerability count. Run as a non-root user (Microsoft images provide a built-in `app` user; set `USER app` and listen on port 8080, not 80). Pin base images by version or digest, scan images in CI (Trivy, Defender for Cloud, Grype) and fail the build on critical findings, and rebuild regularly to pick up patches. Keep secrets out of image layers and build args; inject them at runtime from Key Vault, Kubernetes secrets or environment. At runtime drop capabilities, use a read-only root filesystem with a writable temp volume, and set resource limits. Sign images and verify them at admission. Example: a compromised app running as root in a writable container can install tools and persist, while a non-root read-only container makes that much harder.

**Keywords:** `non-root, chiseled, distroless, image scanning, Trivy, read-only filesystem, secrets, digest`

**Follow-ups:**

-   Why should a container not run as root?
-   What does a read-only root filesystem break in .NET?
-   How do you sign and verify images?

## docker-007 --- How should a .NET container handle health checks and graceful shutdown?

**question_id:** `docker-007`\
**topic_id:** `docker`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How should a .NET container handle health checks and graceful shutdown?

**Answer**

Expose separate endpoints: a liveness check that only proves the process is not stuck, and a readiness check that verifies critical dependencies, using ASP.NET Core `MapHealthChecks` with tags. Orchestrators stop a container by sending SIGTERM and, after a grace period, SIGKILL. The generic host handles SIGTERM, stops accepting new requests, waits for in-flight requests and `BackgroundService.StopAsync`, and then exits; make sure `HostOptions.ShutdownTimeout` fits inside the orchestrator's grace period. Use the exec form of ENTRYPOINT (`["dotnet","App.dll"]`) so the .NET process is PID 1 and receives the signal; the shell form wraps it in `sh`, which does not forward signals. Example: on a rolling deploy, a request that takes 20 seconds is cut off when the default 30 second grace period is exceeded, producing 502 errors. Also fail readiness first so the load balancer drains traffic before shutdown.

**Keywords:** `SIGTERM, graceful shutdown, health checks, readiness, liveness, PID 1, ShutdownTimeout, exec form`

**Follow-ups:**

-   What does preStop sleep solve in Kubernetes?
-   How do you stop a BackgroundService cleanly?
-   What happens to messages being processed during shutdown?

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

## devops-006 --- How does Terraform manage state, and how do you avoid drift and state corruption?

**question_id:** `devops-006`\
**topic_id:** `devops`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How does Terraform manage state, and how do you avoid drift and state corruption?

**Answer**

Terraform compares the desired configuration with a state file that records the real resources it created, then plans and applies the difference. State often contains secrets, so store it remotely and encrypted (Azure Storage, S3 with DynamoDB locking or Terraform Cloud), enable state locking so two applies cannot run at once, and restrict access. Drift occurs when resources are changed outside Terraform (a portal click); detect it with scheduled `terraform plan` runs, decide whether to import the change or revert it, and block manual changes with policy and least-privilege access. Split state by environment and ownership (network, platform, application) to limit blast radius and speed up plans. Run `plan` in pull requests and `apply` only from the pipeline after approval. Example: a developer manually widening an NSG rule is caught by the nightly plan, which shows a diff that is reviewed and reverted.

**Keywords:** `Terraform, state, remote state, locking, drift, plan, apply, import, modules`

**Follow-ups:**

-   How do you refactor resources without destroying them?
-   What belongs in a module?
-   How do you manage provider and module versions?

## devops-007 --- How do Bicep, ARM templates and Terraform compare for Azure infrastructure?

**question_id:** `devops-007`\
**topic_id:** `devops`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do Bicep, ARM templates and Terraform compare for Azure infrastructure?

**Answer**

ARM templates are Azure's native JSON deployment format; Bicep is a cleaner domain-specific language that compiles to ARM, with modules, type checking and no separate state file because Azure Resource Manager tracks deployments. Terraform is cloud-agnostic HCL with a plan/apply workflow and its own state, with a large provider ecosystem covering Azure, AWS, Kubernetes, Cloudflare and SaaS. Choose Bicep for an Azure-only estate that wants first-day support for new resource types and no state management; choose Terraform for multi-cloud, a wider ecosystem or when the team already knows it. Either way, keep infrastructure in source control, review changes in pull requests, deploy through a pipeline with what-if or plan output, and parameterize per environment. Example: a team standardizes on Bicep modules for App Service, SQL and Key Vault and deploys them with `az deployment group what-if` before approval.

**Keywords:** `Bicep, ARM, Terraform, IaC, what-if, modules, state, multi-cloud`

**Follow-ups:**

-   How do you manage secrets in IaC?
-   How do you test infrastructure code?
-   What is idempotency in IaC?

## devops-008 --- What are Helm charts and GitOps, and how do Argo CD or Flux change deployments?

**question_id:** `devops-008`\
**topic_id:** `devops`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What are Helm charts and GitOps, and how do Argo CD or Flux change deployments?

**Answer**

Helm packages Kubernetes manifests as a chart with templates and a `values.yaml`, so one chart can be deployed to dev, test and production with different values, versioned, rolled back and shared. GitOps takes the idea further: Git is the single source of truth for the desired cluster state, and an in-cluster controller (Argo CD or Flux) continuously reconciles the cluster to match it. Deployments become pull requests that change the manifest or image tag, giving review, audit history, easy rollback by reverting a commit, and drift correction if someone edits the cluster by hand. The CI pipeline builds and pushes the image and updates the tag in the config repo; it no longer needs cluster credentials, which improves security. Example: promoting a release from staging to production is a merged pull request on the environment folder, and Argo CD shows the sync status and diff. Keep secrets out of Git with sealed secrets or an external secrets operator.

**Keywords:** `Helm, GitOps, Argo CD, Flux, reconciliation, values.yaml, rollback, drift`

**Follow-ups:**

-   Push versus pull deployment?
-   How do you handle secrets in GitOps?
-   Helm versus Kustomize?

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

## security-007 --- How do you use an identity provider such as Microsoft Entra ID, Keycloak or Duende IdentityServer with an ASP.NET Core API?

**question_id:** `security-007`\
**topic_id:** `security`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you use an identity provider such as Microsoft Entra ID, Keycloak or Duende IdentityServer with an ASP.NET Core API?

**Answer**

Do not build your own login and token issuing for anything beyond a demo; delegate to an identity provider (IdP) that implements OpenID Connect and OAuth2. The web app registers as a client and signs users in with the authorization code flow plus PKCE, and the API is registered as a resource or audience and validates bearer tokens through `AddJwtBearer` or `Microsoft.Identity.Web`, checking issuer, audience, signature (via the IdP's JWKS metadata endpoint), lifetime and scopes or roles. Entra ID is the managed choice in Microsoft shops (app registrations, app roles, groups, conditional access, B2B and B2C-style external identities). Keycloak is open source and self-hosted, and Duende IdentityServer is a commercial, highly customizable framework you host yourself. Example: an Angular SPA signs in against Entra ID, calls the API with an access token carrying the `orders.read` scope, and the API enforces it with an authorization policy. Map IdP claims and roles into your own policies and keep authorization data close to the application.

**Keywords:** `Entra ID, Keycloak, Duende, OpenID Connect, PKCE, JwtBearer, app registration, scopes, JWKS`

**Follow-ups:**

-   Why validate the audience claim?
-   How do you handle key rotation?
-   Hosted IdP versus self-hosted trade-offs?

## security-008 --- How do machine-to-machine and downstream calls authenticate: client credentials, on-behalf-of and managed identity?

**question_id:** `security-008`\
**topic_id:** `security`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do machine-to-machine and downstream calls authenticate: client credentials, on-behalf-of and managed identity?

**Answer**

When a service calls another service without a user, it uses the OAuth2 client credentials flow: it authenticates with a secret, certificate or federated credential and receives an app-only token with application permissions. Certificates or workload identity federation are better than long-lived secrets. When an API must call another API as the signed-in user, it uses the on-behalf-of (OBO) flow: it exchanges the incoming user token for a new token for the downstream audience, keeping the user's identity and consent. In Azure, a managed identity removes stored credentials entirely because the platform issues tokens for Azure resources such as Key Vault and SQL. Do not simply forward the user's original token to every downstream service, because it has the wrong audience and widens the blast radius. Example: a reporting API uses OBO to call the orders API as the user so row-level rules still apply, but uses client credentials for a nightly batch job.

**Keywords:** `client credentials, on-behalf-of, managed identity, app-only token, federated credential, audience`

**Follow-ups:**

-   Why not forward the access token downstream?
-   How do you cache tokens safely?
-   What are application versus delegated permissions?

## security-009 --- How should passwords be stored, and how do MFA and passkeys fit in?

**question_id:** `security-009`\
**topic_id:** `security`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How should passwords be stored, and how do MFA and passkeys fit in?

**Answer**

Never store passwords or encrypt them reversibly; store a salted hash from a slow, purpose-built algorithm. ASP.NET Core Identity uses PBKDF2 with a high iteration count by default; Argon2id and bcrypt are good alternatives. A unique random salt per password defeats rainbow tables, and the slow work factor makes brute force expensive; plan for rehashing at login when you raise the cost. Add defenses around the hash: rate limiting and lockout or back-off, breached-password checks, and generic error messages that do not reveal whether the user exists. Multi-factor authentication (TOTP apps, push or hardware keys) blocks most credential-stuffing attacks. Passkeys (WebAuthn/FIDO2) replace passwords with a device-bound public-key credential that cannot be phished, because the browser only signs challenges for the registered origin. Example: after a leaked-password list appears, accounts with MFA stay safe while password-only accounts are taken over.

**Keywords:** `password hashing, PBKDF2, Argon2, bcrypt, salt, MFA, TOTP, passkeys, WebAuthn, lockout`

**Follow-ups:**

-   Why is SHA-256 alone wrong for passwords?
-   How do you migrate old hashes to a new algorithm?
-   How do you handle account recovery securely?

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

## testing-006 --- What is the difference between mocks, stubs, fakes and spies, and when is mocking harmful?

**question_id:** `testing-006`\
**topic_id:** `testing`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

What is the difference between mocks, stubs, fakes and spies, and when is mocking harmful?

**Answer**

A stub returns canned answers, a fake is a working lightweight implementation (an in-memory repository), a mock is pre-programmed with expectations about the calls it should receive and fails if they do not happen, and a spy records calls for later assertion. Use these to isolate a unit from slow or non-deterministic dependencies such as the clock, network, message broker and email sender. Mocking is harmful when tests assert the implementation instead of the behavior: heavy `Verify(x => x.Save(...))` checks break on every refactor while the behavior is unchanged, and mocking the database hides query and mapping bugs that only a real provider catches. Prefer state-based assertions, fakes for simple collaborators, and integration tests with real infrastructure (Testcontainers) for data access. Do not mock types you do not own, such as `DbContext`; wrap them or use a real provider. Example: testing a checkout service with a fake payment gateway and fake clock is more stable than twelve chained mock setups.

**Keywords:** `mock, stub, fake, spy, Moq, NSubstitute, Testcontainers, behavior verification, test double`

**Follow-ups:**

-   How do you test time-dependent code?
-   Why avoid mocking DbContext?
-   When is verifying a call actually appropriate?

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

## enterprise-004 --- When would you choose SSRS paginated reports versus Power BI dashboards?

**question_id:** `enterprise-004`\
**topic_id:** `enterprise`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When would you choose SSRS paginated reports versus Power BI dashboards?

**Answer**

SSRS (paginated reports) is pixel-perfect, print- and export-oriented reporting: invoices, statements, regulatory forms and operational lists with exact layout, page breaks, headers, subreports and PDF or Excel subscriptions by email. Power BI is interactive, exploratory analytics: dashboards, slicers, drill-through, a semantic model with DAX measures, and self-service for business users. Choose paginated reports when the document itself is the deliverable and must look identical every time, and Power BI when users explore trends and slice data. They can coexist: Power BI Report Server hosts both, and the Power BI service also offers paginated reports. Example: month-end customer statements are generated as PDFs with SSRS, while the finance team explores revenue by region in Power BI. In both cases, point reports at read-optimized views or replicas, not the live transactional tables.

**Keywords:** `SSRS, paginated report, Power BI, DAX, subscription, semantic model, dashboard`

**Follow-ups:**

-   How do you secure row-level data in each tool?
-   How do you embed a report in an ASP.NET Core app?
-   Why avoid reporting on the OLTP database?

## enterprise-005 --- How do you design a reliable, incremental SSIS ETL package?

**question_id:** `enterprise-005`\
**topic_id:** `enterprise`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you design a reliable, incremental SSIS ETL package?

**Answer**

Design for restartability and idempotency. Extract only changes using a watermark column, rowversion, change tracking or CDC rather than reloading everything. Land data in staging tables, validate and transform there, then merge into targets in a transaction so a failed run does not leave partial data. Use lookup transforms for dimension keys, route bad rows to an error output table with the reason instead of failing the whole load, and log each run with row counts and start and end times in an audit table. Parameterize connections through project parameters and environments in the SSIS catalog, and run packages from SQL Agent or Azure Data Factory with alerts. Example: a nightly sales load reads rows with a `ModifiedAt` greater than the stored watermark, upserts them into the warehouse and advances the watermark only after commit. Test by re-running the same batch and confirming the result does not change.

**Keywords:** `SSIS, ETL, incremental load, watermark, CDC, staging, idempotent, error output`

**Follow-ups:**

-   How do you handle late-arriving dimension data?
-   Change tracking versus CDC?
-   How do you monitor package failures?

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

## leadership-004 --- How do you facilitate a design review so it leads to a decision rather than a debate?

**question_id:** `leadership-004`\
**topic_id:** `leadership`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you facilitate a design review so it leads to a decision rather than a debate?

**Answer**

Send a short design document in advance (problem, constraints, options considered, recommendation, risks) so the meeting is for decisions, not presentations. Name a decision owner and an expected deadline, and state which decision types need consensus and which are the owner's call after input. In the meeting, separate clarifying questions from objections, ask reviewers to state the failure scenario behind a concern, and time-box open debates. Capture the outcome as an Architecture Decision Record with the context, decision and consequences, including dissent, so the reasoning survives staff changes. Prefer reversible decisions made quickly and invest review time in the hard-to-reverse ones such as data models and public APIs. Example: two senior engineers disagreed on a message broker; a one-week spike with agreed success criteria resolved it with data, and the ADR recorded why.

**Keywords:** `design review, ADR, decision owner, trade-offs, disagree and commit, reversible decisions`

**Follow-ups:**

-   How do you handle a senior engineer who blocks consensus?
-   When is an ADR overkill?
-   How do you review a design you disagree with?

## leadership-005 --- How do you decide what to do about technical debt and how do you make the case to the business?

**question_id:** `leadership-005`\
**topic_id:** `leadership`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you decide what to do about technical debt and how do you make the case to the business?

**Answer**

First classify the debt: deliberate and prudent (shipped to hit a date, with a plan), accidental, and bit-rot. Then rank by cost of delay: how often the code is changed, how many incidents or bug fixes it causes, how much it slows delivery, and security or compliance risk. Debt in code nobody touches is low priority. Express the case in business terms, such as fewer incidents, faster lead time or reduced onboarding time, backed by metrics like change failure rate and cycle time rather than "the code is ugly". Fund it steadily instead of with a big rewrite: reserve a percentage of each sprint, pair debt fixes with feature work in the same area (the boy-scout rule), and use the strangler approach for large replacements. Example: a flaky payment module that caused four incidents in a quarter justified two sprints of refactoring and tests with measurable incident reduction afterwards.

**Keywords:** `technical debt, prioritization, cost of delay, strangler, change failure rate, business case`

**Follow-ups:**

-   When is a rewrite justified?
-   How do you prevent new debt?
-   How do you track debt visibly?

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

## scenarios-008 --- Immigration and legal case management: how would you design document handling, deadlines and auditability?

**question_id:** `scenarios-008`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Immigration and legal case management: how would you design document handling, deadlines and auditability?

**Answer**

Treat every case as a long-lived aggregate with a strict status workflow (draft, filed, RFE, approved), and make state transitions explicit and validated so illegal jumps are impossible. Documents are sensitive: store files in encrypted blob storage with metadata in the database, virus-scan uploads, serve via short-lived signed URLs, and apply role- and case-based access so only assigned staff and the client see them. Deadlines (filing windows, response dates) are business-critical, so model them as data, compute them with time-zone and holiday awareness, and drive reminders from a durable scheduler, not in-memory timers. Keep an append-only audit trail of who viewed or changed what and when, because disputes and compliance reviews depend on it. Integrate with government e-filing or form systems through an adapter with idempotent submissions and retries, and store versions of generated forms. Example: a missed response date triggers escalating alerts at 30, 7 and 1 day before the deadline and a visible dashboard of at-risk cases.

**Keywords:** `case management, workflow, audit trail, document security, deadlines, signed URL, retention`

**Follow-ups:**

-   How would you handle a client's right to deletion with legal retention duties?
-   How do you test deadline calculations across time zones?
-   How do you support multi-tenant law firms?

## scenarios-009 --- Supply chain integration: how do you handle partner EDI/API feeds, duplicates and inventory accuracy?

**question_id:** `scenarios-009`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Supply chain integration: how do you handle partner EDI/API feeds, duplicates and inventory accuracy?

**Answer**

Partners send orders, shipment notices and stock updates over EDI files, SFTP or APIs, often late, duplicated or out of order. Put an anti-corruption layer at the edge that validates and translates each partner format into your canonical model, and store the raw message first so you can replay and audit it. Make processing idempotent using the partner's document number plus type as a natural key, and handle out-of-order updates with version numbers or timestamps so an old stock count never overwrites a newer one. Publish internal events through an outbox, treat inventory as event-driven and eventually consistent, and run periodic reconciliation jobs against the partner's source of truth with alerts on discrepancies. Isolate each partner's failures with queues, retries, a dead-letter queue and per-partner rate limits so one bad feed does not stall others. Example: a duplicated advance shipment notice is detected by its document number and ignored, while a late stock snapshot is stored but not applied because a newer one exists.

**Keywords:** `EDI, anti-corruption layer, idempotency, ordering, outbox, reconciliation, dead-letter queue, inventory`

**Follow-ups:**

-   How do you onboard a new partner quickly?
-   What do you do when the partner's data is wrong?
-   How do you reserve stock across channels?

## scenarios-010 --- Oil and gas or IoT telemetry: how would you ingest and query high-volume time-series data?

**question_id:** `scenarios-010`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Oil and gas or IoT telemetry: how would you ingest and query high-volume time-series data?

**Answer**

Sensors push millions of small readings a second, so separate ingestion from storage. Devices or gateways publish to Azure IoT Hub, Event Hubs or Kafka, which absorb bursts and decouple producers from consumers. Stream processors (Azure Stream Analytics, Functions, Flink or a .NET worker with batching) validate, deduplicate by device and timestamp, enrich, and write in large batches. Store time-series in a purpose-built engine (Azure Data Explorer, TimescaleDB, InfluxDB) or partitioned tables, with hot, warm and cold tiers: raw data for days, downsampled aggregates (1 min, 1 hour) for months and cheap archive in blob storage for years. Handle late and out-of-order events with event-time windows and watermarks, and alert in the stream on threshold breaches rather than polling the database. Edge devices buffer during connectivity loss and replay later, so ingestion must tolerate duplicates. Example: a pressure sensor outage triggers an alert within seconds from the stream while dashboards query downsampled data in milliseconds.

**Keywords:** `time series, IoT Hub, Event Hubs, stream processing, downsampling, retention tiers, watermark, late events`

**Follow-ups:**

-   How do you size partitions for ingestion?
-   How do you detect missing sensor data?
-   How would you retain raw data cheaply?

## scenarios-011 --- Data archiving and compliance: how do you balance retention, audit and a right-to-erasure request?

**question_id:** `scenarios-011`\
**topic_id:** `scenarios`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

Data archiving and compliance: how do you balance retention, audit and a right-to-erasure request?

**Answer**

Start by classifying data and mapping each class to a legal basis and retention period, because different rules apply (financial records for years, access logs for months, marketing data until consent is withdrawn). Implement retention as automated policy: move cold data to cheaper, immutable archive storage (WORM or legal hold) and purge expired data on a schedule with an audit entry for each purge. For erasure requests (GDPR Article 17), delete or anonymize personal fields, but keep records you must retain by law, documenting the exception. Design for it up front: keep personal data in a small number of identifiable places, use pseudonymous ids elsewhere, and avoid copying it into logs, caches, search indexes and analytics. Event-sourced systems can use crypto-shredding, deleting the per-person encryption key so stored events become unreadable. Back up with retention aligned to policy, since deleted data lingering in backups needs a defined expiry. Example: a closed customer is anonymized in the CRM after 30 days, while invoices are kept for seven years with the name replaced by a reference where the law permits.

**Keywords:** `retention, archive, GDPR, erasure, anonymization, crypto-shredding, legal hold, audit, WORM`

**Follow-ups:**

-   How do you handle erasure in backups?
-   How do you prove deletion happened?
-   What is pseudonymization versus anonymization?

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

## data-stores-005 --- When would you use Elasticsearch, and how does its inverted index work?

**question_id:** `data-stores-005`\
**topic_id:** `data-stores`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

When would you use Elasticsearch, and how does its inverted index work?

**Answer**

Elasticsearch (and OpenSearch) is a distributed search engine built on Lucene. It stores documents as JSON and builds an inverted index: an analyzer tokenizes and normalizes text (lowercasing, stemming, stop words), and the index maps each term to the list of documents containing it, which makes full-text search, relevance scoring (BM25), fuzzy matching, faceted aggregation and log analytics fast. Data is split into shards with replicas for scale and availability, and it is near-real-time because new documents become searchable after a periodic refresh, not instantly. It is a poor system of record: no multi-document ACID transactions, and eventual consistency with the source database. Example: products live in SQL Server, and an outbox-driven indexer keeps an Elasticsearch index in sync to power typo-tolerant search with filters and counts. Design mappings explicitly, avoid unbounded field growth, and plan reindexing with aliases.

**Keywords:** `Elasticsearch, inverted index, analyzer, shards, BM25, near real-time, Lucene, aggregation`

**Follow-ups:**

-   How do you keep the index in sync with the database?
-   Why avoid deep pagination?
-   Keyword versus text field?

## data-stores-006 --- How do you model data in MongoDB: embed or reference?

**question_id:** `data-stores-006`\
**topic_id:** `data-stores`\
**difficulty:** `Mid-level`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do you model data in MongoDB: embed or reference?

**Answer**

MongoDB stores flexible BSON documents, and schema design follows access patterns instead of normalization. Embed data that is read together, owned by the parent and bounded in size, such as order line items inside an order, so one read returns everything and updates to one document are atomic. Reference data that is shared, large, unbounded or changes independently, such as the customer an order belongs to, then join with `$lookup` or a second query. Watch the 16 MB document limit and avoid arrays that grow without bound. Multi-document transactions exist but are slower and used sparingly. Index fields used in filters and sorts, and use compound indexes that match query shape. Example: a blog post embeds its small set of tags but references its author, while comments, which can grow into thousands, go in their own collection with a post id.

**Keywords:** `MongoDB, embed, reference, document, $lookup, access patterns, index, 16 MB`

**Follow-ups:**

-   How do you handle schema versioning?
-   When would you prefer SQL instead?
-   What is a shard key?

## data-stores-007 --- How do PostgreSQL and SQL Server differ in features that matter to a .NET team?

**question_id:** `data-stores-007`\
**topic_id:** `data-stores`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical / Scenario`

**Question**

How do PostgreSQL and SQL Server differ in features that matter to a .NET team?

**Answer**

Both are mature relational engines and EF Core supports both, so the choice is usually about licensing, tooling and features. PostgreSQL is open source with no per-core licensing, rich types (JSONB with GIN indexes, arrays, ranges, enums), extensions (PostGIS, pg_trgm, pgvector), partial and expression indexes, and MVCC where readers do not block writers by default. SQL Server has strong tooling (SSMS, Profiler, Query Store), deep integration with Azure, SSRS/SSIS, columnstore indexes, Always On availability groups and built-in features that enterprise shops already own. Differences to watch when migrating: identifier casing and quoting (Postgres folds to lowercase), `timestamp with time zone` handling, `SERIAL` or identity columns versus `IDENTITY`, T-SQL versus PL/pgSQL, and different isolation behavior (Postgres has no READ UNCOMMITTED). Example: a team moving to Postgres on Azure Flexible Server saves licence cost but must rewrite stored procedures and re-tune queries using `EXPLAIN ANALYZE`.

**Keywords:** `PostgreSQL, SQL Server, JSONB, MVCC, extensions, Npgsql, EXPLAIN ANALYZE, licensing`

**Follow-ups:**

-   How does vacuum work?
-   How would you migrate with minimal downtime?
-   When would you pick JSONB instead of a document database?

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
