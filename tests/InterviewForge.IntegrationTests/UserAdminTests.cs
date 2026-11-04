using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InterviewForge.Api;
using InterviewForge.Application.Admin;
using InterviewForge.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace InterviewForge.IntegrationTests;

public class UserAdminTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string AdminPassword = "Test-only-admin-pass-123";
    private const string MemberPassword = "Test-only-member-pass-123";

    private HttpClient NewClient()
    {
        var c = factory.CreateClient();
        c.DefaultRequestHeaders.Add("X-InterviewForge", "1");
        return c;
    }

    private async Task<HttpClient> Admin()
    {
        var c = NewClient();
        (await c.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = AdminPassword })).EnsureSuccessStatusCode();
        return c;
    }

    private static string Unique(string prefix) => prefix + Guid.NewGuid().ToString("N")[..12];

    private static async Task<JsonElement> Body(HttpResponseMessage r)
    {
        var text = await r.Content.ReadAsStringAsync();
        Assert.True(r.IsSuccessStatusCode, $"{(int)r.StatusCode}: {text}");
        return text.Length == 0 ? default : JsonDocument.Parse(text).RootElement.Clone();
    }

    private static async Task<string> ErrorCode(HttpResponseMessage r) =>
        (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetProperty("code").GetString()!;

    private async Task<(string Id, string Username, string Temp)> CreateUser(HttpClient admin, string role = "Member")
    {
        var username = Unique("usr");
        var res = await Body(await admin.PostAsJsonAsync("/api/admin/users", new
        {
            username, displayName = "Managed " + username, email = username + "@example.test", role, generatePassword = true
        }));
        return (res.GetProperty("user").GetProperty("id").GetString()!, username, res.GetProperty("temporaryPassword").GetString()!);
    }

    private async Task<HttpClient> SignIn(string username, string password)
    {
        var c = NewClient();
        (await c.PostAsJsonAsync("/api/auth/login", new { username, password })).EnsureSuccessStatusCode();
        return c;
    }

    [Fact]
    public async Task Created_user_must_change_temporary_password_before_using_the_api()
    {
        using var admin = await Admin();
        var (_, username, temp) = await CreateUser(admin);
        using var user = await SignIn(username, temp);

        var me = await Body(await user.GetAsync("/api/auth/me"));
        Assert.True(me.GetProperty("user").GetProperty("mustChangePassword").GetBoolean());
        var blocked = await user.GetAsync("/api/questions");
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        Assert.Equal("PASSWORD_CHANGE_REQUIRED", await ErrorCode(blocked));

        var change = await user.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync("/api/questions")).StatusCode);
    }

    [Fact]
    public async Task Members_and_anonymous_cannot_use_admin_endpoints()
    {
        using var admin = await Admin();
        var (_, username, temp) = await CreateUser(admin);
        using var member = await SignIn(username, temp);
        await member.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        using var anon = NewClient();
        foreach (var path in new[] { "/api/admin/users", "/api/admin/settings", "/api/admin/audit" })
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync(path)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync(path)).StatusCode);
        }
    }

    [Fact]
    public async Task Duplicate_username_and_email_are_rejected_case_insensitively()
    {
        using var admin = await Admin();
        var (_, username, _) = await CreateUser(admin);
        var dup = await admin.PostAsJsonAsync("/api/admin/users", new
        {
            username = username.ToUpperInvariant(), displayName = "Dup", email = Unique("e") + "@example.test", role = "Member", generatePassword = true
        });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);
        Assert.Equal("USERNAME_TAKEN", await ErrorCode(dup));

        var dupMail = await admin.PostAsJsonAsync("/api/admin/users", new
        {
            username = Unique("n"), displayName = "Dup", email = (username + "@EXAMPLE.test"), role = "Member", generatePassword = true
        });
        Assert.Equal(HttpStatusCode.Conflict, dupMail.StatusCode);
        Assert.Equal("EMAIL_TAKEN", await ErrorCode(dupMail));
    }

    [Fact]
    public async Task Disable_ends_sessions_blocks_login_and_enable_restores_it()
    {
        using var admin = await Admin();
        var (id, username, temp) = await CreateUser(admin);
        using var user = await SignIn(username, temp);
        await user.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync("/api/questions")).StatusCode);

        (await admin.PostAsync($"/api/admin/users/{id}/disable", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await user.GetAsync("/api/questions")).StatusCode);
        using var again = NewClient();
        var login = await again.PostAsJsonAsync("/api/auth/login", new { username, password = "A-brand-new-passphrase-9" });
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);
        Assert.Equal("ACCOUNT_DISABLED", await ErrorCode(login));

        (await admin.PostAsync($"/api/admin/users/{id}/enable", null)).EnsureSuccessStatusCode();
        await SignIn(username, "A-brand-new-passphrase-9");
    }

    [Fact]
    public async Task Last_admin_and_self_actions_are_protected()
    {
        using var admin = await Admin();
        var me = await Body(await admin.GetAsync("/api/auth/me"));
        var myId = me.GetProperty("user").GetProperty("id").GetString()!;

        var self = await admin.PostAsJsonAsync($"/api/admin/users/{myId}/role", new { role = "Member" });
        Assert.Equal(HttpStatusCode.Conflict, self.StatusCode);
        Assert.Equal("SELF_ACTION_NOT_ALLOWED", await ErrorCode(self));
        Assert.Equal("SELF_ACTION_NOT_ALLOWED", await ErrorCode(await admin.PostAsync($"/api/admin/users/{myId}/disable", null)));

        // A second admin may demote the first only while another enabled admin remains.
        var (secondId, secondName, temp) = await CreateUser(admin, "Admin");
        using var second = await SignIn(secondName, temp);
        await second.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        (await second.PostAsJsonAsync($"/api/admin/users/{secondId}/role", new { role = "Member" })).Dispose();
        Assert.Equal(HttpStatusCode.OK, (await second.PostAsJsonAsync($"/api/admin/users/{myId}/role", new { role = "Member" })).StatusCode);
        // Restore so other tests keep a working bootstrap admin.
        (await second.PostAsJsonAsync($"/api/admin/users/{myId}/role", new { role = "Admin" })).EnsureSuccessStatusCode();

        var last = await second.PostAsJsonAsync($"/api/admin/users/{myId}/disable", null as object);
        Assert.Equal(HttpStatusCode.OK, last.StatusCode); // two enabled admins -> allowed
        (await second.PostAsync($"/api/admin/users/{myId}/enable", null)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Role_change_applies_without_signing_in_again()
    {
        using var admin = await Admin();
        var (id, username, temp) = await CreateUser(admin);
        using var user = await SignIn(username, temp);
        await user.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/admin/users")).StatusCode);

        (await admin.PostAsJsonAsync($"/api/admin/users/{id}/role", new { role = "Admin" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync("/api/admin/users")).StatusCode);
        (await admin.PostAsJsonAsync($"/api/admin/users/{id}/role", new { role = "Member" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/admin/users")).StatusCode);
    }

    [Fact]
    public async Task Password_reset_rotates_sessions_and_never_leaks_secrets_into_the_audit_log()
    {
        using var admin = await Admin();
        var (id, username, temp) = await CreateUser(admin);
        using var user = await SignIn(username, temp);
        const string newPassword = "A-brand-new-passphrase-9";
        await user.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword });

        var reset = await Body(await admin.PostAsJsonAsync($"/api/admin/users/{id}/reset-password", new { }));
        var tempAfter = reset.GetProperty("temporaryPassword").GetString()!;
        Assert.Equal(HttpStatusCode.Unauthorized, (await user.GetAsync("/api/questions")).StatusCode);
        await SignIn(username, tempAfter);

        var audit = await admin.GetStringAsync($"/api/admin/audit?target={id}");
        Assert.Contains("user.password_reset", audit);
        Assert.DoesNotContain(temp, audit);
        Assert.DoesNotContain(tempAfter, audit);
        Assert.DoesNotContain(newPassword, audit);
        Assert.DoesNotContain("AQAAAA", audit); // Identity password-hash prefix
    }

    [Fact]
    public async Task Delete_reassigns_contributions_and_leaves_other_users_data_alone()
    {
        using var admin = await Admin();
        var (id, username, temp) = await CreateUser(admin);
        using var doomed = await SignIn(username, temp);
        await doomed.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        var q = await Body(await doomed.PostAsJsonAsync("/api/questions", new { topicId = 1, text = "Doomed contribution?", answer = "Kept", difficulty = "Intermediate", tags = Array.Empty<string>() }));
        var qid = q.GetProperty("id").GetInt32();
        await doomed.PostAsJsonAsync($"/api/questions/{qid}/progress", new { status = "Completed" });
        await doomed.PutAsJsonAsync($"/api/questions/{qid}/note", new { body = "private" });

        // Another member studies the same question; this must survive the deletion.
        var (otherId, otherName, otherTemp) = await CreateUser(admin);
        using var other = await SignIn(otherName, otherTemp);
        await other.PostAsJsonAsync("/api/account/password", new { currentPassword = otherTemp, newPassword = "A-brand-new-passphrase-9" });
        await other.PostAsJsonAsync($"/api/questions/{qid}/progress", new { status = "Completed" });

        var wrong = await admin.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/admin/users/{id}") { Content = JsonContent.Create(new { confirmUsername = "nope" }) });
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);

        var del = await admin.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/admin/users/{id}") { Content = JsonContent.Create(new { confirmUsername = username }) });
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var question = await Body(await other.GetAsync($"/api/questions/{qid}"));
        Assert.EndsWith("(former member)", question.GetProperty("addedBy").GetString());
        Assert.Equal("Completed", question.GetProperty("userState").GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await doomed.GetAsync("/api/questions")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/admin/users/{id}")).StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.UserNotes.AnyAsync(n => n.UserId == id));
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "user.delete" && a.TargetId == id));
        _ = otherId;
    }

    [Fact]
    public async Task Display_name_change_updates_contribution_labels()
    {
        using var admin = await Admin();
        var (id, username, temp) = await CreateUser(admin);
        using var user = await SignIn(username, temp);
        await user.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        var q = await Body(await user.PostAsJsonAsync("/api/questions", new { topicId = 1, text = "Label question?", answer = "A", difficulty = "Intermediate", tags = Array.Empty<string>() }));

        var detail = await Body(await admin.GetAsync($"/api/admin/users/{id}"));
        (await admin.PutAsJsonAsync($"/api/admin/users/{id}", new { username, displayName = "Renamed Person", email = detail.GetProperty("email").GetString() })).EnsureSuccessStatusCode();
        var after = await Body(await admin.GetAsync($"/api/questions/{q.GetProperty("id").GetInt32()}"));
        Assert.Equal("Renamed Person", after.GetProperty("addedBy").GetString());
    }

    [Fact]
    public async Task Registration_switch_closes_public_signup_but_not_admin_creation()
    {
        using var admin = await Admin();
        try
        {
            (await admin.PutAsJsonAsync("/api/admin/settings", new { registration = "Closed" })).EnsureSuccessStatusCode();
            using var anon = NewClient();
            Assert.False((await Body(await anon.GetAsync("/api/auth/config"))).GetProperty("registrationOpen").GetBoolean());
            var res = await anon.PostAsJsonAsync("/api/auth/register", new { username = Unique("r"), name = "Closed", email = Unique("e") + "@example.test", password = MemberPassword });
            Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
            Assert.Equal("REGISTRATION_CLOSED", await ErrorCode(res));
            await CreateUser(admin);
        }
        finally
        {
            (await admin.PutAsJsonAsync("/api/admin/settings", new { registration = "Open" })).EnsureSuccessStatusCode();
        }
        using var open = NewClient();
        Assert.True((await Body(await open.GetAsync("/api/auth/config"))).GetProperty("registrationOpen").GetBoolean());
    }

    [Fact]
    public async Task Public_registration_ignores_a_forged_role()
    {
        using var c = NewClient();
        var res = await Body(await c.PostAsJsonAsync("/api/auth/register", new
        {
            username = Unique("f"), name = "Forger", email = Unique("e") + "@example.test", password = MemberPassword, role = "Admin", isAdmin = true
        }));
        Assert.False(res.GetProperty("user").GetProperty("isAdmin").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync("/api/admin/users")).StatusCode);
    }

    [Fact]
    public async Task Admin_progress_projection_never_contains_note_bodies()
    {
        using var admin = await Admin();
        var (id, username, temp) = await CreateUser(admin);
        using var user = await SignIn(username, temp);
        await user.PostAsJsonAsync("/api/account/password", new { currentPassword = temp, newPassword = "A-brand-new-passphrase-9" });
        await user.PostAsJsonAsync("/api/questions/1/progress", new { status = "Completed" });
        await user.PutAsJsonAsync("/api/questions/1/note", new { body = "SECRET-NOTE-BODY" });
        var json = await admin.GetStringAsync($"/api/admin/users/{id}/progress");
        Assert.Contains("\"progress\"", json);
        Assert.DoesNotContain("SECRET-NOTE-BODY", json);
    }

    [Fact]
    public async Task User_list_filters_searches_literally_and_pages()
    {
        using var admin = await Admin();
        var (_, username, _) = await CreateUser(admin);
        var list = await Body(await admin.GetAsync($"/api/admin/users?search={username}&pageSize=5"));
        Assert.Equal(1, list.GetProperty("totalCount").GetInt32());
        var wildcard = await Body(await admin.GetAsync("/api/admin/users?search=%25"));
        Assert.Equal(0, wildcard.GetProperty("totalCount").GetInt32()); // % is literal, not a wildcard
        var admins = await Body(await admin.GetAsync("/api/admin/users?role=Admin&status=active"));
        Assert.All(admins.GetProperty("items").EnumerateArray(), x => Assert.Equal("Admin", x.GetProperty("role").GetString()));
    }
}

public class PasswordPolicyTests
{
    [Fact]
    public void Generated_passwords_are_long_unique_and_use_every_class()
    {
        var seen = new HashSet<string>();
        for (var i = 0; i < 50; i++)
        {
            var p = PasswordPolicy.Generate();
            Assert.Equal(16, p.Length);
            Assert.Contains(p, char.IsLower);
            Assert.Contains(p, char.IsUpper);
            Assert.Contains(p, char.IsDigit);
            Assert.Contains(p, c => !char.IsLetterOrDigit(c));
            Assert.True(seen.Add(p));
        }
    }

    [Theory]
    [InlineData("password12345", "someone", "a@b.test", "Some One")]
    [InlineData("someone-name-xx", "someone-name-xx", "a@b.test", "Some One")]
    [InlineData("short", "someone", "a@b.test", "Some One")]
    public void Weak_passwords_are_rejected(string password, string user, string email, string name)
    {
        var v = new InterviewForge.Application.Common.Validator();
        PasswordPolicy.Validate(v, "password", password, user, email, name);
        Assert.False(v.IsValid);
    }
}
