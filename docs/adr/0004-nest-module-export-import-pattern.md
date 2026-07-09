# ADR-0004: Feature Modules Must Export/Import Services Through Nest Modules

**Date**: 2026-07-02
**Status**: accepted
**Deciders**: engineering

## Context

NestJS enforces dependency injection through module exports and imports.
When a service from one module is needed in another (e.g.,
`NotificationsService` in `SiteVisitsModule`), the correct pattern is:
provider module exports the service → consumer module imports the provider
module.

Direct instantiation (`new SomeService()`) or importing service classes
outside the module system bypasses DI, skips lifecycle hooks, and breaks
testing.

## Decision

- Every `@Injectable()` service must be provided and exported by its owning
  module.
- A module that needs a service from another module imports the provider
  module — not the service class directly.
- No `new ServiceName()` calls outside the owning module's scope.
- No direct import of a service class from another module's provider list.

### Good

```typescript
// notifications.module.ts
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

// site-visits.module.ts
@Module({
  imports: [NotificationsModule],
  providers: [SiteVisitsService],
})
export class SiteVisitsModule {}
```

### Bad

```typescript
// Outside the module system
const service = new NotificationsService();
```

## Consequences

- All services participate in NestJS DI lifecycle (constructor injection,
  lifecycle hooks, testing).
- Circular module dependencies become visible immediately as NestJS boot
  errors.
- Test files can import the module instead of mocking every dependency.
