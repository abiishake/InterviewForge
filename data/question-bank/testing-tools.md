# TOPIC --- Unit Testing: xUnit, NUnit, Mocking and Test Design
**topic_id:** `unit-testing`
**priority:** `Core`

## unit-testing-001 --- How do xUnit and NUnit differ, and how do you write parameterized and async tests?

**question_id:** `unit-testing-001`\
**topic_id:** `unit-testing`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do xUnit and NUnit differ, and how do you write parameterized and async tests?

**Answer**

Both are mature .NET test frameworks. **xUnit** creates a new class instance per test (isolation by default), uses constructor/`IDisposable` for setup and teardown, `IClassFixture<T>`/`ICollectionFixture<T>` for shared expensive context, and `[Fact]`/`[Theory]`. **NUnit** reuses one instance per fixture, uses `[SetUp]`/`[TearDown]`/`[OneTimeSetUp]`, `[Test]` and `[TestCase]`. Parameterized tests run one body over many inputs; async tests simply return `Task` (never `async void`).
```csharp
public class PriceTests
{
    [Theory]
    [InlineData(100, 0.10, 90)]
    [InlineData(50, 0, 50)]
    public void Applies_discount(decimal price, decimal rate, decimal expected)
        => Assert.Equal(expected, new Pricing().Apply(price, rate));

    [Fact]
    public async Task Loads_customer()
    {
        var svc = new CustomerService(new FakeRepo());
        Assert.NotNull(await svc.GetAsync(1));
    }
}
```

**Keywords:** `xUnit, NUnit, Theory, InlineData, TestCase, fixtures, async test`

**Follow-ups:**

-   What is the difference between a class fixture and a collection fixture?
-   Why is async void dangerous in tests?
-   How do you run tests in parallel safely?

## unit-testing-002 --- How do you use Moq or NSubstitute well, and how do you keep tests isolated?

**question_id:** `unit-testing-002`\
**topic_id:** `unit-testing`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

How do you use Moq or NSubstitute well, and how do you keep tests isolated?

**Answer**

Mocking libraries create test doubles for interfaces so the unit under test runs in isolation. With **Moq**: `new Mock<IRepo>()`, `Setup(...).ReturnsAsync(...)`, `Verify(...)`; with **NSubstitute**: `Substitute.For<IRepo>()` and `repo.Get(1).Returns(x)`. Keep tests isolated by avoiding shared mutable state, static singletons, real clocks (inject `TimeProvider`) and ordering dependencies. Mock only boundaries you own (repositories, gateways), prefer fakes for stateful collaborators, assert outcomes rather than interactions where possible, and avoid verifying every call, which couples tests to implementation. Use the builder pattern or `AutoFixture` to reduce arrange noise and `FakeTimeProvider` for time.

Real-world example: a Moq and an NSubstitute test of the same service, with an injected clock.

```csharp
// Moq
var repo = new Mock<IOrderRepo>();
repo.Setup(r => r.GetAsync(7)).ReturnsAsync(new Order(7, total: 120m));
var svc = new InvoiceService(repo.Object, new FakeTimeProvider(new DateTimeOffset(2026, 1, 5, 0, 0, 0, TimeSpan.Zero)));
var invoice = await svc.CreateAsync(7);
Assert.Equal(new DateOnly(2026, 2, 4), invoice.DueDate);

// NSubstitute
var repo2 = Substitute.For<IOrderRepo>();
repo2.GetAsync(7).Returns(new Order(7, 120m));
```

**Keywords:** `Moq, NSubstitute, test doubles, isolation, TimeProvider, AutoFixture, verify`

**Follow-ups:**

-   When is mocking harmful?
-   How do you test code using DateTime.Now?
-   Why not mock DbContext?

## unit-testing-003 --- What is the difference between test fixtures, test data builders and parameterized data sources, and how do you organise them?

**question_id:** `unit-testing-003`\
**topic_id:** `unit-testing`\
**difficulty:** `Senior`\
**question_type:** `Conceptual / Practical`

**Question**

What is the difference between test fixtures, test data builders and parameterized data sources, and how do you organise them?

**Answer**

A **fixture** is shared setup (a database container, a configured host) created once per class or collection to save time; it must be reset between tests so state does not leak. A **test data builder** (`new OrderBuilder().WithLines(3).Paid().Build()`) creates valid objects with sensible defaults so each test states only what matters. **Data sources** (`[MemberData]`, `[ClassData]`, `[TestCaseSource]`) feed `[Theory]` cases from code or files for tables of inputs. Organise tests mirroring the production namespaces, name them `Method_Scenario_Expected`, follow Arrange-Act-Assert, keep one behaviour per test and keep slow tests in a separate category.

Real-world example: a test data builder and a MemberData table.

```csharp
public sealed class OrderBuilder
{
    private int _lines = 1; private bool _paid;
    public OrderBuilder WithLines(int n) { _lines = n; return this; }
    public OrderBuilder Paid() { _paid = true; return this; }
    public Order Build() => new(Enumerable.Range(1, _lines).Select(i => new Line($"SKU{i}", 10m)).ToList(), _paid);
}

public static TheoryData<int, decimal> Totals => new() { { 1, 10m }, { 3, 30m }, { 0, 0m } };

[Theory, MemberData(nameof(Totals))]
public void Total_sums_lines(int lines, decimal expected) =>
    Assert.Equal(expected, new OrderBuilder().WithLines(lines).Build().Total);
```

**Keywords:** `fixture, builder pattern, MemberData, TestCaseSource, Arrange Act Assert, naming`

**Follow-ups:**

-   How do you reset a shared fixture?
-   When is a builder better than a constructor call?
-   How do you keep tests fast?

# TOPIC --- Integration and End-to-End Testing: Testcontainers, Brokers, Selenium and Playwright
**topic_id:** `integration-testing`
**priority:** `Core`

## integration-testing-001 --- How do you run EF Core integration tests against a real database with Testcontainers?

**question_id:** `integration-testing-001`\
**topic_id:** `integration-testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you run EF Core integration tests against a real database with Testcontainers?

**Answer**

In-memory providers hide SQL behaviour (constraints, transactions, collation), so run tests against the real engine in a throwaway container with **Testcontainers**: start `MsSqlContainer` once per collection fixture, apply migrations, and give each test isolation by wrapping it in a transaction rolled back at the end, or resetting data with **Respawn**. Combine with `WebApplicationFactory<Program>`, replacing the connection string in `ConfigureWebHost`. Costs: slower startup and a Docker requirement in CI, mitigated by one container per test run and parallelism across collections.
```csharp
public sealed class DbFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _db = new MsSqlBuilder().Build();
    public string ConnectionString => _db.GetConnectionString();
    public Task InitializeAsync() => _db.StartAsync();
    public Task DisposeAsync() => _db.DisposeAsync().AsTask();
}
```

**Keywords:** `Testcontainers, real database, Respawn, WebApplicationFactory, migrations, isolation`

**Follow-ups:**

-   Why avoid the EF InMemory provider?
-   How do you reset data between tests?
-   How do you make this work in CI?

## integration-testing-002 --- How do you test message-broker consumers and publishers in integration tests?

**question_id:** `integration-testing-002`\
**topic_id:** `integration-testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you test message-broker consumers and publishers in integration tests?

**Answer**

Test the contract and the behaviour separately. For behaviour, start the real broker in a container (RabbitMQ or Service Bus emulator via Testcontainers), publish a message to the input queue, then **wait with polling and a timeout** (never `Thread.Sleep`) for the observable outcome: a database row, an outgoing message or a webhook call. MassTransit offers an in-memory test harness (`AddMassTransitTestHarness`) to assert a consumer consumed or a message was published without a broker. Also test idempotency (deliver the same message twice), retries, poison message routing to the dead-letter queue and ordering assumptions. Use unique queue names per test run to avoid cross-talk.

Real-world example: MassTransit's test harness asserting a consumer ran and published a follow-up event.

```csharp
await using var provider = new ServiceCollection()
    .AddMassTransitTestHarness(x => x.AddConsumer<OrderPlacedConsumer>())
    .BuildServiceProvider(true);
var harness = provider.GetRequiredService<ITestHarness>();
await harness.Start();

await harness.Bus.Publish(new OrderPlaced(Guid.NewGuid(), 99m));

Assert.True(await harness.Consumed.Any<OrderPlaced>());                 // polls with a timeout, no Thread.Sleep
Assert.True(await harness.Published.Any<InvoiceRequested>());
```

**Keywords:** `message broker, MassTransit test harness, RabbitMQ, dead-letter, idempotency, polling, Testcontainers`

**Follow-ups:**

-   How do you avoid flaky async assertions?
-   How do you test the outbox?
-   When use the in-memory harness versus a real broker?

## integration-testing-003 --- How do you approach end-to-end UI testing with Selenium or Playwright, and which would you pick?

**question_id:** `integration-testing-003`\
**topic_id:** `integration-testing`\
**difficulty:** `Senior / Lead`\
**question_type:** `Conceptual / Practical`

**Question**

How do you approach end-to-end UI testing with Selenium or Playwright, and which would you pick?

**Answer**

E2E tests drive a real browser through critical user journeys (login, checkout) against a deployed or containerised environment. **Selenium** (WebDriver, many languages, wide browser/grid support) is the long-standing standard; **Playwright** is newer, with auto-waiting, built-in tracing, network interception, parallel browser contexts and first-class .NET support, making tests faster and less flaky. Keep the E2E layer thin (the testing pyramid): few journeys, stable selectors (`data-testid`, roles), the page-object pattern, seeded test data and independent tests. Run them in CI against an ephemeral environment, capture screenshots/traces on failure, and quarantine flaky tests quickly.

Real-world example: a Playwright .NET test of a login-and-checkout journey using stable test ids.

```csharp
public class CheckoutTests : PageTest
{
    [Test]
    public async Task User_can_checkout()
    {
        await Page.GotoAsync("https://staging.shop.example.com");
        await Page.GetByTestId("email").FillAsync("qa@example.com");
        await Page.GetByTestId("password").FillAsync(Environment.GetEnvironmentVariable("QA_PASSWORD")!);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Sign in" }).ClickAsync();
        await Page.GetByTestId("add-to-cart-sku1").ClickAsync();
        await Page.GetByTestId("checkout").ClickAsync();
        await Expect(Page.GetByTestId("order-confirmation")).ToBeVisibleAsync();   // auto-waits, no sleeps
    }
}
```

**Keywords:** `Selenium, Playwright, end-to-end, page object, auto-waiting, flaky tests, testing pyramid`

**Follow-ups:**

-   How do you reduce flaky UI tests?
-   Why use data-testid?
-   Where do E2E tests run in the pipeline?
