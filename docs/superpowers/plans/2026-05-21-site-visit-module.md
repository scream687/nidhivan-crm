# Site Visit Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Site Visit management module — schema migration, backend CRUD API, stage automations, and frontend schedule/outcome forms inside Lead Detail.

**Architecture:** The existing `SiteVisit` Prisma model is extended with new nullable fields and two enums (`VisitOutcome`, `InterestLevel`). Two NestJS controllers handle nested routes (`leads/:leadId/site-visits`) and the existing global list route. The Lead Detail page wires up two modals (schedule + record outcome) using local component state; no new Zustand store needed.

**Tech Stack:** NestJS + Prisma + PostgreSQL (API), Next.js 14 App Router + Zustand + Framer Motion + React Hot Toast (web), Jest (backend tests), TypeScript throughout.

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/api/prisma/schema.prisma` |
| Modify | `apps/api/src/site-visits/site-visits.service.ts` |
| Modify | `apps/api/src/site-visits/site-visits.service.spec.ts` |
| Modify | `apps/api/src/site-visits/site-visits.controller.ts` |
| Modify | `apps/api/src/site-visits/site-visits.module.ts` |
| Modify | `apps/api/src/leads/leads.service.ts` — update `siteVisits` include |
| Create | `apps/web/src/components/leads/ScheduleVisitModal.tsx` |
| Create | `apps/web/src/components/leads/RecordOutcomeModal.tsx` |
| Modify | `apps/web/src/app/(dashboard)/leads/[id]/page.tsx` |

---

## Task 1: Schema — add VisitOutcome + InterestLevel enums and new SiteVisit fields

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add enums after the existing `Priority` enum (around line 365)**

Open `apps/api/prisma/schema.prisma` and add after the existing `Priority` enum:

```prisma
enum VisitOutcome {
  COMPLETED
  NO_SHOW
  CANCELLED
  RESCHEDULED
}

enum InterestLevel {
  HOT
  WARM
  COLD
  NOT_INTERESTED
}
```

- [ ] **Step 2: Add new nullable fields to `SiteVisit` model**

In the existing `SiteVisit` model (around line 246), add these fields after `rating Int?`:

```prisma
  // New outcome-phase fields (all nullable for backward compat)
  scheduledAt     DateTime?
  address         String?
  conductedById   String?
  conductedBy     User?     @relation("SiteVisitConductedBy", fields: [conductedById], references: [id])
  outcome         VisitOutcome?
  interestLevel   InterestLevel?
  propertyShown   String?
  objections      String?
  followUpNotes   String?
  followUpDate    DateTime?
```

- [ ] **Step 3: Add back-relation on User model**

Find the `User` model's SiteVisit relation line (`siteVisits SiteVisit[]`). The existing relation has no name, which will conflict with the new named relation. Add a relation name to both sides.

Find (approximately line 111 in schema.prisma):
```prisma
  siteVisits          SiteVisit[]
```
Change to:
```prisma
  siteVisits          SiteVisit[]         @relation("SiteVisitAssignedTo")
  conductedVisits     SiteVisit[]         @relation("SiteVisitConductedBy")
```

And in the `SiteVisit` model, find the existing `assignedTo` relation and add the name:
```prisma
  assignedTo      User      @relation(fields: [assignedToId], references: [id])
```
Change to:
```prisma
  assignedTo      User      @relation("SiteVisitAssignedTo", fields: [assignedToId], references: [id])
```

- [ ] **Step 4: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_site_visit_outcome_fields
```

Expected output: `The following migration(s) have been applied: .../add_site_visit_outcome_fields`

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(schema): add VisitOutcome, InterestLevel enums and new SiteVisit fields"
```

---

## Task 2: SiteVisitsService — rewrite with new methods

**Files:**
- Modify: `apps/api/src/site-visits/site-visits.service.ts`
- Modify: `apps/api/src/site-visits/site-visits.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Replace the entire contents of `apps/api/src/site-visits/site-visits.service.spec.ts`:

```typescript
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
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John' } };
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
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John' } };
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
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John' } };
      mockPrisma.siteVisit.findFirst.mockResolvedValue(visit);
      mockPrisma.siteVisit.update.mockResolvedValue({ ...visit, outcome: VisitOutcome.CANCELLED });
      mockPrisma.activity.create.mockResolvedValue({ id: 'act-1', user: {}, lead: {} });

      await service.updateOutcome('lead-1', 'visit-1', { outcome: VisitOutcome.CANCELLED }, 'user-1');

      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('COMPLETED + followUpDate creates a follow-up task', async () => {
      const visit = { id: 'visit-1', leadId: 'lead-1', assignedToId: 'user-1', lead: { stage: 'SITE_VISIT_SCHEDULED', name: 'John' } };
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
npx jest site-visits --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `SiteVisitsService` methods throw or don't exist.

- [ ] **Step 3: Rewrite the service**

Replace the entire contents of `apps/api/src/site-visits/site-visits.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityType, Role, User, VisitOutcome } from '@prisma/client';

const STAGE_ORDER = [
  'NEW','ATTEMPTED','CONNECTED','INTERESTED','HOT',
  'SITE_VISIT_SCHEDULED','SITE_VISIT_COMPLETED','NEGOTIATION',
  'BOOKING_PENDING','CLOSED_WON','CLOSED_LOST','FUTURE_PROSPECT',
];

@Injectable()
export class SiteVisitsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private notifications: NotificationsService,
  ) {}

  async schedule(
    leadId: string,
    data: { scheduledAt: string; address: string; propertyShown?: string },
    userId: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const visit = await this.prisma.siteVisit.create({
      data: {
        leadId,
        assignedToId: userId,
        scheduledAt: new Date(data.scheduledAt),
        visitDate: new Date(data.scheduledAt),
        address: data.address,
        project: data.address,
        propertyShown: data.propertyShown,
        status: 'SCHEDULED',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        lead: { select: { name: true, leadNumber: true } },
      },
    });

    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.SITE_VISIT,
        title: `Site Visit Scheduled`,
        description: `Scheduled for ${new Date(data.scheduledAt).toLocaleString('en-IN')} at ${data.address}`,
        userId,
        leadId,
      },
      include: { user: { select: { id: true, name: true } }, lead: { select: { name: true, assignedToId: true } } },
    });

    // Only advance stage if not already past SITE_VISIT_SCHEDULED
    const currentIdx = STAGE_ORDER.indexOf(lead.stage);
    const targetIdx = STAGE_ORDER.indexOf('SITE_VISIT_SCHEDULED');
    if (currentIdx < targetIdx) {
      await this.prisma.lead.update({ where: { id: leadId }, data: { stage: 'SITE_VISIT_SCHEDULED' } });
    }

    await this.notifications.create(
      userId,
      'Site Visit Scheduled',
      `You have a site visit on ${new Date(data.scheduledAt).toLocaleDateString('en-IN')} at ${data.address}`,
      'site_visit_scheduled',
      visit.id,
      'SiteVisit',
    );

    this.gateway.emitToAdmin('activity:new', activity);
    this.gateway.emitToUser(userId, 'activity:new', activity);
    this.gateway.emitToUser(userId, 'notification:new', { title: 'Site Visit Scheduled', body: `Visit for ${lead.name}` });

    return visit;
  }

  async findByLead(leadId: string) {
    return this.prisma.siteVisit.findMany({
      where: { leadId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(leadId: string, visitId: string) {
    const visit = await this.prisma.siteVisit.findFirst({
      where: { id: visitId, leadId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
      },
    });
    if (!visit) throw new NotFoundException('Site visit not found');
    return visit;
  }

  async updateOutcome(
    leadId: string,
    visitId: string,
    data: {
      outcome: VisitOutcome;
      interestLevel?: string;
      propertyShown?: string;
      objections?: string;
      followUpNotes?: string;
      followUpDate?: string;
      conductedById?: string;
    },
    userId: string,
  ) {
    const visit = await this.prisma.siteVisit.findFirst({
      where: { id: visitId, leadId },
      include: { lead: true },
    });
    if (!visit) throw new NotFoundException('Site visit not found');

    const conductedById = data.conductedById ?? visit.assignedToId;

    const updated = await this.prisma.siteVisit.update({
      where: { id: visitId },
      data: {
        outcome: data.outcome,
        interestLevel: data.interestLevel as any,
        propertyShown: data.propertyShown,
        objections: data.objections,
        followUpNotes: data.followUpNotes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        conductedById,
        status: data.outcome,
        feedback: data.followUpNotes,
      },
    });

    // Stage transitions — forward-only
    const stageMap: Partial<Record<VisitOutcome, string>> = {
      [VisitOutcome.COMPLETED]: 'SITE_VISIT_COMPLETED',
      [VisitOutcome.NO_SHOW]: 'CONNECTED',
    };
    const targetStage = stageMap[data.outcome];
    if (targetStage) {
      const currentIdx = STAGE_ORDER.indexOf(visit.lead.stage);
      const targetIdx = STAGE_ORDER.indexOf(targetStage);
      if (data.outcome === VisitOutcome.NO_SHOW || currentIdx < targetIdx) {
        await this.prisma.lead.update({ where: { id: leadId }, data: { stage: targetStage } });
      }
    }

    const activity = await this.prisma.activity.create({
      data: {
        type: ActivityType.SITE_VISIT,
        title: `Site Visit ${data.outcome.replace('_', ' ')}`,
        description: data.followUpNotes || `Visit outcome recorded`,
        userId,
        leadId,
      },
      include: { user: { select: { id: true, name: true } }, lead: { select: { name: true, assignedToId: true } } },
    });

    // Auto follow-up task for COMPLETED visits with a follow-up date
    if (data.outcome === VisitOutcome.COMPLETED && data.followUpDate) {
      await this.prisma.task.create({
        data: {
          title: 'Follow up after site visit',
          description: data.followUpNotes,
          dueDate: new Date(data.followUpDate),
          leadId,
          assignedToId: conductedById,
          createdById: userId,
          priority: 'HIGH',
        },
      });
    }

    this.gateway.emitToAdmin('activity:new', activity);
    this.gateway.emitToUser(visit.assignedToId, 'activity:new', activity);
    if (visit.lead.assignedToId) {
      this.gateway.emitToUser(visit.lead.assignedToId, 'lead:updated', { leadId });
    }

    return updated;
  }

  async remove(leadId: string, visitId: string) {
    const visit = await this.prisma.siteVisit.findFirst({ where: { id: visitId, leadId } });
    if (!visit) throw new NotFoundException('Site visit not found');
    return this.prisma.siteVisit.delete({ where: { id: visitId } });
  }

  async findAll(user: User) {
    const where: any = {};
    if (user.role === Role.SALES_AGENT || user.role === Role.TELECALLER) {
      where.assignedToId = user.id;
    }
    return this.prisma.siteVisit.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, leadNumber: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }
}
```

- [ ] **Step 4: Check that Task model has required fields**

Run:
```bash
grep -A 15 "model Task " apps/api/prisma/schema.prisma
```

Verify the `Task` model has `leadId String?`, `assignedToId String`, `createdById String?`, `priority String?`. If any are missing, add them as nullable fields and run `npx prisma migrate dev --name add_task_fields`.

- [ ] **Step 5: Run tests and verify they pass**

```bash
cd apps/api
npx jest site-visits --no-coverage 2>&1 | tail -25
```

Expected: all tests PASS. If `task.create` fails with a Prisma type error, adjust field names to match your actual Task model.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/site-visits/site-visits.service.ts apps/api/src/site-visits/site-visits.service.spec.ts
git commit -m "feat(site-visits): rewrite service with schedule/outcome/automations"
```

---

## Task 3: SiteVisitsController — new routes

**Files:**
- Modify: `apps/api/src/site-visits/site-visits.controller.ts`
- Modify: `apps/api/src/site-visits/site-visits.module.ts`

- [ ] **Step 1: Write the new controller**

Replace the entire contents of `apps/api/src/site-visits/site-visits.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SiteVisitsService } from './site-visits.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '@prisma/client';

@Controller('leads/:leadId/site-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadSiteVisitsController {
  constructor(private siteVisits: SiteVisitsService) {}

  @Post()
  schedule(
    @Param('leadId') leadId: string,
    @Body() data: { scheduledAt: string; address: string; propertyShown?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.siteVisits.schedule(leadId, data, userId);
  }

  @Get()
  findByLead(@Param('leadId') leadId: string) {
    return this.siteVisits.findByLead(leadId);
  }

  @Get(':visitId')
  findOne(@Param('leadId') leadId: string, @Param('visitId') visitId: string) {
    return this.siteVisits.findOne(leadId, visitId);
  }

  @Patch(':visitId')
  updateOutcome(
    @Param('leadId') leadId: string,
    @Param('visitId') visitId: string,
    @Body() data: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.siteVisits.updateOutcome(leadId, visitId, data, userId);
  }

  @Delete(':visitId')
  @Roles('ADMIN')
  remove(@Param('leadId') leadId: string, @Param('visitId') visitId: string) {
    return this.siteVisits.remove(leadId, visitId);
  }
}

@Controller('site-visits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SiteVisitsController {
  constructor(private siteVisits: SiteVisitsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.siteVisits.findAll(user);
  }
}
```

- [ ] **Step 2: Register both controllers in the module**

Replace `apps/api/src/site-visits/site-visits.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SiteVisitsService } from './site-visits.service';
import { SiteVisitsController, LeadSiteVisitsController } from './site-visits.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [SiteVisitsService],
  controllers: [SiteVisitsController, LeadSiteVisitsController],
})
export class SiteVisitsModule {}
```

- [ ] **Step 3: Build the API to check for TypeScript errors**

```bash
cd apps/api
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If you see errors about `@Roles` decorator signature, check `apps/api/src/common/decorators/roles.decorator.ts` — the argument may need to be `Role.ADMIN` from `@prisma/client` instead of the string `'ADMIN'`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/site-visits/
git commit -m "feat(site-visits): add nested controller at leads/:leadId/site-visits"
```

---

## Task 4: Update leads service to include conductedBy

**Files:**
- Modify: `apps/api/src/leads/leads.service.ts`

- [ ] **Step 1: Find the siteVisits include and add conductedBy**

In `apps/api/src/leads/leads.service.ts`, find the line (approximately line 189):

```typescript
        siteVisits: { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { visitDate: 'desc' } },
```

Change it to:

```typescript
        siteVisits: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            conductedBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: 'desc' },
        },
```

- [ ] **Step 2: Build check**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/leads/leads.service.ts
git commit -m "fix(leads): include conductedBy in siteVisits when fetching lead"
```

---

## Task 5: Frontend — ScheduleVisitModal component

**Files:**
- Create: `apps/web/src/components/leads/ScheduleVisitModal.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/leads/ScheduleVisitModal.tsx` with this content:

```tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScheduleVisitModal({ leadId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ scheduledAt: '', address: '', propertyShown: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scheduledAt || !form.address.trim()) {
      toast.error('Date/time and address are required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/leads/${leadId}/site-visits`, {
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        address: form.address.trim(),
        propertyShown: form.propertyShown.trim() || undefined,
      });
      toast.success('Site visit scheduled');
      onSuccess();
    } catch {
      toast.error('Could not schedule visit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Schedule Site Visit</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address / Location *</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Nidhivan Plot No. 5, Sector 12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Property to Show</label>
              <input
                type="text"
                value={form.propertyShown}
                onChange={e => setForm(f => ({ ...f, propertyShown: e.target.value }))}
                placeholder="e.g. 3BHK Villa Type A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                {saving ? 'Scheduling...' : 'Schedule Visit'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/leads/ScheduleVisitModal.tsx
git commit -m "feat(web): add ScheduleVisitModal component"
```

---

## Task 6: Frontend — RecordOutcomeModal component

**Files:**
- Create: `apps/web/src/components/leads/RecordOutcomeModal.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/leads/RecordOutcomeModal.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  leadId: string;
  visitId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Outcome = 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

const INTEREST_LEVELS = [
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
];

export function RecordOutcomeModal({ leadId, visitId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    outcome: '' as Outcome | '',
    interestLevel: '',
    propertyShown: '',
    objections: '',
    followUpNotes: '',
    followUpDate: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/leads/${leadId}/site-visits/${visitId}`, {
        outcome: form.outcome,
        interestLevel: form.interestLevel || undefined,
        propertyShown: form.propertyShown.trim() || undefined,
        objections: form.objections.trim() || undefined,
        followUpNotes: form.followUpNotes.trim() || undefined,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
      });
      toast.success('Visit outcome recorded');
      onSuccess();
    } catch {
      toast.error('Could not record outcome');
    } finally {
      setSaving(false);
    }
  }

  const isCompleted = form.outcome === 'COMPLETED';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">Record Visit Outcome</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Outcome *</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, outcome: o.value }))}
                    className={cn(
                      'py-2 px-3 rounded-lg text-sm font-medium border transition',
                      form.outcome === o.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {isCompleted && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interest Level</label>
                <select
                  value={form.interestLevel}
                  onChange={e => setForm(f => ({ ...f, interestLevel: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select interest level...</option>
                  {INTEREST_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Property Shown</label>
              <input
                type="text"
                value={form.propertyShown}
                onChange={e => setForm(f => ({ ...f, propertyShown: e.target.value }))}
                placeholder="e.g. 3BHK Villa Type A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Objections / Concerns</label>
              <textarea
                value={form.objections}
                onChange={e => setForm(f => ({ ...f, objections: e.target.value }))}
                placeholder="What concerns did the client raise?"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Notes</label>
              <textarea
                value={form.followUpNotes}
                onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))}
                placeholder="Key takeaways and next steps..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {isCompleted && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">A follow-up task will be auto-created if set</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                {saving ? 'Saving...' : 'Save Outcome'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/leads/RecordOutcomeModal.tsx
git commit -m "feat(web): add RecordOutcomeModal for recording site visit outcomes"
```

---

## Task 7: Frontend — wire Lead Detail page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/leads/[id]/page.tsx`

This task has 3 sub-changes: (a) fix the broken `/stages/active` API call, (b) wire the "Schedule Visit" button, (c) update the Visits tab to use new fields and show the "Record Outcome" button.

- [ ] **Step 1: Add imports at the top of the file**

In `apps/web/src/app/(dashboard)/leads/[id]/page.tsx`, find the import block and add:

```tsx
import { ScheduleVisitModal } from '@/components/leads/ScheduleVisitModal';
import { RecordOutcomeModal } from '@/components/leads/RecordOutcomeModal';
import { LeadStage, LEAD_STAGE_LABELS } from '@nidhivan/shared';
```

Also add `Calendar` and `ClipboardList` to the lucide imports:
```tsx
import { ..., Calendar, ClipboardList } from 'lucide-react';
```

- [ ] **Step 2: Replace the broken `/stages/active` API call and add modal state**

Find (around line 30–38):
```tsx
  const [stages, setStages] = useState<{ name: string; label: string; color: string; bgColor: string }[]>([]);

  ...
  useEffect(() => {
    fetchLead(id);
    loadTimeline();
    api.get('/stages/active').then(r => setStages(r.data)).catch(() => {});
  }, [id]);
```

Replace with:
```tsx
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [outcomeVisitId, setOutcomeVisitId] = useState<string | null>(null);

  const STAGE_COLORS: Record<string, { color: string; bgColor: string }> = {
    NEW: { color: '#6b7280', bgColor: '#f3f4f6' },
    ATTEMPTED: { color: '#f59e0b', bgColor: '#fffbeb' },
    CONNECTED: { color: '#3b82f6', bgColor: '#eff6ff' },
    INTERESTED: { color: '#8b5cf6', bgColor: '#f5f3ff' },
    HOT: { color: '#ef4444', bgColor: '#fef2f2' },
    SITE_VISIT_SCHEDULED: { color: '#0ea5e9', bgColor: '#f0f9ff' },
    SITE_VISIT_COMPLETED: { color: '#10b981', bgColor: '#ecfdf5' },
    NEGOTIATION: { color: '#f97316', bgColor: '#fff7ed' },
    BOOKING_PENDING: { color: '#eab308', bgColor: '#fefce8' },
    CLOSED_WON: { color: '#22c55e', bgColor: '#f0fdf4' },
    CLOSED_LOST: { color: '#6b7280', bgColor: '#f3f4f6' },
    FUTURE_PROSPECT: { color: '#a855f7', bgColor: '#faf5ff' },
  };
  const stages = Object.values(LeadStage).map(s => ({
    name: s,
    label: LEAD_STAGE_LABELS[s],
    ...STAGE_COLORS[s],
  }));

  useEffect(() => {
    fetchLead(id);
    loadTimeline();
  }, [id]);
```

- [ ] **Step 3: Wire the "Schedule Visit" button**

Find (around line 114–118):
```tsx
            {isManager && (
              <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3.5 py-1.5 rounded-lg transition font-medium">
                <MapPin size={14} />
                Schedule Visit
              </button>
            )}
```

Replace with:
```tsx
            {isManager && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3.5 py-1.5 rounded-lg transition font-medium"
              >
                <MapPin size={14} />
                Schedule Visit
              </button>
            )}
```

- [ ] **Step 4: Update the Visits tab content**

Find the Visits tab section (around line 262–290):
```tsx
            {tab === 'Visits' && (
              <div className="space-y-3">
                {lead.siteVisits?.map((v: any) => (
                  ...old content...
                ))}
              </div>
            )}
```

Replace the entire `{tab === 'Visits' && ...}` block with:

```tsx
            {tab === 'Visits' && (
              <div className="space-y-3">
                {isManager && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition font-medium"
                    >
                      <MapPin size={13} />
                      Schedule Visit
                    </button>
                  </div>
                )}

                {lead.siteVisits?.map((v: any) => {
                  const hasOutcome = !!v.outcome;
                  const outcomeColors: Record<string, string> = {
                    COMPLETED: 'bg-green-100 text-green-700',
                    NO_SHOW: 'bg-red-100 text-red-700',
                    CANCELLED: 'bg-gray-100 text-gray-600',
                    RESCHEDULED: 'bg-amber-100 text-amber-700',
                  };

                  return (
                    <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MapPin size={13} className="text-blue-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-900 truncate">{v.address || v.project || '—'}</span>
                            {v.outcome && (
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', outcomeColors[v.outcome] ?? 'bg-gray-100 text-gray-600')}>
                                {v.outcome.replace('_', ' ')}
                              </span>
                            )}
                            {!v.outcome && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
                                SCHEDULED
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(v.scheduledAt || v.visitDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {v.assignedTo?.name && <span>Agent: {v.assignedTo.name}</span>}
                          </div>

                          {v.propertyShown && <p className="text-xs text-gray-500 mt-1">Property: {v.propertyShown}</p>}
                          {v.interestLevel && (
                            <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-1',
                              v.interestLevel === 'HOT' ? 'bg-red-100 text-red-600' :
                              v.interestLevel === 'WARM' ? 'bg-amber-100 text-amber-600' :
                              v.interestLevel === 'COLD' ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-500'
                            )}>
                              {v.interestLevel.replace('_', ' ')}
                            </span>
                          )}
                          {v.objections && <p className="text-xs text-gray-500 mt-1 italic">"{v.objections}"</p>}
                          {v.followUpNotes && <p className="text-xs text-gray-600 mt-1">{v.followUpNotes}</p>}
                        </div>

                        {!hasOutcome && (
                          <button
                            onClick={() => setOutcomeVisitId(v.id)}
                            className="flex-shrink-0 flex items-center gap-1 text-xs text-green-600 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-50 transition"
                          >
                            <ClipboardList size={11} />
                            Record
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {lead.siteVisits?.length === 0 && (
                  <div className="py-12 text-center">
                    <MapPin size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">No site visits recorded</p>
                    {isManager && (
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="mt-3 text-sm text-blue-600 hover:underline"
                      >
                        Schedule the first visit
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
```

- [ ] **Step 5: Add modals at the end of the component return, before the closing `</div>`**

Find the closing `</div>` at the end of the JSX return (around line 294) and add modals just before it:

```tsx
      {showScheduleModal && (
        <ScheduleVisitModal
          leadId={id}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => { setShowScheduleModal(false); fetchLead(id); }}
        />
      )}

      {outcomeVisitId && (
        <RecordOutcomeModal
          leadId={id}
          visitId={outcomeVisitId}
          onClose={() => setOutcomeVisitId(null)}
          onSuccess={() => { setOutcomeVisitId(null); fetchLead(id); }}
        />
      )}
```

- [ ] **Step 6: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Common issues:
- If `LEAD_STAGE_LABELS` import fails, check `@nidhivan/shared` exports `LEAD_STAGE_LABELS` from `packages/shared/src/enums.ts` — it does, so the import should work.
- If `ClipboardList` or `Calendar` is not in your lucide imports, add it.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(dashboard)/leads/[id]/page.tsx
git commit -m "feat(web): wire ScheduleVisitModal and RecordOutcomeModal in Lead Detail"
```

---

## Task 8: Smoke test

- [ ] **Step 1: Start the dev servers**

In one terminal:
```bash
cd apps/api && npm run start:dev
```

In another:
```bash
cd apps/web && npm run dev
```

- [ ] **Step 2: Test schedule flow**

1. Log in as a MANAGER or ADMIN
2. Open any lead detail page
3. Click "Schedule Visit" — modal should open
4. Fill in date/time, address, optional property
5. Submit — should show success toast
6. Lead stage should change to "Site Visit Scheduled"
7. Visits tab should show the new visit with "SCHEDULED" badge and "Record" button

- [ ] **Step 3: Test outcome flow**

1. Click "Record" on the scheduled visit
2. Select "COMPLETED" outcome
3. Fill in interest level, objections, follow-up notes, follow-up date
4. Submit — should show success toast
5. Lead stage should change to "Site Visit Completed"
6. Visit card should show outcome badge, interest level badge, notes
7. Tasks tab should have a new "Follow up after site visit" task

- [ ] **Step 4: Test NO_SHOW**

1. Schedule another visit
2. Record outcome as "NO_SHOW"
3. Lead stage should revert to "CONNECTED"

- [ ] **Step 5: Run backend tests**

```bash
cd apps/api && npx jest --no-coverage 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Site Visit module complete — schedule, outcome, automations"
```
