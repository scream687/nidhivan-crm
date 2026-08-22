import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export const SYSTEM_USER_EMAIL = 'system@nidhivan.internal';

// Cached for the life of the process — the row is immutable once created.
let cachedId: string | null = null;

/**
 * Resolves the User id that owns leads created by machines (webhooks, landing
 * pages, IVR). Lead.createdById is a required FK, so inbound lead capture fails
 * with a Prisma FK violation without a real user to point at.
 *
 * Upserted at runtime rather than seeded, because production is already seeded
 * and would otherwise need a re-seed to accept its first webhook lead.
 *
 * The account is inactive and holds an unreachable password, so it cannot be
 * logged into. It is never auto-assigned leads: getNextRoundRobin() draws from
 * RoundRobinConfig rows, not from the user table.
 */
export async function ensureSystemUser(prisma: PrismaService): Promise<string> {
  if (cachedId) return cachedId;

  const user = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      email: SYSTEM_USER_EMAIL,
      name: 'Nidhivan System',
      role: 'MARKETING',
      isActive: false,
      passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
    },
    select: { id: true },
  });

  cachedId = user.id;
  return cachedId;
}
