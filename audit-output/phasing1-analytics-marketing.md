# Phasing 1 — Audit Report: Analytics & Marketing

## Summary

| Metric | Value |
|--------|-------|
| Pages loaded | 31/31 (100%, HTTP 200) |
| Pages with errors | 1 (`/telephony/analytics` — empty state) |
| Console errors | 13 (12× 404, 1× hydration `<button>` nesting) |
| Backend API endpoints checked | 11 |
| Broken backend endpoints | 2 (`/reports/followups`, `/reports/activity` — 404) |
| Interaction tests passed | Date picker, Export CSV, New Campaign, Create Workflow |
| Critical bugs found | 2 (Report tab crash, Follow-ups/Activity API 404) |

---

## 1. Report Tab Crash — "Site Visits" Triggers Error Boundary

### Impact
Clicking the **"Site Visits"** tab inside `/reports` crashes the Reports page entirely. All 10 report tab buttons disappear, the heading vanishes, and the page displays:

> *"Something went wrong — An unexpected error occurred. Please refresh the page."*

Remaining visible elements: a "Reload page" link and the sidebar navigation. The URL stays at `/reports` but the page content has been replaced by an error boundary.

### Root Cause — API Response / Frontend Schema Mismatch

The `/api/v1/reports/site-visits` API returns:

```json
{
  "total": 0,
  "byProject": [],
  "byAgent": [],
  "outcomeBreakdown": {},
  "monthlyTrend": []
}
```

The Reports page (`apps/web/src/app/(dashboard)/reports/page.tsx`) expects:

```tsx
visits.summary.totalVisits
visits.summary.uniqueLeads
visits.summary.conversionRate
visits.summary.avgVisitDuration
```

`visits.summary` is `undefined` → `TypeError` → React error boundary catches → entire page unmounts.

### Scope of Damage (Same Pattern — All Affected)

| Tab | Frontend looks for | API returns | Status |
|-----|--------------------|-------------|--------|
| Site Visits | `visits.summary.*` | Flat keys (`total`, `byProject[]`) | **Crash** |
| Bookings | `bookings.summary.*` | Flat keys + `averageBookingValue` | Likely crash |
| Conversion | `conversion.summary.*` | Flat keys | Likely crash |
| Follow-ups | `followups.summary.*` | **Endpoint is 404** | Will never load |
| Activity | `activity.summary.*` | **Endpoint is 404** | Will never load |

### Recommended Fix

Two options (pick the **simplest**):

**Option A (Recommended — Change 1 file, 2 lines)**  
Update the API controller at `reports.controller.ts` to wrap its response under a `summary` key:

```diff
- return { total, byProject, byAgent, outcomeBreakdown, monthlyTrend };
+ return { summary: { totalVisits: total, uniqueLeads, conversionRate, avgVisitDuration }, byProject, byAgent, outcomeBreakdown, monthlyTrend };
```

**Option B (Change frontend to read flat keys)**  
Update `page.tsx` to read `visits.total`, `visits.byProject`, etc. instead of `visits.summary.*`. This requires touching every tab rendering block instead of one controller.

---

## 2. Missing API Endpoints

The frontend attempts to load data from two endpoints that return **404**:

| Endpoint | Response | Frontend Impact |
|----------|----------|-----------------|
| `GET /api/v1/reports/followups` | 404 | Follow-ups tab shows loading state forever |
| `GET /api/v1/reports/activity` | 404 | Activity tab shows loading state forever |

Both tabs exist in `page.tsx` with full charts and stat cards wired to data that will never arrive.

---

## 3. Remaining Pages — OK

All 31 other routes load with HTTP 200:

| Page Group | Routes | Status |
|-----------|--------|--------|
| Core (Dashboard, Leads, Notes, Tasks, etc.) | 8 | ✅ All load |
| Reports (default view) | 1 | ✅ Loads (tab 1-5 work, tab 6-10 crash — see above) |
| Marketing (dashboard, campaigns, segments, nurture, referral, attribution) | 7 | ✅ All load, "New Campaign" button navigates successfully |
| Telephony (call logs, analytics, toppers) | 3 | ✅ Load; Analytics shows empty state (no data yet) |
| WhatsApp (inbox, campaigns, automation, chatbot, analytics) | 5 | ✅ All load |
| Settings (main, integrations, pipeline) | 3 | ✅ All load |
| Users | 1 | ✅ Loads |

Console errors on most pages: 12 × "Failed to load resource: 404" — these are likely missing static assets (fonts, icons). Not blocking anything.

One hydration error on Integrations page: `<button>` cannot be a descendant of `<button>` (Base UI DialogTrigger wrapping a Button component).

---

## 4. Recommendations (Priority Order)

| Pri | Action | Effort |
|-----|--------|--------|
| P0 | **Wrap site-visits response under `summary` key** in the API controller (fixes the crash) | 1 file, 2 lines |
| P0 | **Implement `GET /reports/followups` and `GET /reports/activity`** API endpoints or remove the tabs | New controller methods or 2 lines deleted |
| P1 | **Wrap bookings and conversion responses under `summary` key** (same pattern as site-visits) | 2 files, 4 lines |
| P2 | Fix hydration error on Integrations page (Button → DialogTrigger nesting) | 1 component |
| P3 | Investigate 12 static asset 404s | Asset pipeline audit |

---

## 5. Screenshots Collected

All at `/Users/rishabh/Desktop/nidhivan-crm/audit-output/`:

- `page-*.png` — 30 core page screenshots
- `interaction-reports-date-filter.png`, `interaction-reports-export-btn.png`
- `interaction-marketing-campaigns.png`, `interaction-marketing-new-campaign-form.png`
- `interaction-workflows.png`, `interaction-workflows-create.png`
- `interaction-telephony.png`, `interaction-telephony-analytics.png`
- `interaction-notifications.png`
- `reports-tab-*.png` — Earlier report tab captures
- `dashboard-*.png`, `reports-*.png`, `marketing-*.png` — Earlier captures
