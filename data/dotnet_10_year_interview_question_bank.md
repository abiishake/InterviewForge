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
their value semantics and small size provide a real benefit.

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
executed in the application.

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

**Keywords:** `explain, async/await,, task, and, thread.`

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
request logging and timing.

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
instance.

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
CI/CD pipeline with monitoring and rollback.

**Keywords:**
`how, would, you, design, a, production-grade, asp.net, core`

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
offsets and generally provides more predictable performance.

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
downstream messaging is involved, an outbox pattern.

**Keywords:** `how, would, you, make, a, payment, post, endpoint`

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
always faster.

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
inspected.

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
workflows.

**Keywords:** `how, do, you, handle, optimistic, concurrency, in, ef`

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
before measuring.

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
preserves the possibility of efficient index access.

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
workload patterns.

**Keywords:**
`explain, clustered,, nonclustered, and, covering, indexes.`

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
determine the choice.

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
outbox record complete can produce a duplicate.

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
resources rather than simply adding unlimited retries.

**Keywords:** `deadlock, versus, blocking`

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
explicit invalidation policies help control staleness.

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
is unavailable.

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
very deliberate design.

**Keywords:** `when, should, you, not, use, redis`

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
monolith can be the better starting point.

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
non-idempotent operation can duplicate business effects.

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
should be used where business rules genuinely require it.

**Keywords:** `what, is, eventual, consistency`

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
memorizing vendor terminology.

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
provides perfect exactly-once execution.

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

**Keywords:** `how, should, retries, and, dead-letter, queues, work`

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
programming model.

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
atomic.

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
and domain requirements.

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
for good database modeling and query design.

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
cross-instance message delivery must be designed explicitly.

**Keywords:** `signalr, versus, raw, websockets`

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
blindly.

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
concurrency semantics, not simply performance.

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
coordination problem.

**Keywords:** `when, do, you, need, ngrx, or, redux-style, state`

**Follow-ups:**

-   Ask for a real production example.
-   Ask for trade-offs and failure modes.
-   Ask how the candidate would test and monitor the solution.

------------------------------------------------------------------------

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
workload requirements.

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
supports least-privilege service-to-service authentication.

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

**Keywords:**
`design, a, secure, azure, architecture, for, a, .net, api.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
exact replacements.

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
complexity.

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
observable and resilient to dependency failures.

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
.dockerignore, health checks and externalized configuration.

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
container in a durable storage system.

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
and assume the findings apply.

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
Deployment -\> Pods.

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
full application restart storm.

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

**Keywords:** `how, would, you, deploy, a, .net, api, safely, to, aks`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
environments are affordable.

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
should be reviewed and promoted through controlled pipelines.

**Keywords:** `what, is, infrastructure, as, code`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
and authorization policies evaluate roles, claims or scopes.

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
without an end user.

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
can represent a longer-lived ability to obtain access tokens.

**Keywords:** `access, token, versus, refresh, token, versus, id, token`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
prevent or limit it.

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
concatenate untrusted input.

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
external destinations are a business requirement.

**Keywords:** `what, is, ssrf`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
services.

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
Fix the measured bottleneck.

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
quantitative way to balance feature delivery and reliability.

**Keywords:** `what, are, sli,, slo,, sla, and, error, budget`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
exact balance determined by the system.

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
behavior that mocks cannot prove.

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
artificial unit-test count.

**Keywords:** `what, makes, a, good, unit, test`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
create an interface for every class.

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
than forcing a named pattern.

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
projects or pass-through abstractions.

**Keywords:** `explain, clean, architecture.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
workloads or business complexity justify separate models.

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
explicitly.

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
warrants it rather than for simple CRUD applications.

**Keywords:** `what, is, a, bounded, context`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
the same strategy to every component.

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
not simply a permanent 'pick any two' rule.

**Keywords:** `explain, cap, theorem, correctly.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
change; an optimization without measurement is speculation.

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
asynchronous I/O where supported.

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
can also help.

**Keywords:** `how, do, you, optimize, a, cpu-heavy, api`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
need bounded attempts, backoff and appropriate timeouts.

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
failure.

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
appropriate.

**Keywords:**
`how, would, you, implement, distributed, api, rate, limiting`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
trigger model and operational requirements.

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
as forcibly terminating a thread.

**Keywords:** `explain, cancellationtoken, propagation.`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
modern models.

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
observability and deployment.

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
old the code is.

**Keywords:** `rehost,, replatform,, refactor,, rewrite, or, retire`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
repeatedly processing the entire dataset.

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
documents require strict authorization and auditing.

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
correctness, maintainability and production behavior.

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
documents the user cannot access.

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
controls than a read-only assistant.

**Keywords:** `what, is, mcp`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
capacity and application concurrency first.

**Keywords:** `what, causes, database, connection, exhaustion`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
argument.

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
business, not selecting the most fashionable technology.

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
multiple data-access approaches increase complexity.

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
replay, throughput, retention and operational model.

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
are justified.

**Keywords:**
`monolith, versus, modular, monolith, versus, microservices`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
monitoring to prevent recurrence.

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
Otherwise scaling consumers can amplify the bottleneck.

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
be correlated with traces.

**Keywords:**
`kubernetes, pods, are, healthy, but, users, receive, 503., what, could`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.

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
testing and configurability.

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
ToList.

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
deadlocks by selecting a victim.

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
processing.

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
transformations, caching and observability.

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
traces, metrics and logs.

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
flow.

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
based on configured metrics.

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
continued load.

**Keywords:** `what, is, a, circuit, breaker`

**Follow-ups:**

-   Ask for a production example.
-   Ask about trade-offs and failure modes.
-   Ask how the solution would be tested and monitored.
