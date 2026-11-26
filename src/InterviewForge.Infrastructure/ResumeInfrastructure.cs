using System.Net;
using System.Net.Mail;
using System.Text;
using InterviewForge.Application.Resumes;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace InterviewForge.Infrastructure;

/// <summary>Extracts text from PDFs with PdfPig (pure .NET). Image-only pages yield no text.</summary>
public sealed class PdfPigTextExtractor : IPdfTextExtractor
{
    public string Extract(byte[] pdf, int maxPages)
    {
        using var doc = PdfDocument.Open(pdf, new ParsingOptions { UseLenientParsing = true });
        var sb = new StringBuilder();
        foreach (var page in doc.GetPages().Take(maxPages))
            sb.AppendLine(ContentOrderTextExtractor.GetText(page));
        return sb.ToString();
    }
}

/// <summary>SMTP sender using System.Net.Mail. Recipients go in Bcc so administrators do not see each other's addresses.</summary>
public sealed class SmtpEmailSender(EmailOptions options) : IEmailSender
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.SmtpHost) && !string.IsNullOrWhiteSpace(options.From);

    public async Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken ct)
    {
        if (!IsConfigured || recipients.Count == 0) return;
        using var message = new MailMessage { From = new MailAddress(options.From!), Subject = subject, Body = body, IsBodyHtml = false };
        message.To.Add(new MailAddress(options.From!));
        foreach (var r in recipients) message.Bcc.Add(new MailAddress(r));
        using var client = new SmtpClient(options.SmtpHost, options.SmtpPort) { EnableSsl = options.EnableSsl };
        if (!string.IsNullOrWhiteSpace(options.SmtpUser))
            client.Credentials = new NetworkCredential(options.SmtpUser, options.SmtpPassword);
        await client.SendMailAsync(message, ct);
    }
}
