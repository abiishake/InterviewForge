# TOPIC --- Azure SDK Clients and Authentication
**topic_id:** `azd-sdk`
**priority:** `Core`

## azd-sdk-001 --- Why is DefaultAzureCredential discouraged in production, and which credential should you use instead?

**question_id:** `azd-sdk-001`\
**topic_id:** `azd-sdk`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Security`

**Question**

How does DefaultAzureCredential work, why is it discouraged in production, and which credential should you use instead?

**Answer**

`DefaultAzureCredential` is a **chain** that tries credentials in order (environment variables, workload identity, managed identity, Visual Studio, VS Code, Azure CLI, Azure PowerShell, Azure Developer CLI, interactive browser if enabled) and uses the first that succeeds. It is excellent for getting started because the same code works on a laptop and in Azure. The cost: it is **non-deterministic and slow on failure** - a failed managed identity can silently fall through to a developer's Azure CLI login and run with *different permissions*, errors are hard to diagnose, and probing each credential adds latency. Best practice: in production use a **specific credential** - `ManagedIdentityCredential` (system-assigned, or user-assigned with a client id) or `WorkloadIdentityCredential` on AKS - and use a `ChainedTokenCredential` of `VisualStudioCredential`, `AzureCliCredential` etc. only for local development. Choose by environment, reuse **one credential instance** (it caches tokens) and prefer identities over secrets so there is nothing to rotate or leak.

Real-world example: pick a deterministic credential per environment.

```csharp
TokenCredential credential = builder.Environment.IsDevelopment()
    ? new ChainedTokenCredential(new VisualStudioCredential(), new AzureCliCredential())
    : new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(builder.Configuration["Azure:ManagedIdentityClientId"]!));

builder.Services.AddSingleton(credential);

builder.Services.AddAzureClients(clients =>
{
    clients.UseCredential(credential);
    clients.AddBlobServiceClient(new Uri($"https://{builder.Configuration["Storage:Account"]}.blob.core.windows.net"));
    clients.AddSecretClient(new Uri($"https://{builder.Configuration["KeyVault:Name"]}.vault.azure.net"));
});
```

**Keywords:** `DefaultAzureCredential, ManagedIdentityCredential, ChainedTokenCredential, Azure.Identity, workload identity, credential chain, token cache`

**Follow-ups:**

-   What does DefaultAzureCredential try first and why does order matter?
-   When do you use a user-assigned versus a system-assigned managed identity?
-   How do you authenticate locally when a service principal is required?

## azd-sdk-002 --- How do you register and use Azure SDK clients with dependency injection, and what about thread safety and lifetime?

**question_id:** `azd-sdk-002`\
**topic_id:** `azd-sdk`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you register Azure SDK clients with dependency injection, and what are the rules for thread safety and lifetime?

**Answer**

The `Azure.*` client libraries follow common design guidelines: **client classes are thread-safe and should be singletons** (they hold HTTP pipelines and connection pools; creating one per call wastes resources), while *model* objects are not guaranteed thread-safe. `Microsoft.Extensions.Azure` provides `AddAzureClients`, which registers clients as singletons, wires shared **credentials**, `ClientOptions` (retry, diagnostics, transport), **named clients** and logging/OpenTelemetry integration; use `IAzureClientFactory<T>` for named ones. Configure options centrally: `ConfigureDefaults`, or bind from configuration section (`AddBlobServiceClient(config.GetSection("Storage"))`). Do not call `new BlobServiceClient` in request handlers. For sub-clients (`BlobContainerClient`, `BlobClient`) derive them from the singleton parent - they are cheap to create. Inject the narrowest interface you need and wrap in your own abstraction for unit tests.

Real-world example: two named Service Bus clients and a typed consumer.

```csharp
builder.Services.AddAzureClients(clients =>
{
    clients.UseCredential(credential);
    clients.AddServiceBusClientWithNamespace("shop-prod.servicebus.windows.net").WithName("orders");
    clients.AddServiceBusClientWithNamespace("shop-audit.servicebus.windows.net").WithName("audit");
    clients.ConfigureDefaults(o => { o.Retry.MaxRetries = 4; o.Retry.Mode = RetryMode.Exponential; });
});

public sealed class OrderPublisher(IAzureClientFactory<ServiceBusClient> factory)
{
    private readonly ServiceBusSender _sender = factory.CreateClient("orders").CreateSender("orders-placed");
    public Task PublishAsync(OrderPlaced evt, CancellationToken ct) =>
        _sender.SendMessageAsync(new ServiceBusMessage(BinaryData.FromObjectAsJson(evt)) { MessageId = evt.OrderId.ToString() }, ct);
}
```

**Keywords:** `Microsoft.Extensions.Azure, AddAzureClients, singleton, thread safety, IAzureClientFactory, ClientOptions, named clients`

**Follow-ups:**

-   Why shouldn't you create a BlobServiceClient per request?
-   How do you configure retry and logging for all Azure clients at once?
-   How do you unit-test code that uses a BlobClient?

## azd-sdk-003 --- How do pagination, long-running operations and retries behave in the Azure SDK?

**question_id:** `azd-sdk-003`\
**topic_id:** `azd-sdk`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do pagination, long-running operations and retry policies behave in the Azure SDK for .NET?

**Answer**

**Pagination**: list operations return `Pageable<T>` (sync) or `AsyncPageable<T>` (async); iterating with `await foreach` fetches pages lazily and transparently follows continuation tokens, and `.AsPages(continuationToken, pageSizeHint)` gives page-level control and resumability. **Long-running operations (LRO)**: methods such as `StartCopyFromUriAsync` or ARM create/delete take a `WaitUntil` argument - `Started` returns an `Operation<T>` immediately (poll with `UpdateStatusAsync`/`WaitForCompletionAsync`), `Completed` waits for the result; the operation token lets you resume after a restart. **Retries**: the pipeline retries transient failures (408, 429, 5xx, network errors) using `ClientOptions.Retry` (`MaxRetries`, `Delay`, `MaxDelay`, `Mode`, `NetworkTimeout`) and honours `Retry-After`. **Failures** surface as `RequestFailedException` with `Status` and `ErrorCode` - handle specific codes (404 `BlobNotFound`, 409, 412 for ETag conflicts) rather than catching all. Pass `CancellationToken`, and use conditional requests (`ETag`, `IfNoneMatch`) for idempotent writes.

Real-world example: stream all blobs by prefix and handle a conflict explicitly.

```csharp
var container = blobService.GetBlobContainerClient("invoices");

await foreach (BlobItem item in container.GetBlobsAsync(prefix: "2026/11/", cancellationToken: ct))
    Console.WriteLine($"{item.Name} {item.Properties.ContentLength}");

try
{
    await container.GetBlobClient("2026/11/inv-1001.pdf").UploadAsync(stream,
        new BlobUploadOptions { Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All } }, ct);   // create only
}
catch (RequestFailedException ex) when (ex.Status == 409 || ex.Status == 412)
{
    logger.LogInformation("Invoice already uploaded; treating as success.");
}
```

**Keywords:** `Pageable, AsyncPageable, long-running operation, WaitUntil, RequestFailedException, retry policy, ETag, continuation token`

**Follow-ups:**

-   What does WaitUntil.Started give you that Completed does not?
-   How do you make an upload idempotent?
-   Which status codes does the SDK retry by default?

## azd-sdk-004 --- How do you unit-test and mock Azure SDK clients?

**question_id:** `azd-sdk-004`\
**topic_id:** `azd-sdk`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you unit-test code that uses Azure SDK clients, and when do you use an emulator instead?

**Answer**

SDK clients are designed for mocking: they have a **protected parameterless constructor** and their service methods are **virtual**, so Moq/NSubstitute can create test doubles; return types such as `Response<T>`, `Pageable<T>` and models come from factories (`Response.FromValue`, `BlobsModelFactory`, `ServiceBusModelFactory`, `Page<T>.FromValues`, `AsyncPageable<T>.FromPages`). Prefer testing **your own abstraction** (for example `IInvoiceStore`) with the Azure client behind it, so most tests never touch Azure types, and keep a thin adapter covered by integration tests. For realistic tests use emulators: **Azurite** (Blob, Queue, Table), the **Cosmos DB emulator**, the **Service Bus emulator** or Testcontainers, and the `Azure.Core.TestFramework` / custom `HttpPipelineTransport` to inject recorded responses. Avoid mocking too deeply (verifying SDK internals) - assert on behaviour, including 404/409/429 handling.

Real-world example: mock a BlobClient to simulate a missing blob.

```csharp
[Fact]
public async Task Returns_null_when_blob_missing()
{
    var blob = new Mock<BlobClient>();
    blob.Setup(b => b.DownloadContentAsync(It.IsAny<CancellationToken>()))
        .ThrowsAsync(new RequestFailedException(404, "not found", "BlobNotFound", null));

    var container = new Mock<BlobContainerClient>();
    container.Setup(c => c.GetBlobClient("a.pdf")).Returns(blob.Object);

    var store = new InvoiceStore(container.Object);

    Assert.Null(await store.TryGetAsync("a.pdf", CancellationToken.None));
}

// integration: Azurite via docker  -> UseDevelopmentStorage=true
var client = new BlobServiceClient("UseDevelopmentStorage=true");
```

**Keywords:** `mocking, Azure SDK, Azurite, ModelFactory, Moq, emulator, Testcontainers, Response.FromValue`

**Follow-ups:**

-   Why does the SDK make methods virtual with protected constructors?
-   When is an emulator better than a mock?
-   How do you test throttling (429) behaviour?

# TOPIC --- Azure Functions and Serverless
**topic_id:** `azd-functions`
**priority:** `Strong`

## azd-functions-001 --- How does the isolated worker model work and how do triggers and bindings fit in?

**question_id:** `azd-functions-001`\
**topic_id:** `azd-functions`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How does the Azure Functions isolated worker model work, and how do triggers, bindings and dependency injection fit in?

**Answer**

In the **isolated worker model** your function app is a normal .NET console app (`HostBuilder` + `ConfigureFunctionsWebApplication`) running in its own process, talking to the Functions host over gRPC. Benefits over the legacy in-process model (which is being retired): your own .NET version and dependency versions, full control of `Program.cs`, standard DI/configuration/logging, middleware, and ASP.NET Core integration for HTTP triggers. A **trigger** starts the function (HTTP, Timer, Service Bus, Event Hubs, Blob, Queue, Cosmos DB change feed, Event Grid); **input/output bindings** declaratively read/write data (blob, Cosmos, queue) so you avoid boilerplate. Keep functions small and **idempotent**, move business logic into injectable services, use Application Insights, configure `host.json` (batching, concurrency, retries), and prefer managed identity-based connections (`Connection="ServiceBus"` with `ServiceBus__fullyQualifiedNamespace`).

Real-world example: a Service Bus triggered function with DI and message settlement.

```csharp
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(s =>
    {
        s.AddApplicationInsightsTelemetryWorkerService();
        s.ConfigureFunctionsApplicationInsights();
        s.AddScoped<IOrderHandler, OrderHandler>();
    })
    .Build();
host.Run();

public sealed class OrderFunctions(IOrderHandler handler, ILogger<OrderFunctions> log)
{
    [Function("ProcessOrder")]
    public async Task Run(
        [ServiceBusTrigger("orders", Connection = "ServiceBus")] ServiceBusReceivedMessage message,
        ServiceBusMessageActions actions, CancellationToken ct)
    {
        var order = message.Body.ToObjectFromJson<OrderPlaced>();
        await handler.HandleAsync(order, ct);
        await actions.CompleteMessageAsync(message, cancellationToken: ct);
    }
}
```

**Keywords:** `Azure Functions, isolated worker, triggers, bindings, ConfigureFunctionsWebApplication, host.json, dependency injection, in-process retirement`

**Follow-ups:**

-   Why is the in-process model being retired?
-   How do you secure a Service Bus trigger without connection strings?
-   What belongs in host.json for a queue trigger under load?

## azd-functions-002 --- Compare hosting plans (Consumption, Flex Consumption, Premium, Dedicated) and explain cold starts.

**question_id:** `azd-functions-002`\
**topic_id:** `azd-functions`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Design`

**Question**

Compare the Azure Functions hosting plans (Consumption, Flex Consumption, Premium, Dedicated) and explain how to mitigate cold starts.

**Answer**

**Consumption**: pay per execution, scale to zero, cold starts, limited networking and execution time - legacy default. **Flex Consumption**: the modern serverless plan - per-function scaling, scale to zero *or* "always ready" instances to remove cold starts, VNet integration, configurable instance memory and higher concurrency; usually the best new default for event-driven apps. **Premium (Elastic Premium)**: pre-warmed and always-ready instances, VNet, long executions, more powerful instances at a baseline cost - for latency-sensitive production. **Dedicated (App Service plan)**: fixed instances, predictable cost, shares capacity with web apps, no scale-to-zero. **Container Apps hosting** runs functions in containers with KEDA scaling. **Cold start** is the delay loading the host, runtime and your code on a new instance; reduce it with always-ready/pre-warmed instances, smaller deployment packages (run-from-package), ReadyToRun, avoiding heavy startup work, and keeping dependencies lean. Choose by latency tolerance, networking needs, runtime limits and cost profile; verify current limits because plans evolve.

Real-world example: creating a Flex Consumption app with always-ready instances for an HTTP function.

```bash
az functionapp create -g rg-shop -n shop-orders-fn \
  --flexconsumption-location westeurope \
  --runtime dotnet-isolated --runtime-version 10.0 \
  --storage-account shopfnstorage \
  --instance-memory 2048 --maximum-instance-count 40

az functionapp scale config always-ready set -g rg-shop -n shop-orders-fn \
  --settings http=2
```

**Keywords:** `Flex Consumption, Premium plan, Consumption, Dedicated, cold start, always ready, scale to zero, VNet integration`

**Follow-ups:**

-   When would you pick Premium over Flex Consumption?
-   Which startup operations make cold starts worse?
-   How do you scale a queue-triggered function safely against a limited database?

## azd-functions-003 --- What are Durable Functions patterns and the determinism rules for orchestrators?

**question_id:** `azd-functions-003`\
**topic_id:** `azd-functions`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What are the Durable Functions application patterns, and what rules must orchestrator code follow?

**Answer**

Durable Functions add **stateful workflows as code** on Azure Functions. An **orchestrator** function coordinates **activity** functions; its progress is persisted by **event sourcing** into a task hub (Storage, Netherite or Microsoft SQL / Durable Task Scheduler), and it is **replayed** from the start after each await to rebuild state. Patterns: **function chaining**, **fan-out/fan-in** (parallel activities then aggregate), **async HTTP API** (start orchestration, poll status URL), **monitor** (recurring polling loop), **human interaction** (wait for external event with a timeout) and **aggregator/entities** (stateful actors). Because of replay, orchestrator code must be **deterministic**: no `DateTime.UtcNow` (use `context.CurrentUtcDateTime`), no `Guid.NewGuid()` (use `context.NewGuid()`), no direct I/O, `Task.Delay` or threading (use durable timers and activities), and no non-deterministic branching. Activities do the side effects and must be idempotent because they may run more than once. Use sub-orchestrations, retry policies and versioning strategies for long-lived instances.

Real-world example: fan-out/fan-in order processing with a human approval timeout.

```csharp
[Function(nameof(OrderOrchestrator))]
public static async Task<string> OrderOrchestrator([OrchestrationTrigger] TaskOrchestrationContext context)
{
    var order = context.GetInput<Order>()!;

    var tasks = order.Lines.Select(l => context.CallActivityAsync<bool>(nameof(ReserveStock), l)).ToList();
    var results = await Task.WhenAll(tasks);                       // fan-out / fan-in
    if (results.Any(r => !r)) return "OutOfStock";

    using var cts = new CancellationTokenSource();
    var approval = context.WaitForExternalEvent<bool>("Approved");
    var timeout = context.CreateTimer(context.CurrentUtcDateTime.AddHours(24), cts.Token);   // deterministic time
    var winner = await Task.WhenAny(approval, timeout);
    if (winner == approval) { cts.Cancel(); return approval.Result ? "Shipped" : "Rejected"; }
    return "ApprovalTimedOut";
}
```

**Keywords:** `Durable Functions, orchestrator, activity, fan-out fan-in, replay, determinism, durable timer, human interaction`

**Follow-ups:**

-   Why does using DateTime.UtcNow in an orchestrator break it?
-   How do you version an orchestration with running instances?
-   When is Durable Functions the wrong tool compared with Logic Apps or a saga in code?

# TOPIC --- Azure Messaging and Events
**topic_id:** `azd-messaging`
**priority:** `Core`

## azd-messaging-001 --- How do you choose between Service Bus, Event Hubs, Event Grid and Storage Queues?

**question_id:** `azd-messaging-001`\
**topic_id:** `azd-messaging`\
**difficulty:** `Senior`\
**question_type:** `Comparison / Design`

**Question**

How do you choose between Azure Service Bus, Event Hubs, Event Grid and Storage Queues?

**Answer**

Classify the message. **Commands/work items** that must be processed reliably by one consumer (order processing, payments): **Service Bus** - queues, topics/subscriptions, sessions (ordering), dead-lettering, duplicate detection, transactions, scheduled delivery, at-least-once with locks. **Streams of events/telemetry** at high volume that many consumers read at their own pace and may replay: **Event Hubs** - partitions, consumer groups, retention, capture to storage, Kafka-compatible endpoint. **Reactive notifications that something happened** (blob created, resource changed, custom domain events) with push delivery and filtering to webhooks/functions/queues: **Event Grid**. **Simple, cheap, large queues** without ordering or advanced features: **Storage Queues**. Rules of thumb: need DLQ, sessions or topics -> Service Bus; need throughput and replay -> Event Hubs; need to react to Azure events -> Event Grid; need minimal cost/simplicity -> Storage Queue. All are at-least-once, so consumers must be idempotent.

Real-world example: one business flow using three services.

```text
Blob uploaded (invoices container)
   -> Event Grid system topic "BlobCreated" (filter: subject ends with .pdf)
      -> Service Bus queue "invoice-extract"            (reliable work item, DLQ, retries)
         -> Function: Document Intelligence -> publishes "InvoiceExtracted"
            -> Service Bus topic "finance-events" (subscriptions: ledger, notifications)
Clickstream / audit telemetry
   -> Event Hubs "audit-events" (8 partitions) -> Stream Analytics / consumer groups / Capture to ADLS
```

**Keywords:** `Service Bus, Event Hubs, Event Grid, Storage Queue, messaging, event vs command, dead letter, at-least-once`

**Follow-ups:**

-   Why is "event" versus "message" a meaningful distinction here?
-   When would Event Hubs' Kafka endpoint matter?
-   How do you guarantee ordering in Service Bus?

## azd-messaging-002 --- How do you build a reliable Service Bus consumer with ServiceBusProcessor, dead-lettering and idempotency?

**question_id:** `azd-messaging-002`\
**topic_id:** `azd-messaging`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you build a reliable Service Bus consumer with ServiceBusProcessor, dead-lettering and idempotency?

**Answer**

`ServiceBusProcessor` runs a message pump with configurable concurrency. Key settings: `MaxConcurrentCalls`, `PrefetchCount` (throughput versus lock expiry risk), `AutoCompleteMessages` (disable for explicit settlement), `MaxAutoLockRenewalDuration` (for long handlers). Settlement: **Complete** on success, **Abandon** to retry (increments `DeliveryCount`), **DeadLetter** for poison/invalid messages (with reason/description) and **Defer** rarely. After `MaxDeliveryCount` Service Bus dead-letters automatically; monitor and replay the DLQ. Delivery is **at-least-once**, so make handlers **idempotent**: use `MessageId` (and enable duplicate detection on the entity) plus an inbox/idempotency table or natural keys. Distinguish transient errors (abandon, retry later) from permanent ones (dead-letter immediately). Use sessions for ordered per-key processing, scheduled messages for delays, `Subject`/application properties for routing, and an outbox on the producer side to avoid dual-write inconsistency.

Real-world example: a processor that dead-letters invalid messages and ignores duplicates.

```csharp
var processor = client.CreateProcessor("orders", new ServiceBusProcessorOptions
{
    AutoCompleteMessages = false,
    MaxConcurrentCalls = 8,
    PrefetchCount = 16,
    MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(5)
});

processor.ProcessMessageAsync += async args =>
{
    var msg = args.Message;
    OrderPlaced? order;
    try { order = msg.Body.ToObjectFromJson<OrderPlaced>(); }
    catch (JsonException) { await args.DeadLetterMessageAsync(msg, "InvalidPayload", "Body is not valid JSON"); return; }

    if (await inbox.AlreadyProcessedAsync(msg.MessageId, args.CancellationToken)) { await args.CompleteMessageAsync(msg); return; }

    await handler.HandleAsync(order!, args.CancellationToken);
    await inbox.MarkProcessedAsync(msg.MessageId, args.CancellationToken);
    await args.CompleteMessageAsync(msg);
};
processor.ProcessErrorAsync += args => { logger.LogError(args.Exception, "Service Bus error {Source}", args.ErrorSource); return Task.CompletedTask; };
await processor.StartProcessingAsync();
```

**Keywords:** `ServiceBusProcessor, dead-letter queue, MaxDeliveryCount, idempotency, duplicate detection, sessions, settlement, prefetch`

**Follow-ups:**

-   What happens if the handler runs longer than the lock duration?
-   How would you replay dead-lettered messages safely?
-   Why do you need an outbox on the sending side?

## azd-messaging-003 --- How do Event Hubs partitions, consumer groups and checkpointing work?

**question_id:** `azd-messaging-003`\
**topic_id:** `azd-messaging`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do Event Hubs partitions, consumer groups and checkpointing work, and how do you process events reliably with EventProcessorClient?

**Answer**

An Event Hub is a partitioned, append-only log. A **partition** is an ordered sequence; events with the same **partition key** land in the same partition, so ordering is guaranteed *per partition*, not globally, and the partition count caps parallelism (choose it for the target throughput up front). A **consumer group** is an independent view of the stream so several applications each read all events. `EventProcessorClient` balances partitions across processor instances and stores **checkpoints** (the last processed offset/sequence number) in Blob Storage, so a restarted instance resumes where it left off. Checkpointing gives **at-least-once** semantics: checkpoint after processing, and batch checkpoints (every N events) for throughput - events after the last checkpoint are reprocessed after a crash, so handlers must be idempotent. Plan retention, **Capture** to storage for archival, throughput/processing units, and poison-event handling (log and continue; do not block the partition).

Real-world example: an EventProcessorClient that checkpoints every 100 events.

```csharp
var checkpointStore = new BlobContainerClient(new Uri(checkpointContainerUri), credential);
var processor = new EventProcessorClient(checkpointStore, EventHubConsumerClient.DefaultConsumerGroupName,
    "shop-eh.servicebus.windows.net", "audit-events", credential);

int sinceCheckpoint = 0;
processor.ProcessEventAsync += async args =>
{
    await auditSink.WriteAsync(args.Data.EventBody.ToObjectFromJson<AuditEvent>(), args.CancellationToken);
    if (++sinceCheckpoint >= 100)
    {
        await args.UpdateCheckpointAsync(args.CancellationToken);
        sinceCheckpoint = 0;
    }
};
processor.ProcessErrorAsync += args => { logger.LogError(args.Exception, "Partition {Partition}", args.PartitionId); return Task.CompletedTask; };

await processor.StartProcessingAsync();
```

**Keywords:** `Event Hubs, partition, consumer group, checkpoint, EventProcessorClient, partition key, Capture, throughput units`

**Follow-ups:**

-   Why can't you increase the partition count freely in some tiers?
-   What data is reprocessed after a crash and how do you handle it?
-   How do you preserve per-device ordering?

# TOPIC --- Configuration, Aspire and azd Deployment
**topic_id:** `azd-deploy`
**priority:** `Strong`

## azd-deploy-001 --- How do you use Azure App Configuration, feature flags and Key Vault references together?

**question_id:** `azd-deploy-001`\
**topic_id:** `azd-deploy`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you use Azure App Configuration, feature flags and Key Vault references together in an ASP.NET Core app?

**Answer**

**Azure App Configuration** is a central store for non-secret settings and **feature flags** shared by many services and environments, with labels (per environment), snapshots, change notifications and a configuration provider that plugs into `IConfiguration`/options. **Secrets** live in **Key Vault**; App Configuration holds **Key Vault references** (URIs), and the provider resolves them with the app's managed identity, so the secret value never sits in App Configuration. Enable **dynamic refresh** with a *sentinel key* and `IOptionsSnapshot`/`IOptionsMonitor`, so a change to one key refreshes the set without restarting. **`Microsoft.FeatureManagement`** gives `IFeatureManager`, `[FeatureGate]`, filters (percentage, time window, targeting by user/group) for progressive rollouts and kill switches. Use managed identity for both stores (data-reader roles), separate stores per environment, and keep sensible defaults in code so the app starts if the store is unavailable.

Real-world example: wiring App Configuration with Key Vault references and a feature gate.

```csharp
builder.Configuration.AddAzureAppConfiguration(options =>
{
    options.Connect(new Uri(builder.Configuration["AppConfig:Endpoint"]!), credential)
           .Select("Shop:*", labelFilter: builder.Environment.EnvironmentName)
           .ConfigureKeyVault(kv => kv.SetCredential(credential))
           .ConfigureRefresh(r => r.Register("Shop:Sentinel", refreshAll: true)
                                   .SetRefreshInterval(TimeSpan.FromSeconds(30)))
           .UseFeatureFlags(f => f.SetRefreshInterval(TimeSpan.FromSeconds(30)));
});
builder.Services.AddAzureAppConfiguration();
builder.Services.AddFeatureManagement();

app.UseAzureAppConfiguration();
app.MapGet("/checkout/express", [FeatureGate("ExpressCheckout")] () => Results.Ok("Express checkout"));
```

**Keywords:** `Azure App Configuration, feature flags, Key Vault reference, Microsoft.FeatureManagement, sentinel key, dynamic refresh, managed identity`

**Follow-ups:**

-   How does the sentinel key avoid refreshing on every individual change?
-   What happens to the app when App Configuration is unreachable at startup?
-   How would you roll a feature out to 10% of users?

## azd-deploy-002 --- How do Aspire and the Azure Developer CLI (azd) take an app from your laptop to Azure?

**question_id:** `azd-deploy-002`\
**topic_id:** `azd-deploy`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do Aspire and the Azure Developer CLI (azd) take a distributed .NET app from your laptop to Azure?

**Answer**

**Aspire** describes the distributed app in C# (the **app host**): projects, containers, databases and Azure resources, plus references that inject connection strings, **service discovery** and health checks; the Aspire dashboard shows logs, traces and metrics locally. **`ServiceDefaults`** adds OpenTelemetry, health endpoints, resilience and service discovery to every service. For Azure, the **Azure Developer CLI** reads the app host and provisions infrastructure with generated **Bicep**, builds container images, pushes them to Azure Container Registry and deploys to **Azure Container Apps** (or other targets): `azd init`, `azd up` (provision + deploy), `azd deploy`, `azd down`, `azd pipeline config` (GitHub Actions/Azure Pipelines with federated credentials), `azd env` for environments. Services authenticate to Azure resources with managed identities created by the templates. Customise infrastructure (`azd infra gen` to edit the Bicep), keep secrets in Key Vault, and run the same command in CI for repeatable environments.

Real-world example: the day-one flow from repo to a running Azure environment.

```bash
# in the repo containing the Aspire app host
azd auth login
azd init                       # detects the app host, writes azure.yaml
azd env new shop-staging
azd up                         # provisions ACA environment, ACR, Key Vault, monitoring; builds and deploys
azd show                       # service URLs

azd infra gen                  # optional: materialise Bicep to customise
azd pipeline config            # set up CI/CD with OIDC (no stored secrets)
azd down --purge               # tear everything down
```

**Keywords:** `Aspire, azd, Azure Developer CLI, app host, Container Apps, Bicep, ServiceDefaults, azd up, federated credentials`

**Follow-ups:**

-   What does azd generate from the Aspire app host?
-   How does CI authenticate to Azure without a stored secret?
-   When would you not use Aspire's generated deployment and use your own Bicep?

## azd-deploy-003 --- How do you set up a productive local development environment for Azure-based .NET apps?

**question_id:** `azd-deploy-003`\
**topic_id:** `azd-deploy`\
**difficulty:** `Intermediate`\
**question_type:** `Practical`

**Question**

How do you set up a productive and secure local development environment for Azure-based .NET apps?

**Answer**

Tooling: the **.NET SDK**, **Azure CLI** (`az`) and **Azure Developer CLI** (`azd`), Visual Studio with the Azure workload or VS Code with the C# Dev Kit and Azure extensions, Docker for containers, and Bicep tooling. Run dependencies locally with emulators: **Azurite** (Blob/Queue/Table), **Cosmos DB emulator**, **Service Bus emulator**, SQL Server/Azure SQL Edge in a container, Redis; or use Aspire to start them all. Authenticate with your **developer identity** (`az login`, Visual Studio account) so `DefaultAzureCredential`/`ChainedTokenCredential` work against shared dev resources with RBAC instead of shared keys; use **user secrets** (`dotnet user-secrets`) for anything unavoidable and never commit secrets. Give each developer an isolated dev environment (per-developer resource group or `azd env`), use **dev containers** for reproducible setups, and keep a checklist in the repo README so onboarding takes minutes.

Real-world example: starting local emulators and signing in with a developer identity.

```bash
az login
az account set --subscription "Shop Dev"

docker run -d --name azurite -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite
docker run -d --name redis -p 6379:6379 redis:7

dotnet user-secrets init
dotnet user-secrets set "Stripe:ApiKey" "sk_test_xxx"

# RBAC for yourself on the dev storage account (no keys needed)
az role assignment create --assignee "$(az ad signed-in-user show --query id -o tsv)" \
  --role "Storage Blob Data Contributor" --scope "$STORAGE_ID"
```

**Keywords:** `Azure CLI, azd, Azurite, emulators, user secrets, dev containers, RBAC, developer identity`

**Follow-ups:**

-   Why prefer RBAC with your own identity over a shared storage key?
-   What are the limits of emulators compared with the real service?
-   How do you keep dev environments from accumulating cost?

# TOPIC --- Migrating .NET Apps to Azure
**topic_id:** `azd-migrate`
**priority:** `Strong`

## azd-migrate-001 --- How do you choose the right Azure hosting option for a .NET workload?

**question_id:** `azd-migrate-001`\
**topic_id:** `azd-migrate`\
**difficulty:** `Senior`\
**question_type:** `Design / Comparison`

**Question**

How do you choose the right Azure hosting option for a .NET workload (App Service, Container Apps, AKS, VMs, Functions)?

**Answer**

Match the workload to the least operational burden that meets its constraints. **App Service**: web apps and APIs (also Windows/.NET Framework), deployment slots, autoscale - the default for conventional web apps. **Azure Functions**: event-driven, short-lived, bursty work. **Container Apps**: containerised microservices, background workers, scale-to-zero and KEDA, no Kubernetes management. **AKS**: need full Kubernetes (custom operators, service mesh, GPUs, strict platform control) and the team can operate it. **Virtual Machines**: legacy or unsupported software, specific OS/agents, lift-and-shift, licensing needs. **Azure Spring/Service Fabric/Batch/HPC** for special cases. Decision inputs: runtime compatibility (.NET Framework needs Windows), state and session handling, networking/compliance, scaling profile, deployment frequency, team skills and cost model. Prefer **PaaS** first, containers when you need portability/density, and VMs last. Document the decision and revisit when requirements change.

Real-world example: a decision record captured with the project.

```text
Workload: Shop.Api (ASP.NET Core 10, stateless, 99.9% SLA, bursts at campaigns)
Options considered: App Service | Container Apps | AKS
Decision: Azure Container Apps (consumption) with min 2 replicas
Why: scale on HTTP concurrency, revisions for canary, no cluster ops, Dapr not needed
Rejected: AKS (no requirement for custom operators/GPU; ops cost), App Service (fine, but we run 7 services and want one platform)
Revisit when: multi-region active/active or service mesh policies required
```

**Keywords:** `App Service, Container Apps, AKS, Virtual Machines, Functions, hosting decision, PaaS, workload fit`

**Follow-ups:**

-   Which constraints would force you onto VMs?
-   How does the decision change for a .NET Framework 4.8 app?
-   What would make you move from Container Apps to AKS later?

## azd-migrate-002 --- Which migration strategies and tools would you use to move an on-premises ASP.NET application to Azure?

**question_id:** `azd-migrate-002`\
**topic_id:** `azd-migrate`\
**difficulty:** `Senior / Lead`\
**question_type:** `Scenario / Design`

**Question**

Which strategies and tools would you use to migrate an on-premises ASP.NET application and its SQL Server database to Azure?

**Answer**

Pick a strategy per app: **rehost** (lift and shift to VMs - fastest, least benefit), **replatform** (to App Service/Azure SQL with minimal code change - best value for most), **refactor** (to containers/microservices/serverless), **rebuild** or **replace** (SaaS). Process: **discover and assess** (Azure Migrate discovery, **Azure Migrate application and code assessment (AppCAT)** reports dependencies, framework and API compatibility, and issues by target such as App Service, Container Apps or AKS; also GitHub Copilot modernization can assess and apply upgrades), fix blockers (Windows auth, file-system state, COM/registry, MSMQ, machine-key/session state), then **migrate** the app with **App Service migration assistant** or containerisation, and the database with **Azure Database Migration Service** (online/offline) to **Azure SQL Database**, **Managed Instance** (best compatibility: SQL Agent, cross-database queries) or SQL on a VM. Plan identity (Entra ID), connectivity (VPN/ExpressRoute, private endpoints), cutover with rollback, performance baselines and cost management. Migrate incrementally with the **strangler fig** pattern for large systems.

Real-world example: run the AppCAT assessment from the CLI before deciding on a target.

```bash
# install and run the application and code assessment (AppCAT) tool
dotnet tool install -g dotnet-appcat
appcat analyze            # interactive: pick projects, choose source code and/or binary dependencies, choose targets

# review the generated report: mandatory issues first (blocking), then potential and optional ones
# typical blockers found: System.Web dependencies, Windows auth, local file writes, MSMQ

az sql mi create -g rg-shop -n shop-mi --subnet "$SUBNET_ID" --capacity 8 --tier GeneralPurpose \
  --admin-user sqladmin --admin-password "$MI_PASSWORD"
az dms project create -g rg-shop --service-name shop-dms -n sql-to-mi --source-platform SQL --target-platform SQLMI
```

**Keywords:** `rehost, replatform, refactor, Azure Migrate, AppCAT, Azure Database Migration Service, Managed Instance, strangler fig`

**Follow-ups:**

-   Why is Managed Instance often easier than Azure SQL Database for legacy apps?
-   How do you handle Windows authentication and session state?
-   How do you cut over with minimal downtime and a rollback?

## azd-migrate-003 --- How do you modernise a .NET Framework app to .NET with minimal risk?

**question_id:** `azd-migrate-003`\
**topic_id:** `azd-migrate`\
**difficulty:** `Senior`\
**question_type:** `Scenario`

**Question**

How do you modernise a large .NET Framework application to modern .NET with minimal risk while moving it to Azure?

**Answer**

Do not rewrite - **migrate incrementally**. Steps: (1) inventory and assess (Upgrade Assistant, AppCAT, API portability analyzer) and add **characterisation/integration tests** around current behaviour; (2) move libraries first to **.NET Standard 2.0 or multi-target** so both old and new apps share them; (3) update NuGet dependencies and replace unsupported technologies (WCF server -> CoreWCF or gRPC/REST, Web Forms -> Blazor or MVC, `System.Web` -> ASP.NET Core abstractions, Entity Framework 6 -> EF Core or keep EF6 on .NET 8 temporarily, `app.config` -> `IConfiguration`); (4) use the **strangler fig** with **YARP** as a reverse proxy to route migrated endpoints to the new ASP.NET Core app while the old one handles the rest, (5) containerise or deploy to App Service, add CI/CD, observability and feature flags, (6) retire the old pieces gradually. Share authentication (cookie/token interop) and sessions during coexistence. Measure performance and error rates at each step and keep rollback simple.

Real-world example: a YARP strangler proxy routing migrated paths to the new app.

```json
{
  "ReverseProxy": {
    "Routes": {
      "orders-new": { "ClusterId": "modern", "Match": { "Path": "/api/orders/{**rest}" }, "Order": 1 },
      "everything-else": { "ClusterId": "legacy", "Match": { "Path": "/{**catch-all}" }, "Order": 100 }
    },
    "Clusters": {
      "modern": { "Destinations": { "d1": { "Address": "https://shop-modern.azurewebsites.net/" } } },
      "legacy": { "Destinations": { "d1": { "Address": "https://shop-legacy.internal/" } } }
    }
  }
}
```

**Keywords:** `.NET Framework migration, Upgrade Assistant, strangler fig, YARP, .NET Standard, multi-targeting, CoreWCF, incremental modernization`

**Follow-ups:**

-   How do you share authentication between the old and new app during coexistence?
-   Which parts do you migrate first and why?
-   How do you keep the team shipping features during the migration?

# TOPIC --- Azure AI Services for .NET
**topic_id:** `azd-ai`
**priority:** `Strong`

## azd-ai-001 --- How do you call Azure OpenAI from .NET securely and what do deployments, quotas and regions mean?

**question_id:** `azd-ai-001`\
**topic_id:** `azd-ai`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How do you call Azure OpenAI from .NET securely, and what do deployments, quotas and regions mean?

**Answer**

In Azure OpenAI/Microsoft Foundry you create a **resource**, then a named **deployment** of a model (for example a chat model and an embedding model); your code addresses the **deployment name**, not the raw model name, so you can swap model versions without code changes. Deployments have a **type** (Standard regional, Global, Data Zone, Provisioned Throughput for reserved capacity) and **quota** measured in tokens per minute (and requests per minute) per region/subscription; exceeding it returns 429, so plan capacity, spread across deployments/regions and use provisioned throughput for steady high load. Authenticate with **Microsoft Entra ID** (`DefaultAzureCredential` locally, managed identity in Azure) and the **Cognitive Services OpenAI User** role - not API keys. Prefer private endpoints and disabled public access for sensitive data. Use the `Azure.AI.OpenAI` client with `AsIChatClient()` so your code stays on `Microsoft.Extensions.AI`, and monitor token usage, content-filter hits and latency per deployment.

Real-world example: assign the role and create a chat client for a deployment.

```bash
az role assignment create --assignee "$APP_IDENTITY_PRINCIPAL_ID" \
  --role "Cognitive Services OpenAI User" --scope "$OPENAI_RESOURCE_ID"
```

```csharp
var openAi = new AzureOpenAIClient(new Uri("https://shop-ai.openai.azure.com/"), credential);

IChatClient chat = openAi.GetChatClient("chat-prod").AsIChatClient();                       // deployment name
IEmbeddingGenerator<string, Embedding<float>> embed = openAi.GetEmbeddingClient("embed-prod").AsIEmbeddingGenerator();

var response = await chat.GetResponseAsync("Say hello in French.");
```

**Keywords:** `Azure OpenAI, deployment, quota, tokens per minute, provisioned throughput, Entra ID, Cognitive Services OpenAI User, AzureOpenAIClient`

**Follow-ups:**

-   Why does application code reference the deployment name?
-   What can you do when you keep hitting 429 at peak?
-   When is provisioned throughput worth the cost?

## azd-ai-002 --- How does Azure AI Search support keyword, vector and hybrid search for RAG in .NET?

**question_id:** `azd-ai-002`\
**topic_id:** `azd-ai`\
**difficulty:** `Senior`\
**question_type:** `Practical`

**Question**

How does Azure AI Search support keyword, vector and hybrid search for RAG, and how do you query it from .NET?

**Answer**

Azure AI Search is a managed search service with **inverted-index full-text (BM25)**, **vector search** (HNSW / exhaustive KNN over vector fields), and **hybrid search** that runs both and fuses results with **Reciprocal Rank Fusion**; an optional **semantic ranker** re-ranks the top results with a language model for better relevance and returns captions/answers. Indexes hold searchable text fields, filterable/facetable metadata (tenant, ACL, date) and vector fields (dimensions must match the embedding model). **Integrated vectorization** can chunk and embed during indexing and embed queries for you. Hybrid + semantic ranking usually beats pure vector search for enterprise content because exact terms (part numbers, names) and meaning both matter. Use `Azure.Search.Documents` (or the MEVD `AzureAISearch` provider), apply **security filters** in the query, size replicas/partitions for load and index size, and authenticate with managed identity (Search Index Data Reader).

Real-world example: a hybrid query with a vector, a keyword, a filter and semantic ranking.

```csharp
var searchClient = new SearchClient(new Uri(endpoint), "kb-index", credential);

ReadOnlyMemory<float> queryVector = await embeddings.GenerateVectorAsync(question);

var options = new SearchOptions
{
    Size = 5,
    Filter = $"tenantId eq '{tenantId}'",              // use parameterised/validated values in real code
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions { SemanticConfigurationName = "default" },
    VectorSearch = new VectorSearchOptions
    {
        Queries = { new VectorizedQuery(queryVector) { KNearestNeighborsCount = 50, Fields = { "contentVector" } } }
    },
    Select = { "id", "title", "content" }
};

SearchResults<KbDoc> results = await searchClient.SearchAsync<KbDoc>(question, options, ct);   // text + vector = hybrid
await foreach (var r in results.GetResultsAsync()) Console.WriteLine($"{r.Score:F2} {r.Document.Title}");
```

**Keywords:** `Azure AI Search, hybrid search, vector search, BM25, semantic ranker, RRF, HNSW, integrated vectorization, security filter`

**Follow-ups:**

-   Why is hybrid search often better than vector alone?
-   How do you restrict results to documents the user may read?
-   What must match between the index and the embedding model?

## azd-ai-003 --- Which prebuilt Azure AI services would you use from .NET for documents, speech, vision and language?

**question_id:** `azd-ai-003`\
**topic_id:** `azd-ai`\
**difficulty:** `Intermediate`\
**question_type:** `Practical / Comparison`

**Question**

Which prebuilt Azure AI services would you use from .NET for documents, speech, vision and language tasks, and when do they beat an LLM?

**Answer**

Prebuilt AI services are specialised, cheap, fast and predictable: **Azure AI Document Intelligence** extracts text, tables, key-value pairs and fields from forms and prebuilt models (invoices, receipts, IDs, contracts) with confidence scores; **Azure AI Speech** does speech-to-text, text-to-speech, translation and speaker features; **Azure AI Vision** does OCR, image analysis, tagging and object detection; **Azure AI Language** does sentiment, entity/PII recognition and redaction, summarisation, classification and conversational language understanding; **Azure AI Translator** translates; **Azure AI Content Safety** moderates text and images. Choose them when the task is narrow, volume is high, latency/cost matter, you need confidence scores and deterministic schemas, or governance prefers a purpose-built model. Use an **LLM** for open-ended reasoning, flexible extraction from highly variable text, or synthesis - and combine: Document Intelligence for layout and fields, then an LLM or rules for interpretation. Use the `Azure.AI.*` SDKs with managed identity and handle async analyse operations with `WaitUntil`.

Real-world example: extract invoice fields with Document Intelligence and check confidence.

```csharp
var client = new DocumentIntelligenceClient(new Uri(endpoint), credential);

Operation<AnalyzeResult> op = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed, "prebuilt-invoice", BinaryData.FromStream(pdfStream), cancellationToken: ct);

foreach (var doc in op.Value.Documents)
{
    doc.Fields.TryGetValue("VendorName", out var vendor);
    doc.Fields.TryGetValue("InvoiceTotal", out var total);
    if (vendor?.Confidence < 0.8f || total?.Confidence < 0.8f)
        await reviewQueue.EnqueueAsync(doc, ct);        // low confidence -> human review
    else
        await invoices.SaveAsync(vendor!.Content, total!.Content, ct);
}
```

**Keywords:** `Document Intelligence, Azure AI Speech, Azure AI Vision, Azure AI Language, Content Safety, prebuilt models, confidence score, OCR`

**Follow-ups:**

-   When would you pick Document Intelligence over sending a PDF to an LLM?
-   How do you route low-confidence results to a human?
-   How do you combine a prebuilt service with an LLM?
