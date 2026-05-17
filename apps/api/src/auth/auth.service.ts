import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {
    this.googleClient = new OAuth2Client(config.get('GOOGLE_CLIENT_ID'));
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const { passwordHash, ...safeUser } = user;
    return { accessToken: await this.signAccess(user), refreshToken: await this.createRefresh(user.id), user: safeUser };
  }

  async googleLogin(idToken: string) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    if (!clientId) throw new BadRequestException('Google login not configured');

    let payload: any;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) throw new UnauthorizedException('No email in Google token');

    let user = await this.prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });

    if (!user) throw new UnauthorizedException('No account found for this Google account. Ask your admin to create one.');

    if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: user.avatarUrl || picture || undefined, lastLoginAt: new Date() },
      });
    } else {
      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const { passwordHash, ...safeUser } = user;
    return { accessToken: await this.signAccess(user), refreshToken: await this.createRefresh(user.id), user: safeUser };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user || !user.isActive) return { message: 'If that email exists, an OTP has been sent.' };

    // Expire any existing OTPs
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    await this.mail.sendOtp(user.email, user.name, otp);
    return { message: 'If that email exists, an OTP has been sent.' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid OTP');

    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const token of tokens) {
      const match = await bcrypt.compare(otp, token.otpHash);
      if (match) {
        // Mark as used
        await this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { used: true } });
        // Issue a short-lived reset JWT
        const resetToken = this.jwt.sign(
          { sub: user.id, purpose: 'password_reset' },
          { expiresIn: '10m', secret: this.config.get('JWT_SECRET') },
        );
        return { resetToken };
      }
    }
    throw new UnauthorizedException('Invalid or expired OTP');
  }

  async resetPassword(resetToken: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(resetToken, { secret: this.config.get('JWT_SECRET') });
    } catch {
      throw new UnauthorizedException('Reset token expired or invalid');
    }

    if (payload.purpose !== 'password_reset') throw new UnauthorizedException('Invalid token');
    if (newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: payload.sub }, data: { passwordHash: hash } });
    // Invalidate all sessions
    await this.prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });

    return { message: 'Password updated successfully' };
  }

  async refresh(rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    for (const token of tokens) {
      const match = await bcrypt.compare(rawToken, token.tokenHash);
      if (match) {
        await this.prisma.refreshToken.delete({ where: { id: token.id } });
        return {
          accessToken: await this.signAccess(token.user),
          refreshToken: await this.createRefresh(token.userId),
        };
      }
    }
    throw new UnauthorizedException('Invalid refresh token');
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private async signAccess(user: any) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      { expiresIn: '15m', secret: this.config.get('JWT_SECRET') },
    );
  }

  private async createRefresh(userId: string) {
    const raw = uuid();
    const hash = await bcrypt.hash(raw, 10);
    await this.prisma.refreshToken.create({
      data: { tokenHash: hash, userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    return raw;
  }
}
