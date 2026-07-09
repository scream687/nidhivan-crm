# ADR-0002: API Runs on :3001, Web Runs on :3000

**Date**: 2026-07-02
**Status**: accepted
**Deciders**: engineering

## Context

The API (NestJS) and web app (Next.js) both use port 3000 by default, which
causes boot conflicts during local development. A port conflict halts one
service with no clear error message, costing developers time to diagnose.

## Decision

- API runs on port **3001**.
- Web runs on port **3000** (Next.js default).
- The web `.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:3001`.
- All API-side `.env` files set `PORT=3001`.

## Alternatives Considered

### Alternative 1: Dynamic port allocation
- **Pros**: No hardcoded port
- **Cons**: Requires coordination between services; env file drift

### Alternative 2: Single monolith on one port
- **Pros**: No port concerns
- **Cons**: Already separated into two apps; not worth reversing

## Consequences

- No boot conflicts between API and web during development.
- Any new service (e.g., a worker, a cron container) must choose a different
  port and document it.
- CI/CD and deployment configs must be checked for port references.
