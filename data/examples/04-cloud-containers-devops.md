# Real-world code examples: Azure, AWS, Docker, Kubernetes and DevOps

## azure-001
Choosing the hosting model by workload: an HTTP API on App Service, a queue-triggered job on Functions, a multi-service platform on AKS.

```bicep
// App Service: steady web API, predictable scaling, minimal ops
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = { name: 'plan-api', location: location, sku: { name: 'P1v3' }, kind: 'linux' }
resource api 'Microsoft.Web/sites@2023-12-01' = {
  name: 'app-claims-api', location: location, identity: { type: 'SystemAssigned' }
  properties: { serverFarmId: plan.id, httpsOnly: true, siteConfig: { linuxFxVersion: 'DOTNETCORE|10.0', healthCheckPath: '/health/ready' } }
}
```

```csharp
// Functions: spiky, event-driven work that scales to zero
[Function("ProcessClaimDocument")]
public async Task Run([ServiceBusTrigger("claim-documents", Connection = "ServiceBus")] ServiceBusReceivedMessage msg, FunctionContext ctx) { /* OCR + index */ }
// AKS: choose when you need many services, custom networking, sidecars or portability, and have the platform team to run it.
```

## azure-002
Managed Identity: no secrets in config. The app authenticates to Key Vault and SQL as itself.

```csharp
var credential = new DefaultAzureCredential();          // system-assigned MI in Azure, developer login locally
builder.Configuration.AddAzureKeyVault(new Uri("https://kv-claims.vault.azure.net/"), credential);

var blob = new BlobServiceClient(new Uri("https://stclaims.blob.core.windows.net"), credential);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer("Server=tcp:sql-claims.database.windows.net;Database=Claims;Authentication=Active Directory Default;Encrypt=True"));
```

```bash
# Grant the identity least-privilege RBAC (no keys distributed)
az role assignment create --assignee-object-id $PRINCIPAL_ID --role "Storage Blob Data Contributor" \
  --scope /subscriptions/$SUB/resourceGroups/rg-claims/providers/Microsoft.Storage/storageAccounts/stclaims
```

## azure-003
A secure Azure reference setup: private endpoints, no public SQL, WAF in front, secrets in Key Vault.

```bicep
resource sql 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: 'sql-claims', location: location
  properties: { publicNetworkAccess: 'Disabled', minimalTlsVersion: '1.2', administrators: { azureADOnlyAuthentication: true, administratorType: 'ActiveDirectory', principalType: 'Group', login: 'sql-admins', sid: adminGroupId, tenantId: tenant().tenantId } }
}
resource pe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'pe-sql', location: location
  properties: { subnet: { id: dataSubnetId }, privateLinkServiceConnections: [{ name: 'sql', properties: { privateLinkServiceId: sql.id, groupIds: ['sqlServer'] } }] }
}
// Traffic: Front Door + WAF -> App Service (VNet integrated, access restricted to Front Door) -> private endpoints (SQL, Key Vault, Storage)
// Controls: Defender for Cloud, diagnostic settings to Log Analytics, Azure Policy to deny public endpoints.
```

## azure-004
Picking the right messaging service: Service Bus for commands, Event Grid for reactive events, Event Hubs for telemetry streams.

```csharp
// Service Bus: reliable business messages (ordering, sessions, DLQ)
await serviceBusSender.SendMessageAsync(new ServiceBusMessage(JsonSerializer.Serialize(new ChargeCard(orderId))));

// Event Grid: "something happened" notifications fanned out with filters (blob created, resource changed)
await eventGridPublisher.SendEventAsync(new EventGridEvent("orders/42", "Order.Shipped", "1.0", new { orderId = 42 }));

// Event Hubs: high-volume ordered streams (IoT telemetry, clickstream) consumed by partition
await producer.SendAsync(new[] { new EventData(BinaryData.FromObjectAsJson(reading)) }, new SendEventOptions { PartitionKey = reading.DeviceId });

// Storage Queue: simple, cheap, huge backlog, no ordering/DLQ features: background tasks with low guarantees
await queueClient.SendMessageAsync(Convert.ToBase64String(Encoding.UTF8.GetBytes("resize:img-1")));
```

## azure-005
High availability and DR for Azure SQL: zone redundancy, an auto-failover group, and app-side retry.

```bicep
resource db 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlPrimary, name: 'Claims', location: location
  sku: { name: 'BusinessCritical', tier: 'BusinessCritical', capacity: 4 }
  properties: { zoneRedundant: true }                       // survives a datacenter (zone) failure with no data loss
}
resource fog 'Microsoft.Sql/servers/failoverGroups@2023-08-01-preview' = {
  parent: sqlPrimary, name: 'fog-claims'
  properties: { partnerServers: [{ id: sqlSecondary.id }], readWriteEndpoint: { failoverPolicy: 'Automatic', failoverWithDataLossGracePeriodMinutes: 60 }, databases: [db.id] }
}
```

```csharp
// Connect to the failover group listener (fog-claims.database.windows.net) and enable transient-fault retry
o.UseSqlServer(cs, sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null));
```

## azure-006
Azure Functions: a queue-triggered function on a Consumption/Flex plan and a Durable Functions fan-out/fan-in orchestration.

```csharp
[Function("StartImport")]
public static async Task<HttpResponseData> Start([HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req, [DurableClient] DurableTaskClient client)
{
    var id = await client.ScheduleNewOrchestrationInstanceAsync(nameof(ImportOrchestrator), await req.ReadAsStringAsync());
    return await client.CreateCheckStatusResponseAsync(req, id);          // 202 + status URLs
}

[Function(nameof(ImportOrchestrator))]
public static async Task<int> ImportOrchestrator([OrchestrationTrigger] TaskOrchestrationContext ctx)
{
    var files = await ctx.CallActivityAsync<string[]>(nameof(ListFiles), null);
    var tasks = files.Select(f => ctx.CallActivityAsync<int>(nameof(ImportFile), f));        // fan-out
    var counts = await Task.WhenAll(tasks);                                                    // fan-in (state checkpointed, replay-safe)
    return counts.Sum();
}
// Orchestrator code must be deterministic: no DateTime.Now, Guid.NewGuid or direct I/O (use ctx.CurrentUtcDateTime and activities).
```

## aws-001
Azure to AWS service mapping you can express in infrastructure code.

```text
Azure App Service / Container Apps   ->  AWS Elastic Beanstalk / App Runner / ECS Fargate
Azure Functions                      ->  AWS Lambda
AKS                                  ->  Amazon EKS
Azure SQL Database                   ->  Amazon RDS for SQL Server / Aurora
Cosmos DB                            ->  DynamoDB
Azure Service Bus                    ->  Amazon SQS + SNS (or Amazon MQ)
Event Hubs                           ->  Kinesis Data Streams / MSK (Kafka)
Blob Storage                         ->  Amazon S3
Key Vault                            ->  AWS Secrets Manager / KMS
Entra ID managed identity            ->  IAM role (instance/task/IRSA)
Application Insights                 ->  CloudWatch + X-Ray (or OpenTelemetry to any backend)
```

```csharp
// Equivalent code shape: SDK clients use the ambient role credentials
var s3 = new AmazonS3Client();                      // credentials resolved from the task/instance role
await s3.PutObjectAsync(new PutObjectRequest { BucketName = "claims-docs", Key = $"{claimId}/photo.jpg", InputStream = stream });
```

## aws-002
Multi-cloud pain points show up in code: put provider differences behind a port and keep the domain clean.

```csharp
public interface IObjectStore                      // port: the application depends on this only
{
    Task PutAsync(string key, Stream data, CancellationToken ct);
    Task<Stream> GetAsync(string key, CancellationToken ct);
}
public sealed class S3ObjectStore(IAmazonS3 s3, string bucket) : IObjectStore { /* AWS adapter */ }
public sealed class BlobObjectStore(BlobContainerClient container) : IObjectStore { /* Azure adapter */ }

builder.Services.AddSingleton<IObjectStore>(sp => builder.Configuration["Cloud"] == "aws"
    ? new S3ObjectStore(sp.GetRequiredService<IAmazonS3>(), "claims-docs")
    : new BlobObjectStore(sp.GetRequiredService<BlobServiceClient>().GetBlobContainerClient("claims-docs")));
// Real costs of multi-cloud: IAM models, networking, observability, data egress fees and the lowest-common-denominator trap.
```

## aws-003
Cloud-native means managed services, stateless compute, config in the environment and automation: a twelve-factor ECS service.

```yaml
# ECS task definition fragment: stateless container, config via env/secrets, logs to stdout, health check, autoscaling target
containerDefinitions:
  - name: api
    image: 123456789012.dkr.ecr.eu-west-1.amazonaws.com/claims-api:1.8.2     # immutable, versioned image
    portMappings: [{ containerPort: 8080 }]
    environment: [{ name: ASPNETCORE_ENVIRONMENT, value: Production }]
    secrets: [{ name: ConnectionStrings__Default, valueFrom: arn:aws:secretsmanager:eu-west-1:123456789012:secret:claims/db }]
    healthCheck: { command: ["CMD-SHELL", "curl -f http://localhost:8080/health/live || exit 1"], interval: 15, retries: 3 }
    logConfiguration: { logDriver: awslogs, options: { awslogs-group: /ecs/claims-api, awslogs-region: eu-west-1 } }
```

## aws-004
IAM: a least-privilege policy attached to a role the workload assumes, compared with an Azure RBAC assignment.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "ReadWriteClaimDocs", "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"], "Resource": "arn:aws:s3:::claims-docs/*" },
    { "Sid": "ReadOneSecret", "Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": "arn:aws:secretsmanager:eu-west-1:123456789012:secret:claims/db-*" },
    { "Sid": "DenyUnencryptedUploads", "Effect": "Deny", "Action": "s3:PutObject", "Resource": "arn:aws:s3:::claims-docs/*", "Condition": { "Null": { "s3:x-amz-server-side-encryption": "true" } } }
  ]
}
```

```bash
# Azure equivalent: role assignment at a scope for a managed identity
az role assignment create --assignee $MI_PRINCIPAL --role "Storage Blob Data Contributor" --scope $STORAGE_ID
```

## aws-005
Messaging and storage mapping in code: SQS/SNS for queues and topics, S3 for blobs, EventBridge for event routing.

```csharp
// SNS topic -> SQS queues (fan-out), the SNS+SQS pattern equals a Service Bus topic with subscriptions
await sns.PublishAsync(new PublishRequest { TopicArn = orderTopicArn, Message = json, MessageAttributes = { ["type"] = new() { DataType = "String", StringValue = "OrderPlaced" } } });

var received = await sqs.ReceiveMessageAsync(new ReceiveMessageRequest { QueueUrl = billingQueueUrl, MaxNumberOfMessages = 10, WaitTimeSeconds = 20, VisibilityTimeout = 60 });   // long polling
foreach (var m in received.Messages) { await HandleAsync(m); await sqs.DeleteMessageAsync(billingQueueUrl, m.ReceiptHandle); }       // delete = complete

var url = s3.GetPreSignedURL(new GetPreSignedUrlRequest { BucketName = "claims-docs", Key = key, Expires = DateTime.UtcNow.AddMinutes(10), Verb = HttpVerb.GET });
// Dead-letter: configure RedrivePolicy { maxReceiveCount: 5, deadLetterTargetArn } on the queue.
```

## aws-006
Lambda for .NET: reduce cold starts with a small package, ReadyToRun/Native AOT, and static initialization.

```csharp
public sealed class Function
{
    private static readonly IAmazonDynamoDB Db = new AmazonDynamoDBClient();            // created once per execution environment (reused across invocations)
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<APIGatewayHttpApiV2ProxyResponse> Handler(APIGatewayHttpApiV2ProxyRequest req, ILambdaContext ctx)
    {
        var id = req.PathParameters["id"];
        var item = await Db.GetItemAsync("Orders", new() { ["Id"] = new() { S = id } });
        return new() { StatusCode = item.Item.Count == 0 ? 404 : 200, Body = JsonSerializer.Serialize(item.Item.ToDto(), Json) };
    }
}
```

```xml
<!-- csproj: ReadyToRun cuts JIT time; Native AOT gives the fastest cold start when your dependencies are trim-safe -->
<PropertyGroup><PublishReadyToRun>true</PublishReadyToRun><TieredPGO>false</TieredPGO><InvariantGlobalization>true</InvariantGlobalization></PropertyGroup>
```

## aws-007
RDS/Aurora/DynamoDB differences and keeping the databases private inside a VPC.

```hcl
resource "aws_db_instance" "claims" {
  engine                 = "sqlserver-se"
  instance_class         = "db.m6i.xlarge"
  multi_az               = true
  publicly_accessible    = false                        # reachable only inside the VPC
  db_subnet_group_name   = aws_db_subnet_group.private.name
  vpc_security_group_ids = [aws_security_group.db.id]
  storage_encrypted      = true
}
resource "aws_security_group_rule" "api_to_db" {
  type = "ingress"; from_port = 1433; to_port = 1433; protocol = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.api.id    # only the API tasks may connect
}
```

```csharp
// DynamoDB: design around access patterns (single-table design). Query by partition key, never scan.
await db.QueryAsync(new QueryRequest { TableName = "Orders", KeyConditionExpression = "PK = :c AND begins_with(SK, :p)", ExpressionAttributeValues = { [":c"] = new() { S = "CUST#77" }, [":p"] = new() { S = "ORDER#" } } });
```

## docker-001
A production Dockerfile for ASP.NET Core: multi-stage, restore cached separately, non-root, small runtime image.

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/Claims.Api/Claims.Api.csproj", "src/Claims.Api/"]
RUN dotnet restore "src/Claims.Api/Claims.Api.csproj"           # cached until the csproj changes
COPY . .
RUN dotnet publish "src/Claims.Api/Claims.Api.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
USER $APP_UID                                                    # non-root user provided by the base image
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD curl -f http://localhost:8080/health/live || exit 1
ENTRYPOINT ["dotnet", "Claims.Api.dll"]
```

## docker-002
Image versus container: one immutable image, many ephemeral containers; data must live outside the container filesystem.

```bash
docker build -t claims-api:1.8.2 .                       # image = read-only layers (the artifact you ship)
docker run -d --name api-1 -p 8081:8080 claims-api:1.8.2 # container = a running instance with a writable layer
docker run -d --name api-2 -p 8082:8080 claims-api:1.8.2 # same image, second instance

docker rm -f api-1                                       # writable layer (and any data written inside it) is gone
docker run -d -v claims-data:/data claims-api:1.8.2      # volume survives container replacement

docker image ls claims-api; docker history claims-api:1.8.2
```

## docker-003
Works locally, fails in production: a systematic check from the container outward.

```bash
docker ps -a --filter name=claims-api                  # exited? restarting? exit code (137 = OOMKilled, 139 = segfault)
docker logs --tail 200 claims-api                      # app errors and startup configuration failures
docker inspect claims-api --format '{{.State.OOMKilled}} {{.HostConfig.Memory}}'
docker exec -it claims-api printenv | sort             # missing/different environment variables, connection strings
docker exec claims-api sh -c 'getent hosts sql.internal && nc -zv sql.internal 1433'   # DNS + network reachability
docker exec claims-api ls -l /app /data                # file permissions for the non-root user, missing mounted files
docker run --rm -it --entrypoint sh claims-api:1.8.2   # inspect the image the way production sees it
# Typical causes: env vars, non-root permissions, DNS/firewall, memory limit, different image tag, time zone/culture settings.
```

## docker-004
Multi-stage builds, layer caching order and a `.dockerignore` for fast, small images.

```dockerfile
# Order layers from least to most frequently changed so the cache survives code edits
COPY *.sln .
COPY src/Claims.Api/*.csproj src/Claims.Api/
COPY src/Claims.Domain/*.csproj src/Claims.Domain/
RUN dotnet restore                                   # only re-runs when a project file changes
COPY src/ src/                                       # source changes invalidate only the layers below
RUN dotnet publish src/Claims.Api -c Release -o /out --no-restore
```

```text
# .dockerignore: keep the build context tiny and keep secrets out of the image
**/bin
**/obj
.git
.vs
**/*.user
**/appsettings.Development.json
**/node_modules
*.md
```

## docker-005
Docker Compose for a local .NET stack: API, SQL Server and Redis on one network with named volumes.

```yaml
services:
  api:
    build: .
    ports: ["8080:8080"]
    environment:
      ConnectionStrings__Default: "Server=sql;Database=Claims;User Id=sa;Password=${SA_PASSWORD};TrustServerCertificate=True"
      Redis__Configuration: "redis:6379"
    depends_on:
      sql: { condition: service_healthy }
      redis: { condition: service_started }
  sql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment: { ACCEPT_EULA: "Y", MSSQL_SA_PASSWORD: "${SA_PASSWORD}" }
    volumes: ["sqldata:/var/opt/mssql"]
    healthcheck: { test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P $$MSSQL_SA_PASSWORD -Q 'SELECT 1'"], interval: 10s, retries: 10 }
  redis:
    image: redis:7-alpine
volumes: { sqldata: {} }
```

## docker-006
Hardening: non-root, read-only filesystem, dropped capabilities, pinned digests and a vulnerability scan in CI.

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:<digest> AS runtime       # pin by digest for reproducible builds
USER 1654                                                                  # never run as root
COPY --from=build --chown=1654:1654 /app/publish /app
```

```yaml
# Kubernetes securityContext (or `docker run --read-only --cap-drop ALL --security-opt no-new-privileges`)
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities: { drop: ["ALL"] }
```

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 claims-api:1.8.2          # fail the pipeline on serious CVEs
```

## docker-007
Health checks and graceful shutdown for a .NET container.

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])                       // is the process alive?
    .AddSqlServer(cs, name: "sql", tags: ["ready"])                                           // can it serve traffic?
    .AddRedis(redisCs, name: "redis", tags: ["ready"]);

app.MapHealthChecks("/health/live",  new HealthCheckOptions { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = r => r.Tags.Contains("ready") });

builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(20));    // finish in-flight requests on SIGTERM
```

```dockerfile
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -f http://localhost:8080/health/live || exit 1
```

## kubernetes-001
Pod, Deployment and Service for an API: the Deployment keeps replicas running, the Service gives a stable address.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: claims-api }
spec:
  replicas: 3
  selector: { matchLabels: { app: claims-api } }
  template:
    metadata: { labels: { app: claims-api } }
    spec:
      containers:
        - name: api
          image: myregistry.azurecr.io/claims-api:1.8.2
          ports: [{ containerPort: 8080 }]
---
apiVersion: v1
kind: Service
metadata: { name: claims-api }
spec:
  selector: { app: claims-api }          # load-balances across the Pods that match this label
  ports: [{ port: 80, targetPort: 8080 }]
```

## kubernetes-002
Readiness controls traffic; liveness restarts a stuck container; startup protects slow starts.

```yaml
containers:
  - name: api
    startupProbe:   { httpGet: { path: /health/live,  port: 8080 }, failureThreshold: 30, periodSeconds: 2 }   # up to 60s to boot
    readinessProbe: { httpGet: { path: /health/ready, port: 8080 }, periodSeconds: 5, failureThreshold: 3 }   # fail => removed from Service endpoints
    livenessProbe:  { httpGet: { path: /health/live,  port: 8080 }, periodSeconds: 10, failureThreshold: 3 }  # fail => container restarted
# Do NOT put dependency checks (SQL, Redis) in liveness: a database outage would restart every pod and make things worse.
```

## kubernetes-003
Safe deployment to AKS: rolling update with surge, disruption budget and a pipeline that waits for rollout health.

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }       # never drop below desired capacity
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: claims-api }
spec: { minAvailable: 2, selector: { matchLabels: { app: claims-api } } }
```

```bash
kubectl set image deployment/claims-api api=myregistry.azurecr.io/claims-api:$BUILD_ID
kubectl rollout status deployment/claims-api --timeout=180s || { kubectl rollout undo deployment/claims-api; exit 1; }   # automatic rollback
```

## kubernetes-004
Requests, limits, OOMKilled and CPU throttling for a .NET container.

```yaml
resources:
  requests: { cpu: "250m", memory: "256Mi" }     # used by the scheduler: what the pod is guaranteed
  limits:   { memory: "512Mi" }                  # exceeding memory limit => OOMKilled (exit code 137)
  # Avoid tight CPU limits: throttling adds latency. If you set one, size it from load tests.
env:
  - { name: DOTNET_GCHeapHardLimitPercent, value: "75" }     # keep the GC heap below the container limit to avoid OOM
```

```bash
kubectl describe pod claims-api-7d9c | grep -A3 "Last State"      # Reason: OOMKilled
kubectl top pod -l app=claims-api
```

## kubernetes-005
Troubleshooting CrashLoopBackOff and ImagePullBackOff with the commands you run in order.

```bash
kubectl get pods -l app=claims-api                         # STATUS: CrashLoopBackOff / ImagePullBackOff
kubectl describe pod claims-api-7d9c                       # Events: failed pull (auth/tag), failed probe, OOMKilled, mount errors
kubectl logs claims-api-7d9c --previous                    # logs of the container that just crashed
kubectl get events --sort-by=.lastTimestamp | tail -20
kubectl exec -it claims-api-7d9c -- printenv | grep -i connection     # configuration actually in the pod

# ImagePullBackOff: wrong tag or no pull permission
az acr repository show-tags -n myregistry --repository claims-api -o table
az aks update -n aks-prod -g rg-prod --attach-acr myregistry          # grant the cluster pull rights to ACR
```

## devops-001
A production CI/CD pipeline: build, test, scan, publish an immutable artifact, deploy through environments with gates.

```yaml
# azure-pipelines.yml
stages:
  - stage: Build
    jobs:
      - job: build
        steps:
          - script: dotnet restore && dotnet build -c Release --no-restore
          - script: dotnet test -c Release --no-build --collect:"XPlat Code Coverage"
          - script: trivy fs --exit-code 1 --severity HIGH,CRITICAL .
          - task: Docker@2
            inputs: { command: buildAndPush, repository: claims-api, tags: $(Build.BuildId) }
  - stage: Staging
    dependsOn: Build
    jobs: [{ deployment: deploy, environment: staging, strategy: { runOnce: { deploy: { steps: [{ script: ./deploy.sh staging $(Build.BuildId) }] } } } }]
  - stage: Production
    dependsOn: Staging
    jobs: [{ deployment: deploy, environment: production, strategy: { runOnce: { deploy: { steps: [{ script: ./deploy.sh prod $(Build.BuildId) }] } } } }]   # environment has manual approval + checks
```

## devops-002
Blue/green switches all traffic at once; canary shifts a small percentage first. Both with an Ingress.

```yaml
# Canary: 10% of traffic to the new version (NGINX ingress annotations)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: claims-api-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules: [{ host: api.example.com, http: { paths: [{ path: /, pathType: Prefix, backend: { service: { name: claims-api-v2, port: { number: 80 } } } }] } }]
```

```bash
# Blue/green: flip the Service selector after validating green, rollback = flip back
kubectl patch service claims-api -p '{"spec":{"selector":{"app":"claims-api","version":"green"}}}'
```

## devops-003
Infrastructure as Code: a reviewed, versioned definition of a storage account that can be recreated anywhere.

```hcl
resource "azurerm_storage_account" "docs" {
  name                     = "stclaimsdocs${var.env}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.env == "prod" ? "GZRS" : "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                     = { env = var.env, owner = "claims-team" }
}
```

```bash
terraform fmt -check && terraform validate
terraform plan -out=tfplan        # reviewed in the pull request
terraform apply tfplan            # only the pipeline applies, humans do not click in the portal
```

## devops-004
Trunk-based development with short-lived branches and a feature flag that decouples deployment from release.

```csharp
// Code ships dark behind a flag, merged to main daily
if (await featureManager.IsEnabledAsync("NewPricingEngine", new TargetingContext { UserId = user.Id, Groups = [user.Plan] }))
    return await newEngine.QuoteAsync(request, ct);
return await legacyEngine.QuoteAsync(request, ct);
```

```json
{ "FeatureManagement": { "NewPricingEngine": { "EnabledFor": [ { "Name": "Microsoft.Targeting", "Parameters": { "Audience": { "Users": ["qa-team"], "Groups": [{ "Name": "Enterprise", "RolloutPercentage": 10 }], "DefaultRolloutPercentage": 0 } } } ] } } }
```

## devops-005
Supply-chain hardening in a pipeline: pinned dependencies, SBOM, signed images and least-privilege tokens.

```yaml
# GitHub Actions
permissions: { contents: read, id-token: write }              # no long-lived cloud secrets: OIDC federation
steps:
  - uses: actions/checkout@v4
  - run: dotnet restore --locked-mode                         # lock file pins exact NuGet versions
  - run: dotnet list package --vulnerable --include-transitive | tee vuln.txt && ! grep -q "Critical\|High" vuln.txt
  - run: syft claims-api:${{ github.sha }} -o spdx-json > sbom.json                  # SBOM
  - run: cosign sign --yes $REGISTRY/claims-api@${{ steps.build.outputs.digest }}    # keyless signing
  - uses: actions/dependency-review-action@v4
# Also: branch protection + required reviews, secret scanning, pinned action SHAs, separate build and deploy identities.
```

## devops-006
Terraform remote state with locking, and a scheduled drift check.

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateprod"
    container_name       = "tfstate"
    key                  = "claims/prod.tfstate"        # state in blob storage uses lease-based locking
  }
}
```

```bash
terraform plan -detailed-exitcode -refresh-only    # exit code 2 => drift between real infrastructure and state/config (run nightly)
terraform state list
terraform import azurerm_resource_group.main /subscriptions/$SUB/resourceGroups/rg-claims   # adopt a resource created manually
# Never edit state by hand; protect it with RBAC, versioning and soft delete.
```

## devops-007
The same storage account in Bicep and Terraform, showing the trade-off: Bicep is Azure-native, Terraform is multi-cloud.

```bicep
param env string
resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stclaimsdocs${env}'
  location: resourceGroup().location
  sku: { name: env == 'prod' ? 'Standard_GZRS' : 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false }
}
```

```bash
az deployment group what-if -g rg-claims -f main.bicep -p env=prod     # Bicep: preview changes, no state file to manage
az deployment group create  -g rg-claims -f main.bicep -p env=prod
```

## devops-008
GitOps with Argo CD: the Git repository is the desired state and the cluster continuously reconciles to it.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: claims-api, namespace: argocd }
spec:
  project: default
  source:
    repoURL: https://github.com/example/platform-config
    targetRevision: main
    path: apps/claims-api/overlays/prod
  destination: { server: https://kubernetes.default.svc, namespace: claims }
  syncPolicy:
    automated: { prune: true, selfHeal: true }        # manual kubectl changes are reverted
    syncOptions: [CreateNamespace=true]
```

```yaml
# Helm values per environment; the pipeline only updates the image tag in Git (a pull request), Argo CD deploys it
image: { repository: myregistry.azurecr.io/claims-api, tag: "1.8.2" }
replicaCount: 3
```
