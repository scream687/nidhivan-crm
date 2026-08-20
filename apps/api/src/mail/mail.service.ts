import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

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

  async sendInvite(to: string, name: string, password: string) {
    try {
      await this.sendEmail(
        to,
        `Welcome to Nidhivan CRM`,
        `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="color:#1e40af;margin-bottom:8px">Welcome to Nidhivan CRM</h2>
            <p style="color:#374151">Hi ${name},</p>
            <p style="color:#374151">Your account has been created. Use the credentials below to sign in.</p>
            <div style="background:#eff6ff;border-radius:8px;padding:20px;margin:24px 0">
              <p style="margin:0 0 8px;font-size:13px;color:#374151"><strong>Email:</strong> ${to}</p>
              <p style="margin:0;font-size:13px;color:#374151"><strong>Password:</strong> ${password}</p>
            </div>
            <p style="color:#6b7280;font-size:13px">Please change your password after first login.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px">Nidhivan Property CRM &copy; ${new Date().getFullYear()}</p>
          </div>
        `,
      );
    } catch (err) {
      this.logger.error(`Failed to send invite email to ${to}`, err);
      // don't throw — invite still succeeds without email
    }
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