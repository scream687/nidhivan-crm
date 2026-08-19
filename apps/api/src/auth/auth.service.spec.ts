import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};
const mockJwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
const mockConfig = { get: jest.fn().mockReturnValue(undefined) };
const mockMail = { sendOtp: jest.fn() };

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  async function activeUser(password: string) {
    return {
      id: 'u1',
      email: 'agent@nidhivanproperty.com',
      name: 'Agent',
      role: 'SALES_AGENT',
      isActive: true,
      passwordHash: await bcrypt.hash(password, 4),
    };
  }

  it('rejects an unknown email with Invalid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login('nobody@example.com', 'whatever')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong password with Invalid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(await activeUser('Right@2024'));

    await expect(
      service.login('agent@nidhivanproperty.com', 'Wrong@2024'),
    ).rejects.toThrow('Invalid credentials');
  });

  it('rejects a deactivated user even with the correct password', async () => {
    const user = await activeUser('Right@2024');
    mockPrisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });

    await expect(
      service.login('agent@nidhivanproperty.com', 'Right@2024'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // Passwords predating the strength policy must still sign in — enforcing
  // composition rules on the login DTO locked those accounts out entirely.
  it('accepts a weak legacy password when it is the correct one', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(await activeUser('abc'));
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.login('agent@nidhivanproperty.com', 'abc');

    expect(result.accessToken).toBeDefined();
  });

  it('never returns the password hash to the caller', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(await activeUser('Right@2024'));
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.login('agent@nidhivanproperty.com', 'Right@2024');

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.email).toBe('agent@nidhivanproperty.com');
  });
});
