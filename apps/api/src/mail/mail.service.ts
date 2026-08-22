import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/** Company name, sender name and URLs are admin-supplied — never interpolate raw. */
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

  private async gmailClient() {
    const client = new OAuth2Client(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
    );
    client.setCredentials({
      refresh_token: this.config.get('GOOGLE_REFRESH_TOKEN'),
    });
    return client;
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.config.get('GOOGLE_REFRESH_TOKEN')) {
      throw new Error('GOOGLE_REFRESH_TOKEN not set');
    }
    const from = this.config.get('GMAIL_FROM', 'Nidhivan CRM');
    const raw = Buffer.from(
      `From: ${from} <${this.config.get('GMAIL_USER')}>\n` +
        `To: ${to}\n` +
        `Subject: ${subject}\n` +
        `Content-Type: text/html; charset=utf-8\n\n` +
        html,
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const client = await this.gmailClient();
    const { token } = await client.getAccessToken();
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gmail API ${res.status}: ${body}`);
    }
  }

  /**
   * Invites carry no password. The account is created with an unguessable
   * random secret nobody is ever told, and the invitee sets their own via the
   * existing "Forgot password?" flow on the sign-in page — which already does
   * email OTP verification. That keeps a plaintext password out of the mail
   * entirely, and reuses a flow that is already built and tested.
   *
   * Throws on failure rather than swallowing: without the password in the
   * email, an invite that does not arrive leaves an account nobody can reach,
   * so the admin has to be told.
   */
  async sendInvite(to: string, name: string, loginUrl: string) {
    await this.sendEmail(
      to,
      `Welcome to Nidhivan CRM`,
      `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="color:#1e40af;margin-bottom:8px">Welcome to Nidhivan CRM</h2>
            <p style="color:#374151">Hi ${name},</p>
            <p style="color:#374151">An account has been created for you. Set your own password to get started:</p>
            <ol style="color:#374151;font-size:14px;line-height:1.7">
              <li>Open <a href="${loginUrl}" style="color:#C02F12">the sign-in page</a></li>
              <li>Click <strong>Forgot password?</strong></li>
              <li>Enter <strong>${to}</strong> and follow the emailed code</li>
            </ol>
            <p style="color:#6b7280;font-size:13px">Nobody else knows your password — you choose it in that step.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px">Nidhivan Property CRM &copy; ${new Date().getFullYear()}</p>
          </div>
        `,
    );
  }

  /**
   * Asks a listing portal's account manager to enable lead push to our webhook.
   *
   * The URL carries the authentication token, so this goes to one named
   * recipient the admin typed — never a list, and never CC'd anywhere.
   *
   * Throws on failure: an admin who thinks the request went out will sit
   * waiting for leads that were never going to arrive.
   */
  async sendPortalSetupRequest(opts: {
    to: string;
    portalLabel: string;
    webhookUrl: string;
    companyName: string;
    senderName: string;
    replyTo?: string;
  }) {
    const { to, portalLabel, webhookUrl, companyName, senderName, replyTo } = opts;

    await this.sendEmail(
      to,
      `${companyName} — enable CRM lead integration for our ${portalLabel} account`,
      `
          <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
            <p style="color:#374151">Hello,</p>
            <p style="color:#374151">
              Please enable lead push (CRM / API integration) on our ${escapeHtml(portalLabel)}
              account so enquiries are delivered into our CRM automatically.
            </p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
              <tr>
                <td style="padding:8px 0;color:#6b7280;width:90px;vertical-align:top">Endpoint</td>
                <td style="padding:8px 0"><code style="word-break:break-all;color:#111827">${escapeHtml(webhookUrl)}</code></td>
              </tr>
              <tr><td style="padding:8px 0;color:#6b7280">Method</td><td style="padding:8px 0;color:#111827">POST</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Format</td><td style="padding:8px 0;color:#111827">JSON</td></tr>
            </table>
            <p style="color:#374151;font-size:14px">
              The URL already contains our authentication token, so no additional credentials or
              headers are required. If your system needs the token as a header instead of a query
              parameter, we also accept it as <code>X-Nidhivan-Token</code>.
            </p>
            <p style="color:#374151;font-size:14px">
              Please confirm once it is live and send a test lead so we can verify delivery.
            </p>
            <p style="color:#374151;font-size:14px">Thanks,<br>${escapeHtml(senderName)}<br>${escapeHtml(companyName)}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px">
              This endpoint is private to ${escapeHtml(companyName)}. Please do not forward it.
              ${replyTo ? `Reply to ${escapeHtml(replyTo)}.` : ''}
            </p>
          </div>
        `,
    );
  }

  async sendOtp(to: string, name: string, otp: string) {
    try {
      await this.sendEmail(
        to,
        `${otp} — Your Nidhivan CRM password reset OTP`,
        `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="color:#1e40af;margin-bottom:8px">Password Reset OTP</h2>
            <p style="color:#374151">Hi ${name},</p>
            <p style="color:#374151">Use the OTP below to reset your Nidhivan CRM password. It expires in <strong>10 minutes</strong>.</p>
            <div style="background:#eff6ff;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e40af">${otp}</span>
            </div>
            <p style="color:#6b7280;font-size:13px">If you didn't request this, ignore this email. Your password won't change.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px">Nidhivan Property CRM &copy; ${new Date().getFullYear()}</p>
          </div>
        `,
      );
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}`, err);
      throw err;
    }
  }
}