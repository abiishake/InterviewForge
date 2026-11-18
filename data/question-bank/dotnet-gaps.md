# TOPIC --- Language Fundamentals: C# Depth, VB.NET, Python and PowerShell
**topic_id:** `lang-essentials`
**priority:** `Core`

## lang-essentials-001 --- What is reflection in .NET, what is it used for and what does it cost?

**question_id:** `lang-essentials-001`\
**topic_id:** `lang-essentials`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What is reflection in .NET, what is it used for and what does it cost?

**Answer**

**Reflection** inspects and uses type metadata at run time: `typeof(T).GetProperties()`, `Activator.CreateInstance`, `MethodInfo.Invoke`, reading custom attributes. It powers dependency injection, serializers, ORMs, test frameworks and plugin loading. Costs: slower than direct calls (mitigate by caching `PropertyInfo`/delegates, compiled expressions or `Delegate.CreateDelegate`), no compile-time safety, and trimming/AOT problems because the linker cannot see dynamic usage. In modern .NET prefer **source generators** (System.Text.Json source gen, `LoggerMessage`, regex) for startup speed and AOT compatibility.

Real-world example: caching a reflection lookup and replacing it with a compiled delegate.

```csharp
static readonly ConcurrentDictionary<Type, PropertyInfo[]> Cache = new();
static PropertyInfo[] Props(Type t) => Cache.GetOrAdd(t, x => x.GetProperties(BindingFlags.Public | BindingFlags.Instance));

// Faster than PropertyInfo.GetValue in a hot loop: build a delegate once
var prop = typeof(Order).GetProperty(nameof(Order.Total))!;
var getter = (Func<Order, decimal>)Delegate.CreateDelegate(typeof(Func<Order, decimal>), prop.GetGetMethod()!);
decimal total = getter(order);
```

**Keywords:** `reflection, Type, attributes, Activator, source generators, AOT, trimming`

**Follow-ups:**

-   How do you speed up repeated reflection calls?
-   Why does reflection break trimming?
-   What replaces reflection in System.Text.Json?

## lang-essentials-002 --- Where do Python and PowerShell fit in a .NET developer's toolbox, and when is VB.NET knowledge still needed?

**question_id:** `lang-essentials-002`\
**topic_id:** `lang-essentials`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

Where do Python and PowerShell fit in a .NET developer's toolbox, and when is VB.NET knowledge still needed?

**Answer**

**PowerShell** is object-pipeline automation for Windows, Azure (`Az` module) and CI scripts: deployments, IIS/app-pool configuration, bulk admin tasks; it works with .NET objects directly and can load assemblies. **Python** is the go-to for quick data scripts, glue, tooling and AI/ML work (calling LLM APIs, notebooks, data cleanup). **VB.NET** is mostly maintenance knowledge: many enterprise Web Forms/WCF systems are VB, so read it fluently, know the syntax differences (`Dim`, `Handles`, `ByRef`, `Option Strict`) and migrate gradually to C# (shared assemblies, strangler approach). Use the right tool: .NET for products, PowerShell/Python for automation.

Real-world example: a PowerShell snippet that recycles an IIS app pool and lists Azure resources.

```powershell
Import-Module WebAdministration
Restart-WebAppPool -Name "ShopApi"
Get-Website | Where-Object State -eq 'Stopped' | Start-Website

Connect-AzAccount -Identity
Get-AzResource -ResourceGroupName rg-shop-prod | Select-Object Name, ResourceType, Location
```

**Keywords:** `PowerShell, Python, VB.NET, automation, Az module, legacy, scripting`

**Follow-ups:**

-   How would you automate an app-pool recycle?
-   How do you call Python from a .NET service?
-   How do you migrate VB.NET to C# safely?

# TOPIC --- Architecture Patterns: Hexagonal, Modular Monolith, Gateway and Outbox
**topic_id:** `dotnet-architecture`
**priority:** `Core`

## dotnet-architecture-001 --- What is Hexagonal (Ports and Adapters) architecture and how does it differ from Clean Architecture?

**question_id:** `dotnet-architecture-001`\
**topic_id:** `dotnet-architecture`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What is Hexagonal (Ports and Adapters) architecture and how does it differ from Clean Architecture?

**Answer**

Hexagonal architecture puts the **domain/application core** in the centre with **ports** (interfaces the core defines, inbound for use cases and outbound for persistence, messaging, clock) and **adapters** (controllers, EF repositories, message publishers) that implement or call them; dependencies point inward. **Clean Architecture** is the same idea with named concentric layers (Entities, Use Cases, Interface Adapters, Frameworks) and the dependency rule. They are close cousins: Hexagonal stresses symmetry of inbound/outbound ports, Clean stresses layering. Benefit: the core is testable without infrastructure and technology can be replaced. Cost: more interfaces and mapping, so avoid it for trivial CRUD.

Real-world example: ports and adapters in C#: the core defines the port, infrastructure adapts it.

```csharp
// Core (no framework references)
public interface IOrderRepository { Task<Order?> FindAsync(OrderId id, CancellationToken ct); Task SaveAsync(Order order, CancellationToken ct); }
public sealed class PlaceOrderHandler(IOrderRepository orders, IClock clock)
{
    public async Task HandleAsync(PlaceOrder cmd, CancellationToken ct) { var o = Order.Place(cmd, clock.Now); await orders.SaveAsync(o, ct); }
}
// Adapter (Infrastructure)
public sealed class EfOrderRepository(ShopDb db) : IOrderRepository { /* EF Core implementation */ }
```

**Keywords:** `hexagonal, ports and adapters, clean architecture, dependency rule, domain, testability`

**Follow-ups:**

-   Where do DTOs and mapping live?
-   How does it affect testing?
-   When is it overkill?

## dotnet-architecture-002 --- When is a modular monolith better than microservices, and how do you keep module boundaries honest?

**question_id:** `dotnet-architecture-002`\
**topic_id:** `dotnet-architecture`\
**difficulty:** `Senior / Lead`\
**question_type:** `Scenario`

**Question**

When is a modular monolith better than microservices, and how do you keep module boundaries honest?

**Answer**

A **modular monolith** is one deployable with strongly separated modules (each owning its data, exposing a narrow public API or events). It gives most of the design benefits of microservices without distributed-systems costs (network failures, data consistency, deployment orchestration), ideal for small teams or domains still being discovered, and it can be split later along proven boundaries. Keep boundaries honest with separate projects per module, internal visibility, architecture tests (`NetArchTest`, ArchUnitNET) that forbid cross-module references, one schema per module with no cross-module joins, and integration through contracts or in-process events.

Real-world example: an architecture test that stops one module referencing another's internals.

```csharp
[Fact]
public void Billing_must_not_depend_on_Shipping_internals()
{
    var result = Types.InAssembly(typeof(BillingModule).Assembly)
        .That().ResideInNamespace("Shop.Billing")
        .ShouldNot().HaveDependencyOn("Shop.Shipping.Internal")
        .GetResult();
    Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
}
```

**Keywords:** `modular monolith, bounded context, module boundaries, architecture tests, NetArchTest, microservices`

**Follow-ups:**

-   How do you split a module into a service later?
-   How do modules share data?
-   What do architecture tests check?

## dotnet-architecture-003 --- What are the API Gateway, Outbox and idempotent consumer patterns, and why do they appear together in microservices?

**question_id:** `dotnet-architecture-003`\
**topic_id:** `dotnet-architecture`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What are the API Gateway, Outbox and idempotent consumer patterns, and why do they appear together in microservices?

**Answer**

An **API Gateway** is the single entry for clients: routing, authentication, rate limiting, aggregation (YARP, Ocelot, APIM). The **Outbox** pattern solves the dual-write problem: the service writes business data and an outbox row in the *same transaction*, and a relay publishes outbox rows to the broker, guaranteeing at-least-once publication. Because delivery is at-least-once, consumers must be **idempotent**: record processed message ids (inbox table or unique constraint) or make operations naturally repeatable, so duplicates have no extra effect. Together they give reliable, eventually consistent flows across services without distributed transactions.

Real-world example: an outbox write in the same transaction and an idempotent consumer with a unique constraint.

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
db.Orders.Add(order);
db.Outbox.Add(new OutboxMessage(Guid.NewGuid(), nameof(OrderPlaced), JsonSerializer.Serialize(new OrderPlaced(order.Id))));
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);                                   // a relay publishes pending outbox rows afterwards

// Consumer: ProcessedMessages has a unique index on MessageId, so a duplicate delivery fails fast and is skipped
try { db.ProcessedMessages.Add(new(msg.MessageId)); await db.SaveChangesAsync(ct); await HandleAsync(msg); }
catch (DbUpdateException) { /* already processed */ }
```

**Keywords:** `API Gateway, outbox, inbox, idempotent consumer, dual write, at-least-once, YARP`

**Follow-ups:**

-   How do you relay outbox rows without duplicates?
-   Where do you store processed message ids?
-   Gateway versus BFF?

# TOPIC --- Legacy .NET Expertise: Web Forms, MVC, ADO.NET, WCF and Stored Procedures
**topic_id:** `legacy-expertise`
**priority:** `Strong`

## legacy-expertise-001 --- How do you explain ASP.NET Web Forms' page lifecycle and ViewState, and how do you modernise such an app incrementally?

**question_id:** `legacy-expertise-001`\
**topic_id:** `legacy-expertise`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you explain ASP.NET Web Forms' page lifecycle and ViewState, and how do you modernise such an app incrementally?

**Answer**

Web Forms is event-driven and stateful on top of stateless HTTP: each request runs the page lifecycle (Init, Load, control events, PreRender, Render), and **ViewState**/control state round-trips in a hidden field to rebuild controls, which can bloat pages and slow responses. Modernise by the **strangler fig** pattern: put a proxy (YARP/IIS rewrite) in front, move pages or features one by one to ASP.NET Core MVC/Razor or an SPA calling new APIs, extract business logic from code-behind into class libraries targeting .NET Standard so both stacks share it, share authentication (cookie/token bridge), and retire pieces when traffic has moved. Avoid a big-bang rewrite.

Real-world example: a strangler route: YARP forwards migrated paths to ASP.NET Core and everything else to the old Web Forms site.

```json
{
  "ReverseProxy": {
    "Routes": {
      "new-orders": { "ClusterId": "core", "Match": { "Path": "/orders/{**rest}" }, "Order": 1 },
      "legacy":     { "ClusterId": "webforms", "Match": { "Path": "{**catch-all}" }, "Order": 100 }
    },
    "Clusters": {
      "core":     { "Destinations": { "d1": { "Address": "https://orders.internal/" } } },
      "webforms": { "Destinations": { "d1": { "Address": "http://legacy-iis01/" } } }
    }
  }
}
```

**Keywords:** `Web Forms, ViewState, page lifecycle, strangler fig, YARP, code-behind, modernisation`

**Follow-ups:**

-   How do you reduce ViewState size?
-   How do you share auth between old and new apps?
-   What can you not port directly?

## legacy-expertise-002 --- What are ADO.NET and WCF, and how do you wrap and replace them safely?

**question_id:** `legacy-expertise-002`\
**topic_id:** `legacy-expertise`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are ADO.NET and WCF, and how do you wrap and replace them safely?

**Answer**

**ADO.NET** is the low-level data API: `SqlConnection`, `SqlCommand`, `SqlDataReader`, `DataSet`. Use parameterised commands (never string concatenation), `using` blocks, and transactions. Stored procedures are called by command type and keep SQL logic on the server. **WCF** is the SOAP/WS-* service framework with bindings, contracts (`[ServiceContract]`) and endpoints. To modernise, wrap data access behind repository interfaces so Dapper/EF Core can replace it gradually, keep stored procedures until logic is migrated, and move WCF to **CoreWCF** (compatible server) or REST/gRPC with an adapter for existing SOAP clients. Add characterisation tests before changing behaviour.

Real-world example: a parameterised ADO.NET call to a stored procedure behind a repository interface.

```csharp
public async Task<Customer?> GetAsync(int id, CancellationToken ct)
{
    await using var conn = new SqlConnection(_cs);
    await using var cmd = new SqlCommand("dbo.GetCustomer", conn) { CommandType = CommandType.StoredProcedure };
    cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;                    // never concatenate SQL
    await conn.OpenAsync(ct);
    await using var r = await cmd.ExecuteReaderAsync(ct);
    return await r.ReadAsync(ct) ? new Customer(r.GetInt32(0), r.GetString(1)) : null;
}
```

**Keywords:** `ADO.NET, SqlCommand, stored procedures, WCF, CoreWCF, repository, characterization tests`

**Follow-ups:**

-   How do you prevent SQL injection in ADO.NET?
-   What is CoreWCF?
-   How do you test legacy code safely?

# TOPIC --- Advanced SQL: CTEs, Window Functions and Backup/Restore
**topic_id:** `sql-advanced`
**priority:** `Core`

## sql-advanced-001 --- What are CTEs and recursive CTEs in SQL Server, and when do you use them over temp tables or subqueries?

**question_id:** `sql-advanced-001`\
**topic_id:** `sql-advanced`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are CTEs and recursive CTEs in SQL Server, and when do you use them over temp tables or subqueries?

**Answer**

A **Common Table Expression** (`WITH name AS (...)`) is a named, query-scoped result set that makes complex queries readable and can be referenced several times, but it is *not materialised* by default: it is expanded inline like a view, so it does not cache results. **Recursive CTEs** union an anchor query with a recursive member to walk hierarchies (org charts, bill of materials) and need `OPTION (MAXRECURSION n)` for deep trees.
```sql
WITH Tree AS (
    SELECT Id, ParentId, Name, 0 AS Depth FROM Category WHERE ParentId IS NULL
    UNION ALL
    SELECT c.Id, c.ParentId, c.Name, t.Depth + 1
    FROM Category c JOIN Tree t ON c.ParentId = t.Id
)
SELECT * FROM Tree ORDER BY Depth;
```
Use temp tables when you need to reuse a large intermediate result with indexes or statistics.

**Keywords:** `CTE, recursive CTE, WITH, hierarchy, MAXRECURSION, temp table, window functions`

**Follow-ups:**

-   CTE versus temp table performance?
-   How do you stop infinite recursion?
-   How do window functions replace some CTEs?

## sql-advanced-002 --- How do SQL Server full, differential and log backups work, and how do you design a restore strategy?

**question_id:** `sql-advanced-002`\
**topic_id:** `sql-advanced`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do SQL Server full, differential and log backups work, and how do you design a restore strategy?

**Answer**

A **full** backup copies the database; a **differential** captures changes since the last full; a **transaction log** backup captures log records since the previous log backup and, under the *FULL recovery model*, enables **point-in-time restore**. A common schedule: weekly full, daily differential, log every 5-15 minutes, which sets the RPO. Restore sequence: full `WITH NORECOVERY`, latest differential `WITH NORECOVERY`, each log in order, with `STOPAT` for the target time, then `RECOVERY`. Store backups off-server (encrypted, tested), monitor the log chain, and **practice restores**, because an untested backup is not a backup. Simple recovery model has no log backups and no point-in-time restore.

Real-world example: a full, differential and log backup chain and a point-in-time restore.

```sql
BACKUP DATABASE Shop TO DISK = 'D:\bak\shop_full.bak' WITH CHECKSUM, COMPRESSION;
BACKUP DATABASE Shop TO DISK = 'D:\bak\shop_diff.bak' WITH DIFFERENTIAL, CHECKSUM;
BACKUP LOG Shop TO DISK = 'D:\bak\shop_log1.trn' WITH CHECKSUM;

RESTORE DATABASE ShopRestore FROM DISK = 'D:\bak\shop_full.bak' WITH NORECOVERY, MOVE 'Shop' TO 'D:\data\shoprestore.mdf', MOVE 'Shop_log' TO 'D:\data\shoprestore.ldf';
RESTORE DATABASE ShopRestore FROM DISK = 'D:\bak\shop_diff.bak' WITH NORECOVERY;
RESTORE LOG ShopRestore FROM DISK = 'D:\bak\shop_log1.trn' WITH STOPAT = '2026-11-10T08:15:00', RECOVERY;
```

**Keywords:** `backup, restore, full, differential, transaction log, recovery model, RPO, STOPAT`

**Follow-ups:**

-   What breaks the log chain?
-   How do you restore to a point in time?
-   What does RTO depend on?

# TOPIC --- Identity Federation: SAML, WS-Federation and SSO
**topic_id:** `identity-federation`
**priority:** `Core`

## identity-federation-001 --- What is SAML, how does it differ from OIDC, and how does SAML SSO flow work?

**question_id:** `identity-federation-001`\
**topic_id:** `identity-federation`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What is SAML, how does it differ from OIDC, and how does SAML SSO flow work?

**Answer**

**SAML 2.0** is an XML-based federation standard mainly for enterprise web SSO. An **Identity Provider (IdP)** authenticates the user and issues a signed **assertion** with identity and attributes to the **Service Provider (SP)**. In the common SP-initiated flow the app redirects the browser with an `AuthnRequest` to the IdP, the user signs in, and the IdP posts a signed `SAMLResponse` to the SP's Assertion Consumer Service, which validates signature, issuer, audience, time conditions and `InResponseTo`. **OIDC** is JSON/JWT-based on OAuth2, lighter, mobile/SPA-friendly and the modern default; SAML remains common for legacy and enterprise SaaS. In .NET use libraries such as Sustainsys.Saml2 or let Entra ID/Duende broker SAML.

Real-world example: configuring SAML 2.0 SSO in ASP.NET Core with Sustainsys.Saml2.

```csharp
builder.Services.AddAuthentication(o => { o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme; o.DefaultChallengeScheme = Saml2Defaults.Scheme; })
    .AddCookie()
    .AddSaml2(o =>
    {
        o.SPOptions.EntityId = new EntityId("https://shop.example.com/saml");
        o.SPOptions.ReturnUrl = new Uri("https://shop.example.com/");
        o.IdentityProviders.Add(new IdentityProvider(new EntityId("https://idp.contoso.com"), o.SPOptions)
        {
            MetadataLocation = "https://idp.contoso.com/metadata", LoadMetadata = true   // gets the signing certificate
        });
    });
```

**Keywords:** `SAML, IdP, SP, assertion, SSO, OIDC, signature validation, federation`

**Follow-ups:**

-   What must the SP validate in an assertion?
-   How does single logout work?
-   When would you bridge SAML to OIDC?

# TOPIC --- DevSecOps: Security in the Delivery Pipeline
**topic_id:** `devsecops`
**priority:** `Strong`

## devsecops-001 --- What is DevSecOps and which security checks belong in a CI/CD pipeline?

**question_id:** `devsecops-001`\
**topic_id:** `devsecops`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What is DevSecOps and which security checks belong in a CI/CD pipeline?

**Answer**

**DevSecOps** shifts security left and automates it across delivery instead of a late manual gate. Typical pipeline stages: pre-commit **secret scanning**, **SAST** (CodeQL, SonarQube) on pull requests, **SCA/dependency scanning** (Dependabot, `dotnet list package --vulnerable`) with SBOM generation, **IaC scanning** (Checkov, tfsec), **container image scanning** (Trivy, Defender) and signing, **DAST** against a test environment (OWASP ZAP), plus policy gates (fail on critical issues) and runtime monitoring. Add least-privilege pipeline identities, protected branches and reviews, and track findings with owners and SLAs. Balance speed with signal: tune rules to avoid alert fatigue.

Real-world example: a GitHub Actions workflow with SAST, dependency and container scanning gates.

```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    permissions: { contents: read, security-events: write }
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: csharp }
      - run: dotnet build -c Release
      - uses: github/codeql-action/analyze@v3
      - run: dotnet list package --vulnerable --include-transitive | tee vuln.txt && ! grep -q "Critical\|High" vuln.txt
      - uses: aquasecurity/trivy-action@0.28.0
        with: { image-ref: shop-api:${{ github.sha }}, severity: 'CRITICAL,HIGH', exit-code: '1' }
```

**Keywords:** `DevSecOps, SAST, DAST, SCA, SBOM, secret scanning, container scanning, shift left`

**Follow-ups:**

-   SAST versus DAST?
-   How do you handle false positives?
-   How do you secure the pipeline itself?

# TOPIC --- AI Engineering: Embeddings, Vector Search and AI Coding Agents
**topic_id:** `ai-embeddings`
**priority:** `Strong`

## ai-embeddings-001 --- What are embeddings and vector search, and how do they power RAG?

**question_id:** `ai-embeddings-001`\
**topic_id:** `ai-embeddings`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What are embeddings and vector search, and how do they power RAG?

**Answer**

An **embedding** is a numeric vector produced by a model so that semantically similar text lands close together in vector space. **Vector search** finds nearest neighbours (cosine similarity, approximate indexes such as HNSW) in a store like Azure AI Search, pgvector, Redis or Cosmos DB. In **RAG**, you chunk documents (with overlap), embed and index them with metadata, embed the user question, retrieve the top-k chunks (often hybrid keyword + vector, then rerank) and place them in the prompt so the model answers from sources with citations. Quality levers: chunk size, metadata filters, reranking, evaluation sets, and re-embedding when the model changes. Never trust retrieved text as instructions (prompt injection) and enforce per-user access filters at retrieval time.

Real-world example: embedding documents and running a vector search with Microsoft.Extensions.AI and an in-memory cosine ranking.

```csharp
IEmbeddingGenerator<string, Embedding<float>> gen = new AzureOpenAIClient(endpoint, new DefaultAzureCredential())
    .GetEmbeddingClient("text-embedding-3-small").AsIEmbeddingGenerator();

var docs = await gen.GenerateAsync(chunks);                                    // index these in Azure AI Search / pgvector
var query = (await gen.GenerateAsync(["How do I rotate a certificate?"]))[0];
var top = chunks.Zip(docs).OrderByDescending(p => TensorPrimitives.CosineSimilarity(query.Vector.Span, p.Second.Vector.Span)).Take(4);
```

**Keywords:** `embeddings, vector search, RAG, chunking, HNSW, hybrid search, reranking, cosine similarity`

**Follow-ups:**

-   How do you pick chunk size?
-   Why use hybrid search?
-   How do you evaluate retrieval quality?

## ai-embeddings-002 --- How do AI coding agents and assistants (Copilot, Claude Code, Devin-style agents) fit into a professional workflow, and what are the risks?

**question_id:** `ai-embeddings-002`\
**topic_id:** `ai-embeddings`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do AI coding agents and assistants (Copilot, Claude Code, Devin-style agents) fit into a professional workflow, and what are the risks?

**Answer**

Assistants (Copilot, chat in the IDE) suggest or edit code under developer control; **agents** (Claude Code, Devin-style autonomous agents) plan multi-step tasks, run commands and tests and open pull requests. Use them for boilerplate, tests, refactors, migrations and exploration, with clear task descriptions, repository guidance files, small scoped changes and **human review of every diff** plus CI as the safety net. Risks: plausible but wrong code, security flaws, secret or data leakage, licence concerns, hidden over-engineering and eroding understanding. Mitigate with permission modes and sandboxes, no production credentials, least-privilege tokens, required code review, and measure outcomes (cycle time, defects), not lines generated.

Real-world example: a repository guidance file and guardrails that scope what an AI coding agent may do.

```markdown
# AGENTS.md (read by the agent before each task)
- Build: `dotnet build`; test: `dotnet test` - run both before proposing a change.
- Never edit `/migrations` applied to production or files under `/secrets`.
- Keep changes small; one concern per pull request; add tests for behaviour changes.
- Do not add dependencies without noting the licence and justification in the PR.
# Permissions: agent token = read repo + open PR only; no deploy or production credentials.
```

**Keywords:** `AI coding agents, Copilot, Claude Code, Devin, code review, sandbox, prompt, guardrails`

**Follow-ups:**

-   What tasks should you not delegate?
-   How do you review agent-written code?
-   How do you prevent secret leakage?
