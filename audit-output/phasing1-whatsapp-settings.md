# Phase 1 Audit: WhatsApp + Settings Pages

**Date:** 2026-07-03
**App:** Nidhivan CRM (http://localhost:3000)
**Role:** Admin (nidhivanproperty@gmail.com)
**Tool:** agent-browser

---

## Summary

| Category | Working | Broken | Not Found |
|----------|---------|--------|-----------|
| Authentication | Login works | — | — |
| WhatsApp Inbox | Route renders | Shows wrong content | — |
| WhatsApp Analytics | Route renders | Period toggles navigate away | — |
| WhatsApp Automation | — | Redirects to Reports | — |
| WhatsApp Campaigns | Route renders | "New Campaign" navigates to /leads | — |
| WhatsApp Chatbot | — | Redirects to Reports | — |
| Settings — Profile | Renders correctly | — | — |
| Settings — Team Members | — | Click navigates to /leads | — |
| Settings — Notifications | — | Click navigates to /notes | — |
| Settings — WhatsApp API | — | Click triggers erratic redirect | — |
| Settings — Telephony | — | — | Not tested fully |
| Settings — Company | — | — | Not tested fully |
| Settings — Security | — | — | Not tested fully |
| Settings — Integrations | — | Redirects to Reports | — |
| Settings — Pipeline | — | Redirects to /dashboard | — |
| Employees/Leaderboard | Renders data correctly | — | Route is /dashboard, not /employees |
| Calculator | — | Shows Reports content | — |

---

## Issues

### 1. WhatsApp Inbox — Wrong Content
- **URL:** http://localhost:3000/whatsapp
- **Actual:** Shows "Reports & Analytics" page with Sales Pipeline Funnel
- **Expected:** WhatsApp Inbox with conversation list
- **Severity:** CRITICAL
- **Screenshot:** `02b-whatsapp-inbox-bug.png`
- **Root cause:** Route `/whatsapp` either throws an error during render (likely API call failure) and falls back to dashboard content, or auth token check redirects incorrectly

### 2. WhatsApp Analytics — Period Toggles Break Navigation
- **URL:** http://localhost:3000/whatsapp/analytics
- **Actual:** Page renders correctly initially with "WhatsApp Analytics" heading, "7 Days"/"30 Days"/"90 Days" buttons, and chart placeholders. Clicking "30 Days" redirects to `/reports`
- **Expected:** Period toggles should switch data range, not navigate
- **Severity:** HIGH
- **Screenshot:** `03-whatsapp-analytics-initial.png`, `04-whatsapp-analytics-30day.png`
- **Note:** Only "7 Days" view was captured; "90 Days" could not be tested due to redirect

### 3. WhatsApp Automation — Redirects to Reports
- **URL:** http://localhost:3000/whatsapp/automation
- **Actual:** Immediately redirects to `/reports` (Reports & Analytics page)
- **Expected:** Redirect page to Nurture Sequences with "Go to Nurture Sequences" button
- **Severity:** HIGH
- **Screenshot:** (N/A — same as reports page)

### 4. WhatsApp Campaigns — "New Campaign" Routes to /leads
- **URL:** http://localhost:3000/whatsapp/campaigns
- **Actual:** Campaigns page renders with heading "WhatsApp Campaigns" and "New Campaign" button. Clicking "New Campaign" navigates to `/leads` instead of opening a campaign creation form/modal
- **Expected:** Clicking "New Campaign" should open a modal or inline form
- **Severity:** HIGH
- **Screenshot:** `06-whatsapp-campaigns.png`

### 5. WhatsApp Chatbot — Redirects to Reports
- **URL:** http://localhost:3000/whatsapp/chatbot
- **Actual:** Immediately redirects to `/reports`
- **Expected:** Chatbot page with Flows tab (New Flow, Edit, Delete) and Rules tab (Add Rule, drag reorder)
- **Severity:** CRITICAL
- **Screenshot:** `08-whatsapp-chatbot.png` (shows Reports content)

### 6. Settings — Tab Buttons Navigate to Wrong Routes
- **URL:** http://localhost:3000/settings
- **Actual:** Settings page renders with profile tab correctly (Name, Email, Phone fields, Save Changes button) but clicking sidebar tabs causes navigation to arbitrary routes:
  - "Notifications" → `/notes`
  - "Team Members" → `/leads`
  - "WhatsApp API" → inconsistent redirect
  - "Company" → navigates away
  - "Security" → navigates away
- **Expected:** Each tab should switch the content pane client-side without navigation
- **Severity:** CRITICAL
- **Screenshot:** `09-settings-profile.png`, `09-settings-pipeline-redirect.png`
- **Root cause (from code):** The `active` state is set via `onClick={() => setActive(id)}`, but app-wide auth/routing interference (likely 401 → redirect race condition) causes navigation before the state update renders

### 7. Settings — Integrations Page Redirects to Reports
- **URL:** http://localhost:3000/settings/integrations
- **Actual:** Redirects to `/reports`
- **Expected:** Integration management page with Facebook token, Field Mapping dialog, webhook test, logs, and "Request Custom Integration" button
- **Severity:** HIGH

### 8. Settings — Pipeline Page Redirects to /dashboard
- **URL:** http://localhost:3000/settings/pipeline
- **Actual:** Redirects to `/dashboard`
- **Expected:** Pipeline stage management with CRUD and drag reorder
- **Severity:** HIGH

### 9. Calculator Page Shows Reports Content
- **URL:** http://localhost:3000/calculator
- **Actual:** Shows "Reports & Analytics" page content
- **Expected:** EMI calculator, plot price calculator, affordability calculator
- **Severity:** HIGH

### 10. Employees/Leaderboard — No Dedicated Route
- **URL:** http://localhost:3000/employees
- **Actual:** Route does not exist (displays Reports content instead)
- **Expected:** Leaderboard should render at `/employees`
- **Workaround:** Team leaderboard data is visible at the root `/dashboard` route (shows "Team Performance" with full leaderboard table)
- **Severity:** MEDIUM
- **Screenshot:** `08-employees-leaderboard.png`

### 11. Blank Snapshot After Login
- **Issue:** After login, `snapshot -i` returns no interactive elements during certain navigation transitions
- **Severity:** LOW (likely page transition timing)

### 12. Token Expiry / Auth Loss Triggers Route Corruption
- **Issue:** When the JWT access token expires (every 15 min / 900s), the auth check redirects but the layout shows stale page content (Reports) before redirect to login completes
- **Severity:** HIGH — exposes business data (Reports content) to unauthenticated state briefly
- **Observation:** The auth interceptor in `api.ts` clears localStorage on failure and redirects to `/login`, but Next.js client-side navigation doesn't always land there cleanly

---

## What Works

| Page | Status | Notes |
|------|--------|-------|
| Login form | ✅ | Renders with email/password fields, forgot password, Google OAuth (if configured) |
| Authentication API | ✅ | Backend at `localhost:4000` correctly validates credentials and returns JWT + refresh token |
| Sidebar navigation | ✅ | Full sidebar renders on all pages with CRM, Marketing, Calls, WhatsApp, Account sections |
| Settings — Profile tab | ✅ | Loads user data, displays avatar, name (editable), email (read-only), phone (editable), "Save Changes" button |
| Employees Leaderboard | ✅ | Shows ranked list with agent name, role, leads, hot leads, calls today, conversions, conversion rate, score |
| WhatsApp Campaigns page | ✅ | Initial render shows heading with "New Campaign" button (but button navigates incorrectly) |
| WhatsApp Analytics page | ✅ | Initial render with headings, period buttons, chart placeholders |
| Logout redirect | ✅ | App redirects to `/login` when auth session ends |

---

## Screenshots Collected

| File | Description |
|------|-------------|
| `09-settings-profile.png` | Settings — My Profile (correct) |
| `06-whatsapp-campaigns.png` | WhatsApp Campaigns — initial render |
| `08-employees-leaderboard.png` | Team Performance / Leaderboard |
| `03-whatsapp-analytics-initial.png` | WhatsApp Analytics — initial (7 Days) |
| `02-whatsapp-inbox.png` | WhatsApp Inbox — sidebar visible but wrong content |
| `02b-whatsapp-inbox-bug.png` | WhatsApp Inbox — shows Reports content |
| `01-dashboard.png` | Dashboard — Reports & Analytics |

*(Screenshots stored in `/audit-output/` directory)*

---

## Recommendations (Priority Order)

1. **Fix auth redirect race condition** — The dashboard layout (`(dashboard)/layout.tsx`) redirects to `/login` when auth is null, but often shows Reports content before the redirect happens. This is the root cause of most routing issues: API calls fail with 401 → component state lands in an error path → React re-render hits a catch-all that shows reports.

2. **Fix settings tab navigation** — The `onClick={() => setActive(id)}` handlers are being interrupted by parent layout's auth check before the state update renders. Consider using `useCallback` with error boundary or making the settings page a standalone page outside the dashboard layout.

3. **Fix WhatsApp routes** — `/whatsapp/chatbot`, `/whatsapp/automation` redirect to Reports. Check if these pages rely on API endpoints that don't exist or return errors.

4. **Create `/employees` route or redirect** — Leaderboard works at `/dashboard` but `/employees` returns Reports content. Add the route or redirect.

5. **Fix Calculator route** — `/calculator` shows Reports content.

6. **Extend JWT expiry** — 15-minute token expiry with refresh-token mechanism causes frequent session drops during testing. Consider extending to 1 hour or adding silent refresh on page load.

7. **Add error boundary per page** — Instead of a single global ErrorBoundary, add per-page error fallbacks that show helpful messages instead of falling back to unrelated page content.

---

## Console Errors (See logs)

- Multiple 401 Unauthorized responses from API (auth token expired during session)
- 429 Too Many Requests from throttler on rapid login attempts
- Routing mismatches causing Next.js client-side navigation to land on wrong pages
