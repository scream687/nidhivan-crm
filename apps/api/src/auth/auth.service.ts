import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      { expiresIn: '15m', secret: this.config.get('JWT_SECRET') },
    );

    const rawRefresh = uuid();
    const tokenHash = await bcrypt.hash(rawRefresh, 10);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash, ...safeUser } = user;
    return { accessToken, refreshToken: rawRefresh, user: safeUser };
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

        const newAccess = this.jwt.sign(
          { sub: token.user.id, email: token.user.email, role: token.user.role, name: token.user.name },
          { expiresIn: '15m', secret: this.config.get('JWT_SECRET') },
        );

        const newRaw = uuid();
        const newHash = await bcrypt.hash(newRaw, 10);
        await this.prisma.refreshToken.create({
          data: { tokenHash: newHash, userId: token.userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });

        return { accessToken: newAccess, refreshToken: newRaw };
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
}
