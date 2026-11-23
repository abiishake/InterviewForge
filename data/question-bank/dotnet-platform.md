# TOPIC --- Types, Collections and Memory
**topic_id:** `dn-memory`
**priority:** `Core`

## dn-memory-001 --- How do you choose between List, Dictionary, HashSet, ImmutableArray, FrozenDictionary and the concurrent collections?

**question_id:** `dn-memory-001`\
**topic_id:** `dn-memory`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do you choose between List, Dictionary, HashSet, SortedDictionary, ImmutableArray, FrozenDictionary and the concurrent collections?

**Answer**

Start from the access pattern and thread-safety need. `List<T>`: ordered, index access O(1), append amortised O(1), search O(n). `Dictionary<K,V>`: key lookup O(1) average - the default for lookups. `HashSet<T>`: membership and set operations. `SortedDictionary`/`SortedSet`: ordered iteration and range queries, O(log n). `Queue<T>`/`Stack<T>`/`LinkedList<T>` for FIFO/LIFO/frequent middle inserts. **Immutable** collections (`ImmutableArray<T>`, `ImmutableDictionary`) give safe sharing and snapshots, at some allocation cost. **Frozen** collections (`FrozenDictionary`, `FrozenSet`, .NET 8+) are built once and optimised for the fastest reads - ideal for configuration/reference data loaded at startup. **Concurrent** collections (`ConcurrentDictionary`, `ConcurrentQueue`, `BlockingCollection`, `Channel<T>`) when several threads mutate; the plain collections are not thread-safe. Pre-size with capacity when the count is known, avoid `LINQ` in hot loops, and never expose mutable internals - return `IReadOnlyList<T>`.

Real-world example: build a lookup once at startup and read it lock-free for every request.

```csharp
public sealed class CountryLookup
{
    private readonly FrozenDictionary<string, Country> _byCode;

    public CountryLookup(IEnumerable<Country> countries) =>
        _byCode = countries.ToFrozenDictionary(c => c.IsoCode, StringComparer.OrdinalIgnoreCase);

    public Country? Find(string code) => _byCode.TryGetValue(code, out var c) ? c : null;
}

// ConcurrentDictionary: atomic get-or-add (factory may run more than once, so keep it side-effect free)
var cache = new ConcurrentDictionary<int, Lazy<Task<Product>>>();
var product = await cache.GetOrAdd(id, i => new Lazy<Task<Product>>(() => repo.LoadAsync(i))).Value;
```

**Keywords:** `List, Dictionary, HashSet, FrozenDictionary, ImmutableArray, ConcurrentDictionary, collections, Big-O`

**Follow-ups:**

-   Why can the ConcurrentDictionary factory run twice and how do you guard against it?
-   When is an immutable collection better than a frozen one?
-   What is the cost of enumerating a Dictionary while another thread writes to it?

## dn-memory-002 --- What are Span<T>, Memory<T> and ArrayPool<T>, and when should you use them?

**question_id:** `dn-memory-002`\
**topic_id:** `dn-memory`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are Span<T>, Memory<T> and ArrayPool<T>, and when should you use them?

**Answer**

`Span<T>`/`ReadOnlySpan<T>` are `ref struct` views over contiguous memory (array, stack, native or a string slice) with no allocation, so slicing and parsing become zero-copy. Because they can live on the stack they cannot be fields of classes, boxed, captured by lambdas or used across `await`. `Memory<T>`/`ReadOnlyMemory<T>` are the heap-friendly equivalent that *can* be stored and used in async code; call `.Span` to get a span when you do the work. `ArrayPool<T>.Shared` rents reusable arrays to avoid large allocations (always `Return` in `finally`; rented arrays may be larger than requested and contain old data, so track the length and clear sensitive data). `stackalloc` with a span creates small temporary buffers on the stack. Use them for parsers, protocols, serialization and hot paths proven by a profiler - not everywhere; readability matters. Guidelines: prefer `ReadOnlySpan<char>` for string parsing (`int.Parse(span)`), own-vs-borrow semantics must be clear for `Memory<T>`.

Real-world example: parse "key=value;key2=value2" without allocating substrings.

```csharp
static Dictionary<string, string> ParsePairs(ReadOnlySpan<char> input)
{
    var result = new Dictionary<string, string>();
    foreach (var range in input.Split(';'))
    {
        var pair = input[range];
        int eq = pair.IndexOf('=');
        if (eq <= 0) continue;
        result[pair[..eq].Trim().ToString()] = pair[(eq + 1)..].Trim().ToString();
    }
    return result;
}

// rent a buffer for streaming work
byte[] buffer = ArrayPool<byte>.Shared.Rent(81_920);
try { int n = await stream.ReadAsync(buffer.AsMemory(0, 81_920), ct); Process(buffer.AsSpan(0, n)); }
finally { ArrayPool<byte>.Shared.Return(buffer, clearArray: true); }
```

**Keywords:** `Span, Memory, ReadOnlySpan, ArrayPool, stackalloc, ref struct, zero-copy, allocations`

**Follow-ups:**

-   Why can't a Span<T> be used across an await?
-   What goes wrong if you forget to return a rented array, or return it twice?
-   How would you prove that using spans actually helped?

## dn-memory-003 --- What is the difference between structs and classes, and when do record structs, readonly structs and ref structs apply?

**question_id:** `dn-memory-003`\
**topic_id:** `dn-memory`\
**difficulty:** `Senior`\
**question_type:** `Conceptual`

**Question**

What is the difference between structs and classes, and when do record structs, readonly structs and ref structs apply?

**Answer**

Classes are reference types (heap-allocated, reference equality by default, nullable, inheritance). Structs are value types: copied on assignment, stored inline (stack/array/field), no inheritance, default value is all-zeros, and **boxing** happens when treated as an interface/object. Prefer a struct only for small (about 16 bytes), immutable, short-lived values with value semantics (coordinates, money, ids). Make it `readonly struct` to guarantee immutability and avoid defensive copies; use `in` parameters carefully for larger readonly structs. `record struct` adds value equality, `with` expressions and `ToString`; `record class` gives the same for reference types (DTOs, domain value objects). A `ref struct` (Span<T>) is stack-only. Pitfalls: mutable structs in collections (modifying a copy), default(T) validity, large structs copied repeatedly, and equality on structs without `IEquatable<T>` (slow, boxing).

Real-world example: a value-object `Money` as a readonly record struct with validation.

```csharp
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0m, currency);

    public Money Add(Money other) =>
        Currency == other.Currency
            ? this with { Amount = Amount + other.Amount }
            : throw new InvalidOperationException("Currency mismatch.");

    public override string ToString() => $"{Amount:N2} {Currency}";
}

var total = new Money(10m, "EUR").Add(new Money(5.5m, "EUR"));   // 15.50 EUR
```

**Keywords:** `struct, class, readonly struct, record struct, ref struct, boxing, value semantics, IEquatable`

**Follow-ups:**

-   Why does boxing hurt performance and where does it hide?
-   Why is default(Money) a problem for a value object?
-   Record class or record struct for a DTO?

# TOPIC --- Text, Serialization and Time
**topic_id:** `dn-text`
**priority:** `Core`

## dn-text-001 --- How does System.Text.Json differ from Newtonsoft.Json, and how do you customize it?

**question_id:** `dn-text-001`\
**topic_id:** `dn-text`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How does System.Text.Json differ from Newtonsoft.Json, and how do you customize serialization?

**Answer**

`System.Text.Json` (STJ) is the built-in, UTF-8-native, allocation-light serializer with source generation and Native AOT/trimming support; `Newtonsoft.Json` is older and more permissive (more types, implicit conversions, `JObject` model, flexible converters). STJ is **strict by default**: case-sensitive property names, no comments/trailing commas, fields ignored unless enabled, no automatic string-to-number coercion. Customise with `JsonSerializerOptions` (reuse and cache one instance - creating options per call is slow), attributes (`[JsonPropertyName]`, `[JsonIgnore]`, `[JsonRequired]`, `[JsonPolymorphic]`/`[JsonDerivedType]`), **custom converters** (`JsonConverter<T>`), naming policy (`JsonNamingPolicy.CamelCase`), `JsonNode`/`JsonDocument` for dynamic JSON, and `Utf8JsonReader/Writer` for streaming. .NET 8+ added polymorphism, `[JsonRequired]`, and respecting nullable annotations; .NET 9/10 added more (strict options, `JsonSerializerOptions.Strict`, schema export). Migrate by testing contracts, not assuming identical behaviour.

Real-world example: configure web defaults, a custom converter and polymorphism.

```csharp
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(CardPayment), "card")]
[JsonDerivedType(typeof(BankTransfer), "bank")]
public abstract record Payment(decimal Amount);
public sealed record CardPayment(decimal Amount, string Last4) : Payment(Amount);
public sealed record BankTransfer(decimal Amount, string Iban) : Payment(Amount);

public sealed class DateOnlyConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader r, Type t, JsonSerializerOptions o) => DateOnly.ParseExact(r.GetString()!, "yyyy-MM-dd");
    public override void Write(Utf8JsonWriter w, DateOnly v, JsonSerializerOptions o) => w.WriteStringValue(v.ToString("yyyy-MM-dd"));
}

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.Converters.Add(new DateOnlyConverter());
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
```

**Keywords:** `System.Text.Json, Newtonsoft.Json, JsonSerializerOptions, JsonConverter, JsonPolymorphic, JsonNode, naming policy, migration`

**Follow-ups:**

-   Why should JsonSerializerOptions be a singleton?
-   What breaks when migrating from Newtonsoft.Json?
-   How do you serialize an object graph with cycles?

## dn-text-002 --- What is System.Text.Json source generation and why does it matter for performance and Native AOT?

**question_id:** `dn-text-002`\
**topic_id:** `dn-text`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

What is System.Text.Json source generation and why does it matter for startup, performance and Native AOT?

**Answer**

By default STJ uses **reflection** to discover a type's members at first use, which costs startup time and memory and is unsafe for trimming and Native AOT (the linker cannot see what will be reflected over). With **source generation**, a Roslyn generator emits the metadata and serialization code at compile time into a `JsonSerializerContext`: faster first call, lower memory, no runtime reflection, trim- and AOT-friendly. You declare a partial context with `[JsonSerializable(typeof(T))]` for each root type (and options with `[JsonSourceGenerationOptions]`), then pass `Context.T` (`JsonTypeInfo<T>`) to `Serialize/Deserialize`, or add the context to ASP.NET Core's `TypeInfoResolverChain`. Limits: every type reachable must be known at compile time, polymorphic/dynamic scenarios need explicit declaration, and some features need `JsonSerializerOptions` compatibility. The same idea powers Regex, logging and configuration source generators.

Real-world example: a source-generated context used by a minimal API (AOT friendly).

```csharp
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(Todo))]
[JsonSerializable(typeof(List<Todo>))]
internal partial class AppJsonContext : JsonSerializerContext;

public sealed record Todo(int Id, string Title, bool Done);

var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

var app = builder.Build();
app.MapGet("/todos", () => new List<Todo> { new(1, "Write tests", false) });
app.Run();

string json = JsonSerializer.Serialize(new Todo(1, "x", true), AppJsonContext.Default.Todo);
```

**Keywords:** `source generation, JsonSerializerContext, JsonSerializable, Native AOT, trimming, reflection, startup time`

**Follow-ups:**

-   Which other .NET features use compile-time source generation instead of reflection?
-   How do you serialize a type that is only known at runtime with a source-generated context?
-   What does the analyzer warn about when you use reflection-based serialization in an AOT app?

## dn-text-003 --- Which DateTime type should you use, and how do TimeProvider and time zones work?

**question_id:** `dn-text-003`\
**topic_id:** `dn-text`\
**difficulty:** `Senior`\
**question_type:** `Practical / Scenario`

**Question**

Which date and time type should you use (DateTime, DateTimeOffset, DateOnly, TimeOnly), and how do TimeProvider and time zones help?

**Answer**

`DateTime` carries a `Kind` (Utc/Local/Unspecified) but no offset, which causes ambiguity bugs. `DateTimeOffset` stores an instant with its UTC offset - the right choice for timestamps (audit, events, API payloads), stored as UTC. `DateOnly` and `TimeOnly` model calendar dates (birthdays, due dates) and times of day (opening hours) without fake midnight times. `TimeSpan` is a duration. `TimeZoneInfo` converts instants to a user's local zone using the OS (IANA/Windows) database - store UTC, convert at the edges, and handle **daylight-saving gaps and ambiguous times**. Scheduling "every day at 09:00 local" needs the zone, not an offset. **`TimeProvider`** (abstract, .NET 8+) replaces `DateTime.UtcNow` so time is injectable; `FakeTimeProvider` (Microsoft.Extensions.TimeProvider.Testing) lets tests advance time deterministically, including timers and `Task.Delay`/`PeriodicTimer`. Inject `TimeProvider`, call `GetUtcNow()`.

Real-world example: expiry logic that is testable without sleeping.

```csharp
public sealed class TokenService(TimeProvider time)
{
    public Token Issue(TimeSpan lifetime) => new(Guid.NewGuid(), time.GetUtcNow().Add(lifetime));
    public bool IsExpired(Token t) => time.GetUtcNow() >= t.ExpiresAt;
}
public sealed record Token(Guid Id, DateTimeOffset ExpiresAt);

builder.Services.AddSingleton(TimeProvider.System);

[Fact]
public void Token_expires_after_lifetime()
{
    var clock = new FakeTimeProvider(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));
    var sut = new TokenService(clock);
    var token = sut.Issue(TimeSpan.FromMinutes(30));
    clock.Advance(TimeSpan.FromMinutes(31));
    Assert.True(sut.IsExpired(token));
}
```

**Keywords:** `DateTimeOffset, DateOnly, TimeOnly, TimeZoneInfo, TimeProvider, FakeTimeProvider, UTC, daylight saving`

**Follow-ups:**

-   Why is DateTime.Now in business logic a testing and correctness problem?
-   How do you schedule a recurring local-time job across DST changes?
-   What does DateTimeOffset not tell you that a time zone does?

## dn-text-004 --- How do Regex backtracking and ReDoS work, and how do you write safe, fast regular expressions in .NET?

**question_id:** `dn-text-004`\
**topic_id:** `dn-text`\
**difficulty:** `Senior`\
**question_type:** `Practical / Security`

**Question**

How do regex backtracking and ReDoS work, and how do you write safe, fast regular expressions in .NET?

**Answer**

The default .NET regex engine is a **backtracking** engine: with nested quantifiers and overlapping alternatives (for example `(a+)+$`) a non-matching input can trigger exponential work, tying up a CPU - a **ReDoS** (regular expression denial of service) when the input is user-controlled. Defences: **always set a match timeout** (`new Regex(pattern, options, TimeSpan.FromMilliseconds(100))` or `[GeneratedRegex(..., matchTimeoutMilliseconds: 100)]`), avoid nested/ambiguous quantifiers, anchor patterns, limit input length before matching, prefer specific character classes over `.*`, and consider `RegexOptions.NonBacktracking` (linear-time guarantee, a few features unsupported). For speed use the **regex source generator** (`[GeneratedRegex]` on a `partial` method) which emits optimised code at compile time (AOT-friendly) instead of constructing and interpreting at runtime; static `Regex.IsMatch` calls cache patterns, but instances should be reused. Prefer `string` methods/`Span` APIs when a regex is overkill.

Real-world example: a source-generated, time-limited regex for validating an order code.

```csharp
public static partial class OrderCode
{
    [GeneratedRegex(@"^ORD-(?<year>\d{4})-(?<seq>\d{6})$", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex Pattern();

    public static bool TryParse(string? input, out int year, out int seq)
    {
        year = seq = 0;
        if (input is null || input.Length > 20) return false;     // bound the input first
        try
        {
            var m = Pattern().Match(input);
            if (!m.Success) return false;
            year = int.Parse(m.Groups["year"].ValueSpan);
            seq = int.Parse(m.Groups["seq"].ValueSpan);
            return true;
        }
        catch (RegexMatchTimeoutException) { return false; }
    }
}
```

**Keywords:** `Regex, backtracking, ReDoS, GeneratedRegex, NonBacktracking, match timeout, source generator`

**Follow-ups:**

-   What does RegexOptions.NonBacktracking trade away?
-   Why is a catastrophic pattern a security issue and not just a bug?
-   When is string.Split or Span parsing better than a regex?

# TOPIC --- Runtime, Assemblies and Deployment
**topic_id:** `dn-runtime`
**priority:** `Strong`

## dn-runtime-001 --- What happens from "dotnet run" to machine code: CLR, JIT, tiered compilation, PGO and ReadyToRun?

**question_id:** `dn-runtime-001`\
**topic_id:** `dn-runtime`\
**difficulty:** `Senior`\
**question_type:** `Conceptual`

**Question**

What happens from compiled C# to machine code: CLR, JIT, tiered compilation, dynamic PGO and ReadyToRun?

**Answer**

The C# compiler (Roslyn) emits **IL** plus metadata into an assembly. The **CLR** loads it, verifies and manages execution (type loading, garbage collection, exceptions, threading). The **JIT** compiles IL to native code per method on first call. **Tiered compilation** starts each method with quick, unoptimised **tier-0** code for fast startup; methods that run hot (30 calls, background timer) are re-JITted at **tier-1** with full optimisation. **Dynamic PGO** (default since .NET 8) instruments tier-0 code, then uses the collected data to optimise tier-1 (guarded devirtualisation, hot/cold layout, inlining). **ReadyToRun (R2R)** pre-compiles to native code in the assembly to cut startup time (code can still be rejitted at tier-1). **Native AOT** compiles everything ahead of time into a standalone native binary with no JIT (fastest startup, smallest footprint; no dynamic code loading, limited reflection). Implication: first requests are slow, benchmarks need warm-up, and publishing options trade startup versus peak throughput.

Real-world example: choosing publish settings for a short-lived CLI versus a long-running API.

```xml
<!-- CLI tool or serverless function: favour startup -->
<PropertyGroup>
  <PublishReadyToRun>true</PublishReadyToRun>
  <TieredPGO>true</TieredPGO>
  <InvariantGlobalization>true</InvariantGlobalization>
</PropertyGroup>

<!-- Long-running API: default tiering + PGO gives best steady-state throughput -->
<PropertyGroup>
  <TieredCompilation>true</TieredCompilation>
  <TieredPGO>true</TieredPGO>
  <ServerGarbageCollector>true</ServerGarbageCollector>
</PropertyGroup>
```

**Keywords:** `CLR, JIT, IL, tiered compilation, dynamic PGO, ReadyToRun, Native AOT, startup time, Roslyn`

**Follow-ups:**

-   Why do first requests after a deploy run slower?
-   What does ReadyToRun not give you compared with Native AOT?
-   How would you warm up an API before taking traffic?

## dn-runtime-002 --- How do assemblies, versioning, AssemblyLoadContext and dependency loading work?

**question_id:** `dn-runtime-002`\
**topic_id:** `dn-runtime`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do assemblies, versioning and AssemblyLoadContext work, and how would you build a plugin system?

**Answer**

An **assembly** is the unit of deployment: IL, metadata, a manifest (name, version, culture, references) and resources. .NET (Core) resolves dependencies through `*.deps.json` and the **`AssemblyLoadContext` (ALC)**: the default context loads the app's dependencies; you can create additional contexts to **isolate** plugins, so two plugins can load different versions of the same library, and collectible contexts can **unload** plugins (all references must be released). Strong names no longer provide security and are mostly for compatibility. Version policies: assembly version (binding), file version, informational/NuGet version (SemVer). Runtime roll-forward is controlled by `global.json` (SDK) and `runtimeconfig.json` (`rollForward`). A plugin host typically scans a folder, creates an ALC per plugin with `AssemblyDependencyResolver`, shares the contract assembly from the default context (so type identity matches) and instantiates implementations via an interface. Beware of type-identity mismatches, leaked static references blocking unload, and untrusted plugin code (no sandbox in .NET Core).

Real-world example: a collectible plugin load context that resolves the plugin's own dependencies.

```csharp
public sealed class PluginLoadContext(string pluginPath) : AssemblyLoadContext(isCollectible: true)
{
    private readonly AssemblyDependencyResolver _resolver = new(pluginPath);

    protected override Assembly? Load(AssemblyName name)
    {
        // The shared contract assembly must come from the default context.
        if (name.Name == "Shop.Plugins.Contracts") return null;
        var path = _resolver.ResolveAssemblyToPath(name);
        return path is null ? null : LoadFromAssemblyPath(path);
    }
}

var alc = new PluginLoadContext(pluginDllPath);
var asm = alc.LoadFromAssemblyPath(pluginDllPath);
var plugin = asm.GetTypes().Where(t => typeof(IPlugin).IsAssignableFrom(t) && !t.IsAbstract)
                .Select(t => (IPlugin)Activator.CreateInstance(t)!).First();
plugin.Run();
alc.Unload();   // succeeds once no references remain
```

**Keywords:** `assembly, AssemblyLoadContext, plugin, deps.json, versioning, roll-forward, collectible, type identity`

**Follow-ups:**

-   Why must the contract assembly be loaded from the default context?
-   What commonly prevents a collectible context from unloading?
-   What replaced AppDomains and .NET Remoting in .NET Core?

## dn-runtime-003 --- Compare framework-dependent, self-contained, single-file, trimmed and Native AOT deployment.

**question_id:** `dn-runtime-003`\
**topic_id:** `dn-runtime`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Practical`

**Question**

Compare framework-dependent, self-contained, single-file, trimmed and Native AOT deployment, and explain when to use each.

**Answer**

**Framework-dependent** (default): small output, needs the matching runtime installed - best for servers where the runtime is managed (containers use the runtime image) and for quick security patching of the runtime. **Self-contained**: bundles the runtime, so no install prerequisite and version control per app, but a larger package you must patch yourself. **Single-file**: packs the app (and optionally runtime) in one executable - convenient for tools. **Trimming** removes unused framework/library code to shrink size; reflection-heavy code needs annotations or source generators to survive. **ReadyToRun** improves startup. **Native AOT**: native executable without JIT - fastest startup, lowest memory, small containers; but no `Assembly.Load`/`Reflection.Emit`, limited reflection, and only AOT-compatible libraries (publish analyzers warn). Pick by constraints: Kubernetes/serverless cold-start-sensitive APIs -> Native AOT or R2R; ordinary enterprise API -> framework-dependent in a container; desktop/CLI distribution -> self-contained single-file.

Real-world example: publish commands for three deployment shapes.

```bash
# container API: framework-dependent
dotnet publish -c Release -o out --no-self-contained

# CLI tool shipped to users: self-contained, single-file, trimmed
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=true

# serverless / sidecar: Native AOT (needs <PublishAot>true</PublishAot> and AOT-safe code)
dotnet publish -c Release -r linux-x64 -p:PublishAot=true
```

**Keywords:** `self-contained, framework-dependent, single-file, trimming, ReadyToRun, Native AOT, publish, runtime identifier`

**Follow-ups:**

-   Why does trimming break reflection-based libraries and how do you fix it?
-   What changes in patching when you go self-contained?
-   Which ASP.NET Core features are not AOT-compatible?

# TOPIC --- Hosting, Configuration, Logging and Caching
**topic_id:** `dn-hosting`
**priority:** `Core`

## dn-hosting-001 --- How does the Generic Host work and how do you build worker services?

**question_id:** `dn-hosting-001`\
**topic_id:** `dn-hosting`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How does the .NET Generic Host work, and how do you build a reliable worker service with BackgroundService?

**Answer**

The **Generic Host** (`Host.CreateApplicationBuilder`) is the app shell that wires **dependency injection, configuration, logging**, options and the lifetime of **hosted services**. ASP.NET Core is a hosted service on top of it. A **worker service** runs long-lived background work: derive from `BackgroundService` and implement `ExecuteAsync(CancellationToken)` (or implement `IHostedService` for start/stop hooks). Rules: honour the stoppingToken (graceful shutdown within `HostOptions.ShutdownTimeout`), catch and log exceptions inside the loop (an unhandled exception stops the host by default - `BackgroundServiceExceptionBehavior`), use **scoped services via `IServiceScopeFactory`** (a hosted service is a singleton), use `PeriodicTimer` instead of `Task.Delay` loops for schedules, and apply backpressure with `Channel<T>`. The same host runs as a Windows Service (`AddWindowsService`), systemd daemon (`AddSystemd`), container or Azure worker.

Real-world example: a queue-draining worker using a scope per message and a periodic timer.

```csharp
public sealed class OutboxPublisher(IServiceScopeFactory scopes, ILogger<OutboxPublisher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var outbox = scope.ServiceProvider.GetRequiredService<IOutbox>();
                await outbox.PublishPendingAsync(batchSize: 100, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex) { log.LogError(ex, "Outbox publish failed; will retry on next tick."); }
        }
    }
}

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<OutboxPublisher>();
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(30));
await builder.Build().RunAsync();
```

**Keywords:** `Generic Host, BackgroundService, IHostedService, worker service, PeriodicTimer, graceful shutdown, scoped services`

**Follow-ups:**

-   Why can't a BackgroundService inject a scoped DbContext directly?
-   What happens to the host when ExecuteAsync throws?
-   How do you run the same worker as a Windows Service and in a container?

## dn-hosting-002 --- How do configuration providers and the options pattern (IOptions, IOptionsSnapshot, IOptionsMonitor) work, and how do you validate options?

**question_id:** `dn-hosting-002`\
**topic_id:** `dn-hosting`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do configuration providers and the options pattern (IOptions, IOptionsSnapshot, IOptionsMonitor) work, and how do you validate options at startup?

**Answer**

`IConfiguration` merges **providers** in order - later wins: `appsettings.json`, `appsettings.{Environment}.json`, user secrets (development), environment variables (`Section__Key`), command line, plus Azure App Configuration/Key Vault. Bind sections to strongly typed classes with the **options pattern**. Lifetimes: `IOptions<T>` is a singleton snapshot read once; `IOptionsSnapshot<T>` is scoped and recomputed per request (reloads between requests); `IOptionsMonitor<T>` is a singleton that always returns the current value and raises `OnChange` - the one for singletons/background services. **Validate** with data annotations or `IValidateOptions<T>` and call `ValidateOnStart()` so misconfiguration fails the deployment instead of the first request; .NET 8+ adds **source-generated validation** (`[OptionsValidator]`). Keep secrets out of files (Key Vault, user secrets), keep options small and per feature, and never inject `IConfiguration` everywhere.

Real-world example: validated options that fail fast at startup.

```csharp
public sealed class PaymentOptions
{
    public const string Section = "Payments";
    [Required, Url] public string BaseUrl { get; init; } = "";
    [Range(1, 120)] public int TimeoutSeconds { get; init; } = 30;
    [Required, MinLength(16)] public string ApiKey { get; init; } = "";
}

builder.Services.AddOptions<PaymentOptions>()
    .Bind(builder.Configuration.GetSection(PaymentOptions.Section))
    .ValidateDataAnnotations()
    .Validate(o => !o.BaseUrl.Contains("sandbox") || builder.Environment.IsDevelopment(), "Sandbox URL in production")
    .ValidateOnStart();

public sealed class PaymentClient(IOptionsMonitor<PaymentOptions> options)
{
    public Uri Endpoint => new(options.CurrentValue.BaseUrl);   // sees reloads
}
```

**Keywords:** `configuration, options pattern, IOptionsMonitor, IOptionsSnapshot, ValidateOnStart, user secrets, environment variables, IValidateOptions`

**Follow-ups:**

-   Which options interface can a singleton service use to see config reloads?
-   How do nested keys map to environment variables?
-   Where should the API key actually live in production?

## dn-hosting-003 --- How do you do fast, structured logging with LoggerMessage source generation, scopes and sampling?

**question_id:** `dn-hosting-003`\
**topic_id:** `dn-hosting`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you do fast, structured logging in .NET with compile-time LoggerMessage source generation, scopes and sampling?

**Answer**

`ILogger<T>` writes **structured** events: a message template with named placeholders (`{OrderId}`) - never string interpolation, which destroys structure and allocates even when the level is off. The **`[LoggerMessage]`** source generator creates high-performance, allocation-free logging methods with level checks, typed parameters and stable event ids. **Scopes** (`BeginScope`) attach properties (tenant, correlation id) to all logs inside; OpenTelemetry/Activity adds trace ids automatically. Providers: console, debug, EventSource, and OpenTelemetry/Application Insights/Serilog sinks. Control volume with category-level filters in configuration, **log sampling and buffering** (.NET 9+) to keep a fraction of high-volume logs or buffer debug logs until an error occurs, and redaction (`Microsoft.Extensions.Compliance`) so PII never reaches sinks. Log at the right level, include ids not payloads, and never log secrets.

Real-world example: generated log methods and a scope with the tenant.

```csharp
public sealed partial class OrderProcessor(ILogger<OrderProcessor> logger)
{
    [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Processing order {OrderId} for tenant {TenantId}")]
    private partial void LogProcessing(Guid orderId, string tenantId);

    [LoggerMessage(EventId = 1002, Level = LogLevel.Warning, Message = "Payment retry {Attempt} for order {OrderId}")]
    private partial void LogRetry(int attempt, Guid orderId, Exception ex);

    public async Task ProcessAsync(Order order)
    {
        using var scope = logger.BeginScope(new Dictionary<string, object> { ["TenantId"] = order.TenantId });
        LogProcessing(order.Id, order.TenantId);
        // ...
    }
}
```

**Keywords:** `ILogger, structured logging, LoggerMessage, source generator, log scopes, log sampling, redaction, message template`

**Follow-ups:**

-   Why is string interpolation in log calls an anti-pattern?
-   How do you keep debug logs available only when an error occurs?
-   How do you stop PII from reaching the log sink?

## dn-hosting-004 --- How do IMemoryCache, IDistributedCache and HybridCache differ?

**question_id:** `dn-hosting-004`\
**topic_id:** `dn-hosting`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Practical`

**Question**

How do IMemoryCache, IDistributedCache and HybridCache differ, and what is cache stampede protection?

**Answer**

`IMemoryCache` is an in-process cache: fastest, but per instance (inconsistent across a scaled-out API) and lost on restart; it supports size limits, absolute/sliding expiration and eviction callbacks. `IDistributedCache` (Redis, SQL Server, Cosmos) is shared across instances but works on `byte[]`/string with serialization and network latency. **`HybridCache`** (.NET 9) combines **L1 (memory) + L2 (distributed)** behind one API `GetOrCreateAsync(key, factory)` with serialization, tags for invalidation, and built-in **stampede protection**: when a hot key expires and many requests arrive, only one factory call runs and the others wait for its result. Rules: cache immutable or copied data, choose keys including tenant/user/version, set expirations deliberately, and decide an invalidation strategy (TTL, tags, events). Do not cache user-specific secrets in shared caches without scoping; beware stale data and caching failures.

Real-world example: HybridCache with Redis as the second level and tag-based invalidation.

```csharp
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = builder.Configuration.GetConnectionString("Redis"));
builder.Services.AddHybridCache(o =>
{
    o.DefaultEntryOptions = new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(10), LocalCacheExpiration = TimeSpan.FromMinutes(2) };
});

public sealed class ProductService(HybridCache cache, IProductRepository repo)
{
    public ValueTask<ProductDto> GetAsync(int id, CancellationToken ct) =>
        cache.GetOrCreateAsync($"product:{id}",
            async token => await repo.LoadAsync(id, token),
            tags: ["products", $"product:{id}"], cancellationToken: ct);

    public ValueTask InvalidateAsync(int id, CancellationToken ct) => cache.RemoveByTagAsync($"product:{id}", ct);
}
```

**Keywords:** `HybridCache, IMemoryCache, IDistributedCache, Redis, cache stampede, L1 L2 cache, tags, expiration`

**Follow-ups:**

-   What is a cache stampede and how does HybridCache prevent it?
-   How do you invalidate a cached entry across all instances?
-   When is a cache the wrong fix for a slow query?

## dn-hosting-005 --- How do you add resilience with Microsoft.Extensions.Resilience and Polly v8?

**question_id:** `dn-hosting-005`\
**topic_id:** `dn-hosting`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you add resilience to HTTP calls and other dependencies with Microsoft.Extensions.Resilience and Polly v8?

**Answer**

Polly v8 uses **resilience pipelines** composed of strategies: **retry** (with exponential backoff and jitter), **circuit breaker**, **timeout**, **hedging**, **rate limiter** and **fallback**. `Microsoft.Extensions.Http.Resilience` integrates them with `HttpClientFactory`: `AddStandardResilienceHandler()` adds a vetted pipeline (rate limiter, total timeout, retry, circuit breaker, per-attempt timeout) and `AddResilienceHandler` builds custom ones. For non-HTTP code register a pipeline with `AddResiliencePipeline` and resolve `ResiliencePipelineProvider`. Principles: retry only **transient** failures and **idempotent** operations, bound total time, add jitter to avoid thundering herds, break the circuit to protect a failing dependency, and emit telemetry (metrics) for every strategy. Retrying a non-idempotent POST can duplicate side effects - use idempotency keys.

Real-world example: the standard HTTP pipeline plus a custom pipeline for a database call.

```csharp
builder.Services.AddHttpClient<InventoryClient>(c => c.BaseAddress = new Uri("https://inventory.internal"))
    .AddStandardResilienceHandler(o =>
    {
        o.Retry.MaxRetryAttempts = 3;
        o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
        o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
    });

builder.Services.AddResiliencePipeline("db-read", pipeline => pipeline
    .AddRetry(new RetryStrategyOptions { MaxRetryAttempts = 3, BackoffType = DelayBackoffType.Exponential, UseJitter = true,
        ShouldHandle = new PredicateBuilder().Handle<SqlException>(e => e.IsTransient) })
    .AddTimeout(TimeSpan.FromSeconds(10)));

// usage
var pipeline = provider.GetPipeline("db-read");
var rows = await pipeline.ExecuteAsync(async ct => await repo.QueryAsync(ct), cancellationToken);
```

**Keywords:** `Polly, resilience pipeline, retry, circuit breaker, hedging, timeout, AddStandardResilienceHandler, jitter, idempotency`

**Follow-ups:**

-   Why add jitter to exponential backoff?
-   When does hedging help and when does it hurt?
-   How do you make a retried POST safe?

# TOPIC --- Networking, I/O and Concurrency Primitives
**topic_id:** `dn-io`
**priority:** `Strong`

## dn-io-001 --- How do HttpClient, SocketsHttpHandler pooling and DNS refresh work, and what is service discovery?

**question_id:** `dn-io-001`\
**topic_id:** `dn-io`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do HttpClient, SocketsHttpHandler connection pooling and DNS refresh work, and what does service discovery add?

**Answer**

`HttpClient` is designed to be long-lived: each `SocketsHttpHandler` owns a **connection pool** per endpoint. Creating a new `HttpClient` per request exhausts sockets (TIME_WAIT) and skips connection reuse; keeping one forever never re-resolves DNS, so it misses failovers. Solutions: `IHttpClientFactory` (pools handlers and rotates them, default lifetime 2 minutes) or a static/singleton `HttpClient` with `SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) }`. Tune `MaxConnectionsPerServer`, enable HTTP/2 multiplexing (and HTTP/3 over QUIC where supported), set `Timeout` plus per-call cancellation tokens, stream large bodies with `HttpCompletionOption.ResponseHeadersRead`, and always dispose responses. **Service discovery** (`Microsoft.Extensions.ServiceDiscovery`, used by Aspire) resolves logical names like `https+http://inventory` to real endpoints from configuration, DNS SRV, Kubernetes or Consul, enabling load balancing and avoiding hard-coded URLs.

Real-world example: a typed client with factory, pooling and service discovery.

```csharp
builder.Services.AddServiceDiscovery();

builder.Services.AddHttpClient<InventoryClient>(c => c.BaseAddress = new Uri("https+http://inventory"))
    .AddServiceDiscovery()
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        PooledConnectionLifetime = TimeSpan.FromMinutes(2),   // re-resolve DNS regularly
        EnableMultipleHttp2Connections = true,
        ConnectTimeout = TimeSpan.FromSeconds(3)
    });

public sealed class InventoryClient(HttpClient http)
{
    public async Task<Stock?> GetStockAsync(string sku, CancellationToken ct)
    {
        using var response = await http.GetAsync($"/stock/{sku}", HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Stock>(ct);
    }
}
```

**Keywords:** `HttpClient, SocketsHttpHandler, IHttpClientFactory, connection pooling, DNS, HTTP/2, HTTP/3, service discovery`

**Follow-ups:**

-   What symptoms show socket exhaustion from `new HttpClient()` per call?
-   Why does a static HttpClient miss DNS changes?
-   What does HTTP/2 multiplexing change for connection limits?

## dn-io-002 --- What are System.IO.Pipelines and Channels, and when do you use them?

**question_id:** `dn-io-002`\
**topic_id:** `dn-io`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are System.IO.Pipelines and System.Threading.Channels, and when do you use them?

**Answer**

**`System.IO.Pipelines`** is a high-performance API for parsing streaming data (Kestrel uses it): a `Pipe` has a `PipeWriter` and `PipeReader`, owns pooled buffers, handles back-pressure (pause the writer when the reader is behind) and exposes `ReadOnlySequence<byte>` so you parse without copying or manually managing buffers. Use it for custom protocols, framing and large streaming parsers. **`Channel<T>`** is an async producer/consumer queue: `Channel.CreateBounded<T>(capacity)` applies **back-pressure** (`FullMode`: wait/drop), `CreateUnbounded` does not (risk of memory growth). One or many readers and writers, `ReadAllAsync()` for `await foreach`, and `Complete()` to signal the end. Use channels to decouple a fast producer (HTTP request, event hub) from slower consumers (workers) inside one process; use a message broker across processes. Always bound the capacity and handle cancellation/completion.

Real-world example: a bounded channel feeding parallel workers from a hosted service.

```csharp
public sealed class WorkQueue
{
    private readonly Channel<ImageJob> _channel = Channel.CreateBounded<ImageJob>(
        new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.Wait, SingleReader = false });

    public ValueTask EnqueueAsync(ImageJob job, CancellationToken ct) => _channel.Writer.WriteAsync(job, ct);
    public IAsyncEnumerable<ImageJob> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public sealed class ImageWorker(WorkQueue queue, IImageProcessor processor) : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken ct) =>
        Parallel.ForEachAsync(queue.ReadAllAsync(ct), new ParallelOptions { MaxDegreeOfParallelism = 4, CancellationToken = ct },
            async (job, token) => await processor.ProcessAsync(job, token));
}
```

**Keywords:** `Channel, System.IO.Pipelines, PipeReader, back-pressure, bounded channel, producer consumer, Parallel.ForEachAsync`

**Follow-ups:**

-   What happens when a bounded channel is full and the writer is an HTTP request?
-   Why is an unbounded channel risky?
-   When do you need a real message broker instead of a channel?

## dn-io-003 --- How do the Task Parallel Library, async streams and cancellation patterns work together?

**question_id:** `dn-io-003`\
**topic_id:** `dn-io`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do the Task Parallel Library, async streams (IAsyncEnumerable) and cancellation patterns work together in modern .NET?

**Answer**

Distinguish **I/O-bound** work (use `async/await`, no thread blocked) from **CPU-bound** work (use `Task.Run`/`Parallel.For`/PLINQ on the thread pool; never in ASP.NET request threads at scale). `Task.WhenAll` runs independent async operations concurrently; `Parallel.ForEachAsync` limits concurrency for async work (`MaxDegreeOfParallelism`). **`IAsyncEnumerable<T>`** streams results as they arrive (database rows, pages of an API, tokens from an LLM) with `await foreach` and `yield return`, keeping memory flat; ASP.NET Core serialises it incrementally. **Cancellation** is cooperative: accept a `CancellationToken` through every layer (ASP.NET Core passes `HttpContext.RequestAborted`), link tokens with `CancellationTokenSource.CreateLinkedTokenSource`, use `CancelAfter` for timeouts, mark enumerator parameters with `[EnumeratorCancellation]`, and treat `OperationCanceledException` as normal flow. Avoid `async void`, `.Result`/`.Wait()`, and fire-and-forget without error handling.

Real-world example: stream large query results with cancellation and bounded parallel enrichment.

```csharp
public async IAsyncEnumerable<OrderDto> StreamOrdersAsync(
    int customerId, [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var order in db.Orders.Where(o => o.CustomerId == customerId)
                                         .AsNoTracking().AsAsyncEnumerable().WithCancellation(ct))
        yield return order.ToDto();
}

app.MapGet("/customers/{id:int}/orders", (int id, OrderService svc, CancellationToken ct) => svc.StreamOrdersAsync(id, ct));

// bounded parallel I/O
await Parallel.ForEachAsync(ids, new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = ct },
    async (id, token) => await client.RefreshAsync(id, token));

using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
cts.CancelAfter(TimeSpan.FromSeconds(10));
```

**Keywords:** `Task Parallel Library, IAsyncEnumerable, async streams, CancellationToken, Parallel.ForEachAsync, Task.WhenAll, EnumeratorCancellation`

**Follow-ups:**

-   Why is Task.Run in an ASP.NET controller usually a mistake?
-   How does a client disconnect cancel database work?
-   What is the danger of `async void`?

# TOPIC --- SDK, Tooling and Diagnostics
**topic_id:** `dn-tooling`
**priority:** `Strong`

## dn-tooling-001 --- How do you manage SDK versions, shared build settings and central package management in a solution?

**question_id:** `dn-tooling-001`\
**topic_id:** `dn-tooling`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you manage SDK versions, shared build settings and NuGet versions across many projects in a solution?

**Answer**

Use repository-level files so every developer and CI build behaves identically. **`global.json`** pins the SDK (`version` + `rollForward` policy). **`Directory.Build.props`** (and `.targets`) apply common MSBuild settings to every project under it: `TargetFramework`, `Nullable`, `ImplicitUsings`, `LangVersion`, `TreatWarningsAsErrors`, analyzers, SourceLink and versioning. **Central Package Management**: `Directory.Packages.props` with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` and `<PackageVersion>` items so projects reference packages without versions - one place to upgrade. Add **lock files** (`RestorePackagesWithLockFile`) and `--locked-mode` in CI for reproducible restores, **package source mapping** in `nuget.config` to prevent dependency confusion, `.editorconfig` for style and analyzers, and `dotnet list package --vulnerable` plus Dependabot/Renovate for updates. Consider `.slnx` and `dotnet format` for consistency.

Real-world example: a minimal set of repo-level files.

```xml
<!-- global.json -->
{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature" } }

<!-- Directory.Build.props -->
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisMode>Recommended</AnalysisMode>
    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  </PropertyGroup>
</Project>

<!-- Directory.Packages.props -->
<Project>
  <PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.Extensions.AI" Version="9.9.0" />
    <PackageVersion Include="xunit" Version="2.9.3" />
  </ItemGroup>
</Project>
```

**Keywords:** `global.json, Directory.Build.props, Central Package Management, Directory.Packages.props, NuGet, lock file, package source mapping, analyzers`

**Follow-ups:**

-   What does package source mapping protect against?
-   How do you let one project override a centrally managed version?
-   Why use --locked-mode in CI?

## dn-tooling-002 --- Which diagnostic tools do you use for a hang, high CPU, memory growth or slow requests in .NET?

**question_id:** `dn-tooling-002`\
**topic_id:** `dn-tooling`\
**difficulty:** `Senior`\
**question_type:** `Scenario / Practical`

**Question**

Which diagnostic tools do you use for high CPU, memory growth, a hang or slow requests in a running .NET service?

**Answer**

Use the cross-platform **diagnostics CLI tools**, which attach through the runtime's diagnostic IPC (EventPipe) without restarting. **`dotnet-counters`** shows live metrics (CPU, GC heap size, gen0/1/2 collections, thread-pool queue length, exceptions/sec, request rates) - the first look. **`dotnet-trace`** collects CPU sampling and event traces (open in PerfView, Visual Studio or speedscope) to find hot methods. **`dotnet-dump`** captures and analyses full process dumps (`dumpheap -stat`, `gcroot`, `clrstack`, `threads`) for hangs, deadlocks and memory leaks; **`dotnet-gcdump`** captures a lightweight managed heap snapshot to see what is retained. For application-level insight use **System.Diagnostics.Metrics**, **ActivitySource** with OpenTelemetry, and Application Insights; in containers, run tools in a sidecar or `dotnet-monitor`, which exposes the same data over HTTP securely. Always compare before/after, capture in a production-like environment, and watch for thread-pool starvation (growing queue length with low CPU).

Real-world example: the typical command sequence for a memory-growth investigation.

```bash
dotnet-counters ps
dotnet-counters monitor -p 1234 System.Runtime Microsoft.AspNetCore.Hosting

dotnet-gcdump collect -p 1234 -o before.gcdump
# ... drive load for a while ...
dotnet-gcdump collect -p 1234 -o after.gcdump
# compare in Visual Studio / PerfView: which types and roots grew?

dotnet-dump collect -p 1234 -o app.dmp
dotnet-dump analyze app.dmp
> dumpheap -stat
> gcroot 00007f8a1c0045a8
```

**Keywords:** `dotnet-counters, dotnet-trace, dotnet-dump, dotnet-gcdump, EventPipe, dotnet-monitor, memory leak, thread pool starvation`

**Follow-ups:**

-   How do you tell thread-pool starvation from a CPU-bound service?
-   Which tool do you choose for a production container where you cannot install anything?
-   What does gcroot tell you?

## dn-tooling-003 --- How do you add custom metrics and traces with System.Diagnostics.Metrics and ActivitySource?

**question_id:** `dn-tooling-003`\
**topic_id:** `dn-tooling`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you add custom metrics and distributed traces using System.Diagnostics.Metrics and ActivitySource?

**Answer**

.NET has built-in telemetry primitives that OpenTelemetry (and dotnet-counters) consume. **`Meter`** creates instruments - `Counter<T>` (monotonic), `UpDownCounter<T>`, `Histogram<T>` (durations, sizes), observable gauges - with tags for dimensions (keep tag cardinality low!). Create meters via `IMeterFactory` so they are DI-scoped and testable. **`ActivitySource`** creates **spans** (`Activity`) that propagate W3C trace context across HTTP calls and messaging; ASP.NET Core, HttpClient and EF Core already emit activities. Register the sources/meters with OpenTelemetry (`AddSource`, `AddMeter`) and export via OTLP, Azure Monitor or Prometheus. Name things consistently, add business-relevant tags (not PII), record exceptions on spans, and use histograms with explicit bucket boundaries for latency.

Real-world example: an order metric and a span around payment authorisation.

```csharp
public sealed class PaymentMetrics
{
    public const string MeterName = "Shop.Payments";
    private readonly Counter<long> _authorised;
    private readonly Histogram<double> _latency;
    public PaymentMetrics(IMeterFactory factory)
    {
        var meter = factory.Create(MeterName);
        _authorised = meter.CreateCounter<long>("payments.authorised");
        _latency = meter.CreateHistogram<double>("payments.authorise.duration", unit: "ms");
    }
    public void Record(string provider, bool ok, double ms)
    {
        _authorised.Add(1, new KeyValuePair<string, object?>("provider", provider), new("success", ok));
        _latency.Record(ms, new KeyValuePair<string, object?>("provider", provider));
    }
}

static readonly ActivitySource Source = new("Shop.Payments");
using var activity = Source.StartActivity("Authorise payment");
activity?.SetTag("payment.provider", provider);

builder.Services.AddOpenTelemetry()
    .WithMetrics(m => m.AddMeter(PaymentMetrics.MeterName).AddAspNetCoreInstrumentation())
    .WithTracing(t => t.AddSource("Shop.Payments").AddAspNetCoreInstrumentation().AddHttpClientInstrumentation());
```

**Keywords:** `System.Diagnostics.Metrics, Meter, ActivitySource, OpenTelemetry, histogram, trace context, IMeterFactory, cardinality`

**Follow-ups:**

-   Why is high tag cardinality a problem for metrics?
-   How does trace context flow through a message queue?
-   When do you use a histogram instead of a counter?

# TOPIC --- Modern C# 14 and .NET 10 Features
**topic_id:** `dn-modern`
**priority:** `Strong`

## dn-modern-001 --- What is new in C# 14 that a senior developer should know?

**question_id:** `dn-modern-001`\
**topic_id:** `dn-modern`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What is new in C# 14 that a senior developer should know?

**Answer**

C# 14 (shipped with .NET 10) highlights: **`field` keyword** - inside a property accessor, `field` is the compiler-generated backing field, so you can add validation to an auto-property without declaring a manual field; **extension members** - `extension(Type receiver) { ... }` blocks add extension *properties*, static members and operators, not only methods; **null-conditional assignment** (`customer?.Name = "x"` assigns only if non-null); **`nameof` with unbound generics** (`nameof(List<>)`); **first-class `Span<T>`/`ReadOnlySpan<T>` implicit conversions** (better overload resolution and fewer explicit `AsSpan`); lambda parameters with modifiers (`ref`, `in`, `out`) without types; **partial constructors and events**; and **user-defined compound assignment operators** (`+=`) plus increment/decrement operators that avoid temporary allocations. Know the earlier ones too: C# 13 `params` collections and `lock` on `System.Threading.Lock`, C# 12 primary constructors and collection expressions.

Real-world example: `field` validation and an extension property.

```csharp
public sealed class Product
{
    public string Name
    {
        get => field;
        set => field = string.IsNullOrWhiteSpace(value) ? throw new ArgumentException("Name required") : value.Trim();
    }
    public decimal Price { get; set => field = value >= 0 ? value : throw new ArgumentOutOfRangeException(nameof(value)); }
}

public static class EnumerableExtensions
{
    extension<T>(IEnumerable<T> source)
    {
        public bool IsEmpty => !source.Any();                 // extension property
        public IEnumerable<T> WhereNotNull() => source.Where(x => x is not null);
    }
}

customer?.LastSeen = DateTimeOffset.UtcNow;   // null-conditional assignment
```

**Keywords:** `C# 14, field keyword, extension members, null-conditional assignment, partial constructors, Span conversions, .NET 10`

**Follow-ups:**

-   What problem does the field keyword solve compared with a manual backing field?
-   How do extension members differ from classic extension methods?
-   Which C# 12 and 13 features would you also mention?

## dn-modern-002 --- What are file-based apps and top-level statements, and when are they useful?

**question_id:** `dn-modern-002`\
**topic_id:** `dn-modern`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

What are file-based apps (`dotnet run app.cs`) and top-level statements, and where are they useful?

**Answer**

**Top-level statements** (C# 9+) remove the `Program`/`Main` boilerplate: the compiler generates the entry point from statements at the top of a single file. .NET 10 adds **file-based apps**: a single `.cs` file can be run directly with `dotnet run app.cs` without a `.csproj`, using `#:` directives for the SDK, package and property settings (for example `#:package Humanizer@2.14.1`, `#:sdk Microsoft.NET.Sdk.Web`, `#:property PublishAot=false`); `dotnet publish app.cs` produces an executable and you can convert to a project (`dotnet project convert`). Useful for scripts, tooling, experiments, demos, build automation and onboarding - a C# alternative to Python/PowerShell scripts with strong typing. For anything that grows, move to a normal project: multi-file structure, tests, shared build props and CI belong in projects. Combine with `Console.ReadLine`/`System.CommandLine` for tools.

Real-world example: a one-file maintenance script.

```csharp
#:package Spectre.Console@0.49.1
#:property PublishAot=false

using Spectre.Console;

var folder = args.Length > 0 ? args[0] : ".";
var largest = new DirectoryInfo(folder)
    .EnumerateFiles("*", SearchOption.AllDirectories)
    .OrderByDescending(f => f.Length)
    .Take(10);

var table = new Table().AddColumn("File").AddColumn("MB");
foreach (var f in largest) table.AddRow(f.Name, (f.Length / 1_048_576.0).ToString("F1"));
AnsiConsole.Write(table);

// run: dotnet run largest.cs -- C:\\data
```

**Keywords:** `file-based apps, dotnet run, top-level statements, #:package, scripting, .NET 10, single file`

**Follow-ups:**

-   When should a file-based app become a project?
-   How does it resolve NuGet packages without a csproj?
-   Compare it with PowerShell or Python scripts for a .NET team.

## dn-modern-003 --- How do LTS and STS releases work, and how do you handle breaking changes when upgrading .NET?

**question_id:** `dn-modern-003`\
**topic_id:** `dn-modern`\
**difficulty:** `Senior`\
**question_type:** `Scenario`

**Question**

How do you read the .NET release cadence and handle breaking changes when moving from .NET 8 to 9 to 10?

**Answer**

.NET ships a major version every November. **Even-numbered releases are LTS** (3 years of support: .NET 8, 10), odd-numbered are **STS** (2 years of support: .NET 9, 11) - verify dates on the official support policy, because STS support windows have changed. Plan: run on a supported release, upgrade LTS to LTS for conservative systems and track STS where you want new features quickly. Upgrade process: read the **What's new** and **Breaking changes** pages per version (categorised as binary, source and behavioural), update `global.json`/`TargetFramework`, update NuGet packages (EF Core, ASP.NET, third party) together, enable analyzers, run the full test suite plus load tests, watch for behavioural changes (serialization defaults, HTTP stack, trimming warnings, `HttpClient` and EF translation changes), canary deploy, and keep a rollback path. Use the **.NET Upgrade Assistant** or GitHub Copilot modernization for large code bases, and adopt new features gradually.

Real-world example: multi-targeting a library during a transition and gating features by framework.

```xml
<PropertyGroup>
  <TargetFrameworks>net8.0;net10.0</TargetFrameworks>
</PropertyGroup>

<ItemGroup Condition="'$(TargetFramework)' == 'net8.0'">
  <PackageReference Include="System.Collections.Immutable" Version="8.0.0" />
</ItemGroup>
```

```csharp
public static string Hash(ReadOnlySpan<byte> data)
{
#if NET10_0_OR_GREATER
    return Convert.ToHexStringLower(SHA256.HashData(data));
#else
    return Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
#endif
}
```

**Keywords:** `LTS, STS, .NET 10, breaking changes, upgrade, multi-targeting, support policy, Upgrade Assistant`

**Follow-ups:**

-   How do you convince stakeholders to schedule a runtime upgrade?
-   What would you verify first in the breaking-changes list for a web API?
-   How do you keep libraries compatible with several .NET versions?
