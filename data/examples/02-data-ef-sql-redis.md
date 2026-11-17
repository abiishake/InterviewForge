# Real-world code examples: EF Core, SQL Server, transactions, Redis and data stores

## ef-core-001
Read-only list endpoints should not pay for change tracking; updates use tracked entities.

```csharp
// Read path: no tracking, projection to a DTO (only the needed columns)
var list = await db.Claims.AsNoTracking()
    .Where(c => c.PolicyId == policyId)
    .Select(c => new ClaimListItem(c.Id, c.Status, c.Amount))
    .ToListAsync(ct);

// Write path: tracked entity, EF generates an UPDATE for changed columns only
var claim = await db.Claims.SingleAsync(c => c.Id == id, ct);
claim.Approve(approverId);                    // domain method sets Status/ApprovedAt
await db.SaveChangesAsync(ct);

// Global default for read-heavy services
services.AddDbContext<ReadDbContext>(o => o.UseSqlServer(cs).UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));
```

## ef-core-002
N+1: one query for orders, then one more per order for its lines. Fix with `Include`, a projection or split queries.

```csharp
// BAD: 1 + N queries (lazy loading or a loop)
var orders = await db.Orders.Where(o => o.CustomerId == id).ToListAsync(ct);
foreach (var o in orders)
    total += (await db.OrderLines.Where(l => l.OrderId == o.Id).ToListAsync(ct)).Sum(l => l.Price);

// GOOD 1: a single projection with an aggregate computed by SQL
var totals = await db.Orders.Where(o => o.CustomerId == id)
    .Select(o => new { o.Id, Total = o.Lines.Sum(l => l.Price) }).ToListAsync(ct);

// GOOD 2: eager load when you need the entities; split query avoids a huge cartesian product
var withLines = await db.Orders.Include(o => o.Lines).AsSplitQuery().Where(o => o.CustomerId == id).ToListAsync(ct);
```

## ef-core-003
Optimistic concurrency with a `rowversion` token: two agents editing the same claim cannot silently overwrite each other.

```csharp
public class Claim
{
    public Guid Id { get; set; }
    public string Status { get; set; } = "";
    [Timestamp] public byte[] RowVersion { get; set; } = [];      // SQL Server rowversion
}

try
{
    claim.Status = "Approved";
    await db.SaveChangesAsync(ct);          // UPDATE ... WHERE Id = @id AND RowVersion = @original
}
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var current = await entry.GetDatabaseValuesAsync(ct);         // what the other user saved
    return Results.Conflict(new { message = "Claim was modified by someone else", current = current?.ToObject() });
}
```

## ef-core-004
Zero-downtime schema change using expand/contract: ship additive migrations first, remove old columns later.

```csharp
// Release 1 (expand): add the new nullable column, deploy code that writes BOTH columns
migrationBuilder.AddColumn<string>("EmailNormalized", "Customers", maxLength: 320, nullable: true);

// Backfill in batches (outside the deployment transaction) to avoid long locks
migrationBuilder.Sql(@"
    WHILE 1 = 1
    BEGIN
        UPDATE TOP (5000) Customers SET EmailNormalized = LOWER(Email) WHERE EmailNormalized IS NULL;
        IF @@ROWCOUNT = 0 BREAK;
    END");

// Release 2 (contract): code reads only the new column, then drop the old one in a later release
// migrationBuilder.DropColumn("LegacyEmail", "Customers");
```

```bash
# Generate an idempotent script and review it, instead of running Migrate() at app start-up
dotnet ef migrations script --idempotent --output deploy/migrate.sql
```

## ef-core-005
Bulk writes: set-based `ExecuteUpdate`/`ExecuteDelete` and batched inserts instead of loading and saving thousands of entities.

```csharp
// Set-based: one UPDATE statement, no entities loaded
var expired = await db.Quotes
    .Where(q => q.Status == "Open" && q.ExpiresAt < DateTime.UtcNow)
    .ExecuteUpdateAsync(s => s.SetProperty(q => q.Status, "Expired"), ct);

await db.AuditLogs.Where(a => a.At < DateTime.UtcNow.AddYears(-7)).ExecuteDeleteAsync(ct);

// Many inserts: disable per-entity overhead and save in chunks
db.ChangeTracker.AutoDetectChangesEnabled = false;
foreach (var chunk in rows.Chunk(5000))
{
    db.Readings.AddRange(chunk.Select(r => new Reading(r.DeviceId, r.Value, r.At)));
    await db.SaveChangesAsync(ct);
    db.ChangeTracker.Clear();                 // keep memory flat
}
```

## ef-core-006
Choosing the loading strategy: eager for known graphs, explicit for conditional data, lazy only with care.

```csharp
// Eager: the screen always needs lines and customer
var order = await db.Orders.Include(o => o.Lines).Include(o => o.Customer).FirstAsync(o => o.Id == id, ct);

// Explicit: load related data only when a condition holds
var claim = await db.Claims.FirstAsync(c => c.Id == id, ct);
if (claim.NeedsReview)
    await db.Entry(claim).Collection(c => c.Notes).Query().Where(n => !n.IsDeleted).LoadAsync(ct);

// Lazy (Microsoft.EntityFrameworkCore.Proxies): convenient but hides N+1 inside loops and fails after the context is disposed
services.AddDbContext<AppDbContext>(o => o.UseLazyLoadingProxies().UseSqlServer(cs));
```

## ef-core-007
Value converters, owned types, global query filters and shadow properties modelling a multi-tenant, soft-delete domain.

```csharp
protected override void OnModelCreating(ModelBuilder b)
{
    b.Entity<Claim>(e =>
    {
        e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);           // enum stored as text
        e.OwnsOne(x => x.Amount, m => { m.Property(p => p.Value).HasColumnName("Amount").HasPrecision(18, 2); m.Property(p => p.Currency).HasColumnName("Currency").HasMaxLength(3); });
        e.Property<DateTime>("CreatedAt").HasDefaultValueSql("SYSUTCDATETIME()");     // shadow property: not on the class
        e.Property<bool>("IsDeleted");
        e.HasQueryFilter(x => EF.Property<bool>(x, "IsDeleted") == false && x.TenantId == _tenant.Id);
    });
}

var all = await db.Claims.IgnoreQueryFilters().Where(c => c.Id == id).SingleAsync(ct);   // admin/audit access only
```

## sql-001
A step-by-step slow-query investigation with the actual execution plan and wait/IO statistics.

```sql
SET STATISTICS IO, TIME ON;

-- 1. Reproduce with the real parameters and look at the ACTUAL plan (scans, key lookups, estimated vs actual rows)
EXEC sp_executesql N'SELECT * FROM dbo.Orders WHERE CustomerId = @c AND Status = @s', N'@c int, @s nvarchar(20)', @c = 4711, @s = N'Open';

-- 2. Find the worst offenders from Query Store (last 24h)
SELECT TOP 10 qt.query_sql_text, rs.avg_duration, rs.avg_logical_io_reads, rs.count_executions
FROM sys.query_store_query_text qt
JOIN sys.query_store_query q ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON p.query_id = q.query_id
JOIN sys.query_store_runtime_stats rs ON rs.plan_id = p.plan_id
ORDER BY rs.avg_duration * rs.count_executions DESC;

-- 3. Fix: a covering index that matches the predicate and avoids the key lookup
CREATE INDEX IX_Orders_Customer_Status ON dbo.Orders (CustomerId, Status) INCLUDE (OrderDate, Total);
```

## sql-002
SARGable predicates let SQL Server seek an index; wrapping the column in a function forces a scan.

```sql
-- NOT sargable: function on the column, implicit conversion, leading wildcard
SELECT * FROM Orders WHERE YEAR(OrderDate) = 2025;
SELECT * FROM Customers WHERE LEFT(LastName, 3) = 'Pat';
SELECT * FROM Customers WHERE LastName LIKE '%son';

-- Sargable rewrites
SELECT * FROM Orders WHERE OrderDate >= '2025-01-01' AND OrderDate < '2026-01-01';
SELECT * FROM Customers WHERE LastName LIKE 'Pat%';

-- Implicit conversion trap: NVARCHAR parameter against a VARCHAR column scans the index
DECLARE @code nvarchar(20) = N'AB-100';   -- column is varchar(20): use varchar parameters from the app (SqlDbType.VarChar)
```

## sql-003
Clustered vs nonclustered vs covering indexes for an orders table.

```sql
-- Clustered index = physical order of the table (one per table). Choose a narrow, ever-increasing, unique key.
CREATE TABLE dbo.Orders (
    OrderId     bigint IDENTITY PRIMARY KEY CLUSTERED,
    CustomerId  int NOT NULL,
    Status      varchar(20) NOT NULL,
    OrderDate   datetime2 NOT NULL,
    Total       decimal(18,2) NOT NULL
);

-- Nonclustered index supporting "open orders for a customer, newest first"
CREATE NONCLUSTERED INDEX IX_Orders_Customer_Date
    ON dbo.Orders (CustomerId, OrderDate DESC)
    INCLUDE (Status, Total)               -- covering: no key lookup back to the clustered index
    WHERE Status = 'Open';                -- filtered index: smaller and cheaper to maintain
```

## sql-004
Parameter sniffing: one cached plan fits a rare value but is terrible for a common one. Mitigations in code.

```sql
-- Plan compiled for @CustomerId = 1 (3 rows) is reused for @CustomerId = 42 (3 million rows)
CREATE OR ALTER PROCEDURE dbo.GetOrders @CustomerId int AS
BEGIN
    SELECT OrderId, Total FROM dbo.Orders WHERE CustomerId = @CustomerId
    OPTION (RECOMPILE);                                   -- per-execution plan: good for highly skewed data
    -- alternatives: OPTION (OPTIMIZE FOR (@CustomerId UNKNOWN)); or Query Store plan forcing:
END;

EXEC sp_query_store_force_plan @query_id = 1042, @plan_id = 2210;   -- pin the known-good plan
```

## sql-005
Latest N rows per group and removing duplicates with window functions.

```sql
-- Latest 3 claims per policy
WITH ranked AS (
    SELECT ClaimId, PolicyId, SubmittedAt,
           ROW_NUMBER() OVER (PARTITION BY PolicyId ORDER BY SubmittedAt DESC, ClaimId DESC) AS rn
    FROM dbo.Claims
)
SELECT * FROM ranked WHERE rn <= 3;

-- Delete duplicate customers, keeping the oldest row
WITH dupes AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY LOWER(Email) ORDER BY CreatedAt, CustomerId) AS rn
    FROM dbo.Customers
)
DELETE FROM dupes WHERE rn > 1;
```

## sql-006
Join types and when a window function beats a self-join: running totals and previous-row comparison.

```sql
-- INNER: only matching; LEFT: keep all customers even without orders (find customers with no orders)
SELECT c.CustomerId FROM dbo.Customers c LEFT JOIN dbo.Orders o ON o.CustomerId = c.CustomerId WHERE o.OrderId IS NULL;

-- Running total per customer in one pass (a self-join would be O(n^2))
SELECT OrderId, CustomerId, Total,
       SUM(Total) OVER (PARTITION BY CustomerId ORDER BY OrderDate ROWS UNBOUNDED PRECEDING) AS RunningTotal,
       Total - LAG(Total) OVER (PARTITION BY CustomerId ORDER BY OrderDate)               AS ChangeFromPrevious
FROM dbo.Orders;
```

## transactions-001
Choosing an isolation level and using snapshot isolation to stop readers blocking writers.

```sql
-- Database-level: readers see the last committed version instead of waiting for locks
ALTER DATABASE Shop SET READ_COMMITTED_SNAPSHOT ON;
ALTER DATABASE Shop SET ALLOW_SNAPSHOT_ISOLATION ON;
```

```csharp
await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);   // strongest: prevents phantoms, more blocking
var seats = await db.Seats.Where(s => s.ShowId == showId && !s.IsTaken).CountAsync(ct);
if (seats == 0) return Results.Conflict("Sold out");
// ... take a seat ...
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
```

## transactions-002
Updating SQL and publishing a message atomically with the transactional outbox pattern.

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
order.MarkPlaced();
db.OutboxMessages.Add(new OutboxMessage            // same transaction as the business change
{
    Id = Guid.NewGuid(), Type = nameof(OrderPlaced),
    Payload = JsonSerializer.Serialize(new OrderPlaced(order.Id, order.Total)), CreatedAt = DateTime.UtcNow
});
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);

// Background dispatcher: at-least-once publish, consumers must be idempotent
public async Task DispatchAsync(CancellationToken ct)
{
    var batch = await db.OutboxMessages.Where(m => m.ProcessedAt == null).OrderBy(m => m.CreatedAt).Take(100).ToListAsync(ct);
    foreach (var m in batch) { await bus.PublishAsync(m.Type, m.Payload, ct); m.ProcessedAt = DateTime.UtcNow; }
    await db.SaveChangesAsync(ct);
}
```

## transactions-003
Deadlock vs blocking: consistent lock ordering and a retry on error 1205 prevents repeat deadlocks.

```csharp
// Always update accounts in the same order (lowest id first) so two transfers can never lock in opposite order
public async Task TransferAsync(int from, int to, decimal amount, CancellationToken ct)
{
    var (first, second) = from < to ? (from, to) : (to, from);
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM Accounts WITH (UPDLOCK) WHERE Id IN ({first},{second})", ct);
            await db.Accounts.Where(a => a.Id == from).ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance - amount), ct);
            await db.Accounts.Where(a => a.Id == to).ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance + amount), ct);
            await tx.CommitAsync(ct); return;
        }
        catch (SqlException e) when (e.Number == 1205 && attempt < 3) { await Task.Delay(50 * attempt, ct); }   // chosen as deadlock victim: retry
    }
}
```

## transactions-004
Preventing overselling: an atomic conditional update so two concurrent buyers cannot both take the last item.

```sql
-- One statement, atomic: succeeds only if enough stock remains
UPDATE dbo.Inventory
SET Quantity = Quantity - @qty
WHERE Sku = @sku AND Quantity >= @qty;
-- @@ROWCOUNT = 0  => insufficient stock, reject the order
```

```csharp
var updated = await db.Inventory
    .Where(i => i.Sku == sku && i.Quantity >= qty)
    .ExecuteUpdateAsync(s => s.SetProperty(i => i.Quantity, i => i.Quantity - qty), ct);
if (updated == 0) return Results.Conflict("Out of stock");

// Reservation with expiry for checkout flows: UNIQUE (ShowId, SeatNo) enforces "one buyer per seat" even under races
```

## redis-001
Cache-aside with `IDistributedCache`: read from cache, fall back to the database, then populate with a TTL.

```csharp
public async Task<ProductDto?> GetProductAsync(int id, CancellationToken ct)
{
    var key = $"product:{id}";
    var cached = await cache.GetStringAsync(key, ct);
    if (cached is not null) return JsonSerializer.Deserialize<ProductDto>(cached);

    var product = await db.Products.AsNoTracking().Where(p => p.Id == id).Select(p => new ProductDto(p.Id, p.Name, p.Price)).SingleOrDefaultAsync(ct);
    if (product is not null)
        await cache.SetStringAsync(key, JsonSerializer.Serialize(product),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) }, ct);
    return product;
}

public async Task UpdateAsync(Product p, CancellationToken ct) { /* save to DB */ await cache.RemoveAsync($"product:{p.Id}", ct); }   // invalidate on write
```

## redis-002
Cache stampede protection with .NET `HybridCache`: one caller recomputes while others wait, plus jittered TTLs.

```csharp
builder.Services.AddHybridCache(o => o.DefaultEntryOptions = new() { Expiration = TimeSpan.FromMinutes(5), LocalCacheExpiration = TimeSpan.FromMinutes(1) });

public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken ct) =>
    await hybridCache.GetOrCreateAsync("categories:v1",
        async token => await db.Categories.AsNoTracking().Select(c => new CategoryDto(c.Id, c.Name)).ToListAsync(token),   // runs once per key under load
        new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5 + Random.Shared.Next(0, 60) / 60.0) },          // jitter avoids synchronized expiry
        cancellationToken: ct);
```

## redis-003
When not to use Redis: money-critical, relational or large-object data. Use it for ephemeral, rebuildable data.

```csharp
// GOOD uses: rebuildable lookups, sessions, rate limits, distributed locks with expiry, leaderboards
await db.StringSetAsync($"ratelimit:{userId}:{DateTime.UtcNow:yyyyMMddHHmm}", 1, TimeSpan.FromMinutes(2), When.NotExists);

// BAD: the only copy of an account balance. A flush, eviction or failover can lose it.
// await db.StringSetAsync($"balance:{accountId}", 1250.00);      // keep the ledger in SQL, cache a read model if needed

// Large blobs (PDFs, images) belong in blob storage; store only the URL/ETag in the database or cache.
```

## redis-004
Redis data structures matched to real features, with eviction configured so the cache cannot take down the host.

```csharp
var redis = ConnectionMultiplexer.Connect("redis:6379,abortConnect=false");
var db = redis.GetDatabase();

await db.HashSetAsync($"session:{sid}", [new("userId", uid), new("tenant", tenant)]);                       // Hash: object fields
await db.SortedSetAddAsync("leaderboard:weekly", userId, score);                                            // Sorted set: ranking
var top = await db.SortedSetRangeByRankWithScoresAsync("leaderboard:weekly", 0, 9, Order.Descending);
await db.StreamAddAsync("orders:events", [new("type", "placed"), new("id", orderId)]);                     // Stream: durable log + consumer groups
await db.HyperLogLogAddAsync("visitors:2026-11-12", visitorId);                                             // approximate unique counts
```

```text
# redis.conf: bounded memory, evict least-recently-used keys that have a TTL; persistence for restart speed only
maxmemory 2gb
maxmemory-policy volatile-lru
appendonly yes
```

## data-stores-001
Polyglot persistence: choose the store per access pattern behind a repository interface.

```csharp
public sealed class ProductCatalogService(AppDbContext sql, IMongoCollection<ProductDoc> docs, ISearchClient search, IDatabase cache)
{
    public Task<Order> PlaceOrderAsync(Cart cart, CancellationToken ct) => /* SQL: ACID order + payment */ null!;
    public Task<ProductDoc?> GetDetailsAsync(string sku) => docs.Find(d => d.Sku == sku).FirstOrDefaultAsync();   // document store: flexible attributes
    public Task<SearchResult> SearchAsync(string text) => search.QueryAsync(text);                                // Elasticsearch: full-text + facets
    public Task<RedisValue> GetCartAsync(string id) => cache.StringGetAsync($"cart:{id}");                        // Redis: fast, expiring
}
// Rule of thumb: money and relationships in relational; denormalised read models and search in specialised stores.
```

## data-stores-002
Cosmos DB: a partition key that spreads load, an RU-aware point read, and a chosen consistency level.

```csharp
var client = new CosmosClient(endpoint, new DefaultAzureCredential(), new CosmosClientOptions { ConsistencyLevel = ConsistencyLevel.Session });
var container = client.GetContainer("shop", "orders");           // container created with partition key path: /customerId

// Point read by id + partition key: ~1 RU for a 1 KB item (cheapest possible)
var item = await container.ReadItemAsync<Order>("o-1001", new PartitionKey("c-77"));
Console.WriteLine($"Charge: {item.RequestCharge} RU");

// Cross-partition queries cost far more: always include the partition key when possible
var q = new QueryDefinition("SELECT * FROM o WHERE o.customerId = @c AND o.status = 'Open'").WithParameter("@c", "c-77");
using var feed = container.GetItemQueryIterator<Order>(q, requestOptions: new() { PartitionKey = new PartitionKey("c-77") });
// Bad key: /status (3 values = hot partitions). Good key: high-cardinality value used in most queries (customerId, tenantId).
```

## data-stores-003
Moving from SQL Server to PostgreSQL: common syntax and type differences you hit in the first week.

```sql
-- SQL Server                                   -- PostgreSQL
SELECT TOP 10 * FROM Orders ORDER BY Id;        SELECT * FROM orders ORDER BY id LIMIT 10;
GETUTCDATE()                                    now() AT TIME ZONE 'utc'
ISNULL(a, b)                                    COALESCE(a, b)
[Order]                                         "order"            -- identifiers are case-folded to lower case unless quoted
IDENTITY(1,1)                                   GENERATED ALWAYS AS IDENTITY
NVARCHAR(MAX)                                   text
BIT                                             boolean
UNIQUEIDENTIFIER                                uuid
```

```csharp
// Npgsql + EF Core: use snake_case naming and timestamptz, and prefer UTC DateTime
services.AddDbContext<AppDbContext>(o => o.UseNpgsql(cs).UseSnakeCaseNamingConvention());
```

## data-stores-004
Table partitioning by date for fast archival, and a hash shard key for horizontal scaling.

```sql
CREATE PARTITION FUNCTION pf_OrderMonth (datetime2) AS RANGE RIGHT FOR VALUES ('2026-01-01','2026-02-01','2026-03-01');
CREATE PARTITION SCHEME ps_OrderMonth AS PARTITION pf_OrderMonth ALL TO ([PRIMARY]);
CREATE TABLE dbo.Orders (OrderId bigint NOT NULL, OrderDate datetime2 NOT NULL, Total decimal(18,2),
    CONSTRAINT PK_Orders PRIMARY KEY (OrderDate, OrderId)) ON ps_OrderMonth (OrderDate);

-- Archive an old month instantly (metadata operation) instead of a huge DELETE
ALTER TABLE dbo.Orders SWITCH PARTITION 1 TO dbo.Orders_Archive PARTITION 1;
```

```csharp
// Application-level sharding: stable hash of the tenant id picks the database
int Shard(Guid tenantId, int shardCount) => (int)(BitConverter.ToUInt32(SHA256.HashData(tenantId.ToByteArray())) % shardCount);
```

## data-stores-005
Elasticsearch: an inverted-index search with boosting and filters from a .NET service.

```csharp
var client = new ElasticsearchClient(new Uri("https://es.internal:9200"));
var response = await client.SearchAsync<ProductDoc>(s => s
    .Index("products")
    .Query(q => q.Bool(b => b
        .Must(m => m.MultiMatch(mm => mm.Query(text).Fields(new[] { "name^3", "description" }).Fuzziness(new Fuzziness("AUTO"))))
        .Filter(f => f.Term(t => t.Field(p => p.InStock).Value(true)),
                f => f.Range(r => r.NumberRange(n => n.Field(p => p.Price).Lte(500))))))
    .Aggregations(a => a.Add("by_brand", agg => agg.Terms(t => t.Field(p => p.Brand))))
    .Size(20));
// The database stays the source of truth; index changes via an outbox/CDC feed and handle eventual consistency.
```

## data-stores-006
MongoDB modelling: embed data read together, reference data that grows unbounded or is shared.

```csharp
// Embed: order lines are always read with the order and bounded in size
public class Order
{
    public ObjectId Id { get; set; }
    public ObjectId CustomerId { get; set; }                       // reference: customers change independently
    public List<OrderLine> Lines { get; set; } = new();            // embedded
    public Address ShippingAddress { get; set; } = null!;          // snapshot at order time (embedded copy is intentional)
}

// Do NOT embed unbounded arrays (e.g. all comments on a post): document size limit is 16 MB. Reference them instead.
await orders.Indexes.CreateOneAsync(new CreateIndexModel<Order>(Builders<Order>.IndexKeys.Ascending(o => o.CustomerId).Descending("PlacedAt")));
var recent = await orders.Find(o => o.CustomerId == id).SortByDescending(o => o.PlacedAt).Limit(20).ToListAsync();
```

## data-stores-007
PostgreSQL features .NET teams use: JSONB columns with indexes, `ON CONFLICT` upserts and row-level security.

```sql
CREATE TABLE products (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, sku text UNIQUE NOT NULL, attributes jsonb NOT NULL DEFAULT '{}');
CREATE INDEX ix_products_attributes ON products USING gin (attributes);
SELECT * FROM products WHERE attributes @> '{"color":"red"}';

INSERT INTO stock (sku, qty) VALUES ('A1', 5)
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty;            -- atomic upsert (SQL Server: MERGE)

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

```csharp
modelBuilder.Entity<Product>().Property(p => p.Attributes).HasColumnType("jsonb");   // Npgsql maps to JsonDocument or a POCO
```
