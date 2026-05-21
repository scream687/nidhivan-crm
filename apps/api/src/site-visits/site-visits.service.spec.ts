import { Test, TestingModule } from '@nestjs/testing';
import { SiteVisitsService } from './site-visits.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';
import { VisitOutcome } from '@prisma/client';

const mockPrisma = {
  lead: { findUnique: jest.fn(), update: jest.fn() },
  siteVisit: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  activity: { create: jest.fn() },
  task: { create: jest.fn() },
};
const mockGateway = { emitToAdmin: jest.fn(), emitToUser: jest.fn() };
const mockNotifications = { create: jest.fn() };

describe('SiteVisitsService', () => {
  let service: SiteVisitsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteVisitsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<SiteVisitsService>(SiteVisitsService);
  });

  describe('schedule', () => {
    it('throws NotFoundException when lead does not exist', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.schedule('bad-id', { scheduledAt: '2026-06-01T10:00:00Z', address: '123 Main St', propertyShown: 'Villa A' }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('creates visit and sets lead stage to SITE_VISIT_SCHEDULED', async () => {
      const lead = { id: 'lead-1', name: 'John', stage: 'CONNECTED' };
      mockPrisma.lead.findUnique.mockResolvedValue(lead);
      mockPrisma.siteVisit.create.mockResolvedValue({ id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', scheduledAt: new Date('2026-06-01'), address: '123 Main St' });
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', type: 'SITE_VISIT', user: {}, lead: {} });
      mockPrisma.lead.update.mockResolvedValue({});
      mockNotifications.create.mockResolvedValue({});

      const result = await service.schedule('lead-1', { scheduledAt: '2026-06-01T10:00:00Z', address: '123 Main St' }, 'user-1');

      expect(mockPrisma.siteVisit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ leadId: 'lead-1', address: '123 Main St', assignedToId: 'user-1' }) })
      );
      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stage: 'SITE_VISIT_SCHEDULED' } })
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateOutcome', () => {
    it('throws NotFoundException when visit does not exist', async () => {
      mockPrisma.siteVisit.findFirst.mockResolvedValue(null);
      await expect(service.updateOutcome('lead-1', 'bad-visit', { outcome: VisitOutcome.COMPLETED }, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('COMPLETED outcome sets stage to SITE_VISIT_COMPLETED', async () => {
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John', assignedToId: null } };
      mockPrisma.siteVisit.findFirst.mockResolvedValue(visit);
      mockPrisma.siteVisit.update.mockResolvedValue({ ...visit, outcome: VisitOutcome.COMPLETED });
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', user: {}, lead: {} });
      mockPrisma.lead.update.mockResolvedValue({});

      await service.updateOutcome('lead-1', 'visit-1', { outcome: VisitOutcome.COMPLETED }, 'user-1');

      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stage: 'SITE_VISIT_COMPLETED' } })
      );
    });

    it('NO_SHOW reverts stage to CONNECTED', async () => {
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John', assignedToId: null } };
      mockPrisma.siteVisit.findFirst.mockResolvedValue(visit);
      mockPrisma.siteVisit.update.mockResolvedValue({ ...visit, outcome: VisitOutcome.NO_SHOW });
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', user: {}, lead: {} });
      mockPrisma.lead.update.mockResolvedValue({});

      await service.updateOutcome('lead-1', 'visit-1', { outcome: VisitOutcome.NO_SHOW }, 'user-1');

      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stage: 'CONNECTED' } })
      );
    });

    it('CANCELLED does not change stage', async () => {
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John', assignedToId: null } };
      mockPrisma.siteVisit.findFirst.mockResolvedValue(visit);
      mockPrisma.siteVisit.update.mockResolvedValue({ ...visit, outcome: VisitOutcome.CANCELLED });
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', user: {}, lead: {} });

      await service.updateOutcome('lead-1', 'visit-1', { outcome: VisitOutcome.CANCELLED }, 'user-1');

      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('COMPLETED + followUpDate creates a follow-up task', async () => {
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John', assignedToId: null } };
      mockPrisma.siteVisit.findFirst.mockResolvedValue(visit);
      mockPrisma.siteVisit.update.mockResolvedValue({ ...visit, outcome: VisitOutcome.COMPLETED });
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', user: {}, lead: {} });
      mockPrisma.lead.update.mockResolvedValue({});
      mockPrisma.task.create.mockResolvedValue({ id: 'task-1' });

      await service.updateOutcome('lead-1', 'visit-1', { outcome: VisitOutcome.COMPLETED, followUpDate: '2026-06-10T10:00:00Z' }, 'user-1');

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Follow up after site visit', leadId: 'lead-1' }) })
      );
    });
  });

  describe('findByLead', () => {
    it('returns visits for a lead ordered by scheduledAt desc', async () => {
      mockPrisma.siteVisit.findMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]);
      const result = await service.findByLead('lead-1');
      expect(mockPrisma.siteVisit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { leadId: 'lead-1' } })
      );
      expect(result).toHaveLength(2);
    });
  });
});
