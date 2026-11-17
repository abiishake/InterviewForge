# Real-world code examples: microservices, messaging, Orleans, GraphQL/gRPC, resilience, background work and DDD

## microservices-001
Service boundaries follow business capabilities and data ownership: each service has its own schema and exposes a contract, not tables.

```yaml
# Bounded contexts for an e-commerce platform (one team + one database each)
services:
  catalog:   { owns: [Product, Category],         publishes: [ProductPriceChanged] }
  ordering:  { owns: [Order, OrderLine],          publishes: [OrderPlaced, OrderCancelled], consumes: [PaymentCaptured] }
  payments:  { owns: [Payment, Refund],           publishes: [PaymentCaptured, PaymentFailed], consumes: [OrderPlaced] }
  shipping:  { owns: [Shipment],                  consumes: [PaymentCaptured] }
# Smell test: if two services must deploy together or share a table, the boundary is wrong.
```

```csharp
// Ordering never joins to the Catalog database: it keeps a local snapshot updated from events
public sealed class ProductPriceChangedHandler(OrderingDb db) : IConsumer<ProductPriceChanged>
{
    public async Task Consume(ConsumeContext<ProductPriceChanged> ctx) =>
        await db.ProductSnapshots.Where(p => p.Sku == ctx.Message.Sku).ExecuteUpdateAsync(s => s.SetProperty(p => p.Price, ctx.Message.Price));
}
```

## microservices-002
Handling downstream failure with timeout, retry with jitter, circuit breaker and a fallback.

```csharp
builder.Services.AddHttpClient<IInventoryClient, InventoryClient>(c => c.BaseAddress = new("https://inventory"))
    .AddResilienceHandler("inventory", pipeline =>
    {
        pipeline.AddTimeout(TimeSpan.FromSeconds(3));
        pipeline.AddRetry(new HttpRetryStrategyOptions { MaxRetryAttempts = 3, BackoffType = DelayBackoffType.Exponential, UseJitter = true, Delay = TimeSpan.FromMilliseconds(200) });
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions { FailureRatio = 0.5, MinimumThroughput = 20, BreakDuration = TimeSpan.FromSeconds(30) });
    });

public async Task<StockInfo> GetStockAsync(string sku, CancellationToken ct)
{
    try { return await client.GetStockAsync(sku, ct); }
    catch (Exception ex) when (ex is BrokenCircuitException or TimeoutRejectedException or HttpRequestException)
    {
        return StockInfo.Unknown(sku);          // degrade gracefully: show "check availability" instead of failing checkout
    }
}
```

## microservices-003
Eventual consistency: the order is accepted immediately and its status converges as events arrive.

```csharp
app.MapPost("/orders", async (PlaceOrder cmd, OrderingDb db, IPublishEndpoint bus) =>
{
    var order = Order.Place(cmd);                       // Status = Pending
    db.Orders.Add(order);
    await bus.Publish(new OrderPlaced(order.Id, order.Total));   // with the outbox, committed together with the row
    await db.SaveChangesAsync();
    return Results.Accepted($"/orders/{order.Id}", new { order.Id, order.Status });   // 202: not final yet
});

public sealed class PaymentCapturedHandler(OrderingDb db) : IConsumer<PaymentCaptured>
{
    public async Task Consume(ConsumeContext<PaymentCaptured> ctx)
    {
        var order = await db.Orders.FindAsync(ctx.Message.OrderId);
        order!.MarkPaid();                               // idempotent state transition; the UI polls or gets a SignalR push
        await db.SaveChangesAsync();
    }
}
```

## microservices-004
Avoiding a distributed monolith: query another service's data through its API or a local read model, never its database.

```csharp
// BAD: reporting service reads the Orders service's tables directly (tight coupling, shared schema)
// SELECT ... FROM OrdersDb.dbo.Orders o JOIN CustomersDb.dbo.Customers c ...

// GOOD 1: API composition at the edge (BFF / gateway)
app.MapGet("/api/order-details/{id}", async (Guid id, IOrdersApi orders, ICustomersApi customers) =>
{
    var order = await orders.GetAsync(id);
    var customer = await customers.GetAsync(order.CustomerId);
    return new OrderDetails(order, customer.Name);
});

// GOOD 2: a read model fed by events for heavy queries
public sealed class OrderSummaryProjection : IConsumer<OrderPlaced>, IConsumer<CustomerRenamed> { /* update denormalised table */ }
```

## messaging-001
Queue (competing consumers, one message handled once) versus topic (pub/sub, every subscriber gets a copy).

```csharp
// Queue: work distribution. Ten workers share "invoice-generation"; each message goes to exactly one worker.
await sender.SendMessageAsync(new ServiceBusMessage(json) { Subject = "GenerateInvoice" });          // queue: invoice-generation

// Topic + subscriptions: OrderPlaced is delivered to Billing, Shipping and Analytics independently
var topicSender = client.CreateSender("order-events");
await topicSender.SendMessageAsync(new ServiceBusMessage(json) { Subject = "OrderPlaced", ApplicationProperties = { ["region"] = "EU" } });

// Subscription with a filter: Shipping only receives EU orders
await admin.CreateSubscriptionAsync(new CreateSubscriptionOptions("order-events", "shipping-eu"),
    new CreateRuleOptions("eu-only", new SqlRuleFilter("region = 'EU'")));
```

## messaging-002
Idempotent consumer: record processed message ids so redelivery (at-least-once) cannot double-apply.

```csharp
public sealed class OrderPlacedConsumer(BillingDb db) : IConsumer<OrderPlaced>
{
    public async Task Consume(ConsumeContext<OrderPlaced> ctx)
    {
        var messageId = ctx.MessageId!.Value;
        await using var tx = await db.Database.BeginTransactionAsync(ctx.CancellationToken);
        try
        {
            db.ProcessedMessages.Add(new ProcessedMessage(messageId, nameof(OrderPlacedConsumer)));   // PK (MessageId, Consumer)
            await db.SaveChangesAsync(ctx.CancellationToken);                                          // throws on duplicate
        }
        catch (DbUpdateException) { return; }                                                          // already processed: ack and skip

        db.Invoices.Add(Invoice.For(ctx.Message));
        await db.SaveChangesAsync(ctx.CancellationToken);
        await tx.CommitAsync(ctx.CancellationToken);
    }
}
```

## messaging-003
Retry with delays then dead-letter, with a poison-message policy in MassTransit.

```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<PaymentConsumer>(c => c.UseMessageRetry(r => r.Exponential(5, TimeSpan.FromSeconds(1), TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(2))
                                           .Ignore<ValidationException>()));       // permanent errors: do not retry
    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host("rabbitmq");
        cfg.ReceiveEndpoint("payments", e =>
        {
            e.UseDelayedRedelivery(r => r.Intervals(TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(5)));   // slow retries without blocking the queue
            e.ConfigureConsumer<PaymentConsumer>(ctx);              // after all retries the message lands in payments_error (DLQ)
        });
    });
});
// Operate the DLQ: alert on depth, inspect payloads, fix the cause, then replay (shovel/requeue) deliberately.
```

## messaging-004
Kafka fundamentals: key-based partitioning for per-entity ordering, consumer groups for scale, manual offset commit.

```csharp
using var producer = new ProducerBuilder<string, string>(new ProducerConfig { BootstrapServers = "kafka:9092", Acks = Acks.All, EnableIdempotence = true }).Build();
// Same key -> same partition -> ordered events per order
await producer.ProduceAsync("orders", new Message<string, string> { Key = order.Id.ToString(), Value = json });

var consumerConfig = new ConsumerConfig { BootstrapServers = "kafka:9092", GroupId = "billing", EnableAutoCommit = false, AutoOffsetReset = AutoOffsetReset.Earliest };
using var consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
consumer.Subscribe("orders");
while (!ct.IsCancellationRequested)
{
    var result = consumer.Consume(ct);
    await HandleAsync(result.Message, ct);          // process first...
    consumer.Commit(result);                        // ...then commit the offset (at-least-once)
}
// Parallelism <= number of partitions; ordering is guaranteed only within a partition.
```

## messaging-005
Azure Service Bus sessions, duplicate detection and peek-lock with explicit settlement.

```csharp
// Duplicate detection: same MessageId within the window is dropped by the broker
await sender.SendMessageAsync(new ServiceBusMessage(json) { MessageId = $"order-{order.Id}", SessionId = order.CustomerId.ToString() });

// Session processor: messages of one customer are processed in order by one handler at a time
await using var processor = client.CreateSessionProcessor("orders", new ServiceBusSessionProcessorOptions { MaxConcurrentSessions = 8, AutoCompleteMessages = false });
processor.ProcessMessageAsync += async args =>
{
    try { await HandleAsync(args.Message, args.CancellationToken); await args.CompleteMessageAsync(args.Message); }
    catch (TransientException) { await args.AbandonMessageAsync(args.Message); }                      // redeliver
    catch (Exception ex) { await args.DeadLetterMessageAsync(args.Message, "HandlerFailed", ex.Message); }   // poison: park it
};
// Scheduled delivery: new ServiceBusMessage(json) { ScheduledEnqueueTime = DateTimeOffset.UtcNow.AddHours(24) } (e.g. payment reminder)
```

## orleans-001
Orleans models an entity as a virtual actor (grain): single-threaded, addressable by key, activated on demand.

```csharp
public interface IShoppingCartGrain : IGrainWithStringKey
{
    Task AddAsync(string sku, int qty);
    Task<CartSummary> GetAsync();
}

public sealed class ShoppingCartGrain([PersistentState("cart", "carts")] IPersistentState<CartState> state) : Grain, IShoppingCartGrain
{
    public async Task AddAsync(string sku, int qty)
    {
        state.State.Items[sku] = state.State.Items.GetValueOrDefault(sku) + qty;   // no locks: one request at a time per grain
        await state.WriteStateAsync();
    }
    public Task<CartSummary> GetAsync() => Task.FromResult(new CartSummary(state.State.Items));
}

var cart = grainFactory.GetGrain<IShoppingCartGrain>(userId);      // location transparency: the cluster routes the call
await cart.AddAsync("SKU-1", 2);
```

## orleans-002
Turn-based concurrency: no locks inside a grain, but reentrancy and awaiting external calls need care.

```csharp
public sealed class AccountGrain : Grain, IAccountGrain
{
    private decimal _balance;

    public async Task<bool> WithdrawAsync(decimal amount)
    {
        if (_balance < amount) return false;       // no race: the grain processes one call at a time
        _balance -= amount;
        await _audit.WriteAsync($"withdraw {amount}");   // while awaiting, other calls are NOT interleaved (non-reentrant default)
        return true;
    }

    [AlwaysInterleave]                              // opt-in: read-only method may run during an await of another call
    public Task<decimal> GetBalanceAsync() => Task.FromResult(_balance);
}
// [Reentrant] on the class allows interleaving at await points: faster, but invariants must be re-checked after each await.
```

## orleans-003
Choosing Orleans: many independent stateful entities with high fan-out (devices, game sessions, carts) is its sweet spot.

```csharp
// 1 million IoT devices: each device is a grain that keeps its last reading and evaluates rules in memory
public sealed class DeviceGrain : Grain, IDeviceGrain
{
    private Reading? _last;
    private readonly IAlertSink _alerts;
    public async Task IngestAsync(Reading r)
    {
        if (_last is not null && Math.Abs(r.Temperature - _last.Temperature) > 15)
            await _alerts.RaiseAsync(this.GetPrimaryKeyString(), "Temperature spike");
        _last = r;                                  // hot state stays in memory next to the logic
    }
}
// Choose conventional microservices when you need independent deployment/ownership per capability, not per entity instance.
```

## orleans-004
Grain persistence: write state explicitly and handle ETag conflicts, since the in-memory state can diverge from storage.

```csharp
public sealed class OrderGrain([PersistentState("order", "orders")] IPersistentState<OrderState> state) : Grain, IOrderGrain
{
    public async Task ConfirmAsync()
    {
        state.State.Status = "Confirmed";
        try { await state.WriteStateAsync(); }                      // optimistic ETag check against storage
        catch (InconsistentStateException)                         // another activation wrote first (e.g. after a split brain)
        {
            await state.ReadStateAsync();                           // reload and re-apply the decision
            if (state.State.Status != "Confirmed") { state.State.Status = "Confirmed"; await state.WriteStateAsync(); }
        }
    }
}
// Pitfalls: writing on every call (throughput), large state objects, and assuming state survives without WriteStateAsync().
```

## orleans-005
Timers for in-memory periodic work vs reminders for durable schedules that survive deactivation.

```csharp
public sealed class SubscriptionGrain : Grain, ISubscriptionGrain, IRemindable
{
    public override async Task OnActivateAsync(CancellationToken ct)
    {
        // Reminder: persisted, fires even if the grain was deactivated and re-activated elsewhere
        await this.RegisterOrUpdateReminder("renew", dueTime: TimeSpan.FromDays(30), period: TimeSpan.FromDays(30));
        // Timer: lives only while the grain is active (cache refresh, flush batching)
        this.RegisterGrainTimer(FlushAsync, new GrainTimerCreationOptions { DueTime = TimeSpan.FromSeconds(5), Period = TimeSpan.FromSeconds(5) });
    }
    public Task ReceiveReminder(string name, TickStatus status) => name == "renew" ? RenewAsync() : Task.CompletedTask;
}
```

## orleans-006
Hot grain mitigation with a stateless worker pool and placement strategies.

```csharp
// A "hot" singleton counter would serialise every request. A stateless worker scales out per silo automatically.
[StatelessWorker(maxLocalWorkers: 4)]
public sealed class PriceCalculatorGrain : Grain, IPriceCalculatorGrain
{
    public Task<decimal> QuoteAsync(QuoteRequest r) => Task.FromResult(Calculate(r));   // pure CPU work, no state
}

[PreferLocalPlacement]                                // place near the caller to cut network hops
public sealed class SessionGrain : Grain, ISessionGrain { }

// Membership: silos gossip via a membership table (Azure Table/SQL); on failure grains reactivate on remaining silos
siloBuilder.UseAzureStorageClustering(o => o.ConfigureTableServiceClient(connectionString))
           .Configure<ClusterOptions>(o => { o.ClusterId = "prod"; o.ServiceId = "orders"; });
```

## graphql-001
The same data needs: REST returns fixed shapes; GraphQL lets the client ask for exactly the fields it renders.

```graphql
query OrderScreen($id: ID!) {
  order(id: $id) {
    id
    status
    customer { name }
    lines(first: 10) { nodes { sku quantity price } }
  }
}
```

```http
# REST equivalent: three round trips or a custom endpoint per screen
GET /api/orders/1001
GET /api/customers/77
GET /api/orders/1001/lines?pageSize=10
```

## graphql-002
GraphQL N+1: a DataLoader batches the per-parent lookups into one query.

```csharp
public sealed class CustomerByIdDataLoader(IServiceProvider sp, IBatchScheduler scheduler, DataLoaderOptions options)
    : BatchDataLoader<int, Customer>(scheduler, options)
{
    protected override async Task<IReadOnlyDictionary<int, Customer>> LoadBatchAsync(IReadOnlyList<int> keys, CancellationToken ct)
    {
        await using var db = await sp.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContextAsync(ct);
        return await db.Customers.Where(c => keys.Contains(c.Id)).ToDictionaryAsync(c => c.Id, ct);   // ONE query for all orders on the page
    }
}

[ExtendObjectType<Order>]
public sealed class OrderExtensions
{
    public Task<Customer> GetCustomerAsync([Parent] Order o, CustomerByIdDataLoader loader, CancellationToken ct) => loader.LoadAsync(o.CustomerId, ct);
}
```

## graphql-003
SignalR (RPC + fallback transports + groups) versus raw WebSockets: pushing order status to a user.

```csharp
public sealed class OrderHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{Context.UserIdentifier}");   // authenticated user -> group
        await base.OnConnectedAsync();
    }
}

app.MapHub<OrderHub>("/hubs/orders").RequireAuthorization();

// From anywhere in the backend (e.g. an event handler)
await hubContext.Clients.Group($"user:{order.CustomerId}").SendAsync("orderStatusChanged", new { order.Id, order.Status });
```

```ts
const connection = new signalR.HubConnectionBuilder().withUrl("/hubs/orders").withAutomaticReconnect().build();
connection.on("orderStatusChanged", s => updateUi(s));
await connection.start();
```

## graphql-004
Protecting a GraphQL API from abusive queries with depth, complexity, pagination and persisted queries.

```csharp
builder.Services.AddGraphQLServer()
    .AddQueryType<Query>()
    .ModifyRequestOptions(o => { o.ExecutionTimeout = TimeSpan.FromSeconds(10); })
    .AddMaxExecutionDepthRule(8)                                    // reject deeply nested queries
    .ModifyCostOptions(o => { o.MaxFieldCost = 1000; o.EnforceCostLimits = true; })
    .DisableIntrospection(!builder.Environment.IsDevelopment())
    .AddAuthorization()
    .UseAutomaticPersistedQueries()                                 // clients send a hash; arbitrary queries can be disallowed
    .SetPagingOptions(new PagingOptions { MaxPageSize = 100, DefaultPageSize = 25, RequirePagingBoundaries = true });

[Authorize(Policy = "orders.read")]
[UsePaging(MaxPageSize = 100)]
public IQueryable<Order> GetOrders(AppDbContext db, ClaimsPrincipal user) => db.Orders.Where(o => o.TenantId == user.GetTenantId());   // object-level authorisation
```

## graphql-005
Scaling SignalR across servers with a Redis backplane (or Azure SignalR Service) and sticky-session-free transports.

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis("redis:6379", o => o.Configuration.ChannelPrefix = RedisChannel.Literal("myapp"));

// Or offload connections to the managed service so app servers stay stateless
builder.Services.AddSignalR().AddAzureSignalR(builder.Configuration["Azure:SignalR:ConnectionString"]);

// Client: reconnect with backoff and re-join state after reconnect
connection.onreconnected(async () => { await connection.invoke("Resubscribe", currentOrderIds); });
// Without a backplane a message sent via server A never reaches clients connected to server B.
```

## graphql-006
gRPC for internal service-to-service calls: a typed contract, unary and server-streaming methods.

```protobuf
syntax = "proto3";
service PriceService {
  rpc GetPrice (PriceRequest) returns (PriceReply);                 // unary
  rpc StreamPrices (PriceSubscription) returns (stream PriceTick);  // server streaming
}
message PriceRequest { string sku = 1; }
message PriceReply   { string sku = 1; double price = 2; }
```

```csharp
public sealed class PriceServiceImpl(IPriceStore store) : PriceService.PriceServiceBase
{
    public override async Task StreamPrices(PriceSubscription req, IServerStreamWriter<PriceTick> stream, ServerCallContext ctx)
    {
        await foreach (var tick in store.SubscribeAsync(req.Skus, ctx.CancellationToken))
            await stream.WriteAsync(new PriceTick { Sku = tick.Sku, Price = tick.Price });
    }
}
```

## graphql-007
gRPC in Kubernetes: HTTP/2 connections are long-lived, so use client-side load balancing instead of the L4 Service VIP.

```csharp
builder.Services.AddGrpcClient<PriceService.PriceServiceClient>(o => o.Address = new Uri("dns:///price-service.default.svc.cluster.local:5001"))
    .ConfigureChannel(c => c.ServiceConfig = new ServiceConfig { LoadBalancingConfigs = { new RoundRobinConfig() } })   // spread calls across pods
    .AddStandardResilienceHandler();
```

```yaml
# Headless Service so DNS returns every pod IP (client-side balancing); ordinary ClusterIP pins one HTTP/2 connection to one pod
apiVersion: v1
kind: Service
metadata: { name: price-service }
spec:
  clusterIP: None
  selector: { app: price-service }
  ports: [{ port: 5001, name: grpc }]
```

## graphql-008
Evolving a GraphQL schema without versions: add fields, deprecate, and measure usage before removal.

```graphql
type Customer {
  id: ID!
  name: String!
  fullName: String @deprecated(reason: "Use name. Removal planned after 2027-03-01.")
  email: String
}

type Query {
  customers(first: Int = 25, after: String): CustomerConnection!    # additive: new optional arguments are safe
}
# Never: change a field type, make an optional argument required, or remove a field that clients still request.
```

```csharp
// Track field usage from operation logs/Apollo-style reporting, then remove deprecated fields when usage reaches zero.
public sealed class Customer { [GraphQLDeprecated("Use name")] public string FullName => Name; public string Name { get; init; } = ""; }
```

## resilience-001
Timeout, retry and circuit breaker composed with Polly v8 and a retry only for transient failures.

```csharp
var pipeline = new ResiliencePipelineBuilder<HttpResponseMessage>()
    .AddTimeout(TimeSpan.FromSeconds(5))                                         // outermost: overall deadline per attempt
    .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
    {
        MaxRetryAttempts = 3, BackoffType = DelayBackoffType.Exponential, UseJitter = true, Delay = TimeSpan.FromMilliseconds(200),
        ShouldHandle = new PredicateBuilder<HttpResponseMessage>().Handle<HttpRequestException>().HandleResult(r => (int)r.StatusCode is 502 or 503 or 504 or 429),
    })
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions<HttpResponseMessage> { FailureRatio = 0.5, SamplingDuration = TimeSpan.FromSeconds(30), MinimumThroughput = 10, BreakDuration = TimeSpan.FromSeconds(15) })
    .Build();

var response = await pipeline.ExecuteAsync(async ct => await http.GetAsync("/inventory/42", ct), cancellationToken);
```

## resilience-002
Backpressure with a bounded `Channel<T>`: producers slow down (or drop) instead of exhausting memory.

```csharp
var channel = Channel.CreateBounded<ImportRow>(new BoundedChannelOptions(1_000)
{
    FullMode = BoundedChannelFullMode.Wait,        // producer awaits when the consumer is behind = backpressure
    SingleReader = false
});

var producer = Task.Run(async () =>
{
    await foreach (var row in ReadCsvAsync(file, ct)) await channel.Writer.WriteAsync(row, ct);   // blocks at 1,000 items
    channel.Writer.Complete();
});

var consumers = Enumerable.Range(0, 4).Select(_ => Task.Run(async () =>
{
    await foreach (var row in channel.Reader.ReadAllAsync(ct)) await SaveAsync(row, ct);
})).ToArray();
await Task.WhenAll(consumers.Append(producer));
```

## resilience-003
Distributed rate limiting with a Redis Lua script so all instances share one counter (fixed window shown).

```csharp
private const string Script = @"
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return current";

public async Task<bool> AllowAsync(string clientId, int limit, int windowSeconds)
{
    var key = $"rl:{clientId}:{DateTimeOffset.UtcNow.ToUnixTimeSeconds() / windowSeconds}";
    var count = (long)await _db.ScriptEvaluateAsync(Script, new RedisKey[] { key }, new RedisValue[] { windowSeconds });
    return count <= limit;
}

app.Use(async (ctx, next) =>
{
    if (!await limiter.AllowAsync(ctx.User.FindFirstValue("client_id") ?? ctx.Connection.RemoteIpAddress!.ToString(), 100, 60))
    { ctx.Response.StatusCode = 429; ctx.Response.Headers.RetryAfter = "30"; return; }
    await next();
});
```

## resilience-004
Bulkhead isolation: separate concurrency limits per dependency so one slow service cannot consume every thread.

```csharp
builder.Services.AddHttpClient<IPaymentsClient, PaymentsClient>()
    .AddResilienceHandler("payments-bulkhead", p => p.AddConcurrencyLimiter(permitLimit: 20, queueLimit: 50));   // max 20 in flight

builder.Services.AddHttpClient<IRecommendationsClient, RecommendationsClient>()
    .AddResilienceHandler("recs-bulkhead", p =>
    {
        p.AddConcurrencyLimiter(permitLimit: 5, queueLimit: 0);      // non-critical: fail fast instead of queuing
        p.AddTimeout(TimeSpan.FromMilliseconds(800));
    });
// Slow recommendations can now exhaust only their own 5 slots; checkout via Payments keeps its capacity.
```

## resilience-005
Chaos experiment: inject latency and failures in a controlled way and verify the fallback and alerts work.

```csharp
builder.Services.AddHttpClient<IInventoryClient, InventoryClient>()
    .AddResilienceHandler("chaos", (p, ctx) =>
    {
        var enabled = ctx.ServiceProvider.GetRequiredService<IFeatureManager>().IsEnabledAsync("Chaos.Inventory").GetAwaiter().GetResult();
        p.AddChaosLatency(new ChaosLatencyStrategyOptions { Latency = TimeSpan.FromSeconds(2), InjectionRate = 0.1, Enabled = enabled });
        p.AddChaosFault(new ChaosFaultStrategyOptions { InjectionRate = 0.05, FaultGenerator = new FaultGenerator().AddException(() => new HttpRequestException("chaos")), Enabled = enabled });
    });
// Run in staging (or a small slice of prod) with a hypothesis: "checkout stays above 99% success with inventory degraded".
// Pair with a runbook, a kill switch (feature flag), and DR drills: restore a backup and measure actual RTO/RPO.
```

## background-001
Choosing the host: an in-process `BackgroundService` for light polling, a queue consumer for durable work.

```csharp
public sealed class OutboxDispatcher(IServiceScopeFactory scopes, ILogger<OutboxDispatcher> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();                       // scoped services (DbContext) per iteration
                await scope.ServiceProvider.GetRequiredService<IOutbox>().DispatchAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "Outbox dispatch failed"); }
        }
    }
}
builder.Services.AddHostedService<OutboxDispatcher>();
// Durable, retryable, scalable work (emails, PDFs): use a message consumer or Azure Function with a queue trigger instead.
```

## background-002
Graceful shutdown: finish in-flight work within the grace period when Kubernetes sends SIGTERM.

```csharp
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(25));   // less than terminationGracePeriodSeconds

public sealed class QueueWorker(IMessageSource source) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var msg in source.ReadAsync(stoppingToken))
                await HandleAsync(msg, CancellationToken.None);       // finish the current message even though shutdown started
        }
        catch (OperationCanceledException) { /* normal during shutdown */ }
    }
}
```

```yaml
spec:
  terminationGracePeriodSeconds: 30
  containers:
    - name: worker
      lifecycle:
        preStop: { exec: { command: ["sleep", "5"] } }     # let the endpoint be removed from the load balancer first
```

## background-003
Propagating `CancellationToken` from the HTTP request through every layer so abandoned requests stop doing work.

```csharp
app.MapGet("/api/reports/{id}", async (Guid id, IReportService svc, CancellationToken ct) =>   // bound to RequestAborted
    Results.Ok(await svc.BuildAsync(id, ct)));

public async Task<Report> BuildAsync(Guid id, CancellationToken ct)
{
    var rows = await db.Rows.Where(r => r.ReportId == id).ToListAsync(ct);      // EF cancels the SQL command
    using var http = await client.GetAsync($"/rates/{id}", ct);                  // HttpClient cancels the request
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(10));                                   // add an internal deadline on top of the caller's token
    return await renderer.RenderAsync(rows, cts.Token);
}
```

## background-004
Reliable scheduled jobs in a scaled-out deployment: Hangfire with a database lock so only one instance runs each job.

```csharp
builder.Services.AddHangfire(c => c.UseSqlServerStorage(cs));
builder.Services.AddHangfireServer(o => o.WorkerCount = 4);

RecurringJob.AddOrUpdate<IInvoiceJob>("nightly-invoices", j => j.RunAsync(CancellationToken.None), "0 2 * * *", new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

public sealed class InvoiceJob(AppDbContext db) : IInvoiceJob
{
    [DisableConcurrentExecution(timeoutInSeconds: 600)]        // distributed lock: two instances cannot run it at once
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = [60, 300, 900])]
    public async Task RunAsync(CancellationToken ct) { /* idempotent: safe to re-run after a crash */ }
}
// With Azure Functions use a TimerTrigger with a singleton lock (blob lease); with Quartz use clustered JobStore (AdoJobStore).
```

## ddd-001
CQRS: separate command handlers (write model, invariants) from queries (thin read model, no tracking).

```csharp
public sealed record ApproveClaim(Guid ClaimId, Guid ApproverId) : IRequest;

public sealed class ApproveClaimHandler(ClaimsDb db) : IRequestHandler<ApproveClaim>
{
    public async Task Handle(ApproveClaim cmd, CancellationToken ct)
    {
        var claim = await db.Claims.SingleAsync(c => c.Id == cmd.ClaimId, ct);   // aggregate enforces invariants
        claim.Approve(cmd.ApproverId);
        await db.SaveChangesAsync(ct);
    }
}

public sealed record GetClaimList(string? Status) : IRequest<IReadOnlyList<ClaimListItem>>;
public sealed class GetClaimListHandler(ReadDb db) : IRequestHandler<GetClaimList, IReadOnlyList<ClaimListItem>>
{
    public async Task<IReadOnlyList<ClaimListItem>> Handle(GetClaimList q, CancellationToken ct) =>
        await db.ClaimListView.AsNoTracking().Where(v => q.Status == null || v.Status == q.Status).ToListAsync(ct);   // denormalised view / Dapper
}
```

## ddd-002
Orchestrated saga with compensation: reserve stock, charge the payment, and undo the reservation on failure.

```csharp
public sealed class OrderStateMachine : MassTransitStateMachine<OrderState>
{
    public State StockReserved { get; private set; } = null!;
    public State Completed { get; private set; } = null!;
    public State Cancelled { get; private set; } = null!;
    public Event<OrderPlaced> OrderPlaced { get; private set; } = null!;
    public Event<StockReservedEvt> StockReservedEvt { get; private set; } = null!;
    public Event<PaymentFailed> PaymentFailed { get; private set; } = null!;
    public Event<PaymentCaptured> PaymentCaptured { get; private set; } = null!;

    public OrderStateMachine()
    {
        InstanceState(x => x.CurrentState);
        Initially(When(OrderPlaced).Publish(ctx => new ReserveStock(ctx.Saga.CorrelationId)).TransitionTo(StockReserved));
        During(StockReserved,
            When(StockReservedEvt).Publish(ctx => new CapturePayment(ctx.Saga.CorrelationId)),
            When(PaymentCaptured).TransitionTo(Completed).Finalize(),
            When(PaymentFailed).Publish(ctx => new ReleaseStock(ctx.Saga.CorrelationId)).TransitionTo(Cancelled));   // compensation
    }
}
```

## ddd-003
Bounded contexts: the same word means different things, so each context has its own model and an anti-corruption layer maps between them.

```csharp
namespace Sales { public sealed class Customer { public Guid Id; public string Name; public CreditLimit Limit; public IReadOnlyList<Quote> Quotes; } }
namespace Support { public sealed class Customer { public Guid Id; public string Name; public SupportTier Tier; public IReadOnlyList<Ticket> Tickets; } }

// Anti-corruption layer: translate the external model into ours at the boundary
public sealed class CrmCustomerTranslator
{
    public Sales.Customer ToSalesCustomer(CrmCustomerDto dto) =>
        new(dto.AccountGuid, $"{dto.FirstName} {dto.LastName}".Trim(), CreditLimit.FromCrmBand(dto.CreditBand));
}
```

## ddd-004
Event sourcing: the stream of events is the source of truth; current state is a fold over events.

```csharp
public abstract record AccountEvent;
public sealed record AccountOpened(Guid Id, string Owner) : AccountEvent;
public sealed record MoneyDeposited(decimal Amount) : AccountEvent;
public sealed record MoneyWithdrawn(decimal Amount) : AccountEvent;

public sealed class Account
{
    public Guid Id { get; private set; }
    public decimal Balance { get; private set; }
    private readonly List<AccountEvent> _uncommitted = new();

    public static Account Rehydrate(IEnumerable<AccountEvent> history) { var a = new Account(); foreach (var e in history) a.Apply(e); return a; }
    public void Withdraw(decimal amount)
    {
        if (amount > Balance) throw new InvalidOperationException("Insufficient funds");
        Raise(new MoneyWithdrawn(amount));
    }
    private void Raise(AccountEvent e) { Apply(e); _uncommitted.Add(e); }
    private void Apply(AccountEvent e) { switch (e) { case AccountOpened o: Id = o.Id; break; case MoneyDeposited d: Balance += d.Amount; break; case MoneyWithdrawn w: Balance -= w.Amount; break; } }
}
// Append with expected version (optimistic concurrency); snapshots every N events; projections build read models.
```

## ddd-005
Aggregate root protecting invariants, raising a domain event that is translated into an integration event.

```csharp
public sealed class Order : AggregateRoot
{
    private readonly List<OrderLine> _lines = new();
    public IReadOnlyList<OrderLine> Lines => _lines;
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;

    public void AddLine(Sku sku, int qty, Money price)
    {
        if (Status != OrderStatus.Draft) throw new DomainException("Cannot modify a placed order");
        if (qty <= 0) throw new DomainException("Quantity must be positive");
        _lines.Add(new OrderLine(sku, qty, price));
    }
    public void Place()
    {
        if (_lines.Count == 0) throw new DomainException("Empty order");
        Status = OrderStatus.Placed;
        Raise(new OrderPlacedDomainEvent(Id, _lines.Sum(l => l.Total.Amount)));      // in-process, same transaction
    }
}

// Domain event handler publishes the integration event (contract for other services) via the outbox
public sealed class PublishOrderPlaced(IOutbox outbox) : IDomainEventHandler<OrderPlacedDomainEvent>
{
    public Task Handle(OrderPlacedDomainEvent e, CancellationToken ct) => outbox.AddAsync(new OrderPlacedIntegrationEvent(e.OrderId, e.Total), ct);
}
```
