# ADR-0005: Business Metrics Have a Single Source of Truth

**Date**: 2026-07-03
**Status**: accepted
**Deciders**: engineering

## Context

Dashboards, reports, sockets, exports, and analytics all compute business
metrics (KPI counts, pipeline values, conversion rates). Before this ADR,
each module computed metrics independently — LeadsService returned 5 KPI
fields, reports had their own query logic, and the dashboard made separate
API calls. This caused KPI drift: the same metric could show different
numbers in different places because queries diverged.

Additionally, socket-based real-time updates (`emitKpiUpdate`) were defined
in the gateway but never called — no business event triggered a KPI push.

## Decision

All dashboards, reports, socket events, exports, and analytics must consume
KPIs from `BusinessMetricsService`. No module may calculate business metrics
independently.

- `BusinessMetricsService` owns KPI computation and caching
- Mutating services (`LeadsService`, `BookingsService`, `TasksService`,
  `SiteVisitsService`) call explicit notification methods — they never
  compute KPIs themselves
- The KPI endpoint and socket emit both read from `BusinessMetricsService`
- Reports may fetch raw data independently but must use
  `BusinessMetricsService` for aggregate calculations
- `BusinessMetricsService` is a `@Global()` module so any service can inject
  it without importing the module directly

### Explicit notification methods

Each mutating service has a corresponding notification method that is
self-documenting and grepable:

| Method | Called By | Trigger |
|--------|-----------|---------|
| `onLeadChanged()` | LeadsService | lead create, update, stage change, assign, markHot |
| `onBookingChanged()` | BookingsService | booking create, status change |
| `onVisitChanged()` | SiteVisitsService | visit create, status change |
| `onTaskChanged()` | TasksService | task create, complete, update |

Each method: invalidates the KPI cache, recomputes fresh KPIs, and emits
`dashboard:kpi_update` to the admin socket room.

## Alternatives Considered

### Alternative 1: Each module owns its KPI calculation
- **Pros**: No central dependency, modules are self-contained
- **Cons**: Duplicated query logic across modules, inconsistent numbers,
  harder to add real-time updates
- **Why not**: Every new report or dashboard dimension would require N
  implementations instead of 1

### Alternative 2: Generic event bus with KPI subscribers
- **Pros**: Looser coupling, extensible without touching existing services
- **Cons**: Event schema versioning, async consistency concerns, harder to
  trace the notification flow
- **Why not**: Premature — direct method calls are simpler for the current
  module count (~15). An event bus can be introduced when the CRM reaches
  30+ modules

## Consequences

### Positive
- One implementation, consistent numbers across all surfaces
- Easier testing (one service to mock)
- No duplicated query logic
- Adding a new metric means changing one file instead of N
- Explicit notification methods make the notification flow grepable

### Negative
- `BusinessMetricsService` becomes a high-traffic service on every mutation
- Cache invalidation must be correct to avoid stale data

### Risks
- Cache stampede on high-write periods: mitigated by short TTL (30s) and
  single recomputation per change
- Service coupling: mitigated by `@Global()` module — no circular dependency
  risk since metrics only reads, never mutates
