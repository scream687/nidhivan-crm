import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private mail: MailService,
  ) {}

  async create(data: { name: string; email: string; password: string; role?: Role; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const { passwordHash: _, ...user } = await this.prisma.user.create({
      data: {
        id: require('crypto').randomUUID(),
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role ?? Role.SALES_AGENT,
        phone: data.phone,
      },
    });
    await this.cache.del('leaderboard');
    return user;
  }

  async invite(data: { name: string; email: string; role?: Role; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const tempPassword = crypto.randomBytes(4).toString('hex') + '!Ab1';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role ?? Role.SALES_AGENT,
        phone: data.phone,
        isActive: true,
      },
    });

    // attempt to send invite email; ok if it fails
    this.mail.sendInvite(user.email, user.name, tempPassword).catch((e) => console.error("async", e));

    await this.cache.del('leaderboard');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async findAll(query: { page?: string; limit?: string; search?: string; role?: string }) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role && Object.values(Role).includes(query.role as Role)) {
      where.role = query.role;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, avatarUrl: true, notificationPreferences: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalLeads, hotLeads, callsToday, conversions, pendingTasks] = await Promise.all([
      this.prisma.lead.count({ where: { assignedToId: userId } }),
      this.prisma.lead.count({ where: { assignedToId: userId, isHot: true } }),
      this.prisma.callLog.count({ where: { callerId: userId, createdAt: { gte: today } } }),
      this.prisma.lead.count({ where: { assignedToId: userId, stage: 'CLOSED_WON' } }),
      this.prisma.task.count({ where: { assignedToId: userId, isCompleted: false } }),
    ]);

    return { totalLeads, hotLeads, callsToday, conversions, pendingTasks };
  }

  async getLeaderboard() {
    const cached = await this.cache.get<any[]>('leaderboard');
    if (cached) return cached;

    const users = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: [Role.SALES_AGENT, Role.TELECALLER, Role.MANAGER] } },
      select: { id: true, name: true, avatarUrl: true, role: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Promise.all(
      users.map(async (u) => {
        const [totalLeads, callsToday, conversions] = await Promise.all([
          this.prisma.lead.count({ where: { assignedToId: u.id } }),
          this.prisma.callLog.count({ where: { callerId: u.id, createdAt: { gte: today } } }),
          this.prisma.lead.count({ where: { assignedToId: u.id, stage: 'CLOSED_WON' } }),
        ]);
        const score = conversions * 100 + callsToday * 5 + totalLeads;
        return { ...u, totalLeads, callsToday, conversions, productivityScore: score };
      }),
    );

    const result = stats.sort((a, b) => b.productivityScore - a.productivityScore);
    await this.cache.set('leaderboard', result, 60);
    return result;
  }

  async updateSelf(id: string, data: { name?: string; phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...updated } = await this.prisma.user.update({ where: { id }, data });
    await this.cache.del('leaderboard');
    return updated;
  }

  async update(id: string, data: { name?: string; email?: string; phone?: string; role?: Role; isActive?: boolean; newPassword?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (data.email && data.email.toLowerCase() !== user.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (emailTaken) throw new ConflictException('Email already in use');
    }

    const updateData: any = { ...data };
    delete updateData.newPassword;
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.newPassword) updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);

    const { passwordHash, ...updated } = await this.prisma.user.update({ where: { id }, data: updateData });
    await this.cache.del('leaderboard');
    return updated;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password incorrect');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
    return { message: 'Password updated' };
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
    });
    await this.cache.del('leaderboard');
    return updated;
  }
}
