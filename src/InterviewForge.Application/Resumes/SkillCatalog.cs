using InterviewForge.Application.Common;

namespace InterviewForge.Application.Resumes;

/// <summary>A known technology skill. Aliases are matched as whole terms in resume text.</summary>
/// <param name="CaseSensitive">Aliases that are also common English words (e.g. "Go", "Spring") only match with their exact casing.</param>
public sealed record SkillEntry(string Key, string Name, IReadOnlyList<string> Aliases, bool CaseSensitive = false);

/// <summary>
/// Curated dictionary of technology skills used to recognise skills in resumes.
/// It maps aliases onto one canonical skill and tells real skills apart from ordinary words,
/// so only genuine technologies are reported to administrators as missing topics.
/// </summary>
public static class SkillCatalog
{
    private static SkillEntry S(string name, params string[] aliases) =>
        new(KeyOf(name), name, new[] { name }.Concat(aliases).Distinct(StringComparer.OrdinalIgnoreCase).ToArray());
    private static SkillEntry Cs(string name, params string[] aliases) =>
        new(KeyOf(name), name, new[] { name }.Concat(aliases).Distinct().ToArray(), CaseSensitive: true);

    /// <summary>Stable key for a skill name ("C++" → "cpp", "C#" → "csharp", "Node.js" → "node-js").</summary>
    public static string KeyOf(string name)
    {
        var k = Text.Slugify(name.Trim().ToLowerInvariant().Replace("++", "pp").Replace("c#", "csharp").Replace("f#", "fsharp").Replace("#", "sharp"));
        return k.Length > 80 ? k[..80] : k;
    }

    public static readonly IReadOnlyList<SkillEntry> All = new[]
    {
        // Languages
        S("C#", "csharp", "c sharp"), S("F#", "fsharp"), S("VB.NET", "visual basic .net", "visual basic"), S("Java"), S("Kotlin"), S("Scala"),
        S("Python"), S("JavaScript", "ecmascript", "es6"), S("TypeScript"), Cs("Go", "Golang"), S("Rust"), S("C++", "cpp"), S("Ruby"), S("PHP"),
        Cs("Swift"), S("Objective-C"), S("Dart"), S("Elixir"), S("Erlang"), S("Haskell"), S("Clojure"), S("Perl"), S("Lua"), S("Groovy"),
        S("PowerShell"), S("Bash", "shell scripting", "shell script"), S("SQL"), S("T-SQL", "tsql", "transact-sql"), S("PL/SQL", "plsql"),
        S("HTML", "html5"), S("CSS", "css3"), S("Sass", "scss"), S("GraphQL"), S("WebAssembly", "wasm"), S("MATLAB"), S("Solidity"),
        // .NET
        S(".NET", "dotnet", ".net core", ".net framework", ".net 8", ".net 6", ".net 9", ".net 10"), S("ASP.NET Core", "asp.net core mvc"),
        S("ASP.NET", "asp.net mvc", "asp.net web forms", "web forms"), S("ASP.NET Web API", "web api"), S("Entity Framework", "ef core", "entity framework core", "ef6"),
        S("LINQ"), S("Dapper"), S("Blazor"), S("WPF"), S("WinForms", "windows forms"), S(".NET MAUI", "maui"), S("Xamarin"), S("WCF"),
        S("SignalR"), S("gRPC"), S("MediatR"), S("AutoMapper"), S("Polly"), S("Hangfire"), S("Quartz.NET"), S("Serilog"), S("NLog"),
        S("MassTransit"), S("NServiceBus"), S("Orleans"), S("Minimal APIs", "minimal api"), S("Razor Pages", "razor"), S("Identity Server", "identityserver", "duende"),
        S("xUnit"), S("NUnit"), S("MSTest"), S("Moq"), S("FluentValidation"), S("Akka.NET"), S("Roslyn"), S("Aspire", ".net aspire"),
        // Frontend
        S("Angular", "angularjs", "angular js"), S("React", "react.js", "reactjs"), S("Vue.js", "vue", "vuejs"), S("Svelte"), S("Next.js", "nextjs"),
        S("Nuxt"), S("Redux"), S("NgRx"), S("RxJS"), S("jQuery"), S("Bootstrap"), S("Tailwind CSS", "tailwind"), S("Material UI", "mui"),
        S("Webpack"), S("Vite"), S("Babel"), S("Storybook"), S("Micro Frontends", "micro-frontends", "microfrontends"), S("React Native"),
        S("Flutter"), S("Ionic"), S("Electron"), S("Three.js"), S("D3.js", "d3"),
        // Backend / runtimes
        S("Node.js", "nodejs"), Cs("Express", "Express.js", "ExpressJS"), S("NestJS"), S("Deno"), Cs("Spring", "Spring Boot", "Spring Framework"),
        S("Hibernate"), S("Django"), S("Flask"), S("FastAPI"), S("Ruby on Rails", "rails"), S("Laravel"), S("Symfony"),
        // Data
        S("SQL Server", "mssql", "ms sql", "microsoft sql server"), S("PostgreSQL", "postgres"), S("MySQL"), S("MariaDB"), S("Oracle Database", "oracle db", "oracle"),
        S("SQLite"), S("MongoDB", "mongo"), S("Cosmos DB", "cosmosdb", "azure cosmos db"), S("Redis"), S("Cassandra"), S("DynamoDB"),
        S("Elasticsearch", "elastic search", "elk"), S("OpenSearch"), S("Neo4j"), S("Couchbase"), S("Snowflake"), S("Databricks"),
        S("Apache Spark", "pyspark"), S("Hadoop"), S("Apache Kafka", "kafka"), S("RabbitMQ"), S("ActiveMQ"), S("Azure Service Bus", "service bus"),
        S("Azure Event Hubs", "event hubs", "event hub"), S("Azure Event Grid", "event grid"), S("Amazon SQS", "sqs"), S("Amazon SNS", "sns"),
        S("Power BI", "powerbi"), S("Tableau"), S("SSIS"), S("SSRS"), S("ETL"), S("Data Warehouse", "data warehousing"), S("Airflow", "apache airflow"),
        S("dbt"), S("NoSQL"), S("Stored Procedures", "stored procedure"), S("Database Indexing", "indexing", "query optimization"),
        // Cloud
        S("Azure", "microsoft azure"), S("Azure Functions"), S("Azure App Service", "app service"), S("Azure DevOps", "vsts", "tfs"),
        S("Azure Kubernetes Service", "aks"), S("Azure Storage", "blob storage", "azure blob"), S("Azure Key Vault", "key vault"),
        S("Azure AD", "azure active directory", "entra id", "microsoft entra"), S("Azure API Management", "apim", "api management"),
        S("Azure Monitor"), S("Application Insights", "app insights"), S("Azure Logic Apps", "logic apps"), S("Azure Data Factory", "data factory", "adf"),
        S("Azure SQL"), S("Azure Container Apps", "container apps"), S("Azure OpenAI"),
        S("AWS", "amazon web services"), S("AWS Lambda", "aws lambdas"), S("Amazon S3", "s3"), S("Amazon EC2", "ec2"), S("Amazon ECS", "ecs"),
        S("Amazon EKS", "eks"), S("Amazon RDS", "rds"), S("CloudFormation"), S("AWS CDK", "cdk"),
        S("Google Cloud", "gcp", "google cloud platform"), S("BigQuery"), S("Firebase"), S("Cloudflare"), S("Heroku"), S("Vercel"),
        S("Serverless"),
        // DevOps
        S("Docker", "containers", "containerization"), S("Kubernetes", "k8s"), S("Helm"), S("Terraform"), S("Bicep"), S("ARM Templates", "arm template"),
        S("Pulumi"), S("Ansible"), S("Chef"), S("Puppet"), S("Jenkins"), S("GitHub Actions"), S("GitLab CI", "gitlab"), S("CircleCI"),
        S("TeamCity"), S("Octopus Deploy"), S("Argo CD", "argocd"), S("CI/CD", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"),
        S("Git"), S("GitHub"), S("Bitbucket"), S("Linux"), S("Nginx"), S("IIS"), S("Istio"), S("Service Mesh"),
        S("Prometheus"), S("Grafana"), S("OpenTelemetry", "open telemetry"), S("Datadog"), S("New Relic"), S("Splunk"), S("Kibana"),
        S("Infrastructure as Code", "iac"), S("SRE", "site reliability engineering"), S("Observability"),
        // Architecture & practices
        S("Microservices", "microservice", "micro services"), S("Domain-Driven Design", "ddd", "domain driven design"), S("CQRS"), S("Event Sourcing"),
        S("Event-Driven Architecture", "event driven", "event-driven"), S("Clean Architecture", "onion architecture", "hexagonal architecture"),
        S("Design Patterns"), S("SOLID", "solid principles"), S("System Design"), S("REST", "rest api", "restful", "rest apis", "restful apis"),
        S("SOAP"), S("OAuth", "oauth2", "oauth 2.0"), S("OpenID Connect", "oidc"), S("JWT", "json web token"), S("SAML"),
        S("Caching", "distributed cache", "distributed caching"), S("Message Queues", "message queue", "messaging"), S("API Gateway"),
        S("Unit Testing", "unit tests", "tdd", "test driven development"), S("Integration Testing", "integration tests"),
        S("Selenium"), S("Playwright"), S("Cypress"), S("Jest"), S("Jasmine"), S("Karma"), S("Postman"), S("SpecFlow", "bdd"),
        S("JMeter"), S("k6"), S("Load Testing", "performance testing"), S("SonarQube"),
        S("Agile", "scrum", "kanban"), S("Multithreading", "multi-threading", "concurrency", "async/await", "parallel programming"),
        S("Data Structures"), S("Algorithms"), S("Security", "owasp", "application security"), S("Performance Tuning", "performance optimization"),
        S("WebSockets", "websocket"), S("Real-time", "realtime"),
        // AI / ML
        S("Machine Learning", "ml"), S("Deep Learning"), S("LLM", "llms", "large language models"), S("OpenAI", "chatgpt", "gpt"),
        S("Semantic Kernel"), S("LangChain"), S("RAG", "retrieval augmented generation"), S("TensorFlow"), S("PyTorch"), S("scikit-learn"),
        S("ML.NET"), S("Prompt Engineering"), S("Vector Databases", "vector database", "pinecone"),
        // Other platforms
        S("Salesforce"), S("SharePoint"), S("Dynamics 365", "dynamics crm"), S("SAP"), S("Umbraco"), S("Sitecore"), S("WordPress"),
        Cs("Unity", "Unity3D"), S("Blockchain"),
    };

    /// <summary>
    /// Knowledge-base names that cover a skill under a different title (e.g. SignalR questions live under "Real-time").
    /// Used only when matching skills to topics, never to detect skills in resume text.
    /// </summary>
    private static readonly Dictionary<string, string[]> Related = BuildRelated(new (string[] Keys, string[] Terms)[]
    {
        (["aspdotnet-core", "aspdotnet", "aspdotnet-web-api", "minimal-apis"], ["web api", "rest", "backend dotnet"]),
        (["signalr", "websockets"], ["real-time"]),
        (["grpc", "soap"], ["api integration"]),
        (["azure-service-bus", "azure-event-hubs", "azure-event-grid"], ["azure messaging", "messaging"]),
        (["apache-kafka", "rabbitmq", "activemq", "amazon-sqs", "amazon-sns", "masstransit", "nservicebus", "message-queues"], ["messaging"]),
        (["cosmos-db", "mongodb", "cassandra", "dynamodb", "couchbase"], ["nosql"]),
        (["t-sql", "stored-procedures", "database-indexing", "azure-sql"], ["sql server"]),
        (["terraform", "bicep", "arm-templates", "pulumi", "infrastructure-as-code", "ansible"], ["infrastructure", "devops"]),
        (["github-actions", "azure-devops", "jenkins", "gitlab-ci", "teamcity", "octopus-deploy", "circleci", "argo-cd"], ["ci/cd"]),
        (["xunit", "nunit", "mstest", "moq", "specflow"], ["unit testing"]),
        (["playwright", "selenium", "cypress", "jest", "jasmine", "karma", "load-testing", "jmeter", "k6"], ["testing"]),
        (["application-insights", "azure-monitor", "opentelemetry", "prometheus", "grafana", "datadog", "new-relic", "splunk", "kibana", "sre"], ["observability"]),
        (["oauth", "openid-connect", "jwt", "saml", "azure-ad", "identity-server", "security"], ["identity security"]),
        (["azure-key-vault"], ["security"]),
        (["clean-architecture", "solid", "design-patterns"], ["software design"]),
        (["llm", "openai", "rag", "semantic-kernel", "langchain", "prompt-engineering", "azure-openai", "vector-databases", "machine-learning", "deep-learning", "ml-dotnet"], ["ai"]),
        (["wpf", "winforms", "xamarin"], ["client app"]),
        (["wcf", "vb-net", "aspdotnet"], ["legacy"]),
        (["linq"], ["c# depth"]),
        (["power-bi", "ssrs", "ssis", "tableau"], ["reporting"]),
        (["html", "css", "sass", "bootstrap", "tailwind-css", "webpack", "vite", "micro-frontends"], ["frontend"]),
        (["next-js", "redux", "react-native"], ["react"]),
        (["ngrx"], ["angular"]),
        (["helm"], ["kubernetes"]),
        (["data-structures", "algorithms"], ["coding"]),
        (["azure-storage"], ["storage"]),
        (["azure-api-management", "azure-logic-apps"], ["integration"]),
        (["azure-app-service", "azure-container-apps"], ["compute"]),
        (["aws-lambda", "amazon-s3", "amazon-ec2", "amazon-ecs", "amazon-eks", "amazon-rds", "cloudformation", "aws-cdk"], ["aws"]),
        (["dotnet-maui"], ["maui"]),
    });

    private static Dictionary<string, string[]> BuildRelated((string[] Keys, string[] Terms)[] groups)
    {
        var d = new Dictionary<string, List<string>>();
        foreach (var (keys, terms) in groups)
            foreach (var k in keys) { if (!d.TryGetValue(k, out var l)) d[k] = l = new(); l.AddRange(terms); }
        return d.ToDictionary(x => x.Key, x => x.Value.Distinct().ToArray());
    }

    public static IReadOnlyList<string> RelatedTerms(string key) => Related.GetValueOrDefault(key) ?? [];

    private static readonly Dictionary<string, SkillEntry> ByKey = All.GroupBy(s => s.Key).ToDictionary(g => g.Key, g => g.First());
    private static readonly Dictionary<string, SkillEntry> ByAlias = BuildAliasIndex();

    private static Dictionary<string, SkillEntry> BuildAliasIndex()
    {
        var d = new Dictionary<string, SkillEntry>(StringComparer.OrdinalIgnoreCase);
        foreach (var s in All) foreach (var a in s.Aliases) d.TryAdd(a.Trim(), s);
        return d;
    }

    public static SkillEntry? FindByKey(string key) => ByKey.GetValueOrDefault(key);

    /// <summary>Exact (case-insensitive) lookup of a term as written in a skills list.</summary>
    public static SkillEntry? FindByAlias(string term) => ByAlias.GetValueOrDefault(term.Trim());
}
