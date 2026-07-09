# ADR-0001: Lead Workspace Is the Primary Operating Surface

**Date**: 2026-07-02
**Status**: accepted
**Deciders**: engineering

## Context

Sprint 1 unified the Lead Detail page into a Workspace with sticky layout,
timeline, and health scoring. Three separate timeline query patterns already
exist (CommunicationService, ActivitiesService, LeadsService), and each new
feature is at risk of adding a fourth. Without an architectural principle, the
product will accumulate fragmented views — a Call History page, a WhatsApp
Inbox page, a Task List page — each showing a subset of the same lead data
but requiring the salesperson to navigate between them.

The CRM already has an `Activity` model with a polymorphic `type`
discriminator (`NOTE | CALL | WHATSAPP | EMAIL | SITE_VISIT | TASK |
STAGE_CHANGE | ASSIGNMENT | SYSTEM`). This table is designed to hold every
user-facing event. The principle formalizes what the data model already
supports.

## Decision

The Lead Workspace timeline is the single operating surface for all
customer-facing activity. Every module that records an event against a lead
must:

1. Create an `Activity` record at the time of the mutation.
2. Surface that event in the Workspace timeline.

No feature gets its own history page. No second timeline is introduced.

## Alternatives Considered

### Alternative 1: Feature-specific history pages
- **Pros**: Familiar pattern — each feature owns its domain
- **Cons**: Salespeople must navigate 5+ views to reconstruct a lead's story;
  each page duplicates pagination, filtering, and rendering logic
- **Why not**: Violates the "one place for everything" UX goal; the Activity
  model already exists, so the data layer cost is zero

### Alternative 2: Event-sourced timeline with a dedicated event store
- **Pros**: Stronger audit trail, temporal queries
- **Cons**: New infrastructure (event store, subscriptions), overkill for a
  CRM where the Activity table already records what happened
- **Why not**: YAGNI — the existing `activities` table with `createdAt`
  ordering is sufficient for the timeline use case

## Consequences

### Positive
- Single mental model: "open a lead, see everything"
- Each new feature integration is a fixed pattern: mutate → create Activity →
  timeline picks it up automatically
- Salespeople learn one view, not five
- Clicks to complete a sale decrease because context switching is eliminated

### Negative
- Requires discipline to reject "let's build a separate X history page"
  requests during planning
- The `Activity` table becomes a high-write table; index on `(leadId,
  createdAt)` is critical
- Polymorphic metadata in a JSON column means no referential integrity
  between Activity and the source record (mitigated by storing the source
  record ID in metadata)

### Risks
- Timeline query performance at scale: mitigated by database-level
  pagination (Sprint 2) and covering indexes
- Feature teams adding only to their own domain tables and forgetting the
  Activity record: mitigated by making Activity creation part of the
  mutation, not a separate step a developer can skip
