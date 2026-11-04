namespace InterviewForge.Application.Admin;

public sealed record AdminUserListItem(string Id, string Username, string DisplayName, string Email, string Role, bool IsDisabled,
    DateTime CreatedAt, DateTime? LastLoginAt, DateTime? LastActiveAt, int Completed, int Contributions);

public sealed record AdminUserDetail(string Id, string Username, string DisplayName, string Email, string Role, bool IsDisabled, DateTime? DisabledAt,
    bool MustChangePassword, string TimeZone, DateTime CreatedAt, DateTime? LastLoginAt, DateTime? PasswordChangedAt,
    int Completed, int NeedsReview, int Reviews, int Plans, int Sections, int Topics, int Questions, int Algorithms, int FeedbackSubmitted);

public sealed record CreateUserRequest(string Username, string DisplayName, string Email, string Role, string? Password, bool GeneratePassword);
public sealed record UpdateUserRequest(string Username, string DisplayName, string Email);
public sealed record SetRoleRequest(string Role);
public sealed record ResetPasswordRequest(string? Password);
public sealed record DeleteUserRequest(string ConfirmUsername);
public sealed record AuditEntryDto(long Id, DateTime At, string ActorName, string Action, string? TargetName, string? Detail);
public sealed record CreateUserResult(AdminUserDetail User, string? TemporaryPassword);
public sealed record TemporaryPasswordResult(string TemporaryPassword);
public sealed record UserListQuery(string? Search, string? Role, string? Status, string? Sort, int Page = 1, int PageSize = 25);
public sealed record AuditQuery(string? Actor, string? Target, string? Action, DateTime? From, DateTime? To, int Page = 1, int PageSize = 50);

public static class AuditActions
{
    public const string UserCreate = "user.create";
    public const string UserUpdate = "user.update";
    public const string UserRoleChange = "user.role_change";
    public const string UserDisable = "user.disable";
    public const string UserEnable = "user.enable";
    public const string UserPasswordReset = "user.password_reset";
    public const string UserSessionsRevoked = "user.sessions_revoked";
    public const string UserDelete = "user.delete";
    public const string RegistrationChange = "settings.registration_change";
    public const string BootstrapRecovery = "bootstrap.recovery";
    public const string ContentForceDelete = "content.force_delete";
    public const string SeedRestore = "seed.restore";
}

/// <summary>Hashing and session-cache ports implemented by the API host.</summary>
public interface IPasswordService
{
    string Hash(string password);
}

public interface IAccountSessionCache
{
    void Invalidate(string accountId);
}
