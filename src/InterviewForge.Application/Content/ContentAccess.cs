using InterviewForge.Domain;
using InterviewForge.Application.Common;
namespace InterviewForge.Application.Content;
public static class ContentAccess
{
    public static bool CanEdit(ICurrentUser user, IContributedContent content) => user.IsAdmin || content.CreatedByUserId == user.UserId;
    public static void Ensure(ICurrentUser user, IContributedContent content)
    {
        if (!CanEdit(user, content)) throw new ForbiddenException();
        if (user.IsAdmin) content.IsAdminEdited = true;
    }
    public static void Attribute(ICurrentUser user, IContributedContent content)
    { content.CreatedByUserId = user.UserId; content.AddedBy = user.DisplayName; }
}
