using InterviewForge.Api;
using InterviewForge.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
namespace InterviewForge.IntegrationTests;
public class UpgradeTests
{
    [Fact] public async Task Existing_SQLite_study_data_and_contributions_belong_to_bootstrap_admin()
    {
        var path=Path.Combine(Path.GetTempPath(),Guid.NewGuid()+".db");
        try {
            await using var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite($"Data Source={path};Pooling=False").Options);
            await db.GetService<IMigrator>().MigrateAsync("20261015202542_InitialCreate");
            await db.Database.ExecuteSqlRawAsync("INSERT INTO Sections (Id,Name,Slug,SortOrder,Priority,IsUserCreated,CreatedAt,UpdatedAt) VALUES (1,'Legacy section','legacy',0,0,1,'2026-10-15','2026-10-15')");
            await db.Database.ExecuteSqlRawAsync("INSERT INTO Topics (Id,SectionId,Name,Slug,SortOrder,Priority,IsUserCreated,CreatedAt,UpdatedAt) VALUES (1,1,'Legacy topic','legacy',0,0,1,'2026-10-15','2026-10-15')");
            await db.Database.ExecuteSqlRawAsync("INSERT INTO Questions (Id,TopicId,ContentHash,Text,Difficulty,IsUserCreated,SortOrder,SearchText,CreatedAt,UpdatedAt) VALUES (1,1,'hash','Legacy question?',0,1,0,'legacy','2026-10-15','2026-10-15')");
            await db.Database.ExecuteSqlRawAsync("INSERT INTO UserProgress (UserId,QuestionId,Status,IsFavorite,ReviewCount,LapseCount,IntervalDays,UpdatedAt) VALUES ('local',1,2,1,3,0,4,'2026-10-15')");
            await db.Database.ExecuteSqlRawAsync("INSERT INTO UserNotes (UserId,QuestionId,Body,CreatedAt,UpdatedAt) VALUES ('local',1,'Legacy note','2026-10-15','2026-10-15')");
            await db.Database.MigrateAsync();
            var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> { ["Admin:Email"]="upgrade@example.test",["Admin:Password"]="Test-only-upgrade-pass-123",["Admin:DisplayName"]="Legacy owner" }).Build();
            await AccountBootstrap.Run(db,config);
            Assert.Equal("local",(await db.Accounts.SingleAsync()).Id);
            Assert.Equal("Admin",(await db.AccountRoles.SingleAsync()).Role);
            Assert.Equal("local",(await db.Questions.SingleAsync()).CreatedByUserId);
            Assert.Equal("Legacy owner",(await db.Sections.SingleAsync()).AddedBy);
            Assert.Equal(3,(await db.UserProgress.SingleAsync()).ReviewCount);
            Assert.True((await db.UserProgress.SingleAsync()).IsFavorite);
            Assert.Equal("Legacy note",(await db.UserNotes.SingleAsync()).Body);
            await AccountBootstrap.Run(db,config);Assert.Equal(1,await db.Accounts.CountAsync());
        } finally {File.Delete(path);}
    }
}
