import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { IntegrationsService } from './integrations.service';
import { LeadsService } from '../leads/leads.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let leads: { create: jest.Mock };
  let mail: { sendPortalSetupRequest: jest.Mock };
  let prisma: any;

  beforeEach(async () => {
    leads = { create: jest.fn() };
    mail = { sendPortalSetupRequest: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      integrationConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      webhookDelivery: { create: jest.fn().mockResolvedValue({}), deleteMany: jest.fn() },
      lead: { findUnique: jest.fn().mockResolvedValue(null) },
      user: { upsert: jest.fn().mockResolvedValue({ id: 'system-user-id' }) },
      company: { findFirst: jest.fn().mockResolvedValue({ name: 'Nidhivan Property Linkers', email: 'nidhivanproperty@gmail.com' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: LeadsService, useValue: leads },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapPortalPayload', () => {
    it('maps a Housing.com payload using snake_case field names', () => {
      const { dto, phoneValid } = service.mapPortalPayload('housing', {
        name: 'Ramesh Gupta',
        contact_number: '9876543210',
        email: 'ramesh@example.com',
        city: 'Vrindavan',
        project_name: 'Nidhivan Greens',
      });

      expect(phoneValid).toBe(true);
      expect(dto.name).toBe('Ramesh Gupta');
      expect(dto.phone).toBe('9876543210');
      expect(dto.email).toBe('ramesh@example.com');
      expect(dto.projectInterest).toBe('Nidhivan Greens');
      expect(dto.source).toBe('HOUSING_COM');
      expect(dto.utmSource).toBe('Housing.com');
    });

    it('maps a 99acres payload using PascalCase field names', () => {
      const { dto, phoneValid } = service.mapPortalPayload('99acres', {
        ContactName: 'Sunita Devi',
        MobileNumber: '9123456780',
        Email: 'sunita@example.com',
        ProjectName: 'Nidhivan Heights',
      });

      expect(phoneValid).toBe(true);
      expect(dto.name).toBe('Sunita Devi');
      expect(dto.phone).toBe('9123456780');
      expect(dto.projectInterest).toBe('Nidhivan Heights');
      expect(dto.source).toBe('NINETYNINE_ACRES');
    });

    it('reads leads nested under a wrapper key', () => {
      const { dto, phoneValid } = service.mapPortalPayload('housing', {
        event: 'new_lead',
        lead: { name: 'Nested Person', phone: '9800011122' },
      });

      expect(phoneValid).toBe(true);
      expect(dto.name).toBe('Nested Person');
      expect(dto.phone).toBe('9800011122');
    });

    it.each([
      ['+91 98765 43210', '9876543210'],
      ['0919876543210', '9876543210'],
      ['09876543210', '9876543210'],
      ['919876543210', '9876543210'],
      ['98765-43210', '9876543210'],
    ])('normalizes %s to %s', (input, expected) => {
      const { dto, phoneValid } = service.mapPortalPayload('housing', { name: 'X', phone: input });
      expect(dto.phone).toBe(expected);
      expect(phoneValid).toBe(true);
    });

    it.each([
      ['1234567890', 'does not start with 6-9'],
      ['12345', 'too short'],
      ['', 'empty'],
    ])('rejects %s (%s)', (input) => {
      const { phoneValid } = service.mapPortalPayload('housing', { name: 'X', phone: input });
      expect(phoneValid).toBe(false);
    });

    it('lets an admin field map override the built-in candidates', () => {
      const { dto } = service.mapPortalPayload(
        'housing',
        { name: 'Built In', phone: '9876543210', customer_mobile: '9999988888' },
        { phone: 'customer_mobile' },
      );

      expect(dto.phone).toBe('9999988888');
    });

    it('falls back to a portal-labelled name when none is supplied', () => {
      const { dto } = service.mapPortalPayload('99acres', { phone: '9876543210' });
      expect(dto.name).toBe('99acres Lead');
    });
  });

  describe('handlePortalLead', () => {
    it('creates a lead and records a delivery on a valid payload', async () => {
      leads.create.mockResolvedValue({ id: 'lead-1', leadNumber: 'LD-1' });

      const result = await service.handlePortalLead('housing', {
        name: 'Ramesh',
        phone: '9876543210',
      });

      expect(result).toEqual({ status: 'created', leadId: 'lead-1' });
      expect(leads.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '9876543210', source: 'HOUSING_COM' }),
        'system-user-id',
      );
      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'created', source: 'HOUSING_COM' }) }),
      );
    });

    it('rejects a payload with no usable phone number and creates no lead', async () => {
      const result = await service.handlePortalLead('housing', { name: 'No Phone' });

      expect(result.status).toBe('rejected');
      expect(leads.create).not.toHaveBeenCalled();
      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) }),
      );
    });

    it('records an error delivery when lead creation throws', async () => {
      leads.create.mockRejectedValue(new Error('db is down'));

      const result = await service.handlePortalLead('housing', { name: 'X', phone: '9876543210' });

      expect(result.status).toBe('error');
      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'error', error: 'db is down' }) }),
      );
    });
  });

  describe('verifyFacebookSignature', () => {
    const appSecret = 'test-app-secret';
    const body = Buffer.from(JSON.stringify({ entry: [{ id: '1' }] }));

    beforeEach(() => {
      prisma.integrationConfig.findUnique.mockResolvedValue({ metadata: { appSecret } });
    });

    it('accepts a correctly signed body', async () => {
      const sig = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
      await expect(service.verifyFacebookSignature(body, sig)).resolves.toBe(true);
    });

    it('rejects a tampered body', async () => {
      const sig = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
      const tampered = Buffer.from(JSON.stringify({ entry: [{ id: '666' }] }));
      await expect(service.verifyFacebookSignature(tampered, sig)).resolves.toBe(false);
    });

    it('rejects a missing signature header', async () => {
      await expect(service.verifyFacebookSignature(body, undefined)).resolves.toBe(false);
    });

    it('fails closed when no app secret is configured', async () => {
      prisma.integrationConfig.findUnique.mockResolvedValue(null);
      const previous = process.env.FB_APP_SECRET;
      delete process.env.FB_APP_SECRET;

      const sig = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
      await expect(service.verifyFacebookSignature(body, sig)).resolves.toBe(false);

      if (previous !== undefined) process.env.FB_APP_SECRET = previous;
    });
  });

  describe('handleFacebookLead', () => {
    it('short-circuits a replayed leadgen_id as a duplicate without creating a lead', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'existing-lead' });

      const result = await service.handleFacebookLead({
        entry: [{ changes: [{ value: { leadgen_id: 'lg-1', form_id: 'f-1' } }] }],
      });

      expect(result).toEqual({ status: 'duplicate', leadId: 'existing-lead' });
      expect(leads.create).not.toHaveBeenCalled();
    });

    it('rejects a payload with no leadgen_id', async () => {
      const result = await service.handleFacebookLead({ entry: [{ changes: [{ value: {} }] }] });
      expect(result.status).toBe('rejected');
      expect(leads.create).not.toHaveBeenCalled();
    });
  });

  describe('sendSetupEmail', () => {
    const previousApiUrl = process.env.API_URL;

    beforeEach(() => {
      process.env.API_URL = 'https://api.example.com';
      prisma.integrationConfig.findUnique.mockResolvedValue({
        metadata: { webhookSecret: 'sekret123' },
      });
    });

    afterEach(() => {
      if (previousApiUrl === undefined) delete process.env.API_URL;
      else process.env.API_URL = previousApiUrl;
    });

    it('emails the account manager the URL carrying the token', async () => {
      const result = await service.sendSetupEmail('HOUSING_COM', 'manager@housing.com', 'Rishabh');

      expect(result.sent).toBe(true);
      expect(mail.sendPortalSetupRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'manager@housing.com',
          portalLabel: 'Housing.com',
          webhookUrl: 'https://api.example.com/api/v1/integrations/leads/housing?token=sekret123',
          senderName: 'Rishabh',
        }),
      );
    });

    it('generates a secret first when none exists yet', async () => {
      prisma.integrationConfig.findUnique.mockResolvedValueOnce(null).mockResolvedValue({
        metadata: { webhookSecret: 'freshly-made' },
      });

      await service.sendSetupEmail('NINETYNINE_ACRES', 'rm@99acres.com', 'Rishabh');

      expect(prisma.integrationConfig.upsert).toHaveBeenCalled();
      expect(mail.sendPortalSetupRequest).toHaveBeenCalled();
    });

    it.each(['not-an-email', 'missing@domain', '', 'a b@c.com'])(
      'refuses to send to the invalid address %p',
      async (bad) => {
        await expect(service.sendSetupEmail('HOUSING_COM', bad, 'Rishabh')).rejects.toThrow();
        expect(mail.sendPortalSetupRequest).not.toHaveBeenCalled();
      },
    );

    it('refuses sources that have no portal webhook to share', async () => {
      await expect(service.sendSetupEmail('FACEBOOK', 'x@y.com', 'Rishabh')).rejects.toThrow();
      expect(mail.sendPortalSetupRequest).not.toHaveBeenCalled();
    });

    it('surfaces a mail failure instead of reporting success', async () => {
      mail.sendPortalSetupRequest.mockRejectedValue(new Error('Gmail API 403'));

      await expect(
        service.sendSetupEmail('HOUSING_COM', 'manager@housing.com', 'Rishabh'),
      ).rejects.toThrow(/Gmail API 403/);
    });

    it('does not record a recipient when the send failed', async () => {
      mail.sendPortalSetupRequest.mockRejectedValue(new Error('nope'));
      prisma.integrationConfig.upsert.mockClear();

      await expect(
        service.sendSetupEmail('HOUSING_COM', 'manager@housing.com', 'Rishabh'),
      ).rejects.toThrow();
      expect(prisma.integrationConfig.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getWebhookUrl', () => {
    it('returns null when no secret exists, rather than a URL that would 401', async () => {
      process.env.API_URL = 'https://api.example.com';
      prisma.integrationConfig.findUnique.mockResolvedValue({ metadata: {} });
      await expect(service.getWebhookUrl('HOUSING_COM')).resolves.toBeNull();
    });
  });

  describe('verifyFacebookCredentials', () => {
    it('flags a missing app secret as the reason deliveries are being rejected', async () => {
      prisma.integrationConfig.findUnique.mockResolvedValue({
        accessToken: 'tok',
        metadata: { verifyToken: 'vt' },
      });
      const previous = process.env.FB_APP_SECRET;
      delete process.env.FB_APP_SECRET;

      const result = await service.verifyFacebookCredentials();

      expect(result.ok).toBe(false);
      expect(result.blocksDeliveries).toBe(true);
      expect(result.error).toContain('App secret');

      if (previous !== undefined) process.env.FB_APP_SECRET = previous;
    });
  });

  describe('verifyWebhookSecret', () => {
    it('rejects when no secret is configured', async () => {
      prisma.integrationConfig.findUnique.mockResolvedValue(null);
      await expect(service.verifyWebhookSecret('HOUSING_COM', 'anything')).resolves.toBe(false);
    });

    it('rejects a wrong secret and accepts the right one', async () => {
      prisma.integrationConfig.findUnique.mockResolvedValue({ metadata: { webhookSecret: 'correct-secret' } });
      await expect(service.verifyWebhookSecret('HOUSING_COM', 'wrong-secret')).resolves.toBe(false);
      await expect(service.verifyWebhookSecret('HOUSING_COM', 'correct-secret')).resolves.toBe(true);
    });

    it('rejects a missing secret', async () => {
      prisma.integrationConfig.findUnique.mockResolvedValue({ metadata: { webhookSecret: 'correct-secret' } });
      await expect(service.verifyWebhookSecret('HOUSING_COM', undefined)).resolves.toBe(false);
    });
  });
});
