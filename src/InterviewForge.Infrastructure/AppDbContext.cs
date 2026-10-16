using InterviewForge.Application;
using InterviewForge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore.Storage;

namespace InterviewForge.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Answer> Answers => Set<Answer>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<QuestionTag> QuestionTags => Set<QuestionTag>();
    public DbSet<QuestionTopic> QuestionTopics => Set<QuestionTopic>();
    public DbSet<QuestionReference> QuestionReferences => Set<QuestionReference>();
    public DbSet<UserProgress> UserProgress => Set<UserProgress>();
    public DbSet<UserNote> UserNotes => Set<UserNote>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<PlanDay> PlanDays => Set<PlanDay>();
    public DbSet<PlanItem> PlanItems => Set<PlanItem>();
    public DbSet<Algorithm> Algorithms => Set<Algorithm>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountRole> AccountRoles => Set<AccountRole>();
    public DbSet<ContentFeedback> Feedback => Set<ContentFeedback>();
    public DbSet<DeletedSeed> DeletedSeeds => Set<DeletedSeed>();

    public async Task<IAppTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        // Nested calls (e.g. service inside an outer transaction) reuse the ambient transaction.
        if (Database.CurrentTransaction is not null) return new NoopTransaction();
        return new EfTransaction(await Database.BeginTransactionAsync(cancellationToken));
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Account>(e => { e.HasKey(x => x.Id); e.HasIndex(x => x.Email).IsUnique(); e.HasIndex(x => x.Username).IsUnique(); e.Property(x => x.Username).HasMaxLength(32); e.Property(x => x.Email).HasMaxLength(254); });
        b.Entity<AccountRole>(e => { e.HasKey(x => new { x.AccountId, x.Role }); e.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Cascade); });
        b.Entity<ContentFeedback>(e => { e.HasIndex(x => new { x.UserId, x.Status }); e.HasOne<Account>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict); });
        b.Entity<DeletedSeed>().HasKey(x => new { x.Kind, x.Key });
        b.Entity<Section>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(120);
            e.HasIndex(x => x.SourceKey).IsUnique();
            e.HasIndex(x => x.SortOrder);
        });
        b.Entity<Topic>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(120);
            e.HasIndex(x => x.SourceKey).IsUnique();
            e.HasIndex(x => new { x.SectionId, x.SortOrder });
            e.HasOne(x => x.Section).WithMany(s => s.Topics).HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<Question>(e =>
        {
            e.Property(x => x.Text).HasMaxLength(4000).IsRequired();
            e.Property(x => x.ExternalId).HasMaxLength(100);
            e.Property(x => x.ContentHash).HasMaxLength(64);
            e.HasIndex(x => x.ExternalId).IsUnique();
            e.HasIndex(x => x.ContentHash);
            e.HasIndex(x => new { x.TopicId, x.SortOrder });
            e.HasIndex(x => x.IsUserCreated);
            e.HasOne(x => x.Topic).WithMany(t => t.Questions).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Answer).WithOne(a => a.Question).HasForeignKey<Answer>(a => a.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Answer>(e => e.HasIndex(x => x.QuestionId).IsUnique());
        b.Entity<Tag>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(60).UseCollation("NOCASE");
            e.HasIndex(x => x.Name).IsUnique();
        });
        b.Entity<QuestionTag>(e =>
        {
            e.HasKey(x => new { x.QuestionId, x.TagId });
            e.HasOne(x => x.Question).WithMany(q => q.Tags).HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Tag).WithMany(t => t.Questions).HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<QuestionTopic>(e =>
        {
            e.HasKey(x => new { x.QuestionId, x.TopicId });
            e.HasOne(x => x.Question).WithMany(q => q.AdditionalTopics).HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Topic).WithMany(t => t.RelatedQuestions).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<QuestionReference>(e =>
        {
            e.Property(x => x.Url).HasMaxLength(2000);
            e.Property(x => x.Title).HasMaxLength(200);
            e.HasOne(x => x.Question).WithMany(q => q.References).HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<UserProgress>(e =>
        {
            e.Property(x => x.UserId).HasMaxLength(100);
            e.HasIndex(x => new { x.UserId, x.QuestionId }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.Status });
            e.HasIndex(x => new { x.UserId, x.NextReviewAt });
            e.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<UserNote>(e =>
        {
            e.Property(x => x.UserId).HasMaxLength(100);
            e.HasIndex(x => new { x.UserId, x.QuestionId }).IsUnique();
            e.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ActivityLog>(e =>
        {
            e.Property(x => x.UserId).HasMaxLength(100);
            e.HasIndex(x => new { x.UserId, x.OccurredAt });
            e.HasOne<Question>().WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Plan>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.UserId).HasMaxLength(100);
            e.HasIndex(x => new { x.UserId, x.IsCurrent });
        });
        b.Entity<PlanDay>(e =>
        {
            e.HasIndex(x => new { x.PlanId, x.DayNumber }).IsUnique();
            e.HasOne(x => x.Plan).WithMany(p => p.Days).HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<PlanItem>(e =>
        {
            e.HasIndex(x => new { x.PlanDayId, x.SortOrder });
            e.HasIndex(x => x.QuestionId);
            e.HasOne(x => x.PlanDay).WithMany(d => d.Items).HasForeignKey(x => x.PlanDayId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Algorithm>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => new { x.Category, x.SortOrder });
        });
    }

    private sealed class EfTransaction(IDbContextTransaction tx) : IAppTransaction
    {
        public Task CommitAsync(CancellationToken cancellationToken = default) => tx.CommitAsync(cancellationToken);
        public ValueTask DisposeAsync() => tx.DisposeAsync();
    }

    private sealed class NoopTransaction : IAppTransaction
    {
        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}

/// <summary>Used by `dotnet ef` at design time.</summary>
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite("Data Source=design.db").Options);
}
