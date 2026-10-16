using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewForge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UsernameLogin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Username", table: "Accounts", type: "TEXT", maxLength: 32, nullable: false, defaultValue: "");
            // Existing accounts get a unique username: the bootstrap admin becomes "admin", others "user_<id>".
            migrationBuilder.Sql("UPDATE Accounts SET Username = CASE WHEN Id = 'local' THEN 'admin' ELSE 'user_' || substr(Id, 1, 12) END WHERE Username = '';");
            migrationBuilder.CreateIndex(name: "IX_Accounts_Username", table: "Accounts", column: "Username", unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Accounts_Username", table: "Accounts");
            migrationBuilder.DropColumn(name: "Username", table: "Accounts");
        }
    }
}
