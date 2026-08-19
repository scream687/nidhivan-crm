import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { MailService } from '../mail/mail.service';

const mockPrisma = {
  user: { findMany: jest.fn(), count: jest.fn() },
};
const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockMail = { sendOtp: jest.fn() };

/**
 * findAll answers with a pagination envelope, not a bare array. The web app
 * assigned the body straight into array state in five places, so every
 * users.map()/users.filter() call site threw and the error boundary swallowed
 * whole pages. These tests pin the shape so that contract cannot drift
 * silently again.
 */
describe('UsersService.findAll', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('returns a pagination envelope whose data is an array', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', name: 'Agent' }]);
    mockPrisma.user.count.mockResolvedValue(1);

    const result = await service.findAll({});

    expect(Array.isArray(result)).toBe(false);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('keeps data an array when there are no users', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const result = await service.findAll({});

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('caps limit at 100 so a caller cannot request the whole table', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const result = await service.findAll({ limit: '5000' });

    expect(result.limit).toBe(100);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('coerces a junk page number to page 1 rather than a negative skip', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const result = await service.findAll({ page: '-3' });

    expect(result.page).toBe(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });

  it('ignores a role filter that is not a real Role', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    await service.findAll({ role: 'NOT_A_ROLE' });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
