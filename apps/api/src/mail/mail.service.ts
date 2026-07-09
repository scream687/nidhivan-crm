import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async sendInvite(to: string, name: string, password: string) {
    const from = this.config.get('SMTP_FROM', `Nidhivan CRM <${this.config.get('SMTP_USER')}>`);
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `Welcome to Nidhivan CRM`,
        html: `
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
      });
    } catch (err) {
      this.logger.error(`Failed to send invite email to ${to}`, err);
      // don't throw — invite still succeeds without email
    }
  }

  async sendOtp(to: string, name: string, otp: string) {
    const from = this.config.get('SMTP_FROM', `Nidhivan CRM <${this.config.get('SMTP_USER')}>`);
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `${otp} — Your Nidhivan CRM password reset OTP`,
        html: `
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
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}`, err);
      throw err;
    }
  }
}
