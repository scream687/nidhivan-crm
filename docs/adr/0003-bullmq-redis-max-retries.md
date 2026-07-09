# ADR-0003: BullMQ Redis Connections Require maxRetriesPerRequest: null

**Date**: 2026-07-02
**Status**: accepted
**Deciders**: engineering

## Context

BullMQ uses Redis-backed job queues for async processing. The BullMQ default
`maxRetriesPerRequest: 3` causes queue workers to disconnect permanently after
a brief Redis hiccup. In a local development environment where Redis may not
be running immediately at boot, or may restart during a session, a producer or
worker with the default setting is unrecoverable without a process restart.

## Decision

Every BullMQ queue and worker initialisation must set
`maxRetriesPerRequest: null` in the Redis connection options. This tells
BullMQ to retry Redis operations indefinitely instead of failing after 3
attempts.

```typescript
new Queue('notifications', {
  connection: { host: 'localhost', port: 6379, maxRetriesPerRequest: null },
});
```

## Consequences

- Workers recover automatically after transient Redis disconnections.
- A stuck Redis connection will hang the worker instead of failing fast; this
  is acceptable for a CRM where latency tolerance is seconds, not
  milliseconds.
- This applies to all BullMQ consumers — not just the primary notification
  queue.
