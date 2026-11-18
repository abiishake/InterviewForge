# TOPIC --- Azure Compute: App Service, Functions and Containers
**topic_id:** `az-compute`
**priority:** `Core`

## az-compute-001 --- When would you choose Azure Container Apps over App Service or AKS?

**question_id:** `az-compute-001`\
**topic_id:** `az-compute`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

When would you choose Azure Container Apps over App Service or AKS?

**Answer**

App Service is the simplest home for a conventional web app or API: managed runtime, deployment slots, built-in autoscale, minimal operations. **Azure Container Apps** runs containers on a managed Kubernetes-based environment without exposing the cluster: scale-to-zero, KEDA event-driven scaling (queue length, HTTP concurrency), revisions with traffic splitting and Dapr integration. **AKS** gives full Kubernetes control (custom operators, service mesh, node-level tuning, GPU pools) at the cost of cluster operations. Rule of thumb: App Service for monolith/API, Container Apps for microservices and event-driven workers when you do not need Kubernetes APIs, AKS when platform requirements demand it. Example: a queue-consuming order processor that is idle at night fits Container Apps scaled by Service Bus queue depth.

Real-world example: a Container App scaled by Service Bus queue depth with KEDA, deployed with Bicep.

```bicep
resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'order-worker'
  location: location
  properties: {
    managedEnvironmentId: env.id
    template: {
      containers: [{ name: 'worker', image: '${acr}/order-worker:1.4', resources: { cpu: json('0.5'), memory: '1Gi' } }]
      scale: {
        minReplicas: 0
        maxReplicas: 20
        rules: [{
          name: 'queue-depth'
          custom: { type: 'azure-servicebus', metadata: { queueName: 'orders', messageCount: '50' }, auth: [{ secretRef: 'sb', triggerParameter: 'connection' }] }
        }]
      }
    }
  }
}
```

**Keywords:** `App Service, Container Apps, AKS, KEDA, scale to zero, revisions, Dapr`

**Follow-ups:**

-   How does scale-to-zero affect cold start?
-   What blocks you from moving an App Service app to Container Apps?
-   How do revisions help canary releases?

## az-compute-002 --- How do deployment slots work in Azure App Service and what are their pitfalls?

**question_id:** `az-compute-002`\
**topic_id:** `az-compute`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do deployment slots work in Azure App Service and what are their pitfalls?

**Answer**

A slot is a live instance of the app with its own host name and settings. You deploy to *staging*, warm it up, then **swap**: Azure swaps routing after the warm-up requests succeed, so production has no cold start and rollback is a second swap. Mark connection strings and secrets as **slot settings** (sticky) so they do not travel with the swap. Pitfalls: non-sticky settings pointing production at the staging database, EF migrations that are not backward compatible with the old code still running during the swap, in-memory session/cache lost on swap, and Always On/health-check warm-up not configured. Use *swap with preview* to validate with production settings before completing.

Real-world example: a staged release with a warm-up swap and one-command rollback.

```bash
az webapp deployment slot create -g rg-app -n shop-api --slot staging
az webapp deploy -g rg-app -n shop-api --slot staging --src-path api.zip
az webapp config appsettings set -g rg-app -n shop-api --slot staging --slot-settings ASPNETCORE_ENVIRONMENT=Staging
az webapp deployment slot swap -g rg-app -n shop-api --slot staging --target-slot production
# rollback = swap again
az webapp deployment slot swap -g rg-app -n shop-api --slot staging --target-slot production
```

**Keywords:** `deployment slots, swap, warm-up, slot settings, rollback, App Service`

**Follow-ups:**

-   How do you run database migrations with slot swaps?
-   What is swap with preview?
-   Which settings should be sticky?

# TOPIC --- Azure Networking: VNet, NSG, Private Endpoints and Front Door
**topic_id:** `az-networking`
**priority:** `Core`

## az-networking-001 --- How do VNets, subnets and NSGs work together to secure an Azure workload?

**question_id:** `az-networking-001`\
**topic_id:** `az-networking`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do VNets, subnets and NSGs work together to secure an Azure workload?

**Answer**

A **Virtual Network** is the private address space; **subnets** segment it by tier (web, app, data, gateway). A **Network Security Group (NSG)** is a stateful allow/deny rule list evaluated by priority and attached to a subnet or NIC; rules match source/destination, port and protocol, and default rules allow VNet-internal and outbound internet traffic while denying inbound internet. Design: only the gateway subnet accepts internet traffic, the app subnet accepts traffic only from the gateway subnet's range or an application security group, and the data subnet accepts only the app subnet on the database port. Use service tags (e.g. `Storage`, `AzureCloud`) instead of IP lists and enable NSG flow logs for auditing. NSGs are layer 3/4; add Azure Firewall or WAF for layer 7 and egress control.

Real-world example: an NSG rule that lets only the app subnet reach SQL on 1433.

```bicep
resource dataNsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-data'
  location: location
  properties: {
    securityRules: [
      { name: 'allow-app-to-sql', properties: { priority: 100, direction: 'Inbound', access: 'Allow', protocol: 'Tcp',
          sourceAddressPrefix: '10.0.2.0/24', sourcePortRange: '*', destinationAddressPrefix: '*', destinationPortRange: '1433' } }
      { name: 'deny-all-inbound', properties: { priority: 4000, direction: 'Inbound', access: 'Deny', protocol: '*',
          sourceAddressPrefix: '*', sourcePortRange: '*', destinationAddressPrefix: '*', destinationPortRange: '*' } }
    ]
  }
}
```

**Keywords:** `VNet, subnet, NSG, service tags, application security group, flow logs, Azure Firewall`

**Follow-ups:**

-   What is the difference between an NSG and Azure Firewall?
-   How do you evaluate rule priority?
-   How do you restrict egress?

## az-networking-002 --- What is a Private Endpoint and how does it differ from a service endpoint, and how does DNS fit in?

**question_id:** `az-networking-002`\
**topic_id:** `az-networking`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What is a Private Endpoint and how does it differ from a service endpoint, and how does DNS fit in?

**Answer**

A **Private Endpoint** places a private IP from your subnet in front of a PaaS resource (Storage, SQL, Key Vault), so traffic stays on the Microsoft backbone and the public endpoint can be disabled. A **service endpoint** only extends the VNet identity to the service's public endpoint and keeps using the public IP, so it cannot be reached from on-premises and does not remove the public surface. The usual gotcha is **DNS**: the resource name must resolve to the private IP, which needs a Private DNS Zone (e.g. `privatelink.database.windows.net`) linked to the VNet, and on-premises needs a conditional forwarder or Azure DNS Private Resolver. Without it clients still resolve the public IP and fail once public access is blocked.

Real-world example: a private endpoint for Azure SQL with its private DNS zone.

```bicep
resource pe 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'pe-sql'
  location: location
  properties: {
    subnet: { id: dataSubnetId }
    privateLinkServiceConnections: [{ name: 'sql', properties: { privateLinkServiceId: sqlServer.id, groupIds: ['sqlServer'] } }]
  }
}
resource zone 'Microsoft.Network/privateDnsZones@2020-06-01' = { name: 'privatelink${environment().suffixes.sqlServerHostname}', location: 'global' }
resource zoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: pe
  name: 'default'
  properties: { privateDnsZoneConfigs: [{ name: 'sql', properties: { privateDnsZoneId: zone.id } }] }
}
```

**Keywords:** `private endpoint, service endpoint, private DNS zone, privatelink, DNS resolver`

**Follow-ups:**

-   How do you troubleshoot a private endpoint that resolves to a public IP?
-   How do on-premises clients resolve it?
-   What does it cost compared with service endpoints?

## az-networking-003 --- How do Application Gateway, Front Door, Load Balancer and Traffic Manager differ, and where does a CDN fit?

**question_id:** `az-networking-003`\
**topic_id:** `az-networking`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do Application Gateway, Front Door, Load Balancer and Traffic Manager differ, and where does a CDN fit?

**Answer**

**Load Balancer** is regional layer 4. **Application Gateway** is regional layer 7 with path routing, TLS termination, cookie affinity and an optional WAF. **Front Door** is a global layer 7 entry point: anycast edge, TLS offload, WAF, caching/CDN, health-probe failover and path/host routing across regions. **Traffic Manager** is DNS-based global routing (priority, weighted, performance) with no data-path involvement and no TLS awareness. A **CDN** caches static content at the edge; Front Door Standard/Premium includes it. Typical design: Front Door with WAF globally, regional Application Gateway or internal load balancer behind it, and Private Link origins so the apps are never exposed publicly. Choose Traffic Manager only for non-HTTP protocols or simple DNS failover.

Real-world example: locking an App Service origin so only Front Door can call it (header check in ASP.NET Core).

```csharp
// Front Door adds X-Azure-FDID with your profile's unique id; reject anything else.
app.Use(async (ctx, next) =>
{
    var expected = ctx.RequestServices.GetRequiredService<IConfiguration>()["FrontDoor:Id"];
    if (ctx.Request.Headers["X-Azure-FDID"] != expected) { ctx.Response.StatusCode = 403; return; }
    await next();
});
// Also set an App Service access restriction on the 'AzureFrontDoor.Backend' service tag.
```

**Keywords:** `Application Gateway, Front Door, Load Balancer, Traffic Manager, CDN, WAF, DNS`

**Follow-ups:**

-   Why prefer Front Door over Traffic Manager for web apps?
-   How does failover time differ?
-   How do you lock an origin so only Front Door can reach it?

# TOPIC --- Azure Storage: Blob, Queue, Files, SAS and Lifecycle
**topic_id:** `az-storage`
**priority:** `Core`

## az-storage-001 --- How do shared access signatures work, and what are the safer alternatives?

**question_id:** `az-storage-001`\
**topic_id:** `az-storage`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do shared access signatures work, and what are the safer alternatives?

**Answer**

A **SAS** is a signed URL granting scoped, time-limited access to storage resources. Types: *account SAS*, *service SAS* (signed with the account key) and *user delegation SAS* (signed with Entra ID credentials, preferred). Anyone with the URL can use it until it expires, and a key-signed SAS cannot be revoked individually unless tied to a **stored access policy** or the account key is rotated. Good practice: user delegation SAS, short lifetime, minimum permissions (read-only, one blob), HTTPS only, IP range if possible. Prefer **Managed Identity with RBAC** (`Storage Blob Data Contributor`) for server-to-storage calls and use SAS only to hand a browser or third party direct upload/download, e.g. the API returns a 10-minute write-only SAS so a large file bypasses the API.

Real-world example: issuing a 10-minute write-only user delegation SAS so a browser uploads straight to Blob Storage.

```csharp
var service = new BlobServiceClient(new Uri(accountUri), new DefaultAzureCredential());
var key = await service.GetUserDelegationKeyAsync(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddMinutes(10));

var sas = new BlobSasBuilder(BlobSasPermissions.Create | BlobSasPermissions.Write, DateTimeOffset.UtcNow.AddMinutes(10))
{
    BlobContainerName = "uploads",
    BlobName = $"{userId}/{Guid.NewGuid()}.pdf",
    Protocol = SasProtocol.Https
};
var uri = new BlobUriBuilder(blobUri) { Sas = sas.ToSasQueryParameters(key, service.AccountName) }.ToUri();
```

**Keywords:** `SAS, user delegation, stored access policy, RBAC, managed identity, Blob Storage`

**Follow-ups:**

-   How do you revoke a leaked SAS?
-   Why disable shared key access?
-   How does direct-to-blob upload reduce API load?

## az-storage-002 --- How do you manage cost and retention for Blob data with access tiers and lifecycle policies?

**question_id:** `az-storage-002`\
**topic_id:** `az-storage`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do you manage cost and retention for Blob data with access tiers and lifecycle policies?

**Answer**

Blob tiers trade storage price against access price and latency: **Hot** (frequent), **Cool** (30+ days), **Cold** (90+), **Archive** (180+, hours to rehydrate). A **lifecycle management policy** is a JSON rule set on the storage account that moves blobs between tiers or deletes them based on age since creation/modification/last access, with filters by prefix or blob index tags. Combine with **soft delete**, **versioning** and **immutability** policies for protection; note early-deletion fees when moving out of Cool/Cold/Archive too soon. Example: invoices stay Hot 30 days, Cool until 1 year, Archive until the 7-year retention ends, then delete. Redundancy (LRS/ZRS/GRS/GZRS) is a separate decision driven by availability and DR needs.

Real-world example: a lifecycle rule: Cool at 30 days, Archive at 365 days, delete at 7 years.

```json
{
  "rules": [{
    "name": "invoices-retention",
    "enabled": true,
    "type": "Lifecycle",
    "definition": {
      "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["invoices/"] },
      "actions": { "baseBlob": {
        "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
        "tierToArchive": { "daysAfterModificationGreaterThan": 365 },
        "delete":        { "daysAfterModificationGreaterThan": 2555 } } }
    }
  }]
}
```

**Keywords:** `lifecycle policy, access tiers, Hot, Cool, Archive, soft delete, versioning, redundancy`

**Follow-ups:**

-   What is rehydration from Archive?
-   How does LRS differ from ZRS and GZRS?
-   How do you test a lifecycle rule safely?

## az-storage-003 --- What are Azure Queue Storage and Azure Files, and when would you pick them over Service Bus or a database?

**question_id:** `az-storage-003`\
**topic_id:** `az-storage`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are Azure Queue Storage and Azure Files, and when would you pick them over Service Bus or a database?

**Answer**

**Queue Storage** is a simple, cheap, very large HTTP queue (messages up to 64 KB, at-least-once, visibility timeout, no ordering guarantee, no topics, no dead-letter queue of its own beyond a poison queue you build). Pick it for basic work distribution; pick **Service Bus** when you need sessions/FIFO, topics and subscriptions, transactions, duplicate detection or built-in dead-lettering. **Azure Files** is a managed SMB/NFS file share, useful for lift-and-shift apps needing a shared drive or mounting into containers; it is not a replacement for Blob (object, cheap, scalable) or a database. All live in a **storage account**, which defines redundancy, networking rules and encryption for every service inside it.

Real-world example: enqueueing and processing with Queue Storage, including a poison-message check.

```csharp
var queue = new QueueClient(new Uri(queueUri), new DefaultAzureCredential());
await queue.SendMessageAsync(Convert.ToBase64String(JsonSerializer.SerializeToUtf8Bytes(job)));

QueueMessage[] batch = await queue.ReceiveMessagesAsync(maxMessages: 10, visibilityTimeout: TimeSpan.FromMinutes(2));
foreach (var m in batch)
{
    if (m.DequeueCount > 5) { await poison.SendMessageAsync(m.Body); await queue.DeleteMessageAsync(m.MessageId, m.PopReceipt); continue; }
    await HandleAsync(m);                                   // must be idempotent
    await queue.DeleteMessageAsync(m.MessageId, m.PopReceipt);
}
```

**Keywords:** `Queue Storage, Azure Files, Service Bus, storage account, visibility timeout, poison message`

**Follow-ups:**

-   How do you handle poison messages in Queue Storage?
-   When is Azure Files needed in a container?
-   What does a storage account group together?

# TOPIC --- Azure Integration: Logic Apps and API Management
**topic_id:** `az-integration`
**priority:** `Strong`

## az-integration-001 --- When do you use Logic Apps versus Azure Functions or Durable Functions?

**question_id:** `az-integration-001`\
**topic_id:** `az-integration`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

When do you use Logic Apps versus Azure Functions or Durable Functions?

**Answer**

**Logic Apps** are low-code workflows with hundreds of managed connectors (SharePoint, Dynamics, SAP, Office 365), built-in retries, run history and a designer, billed per action (Consumption) or on dedicated capacity (Standard). Choose them for integration glue, approvals and B2B/EDI where connectors save weeks. **Functions** fit custom code with tight performance control, unit testing and complex logic; **Durable Functions** add code-defined orchestration (fan-out/fan-in, human interaction, sagas). Trade-offs: Logic Apps are harder to unit test and diff, can get expensive at very high action counts, and designer JSON is awkward in code review; mitigate with Standard plan, source-controlled workflows and Bicep deployment.

Real-world example: a Durable Functions fan-out/fan-in orchestration, the code-first alternative to a Logic Apps workflow.

```csharp
[Function(nameof(ProcessOrders))]
public static async Task ProcessOrders([OrchestrationTrigger] TaskOrchestrationContext ctx)
{
    var orderIds = await ctx.CallActivityAsync<int[]>(nameof(LoadPending));
    var tasks = orderIds.Select(id => ctx.CallActivityAsync(nameof(Fulfil), id));
    await Task.WhenAll(tasks);                       // fan-out / fan-in
    await ctx.CallActivityAsync(nameof(NotifyDone));
}
```

**Keywords:** `Logic Apps, connectors, Functions, Durable Functions, orchestration, low-code`

**Follow-ups:**

-   How do you version and deploy Logic Apps?
-   What drives Logic Apps cost?
-   How are failures retried?

## az-integration-002 --- What does Azure API Management provide, and how do policies, products and subscriptions work?

**question_id:** `az-integration-002`\
**topic_id:** `az-integration`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

What does Azure API Management provide, and how do policies, products and subscriptions work?

**Answer**

APIM is a gateway plus developer portal in front of backend APIs. The gateway applies **policies** in inbound/backend/outbound/on-error pipelines: JWT validation (`validate-jwt`), rate limiting and quotas, header and body transformation, caching, mock responses, retry and circuit breaking. **Products** group APIs with terms, while **subscriptions** issue keys so consumers can be identified and throttled. Versions and revisions let you evolve APIs without breaking clients. Use it to centralise authentication, throttling and observability so backends stay simple. Keep policies in source control, deploy via Bicep/DevOps, use a self-hosted gateway for on-premises backends, and avoid heavy business logic in policy XML.

Real-world example: an APIM inbound policy that validates a JWT, rate-limits per subscription and hides the backend key.

```xml
<inbound>
  <base />
  <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
    <openid-config url="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration" />
    <required-claims><claim name="aud"><value>api://orders</value></claim></required-claims>
  </validate-jwt>
  <rate-limit-by-key calls="100" renewal-period="60" counter-key="@(context.Subscription.Id)" />
  <set-header name="x-functions-key" exists-action="override"><value>{{backend-key}}</value></set-header>
</inbound>
```

**Keywords:** `API Management, policies, validate-jwt, rate limit, products, subscriptions, versions`

**Follow-ups:**

-   How do you protect backends so they only accept APIM traffic?
-   Difference between versions and revisions?
-   When is APIM overkill?

# TOPIC --- Azure Security: Entra ID, Key Vault and RBAC
**topic_id:** `az-security`
**priority:** `Core`

## az-security-001 --- How do you use Key Vault from a .NET app without storing any secret in configuration?

**question_id:** `az-security-001`\
**topic_id:** `az-security`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do you use Key Vault from a .NET app without storing any secret in configuration?

**Answer**

Give the app a **Managed Identity** and grant it a data-plane role on the vault (`Key Vault Secrets User` with the RBAC permission model rather than legacy access policies). In code use `DefaultAzureCredential` (managed identity in Azure, developer login locally) with `AddAzureKeyVault(new Uri(vaultUri), new DefaultAzureCredential())` so secrets load into `IConfiguration`, or use **Key Vault references** in App Service settings so the platform resolves them. Enable soft delete and purge protection, keep secrets, keys and certificates in separate vaults per environment, restrict network access with private endpoints, and log access to Log Analytics. Rotation: Key Vault supports expiry events through Event Grid; apps should reload or restart on rotation and never cache forever.

Real-world example: loading Key Vault secrets into configuration with managed identity.

```csharp
var builder = WebApplication.CreateBuilder(args);
var vault = new Uri(builder.Configuration["KeyVault:Uri"]!);
builder.Configuration.AddAzureKeyVault(vault, new DefaultAzureCredential());   // managed identity in Azure, az login locally

// Secret named ConnectionStrings--Default maps to ConnectionStrings:Default
builder.Services.AddDbContext<AppDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

**Keywords:** `Key Vault, managed identity, DefaultAzureCredential, RBAC, secret rotation, private endpoint`

**Follow-ups:**

-   What happens when the vault is unavailable at startup?
-   How do you rotate a certificate with zero downtime?
-   Access policies versus RBAC?

## az-security-002 --- How do Azure RBAC and Entra ID roles differ, and how do you apply least privilege?

**question_id:** `az-security-002`\
**topic_id:** `az-security`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do Azure RBAC and Entra ID roles differ, and how do you apply least privilege?

**Answer**

**Entra ID roles** control directory resources (users, apps, groups). **Azure RBAC** controls Azure resources through role assignments of *principal + role + scope* (management group, subscription, resource group, resource) and inherits downward. Apply least privilege by assigning built-in roles to **groups**, not individuals, at the narrowest scope; use **Privileged Identity Management** for just-in-time elevation; separate management-plane from data-plane roles; use managed identities for workloads and conditional access plus MFA for humans. Audit with Activity Log and access reviews, and avoid `Owner` on subscriptions for pipelines - give the deployment identity `Contributor` on specific resource groups.

Real-world example: granting a deployment identity least-privilege access with a role assignment.

```bash
# Contributor only on one resource group, assigned to a group rather than to individuals
az role assignment create --assignee-object-id $PIPELINE_SP_OBJECT_ID --assignee-principal-type ServicePrincipal \
  --role "Contributor" --scope /subscriptions/$SUB/resourceGroups/rg-shop-prod
# Data-plane access for the app identity
az role assignment create --assignee $APP_MI_PRINCIPAL_ID --role "Key Vault Secrets User" \
  --scope /subscriptions/$SUB/resourceGroups/rg-shop-prod/providers/Microsoft.KeyVault/vaults/kv-shop-prod
```

**Keywords:** `RBAC, Entra ID, PIM, least privilege, scope, managed identity, conditional access`

**Follow-ups:**

-   Why avoid custom roles where possible?
-   How do deny assignments work?
-   How do you give a pipeline minimal rights?

# TOPIC --- Azure Data: Azure SQL, Cosmos DB and Cache for Redis
**topic_id:** `az-data`
**priority:** `Core`

## az-data-001 --- How do you choose a Cosmos DB partition key and consistency level?

**question_id:** `az-data-001`\
**topic_id:** `az-data`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you choose a Cosmos DB partition key and consistency level?

**Answer**

Cosmos DB scales through **logical partitions** (all items sharing a partition-key value) mapped to physical partitions. A good key has high cardinality, spreads requests and storage evenly, and appears in most queries so they avoid cross-partition fan-out; a 20 GB logical-partition limit and hot keys are the main risks. Example: `tenantId` for multi-tenant data, or a synthetic `tenantId_month` key when one tenant is huge. Cost is measured in **RUs**, so model access patterns first. **Consistency levels** trade latency and availability against freshness: strong, bounded staleness, session (default, read-your-writes within a session), consistent prefix, eventual. Most apps use session; choose strong only when needed, as it limits multi-region writes.

Real-world example: a Cosmos DB container using a hierarchical partition key and a point read by id and key.

```csharp
var container = (await db.CreateContainerIfNotExistsAsync(
    new ContainerProperties("orders", new List<string> { "/tenantId", "/customerId" }) { DefaultTimeToLive = -1 })).Container;

// Cheapest operation: point read with id + partition key (~1 RU for 1 KB)
var response = await container.ReadItemAsync<Order>(id, new PartitionKeyBuilder().Add(tenantId).Add(customerId).Build());
Console.WriteLine($"RU charge: {response.RequestCharge}");
```

**Keywords:** `Cosmos DB, partition key, RU, consistency levels, session, hot partition, cross-partition query`

**Follow-ups:**

-   How do you fix a hot partition?
-   What is the change feed?
-   How do you estimate RU needs?

## az-data-002 --- How do you use Azure Cache for Redis safely: sizing, eviction, persistence and failover?

**question_id:** `az-data-002`\
**topic_id:** `az-data`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do you use Azure Cache for Redis safely: sizing, eviction, persistence and failover?

**Answer**

Pick a tier by memory, throughput and availability needs (Standard replicates to a replica; Premium/Enterprise add clustering, persistence and zone redundancy). Set an eviction policy (`volatile-lru` or `allkeys-lru` for caches), give every key a TTL, and keep values small to avoid blocking the single-threaded server with large commands. Treat Redis as a **cache, not the system of record** unless persistence is configured and the data is reconstructible. In .NET reuse one `ConnectionMultiplexer`, enable retries and `abortConnect=false`, and handle failover by retrying with backoff. Add cache-aside with stampede protection (lock or jittered TTL) and watch evicted keys, server load and connected clients.

Real-world example: cache-aside with a jittered TTL and a single shared multiplexer.

```csharp
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(
    new ConfigurationOptions { EndPoints = { redisHost }, Ssl = true, AbortOnConnectFail = false, ConnectRetry = 3 }));

public async Task<Product?> GetAsync(int id)
{
    var db = _redis.GetDatabase();
    var cached = await db.StringGetAsync($"product:{id}");
    if (cached.HasValue) return JsonSerializer.Deserialize<Product>(cached!);

    var product = await _repo.FindAsync(id);
    var ttl = TimeSpan.FromMinutes(10) + TimeSpan.FromSeconds(Random.Shared.Next(0, 60));   // jitter avoids stampedes
    await db.StringSetAsync($"product:{id}", JsonSerializer.Serialize(product), ttl);
    return product;
}
```

**Keywords:** `Redis, eviction, TTL, ConnectionMultiplexer, failover, cache-aside, persistence`

**Follow-ups:**

-   How do you prevent a cache stampede?
-   What happens during a patching failover?
-   Why avoid KEYS in production?

## az-data-003 --- How do you design Azure SQL high availability, backup/restore and point-in-time recovery?

**question_id:** `az-data-003`\
**topic_id:** `az-data`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you design Azure SQL high availability, backup/restore and point-in-time recovery?

**Answer**

Azure SQL provides built-in HA (zone-redundant option, automatic failover within a region) and **automated backups** (full weekly, differential, log every few minutes) retained 7-35 days for **point-in-time restore (PITR)**, with optional long-term retention for years. Restore always creates a *new* database, so plan the cut-over (rename or change connection string). For regional DR use **active geo-replication** or **failover groups** with a stable listener endpoint, and define RPO (seconds, async replication) and RTO. Test restores regularly, protect against accidental deletes with locks, and remember that backups do not protect against application-level corruption you notice late, so keep retention long enough.

Real-world example: a point-in-time restore and a failover group created with the Azure CLI.

```bash
az sql db restore -g rg-data --server sql-prod --name shopdb --dest-name shopdb-restored \
  --time "2026-11-10T08:15:00Z"
az sql failover-group create -g rg-data -s sql-prod-weu --name fog-shop \
  --partner-server sql-prod-neu --add-db shopdb --failover-policy Automatic --grace-period 1
# apps use fog-shop.database.windows.net so no connection-string change is needed on failover
```

**Keywords:** `Azure SQL, PITR, backup, restore, geo-replication, failover group, RPO, RTO`

**Follow-ups:**

-   What is the RPO of geo-replication?
-   How do you restore a single dropped table?
-   Elastic pool versus single database?

# TOPIC --- Azure Observability: Application Insights, Monitor and Log Analytics
**topic_id:** `az-observability`
**priority:** `Core`

## az-observability-001 --- How do Application Insights, Azure Monitor and Log Analytics relate, and how do you instrument a .NET API?

**question_id:** `az-observability-001`\
**topic_id:** `az-observability`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do Application Insights, Azure Monitor and Log Analytics relate, and how do you instrument a .NET API?

**Answer**

**Azure Monitor** is the umbrella platform for metrics and logs. **Log Analytics** is the workspace that stores logs and is queried with **KQL**. **Application Insights** is the APM feature (requests, dependencies, exceptions, traces, availability tests) and is workspace-based, so its telemetry lands in Log Analytics. For .NET use the Azure Monitor OpenTelemetry distro (`UseAzureMonitor()`) or the Application Insights SDK to get automatic request/dependency telemetry, correlation via W3C `traceparent`, and custom metrics. Control cost with sampling, daily caps and per-table retention. Build alerts on KQL queries and metrics, workbooks for dashboards, and use the Application Map and transaction search to trace a failing request end-to-end.

Real-world example: wiring Application Insights through the OpenTelemetry distro with sampling.

```csharp
builder.Services.AddOpenTelemetry().UseAzureMonitor(o =>
{
    o.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    o.SamplingRatio = 0.25f;                       // keep 25% of traces to control cost
});
builder.Services.ConfigureOpenTelemetryTracerProvider(t => t.AddSource("Shop.Orders"));
```

**Keywords:** `Application Insights, Azure Monitor, Log Analytics, KQL, OpenTelemetry, sampling, correlation`

**Follow-ups:**

-   How does sampling affect metrics accuracy?
-   Write a KQL query for p95 latency by operation.
-   How do you correlate logs across services?

## az-observability-002 --- Write and explain a KQL query to find the slowest operations and failure rate in the last hour.

**question_id:** `az-observability-002`\
**topic_id:** `az-observability`\
**difficulty:** `Senior / Lead`\
**question_type:** `Practical`

**Question**

Write and explain a KQL query to find the slowest operations and failure rate in the last hour.

**Answer**

```kusto
requests
| where timestamp > ago(1h)
| summarize total = count(),
            failed = countif(success == false),
            p95 = percentile(duration, 95)
          by operation_Name
| extend failureRate = round(100.0 * failed / total, 2)
| order by p95 desc
| take 10
```
`requests` holds incoming operations; `summarize ... by` aggregates per operation; `percentile` gives tail latency, which is more honest than average. Join to `dependencies` or `exceptions` on `operation_Id` to see which downstream call caused the slowness. Turn the query into a log alert with a threshold and action group, and pin it to a workbook. Beware sampling: use `itemCount` (`sum(itemCount)`) when Application Insights sampling is active.

**Keywords:** `KQL, requests, percentile, summarize, operation_Id, itemCount, alerts`

**Follow-ups:**

-   How do you join requests and dependencies?
-   Why use p95 instead of average?
-   How do you alert on it?

# TOPIC --- Azure Infrastructure as Code: ARM Templates and Bicep
**topic_id:** `az-infrastructure`
**priority:** `Strong`

## az-infrastructure-001 --- What are ARM templates, and why is Bicep preferred for authoring them?

**question_id:** `az-infrastructure-001`\
**topic_id:** `az-infrastructure`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What are ARM templates, and why is Bicep preferred for authoring them?

**Answer**

**ARM templates** are declarative JSON deployed through Azure Resource Manager: you describe desired resources, ARM works out dependencies and applies them idempotently, supporting parameters, variables, outputs, deployment scopes and modes (Incremental by default, Complete deletes unlisted resources). JSON is verbose and hard to review. **Bicep** is a DSL that compiles to ARM, with concise syntax, automatic dependency inference via symbolic references, modules for reuse, type checking and first-day support for new resource types. Use `what-if` before deploying, parameter files per environment, modules from a registry, and deploy through a pipeline with a least-privilege service connection. Prefer Incremental mode and be deliberate with Complete mode.

Real-world example: a small Bicep file with a parameter, a variable, a resource and an output.

```bicep
param location string = resourceGroup().location
param sku string = 'B1'
var planName = 'plan-${uniqueString(resourceGroup().id)}'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: { name: sku }
}
output planId string = plan.id
```

**Keywords:** `ARM template, Bicep, what-if, modules, incremental mode, declarative, idempotent`

**Follow-ups:**

-   How do you share Bicep modules across teams?
-   What does what-if show?
-   When would Terraform be better?

## az-infrastructure-002 --- How do you structure a multi-environment Azure deployment with Bicep modules and a CI/CD pipeline?

**question_id:** `az-infrastructure-002`\
**topic_id:** `az-infrastructure`\
**difficulty:** `Senior / Lead`\
**question_type:** `Scenario`

**Question**

How do you structure a multi-environment Azure deployment with Bicep modules and a CI/CD pipeline?

**Answer**

Create small modules (app service plan + app, SQL, Key Vault, networking) and a `main.bicep` per workload that composes them, with a `.bicepparam` file per environment (dev/test/prod) for SKUs, names and scale. The pipeline runs `az bicep build`/lint, `az deployment group what-if` on pull requests, then deploys to dev automatically and to prod after an approval gate, using a federated identity (OIDC) instead of stored secrets. Keep state in Azure itself (no state file), tag resources, use naming conventions with a unique suffix, and protect critical resources with locks and policy. Separate pipelines or stages for foundation (networking, vaults) and application layers to limit blast radius.

Real-world example: a pipeline that runs what-if on pull requests and deploys with OIDC.

```yaml
- task: AzureCLI@2
  displayName: What-if
  inputs:
    azureSubscription: 'oidc-shop-prod'          # workload identity federation, no secret
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az deployment group what-if -g rg-shop-$(env) -f infra/main.bicep -p infra/$(env).bicepparam
- task: AzureCLI@2
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  displayName: Deploy
  inputs:
    azureSubscription: 'oidc-shop-prod'
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: az deployment group create -g rg-shop-$(env) -f infra/main.bicep -p infra/$(env).bicepparam
```

**Keywords:** `Bicep, modules, parameter files, what-if, pipeline, OIDC, environments`

**Follow-ups:**

-   How do you avoid drift from portal changes?
-   How do you deploy secrets to Key Vault from a pipeline?
-   How do you test a Bicep module?
