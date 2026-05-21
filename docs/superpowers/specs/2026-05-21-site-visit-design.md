# Site Visit Management — Design Spec
**Date:** 2026-05-21  
**Status:** Approved

---

## 1. Data Model

### New Prisma model: `SiteVisit`

```prisma
model SiteVisit {
  id              String          @id @default(cuid())
  leadId          String
  lead            Lead            @relation(fields: [leadId], references: [id])
  scheduledById   String
  scheduledBy     User            @relation("ScheduledBy", fields: [scheduledById], references: [id])
  conductedById   String?         // defaults to scheduledById on completion
  conductedBy     User?           @relation("ConductedBy", fields: [conductedById], references: [id])
  scheduledAt     DateTime
  address         String
  propertyShown   String?
  outcome         VisitOutcome?
  interestLevel   InterestLevel?
  objections      String?
  followUpNotes   String?
  followUpDate    DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

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

### Lead model changes
- Add `siteVisits SiteVisit[]` relation
- No new fields on Lead itself; stage transitions driven by visit outcome

### Stage transitions on visit outcome
| Outcome      | Lead stage change                   |
|--------------|-------------------------------------|
| COMPLETED    | → SITE_VISIT_DONE                   |
| NO_SHOW      | → CONNECTED (revert)                |
| CANCELLED    | No change                           |
| RESCHEDULED  | No change (new visit created)       |

**Rule:** Stage only moves forward. If lead is already past SITE_VISIT_DONE, no backwards move.

---

## 2. API

### Module: `SiteVisitsModule`
- Controller: `SiteVisitsController`
- Service: `SiteVisitsService`
- Routes mounted under `/leads/:leadId/site-visits`

### Endpoints

| Method | Path                                         | Who           | Description                       |
|--------|----------------------------------------------|---------------|-----------------------------------|
| POST   | `/leads/:leadId/site-visits`                 | Agent+        | Schedule a site visit             |
| GET    | `/leads/:leadId/site-visits`                 | Agent+        | List all visits for a lead        |
| GET    | `/leads/:leadId/site-visits/:visitId`        | Agent+        | Get single visit                  |
| PATCH  | `/leads/:leadId/site-visits/:visitId`        | Agent+        | Update outcome / post-visit form  |
| DELETE | `/leads/:leadId/site-visits/:visitId`        | ADMIN only    | Hard delete                       |

### POST body (schedule)
```json
{
  "scheduledAt": "ISO datetime",
  "address": "Property address",
  "propertyShown": "optional"
}
```

### PATCH body (post-visit form)
```json
{
  "outcome": "COMPLETED | NO_SHOW | CANCELLED | RESCHEDULED",
  "interestLevel": "HOT | WARM | COLD | NOT_INTERESTED",
  "propertyShown": "string",
  "objections": "string",
  "followUpNotes": "string",
  "followUpDate": "ISO datetime",
  "conductedById": "userId (optional, defaults to scheduledById)"
}
```

### Side effects on PATCH (outcome submitted)
1. Update `SiteVisit` record
2. Update `Lead.stage` per transition table above
3. Create `Activity` entry (`type: SITE_VISIT`, `metadata: {visitId, outcome}`)
4. If `COMPLETED` + `followUpDate`: auto-create a `Task` (title: "Follow up after site visit", due: followUpDate, assigned to conductedById)
5. Emit socket event `lead:updated` for real-time UI refresh

---

## 3. Frontend

### Location
Site visits live inside the **Lead Detail page** only — no separate `/site-visits` route.

### Lead Detail page additions

**Tab bar** — add "Visits" tab alongside Notes / Tasks / Timeline tabs.

**Visits tab content:**
- List of `SiteVisit` cards sorted by `scheduledAt` desc
- Each card shows: date/time, address, outcome badge, interest level badge, agent name
- "Schedule Visit" button (top-right of tab) → opens Schedule modal
- Clicking a completed visit card → opens Post-Visit detail drawer (read-only if already has outcome)
- Pending visits (no outcome) → show "Record Outcome" button on card

**Schedule Visit modal** (simple, 3 fields):
- Date + time picker (`scheduledAt`)
- Address text input
- Property shown (optional text)
- Submit → `POST /leads/:leadId/site-visits`

**Post-Visit Form modal** (triggered from "Record Outcome" button):
- Outcome dropdown (COMPLETED / NO_SHOW / CANCELLED / RESCHEDULED)
- Interest Level dropdown (shown only if COMPLETED)
- Property shown (text)
- Objections (textarea)
- Follow-up notes (textarea)
- Follow-up date picker
- Submit → `PATCH /leads/:leadId/site-visits/:visitId`
- On success: reload lead data + show toast "Visit recorded"

**Timeline integration:**
- `SITE_VISIT` activity entries already flow into the existing timeline
- Timeline renders them with a "Map Pin" icon and shows outcome badge inline

### State management
- No new Zustand store — data fetched locally in the Visits tab component with `useState` + `useEffect`
- On success mutations, re-fetch the visits list and emit a lead refresh

---

## 4. Automations

All three automations trigger together when a visit outcome is submitted:

1. **Stage transition** — applied immediately in `SiteVisitsService.updateVisit()`
2. **WhatsApp message** — send template via existing `NotificationsService.sendWhatsApp()`:
   - COMPLETED → "Thank you for visiting [property]. We'll follow up on [followUpDate]."
   - NO_SHOW → "We missed you today. Let's reschedule your site visit."
3. **Follow-up task** — created only when `outcome === COMPLETED && followUpDate` is set

All three are fire-and-forget; failures are logged but don't fail the PATCH request.

---

## Self-review notes (incorporated)
- `conductedById` defaults to `scheduledById` when not provided in PATCH body
- NO_SHOW reverts stage to CONNECTED; CANCELLED leaves stage unchanged
- Stage transition is forward-only: scheduling a visit on an already-completed lead does not move stage backwards
