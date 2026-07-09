# Nidhivan CRM — Complete Audit Tickets

**Generated:** 2026-07-03
**Source:** Code audit + Interactive browser audit (agent-browser) + Mobile/Accessibility audit
**Total tickets:** 58

---

## Sprint 4 — Critical & Security (14 tickets)

### CRM-001 🔴 Migrate tokens from localStorage to httpOnly cookies

| Field | Value |
|-------|-------|
| **Files** | `authStore.ts`, `lib/api.ts`, `auth.service.ts` |
| **Current** | Both `accessToken` and `refreshToken` stored in `localStorage`. Any XSS vulnerability leaks both tokens permanently. |
| **Expected** | Access token in httpOnly, Secure, SameSite=Strict cookie. Refresh token as bcrypt-hashed DB record (already implemented) + httpOnly cookie. |
| **Acceptance** | 1. No tokens in `localStorage` after login. 2. Authenticated API calls work via cookie. 3. 401 still triggers refresh flow. 4. All existing tests pass. |
| **Effort** | 3 files, ~50 lines changed |

---

### CRM-002 🔴 Add error handling on 3 crash-prone pages

| Field | Value |
|-------|-------|
| **Files** | `employees/page.tsx`, `whatsapp/analytics/page.tsx`, `reports/page.tsx` |
| **Current** | All three pages have primary API calls with `try`/`finally` but **no `catch` block**. If the backend is down or returns an error, these pages crash entirely with unhandled promise rejections → white screen. |
| **Expected** | Each API call has a `catch` handler that: sets error state, displays a user-facing error message/toast, and does not crash the page. |
| **Acceptance** | 1. Manually stop the API server. 2. Navigate to each page. 3. See error message (not white screen). |
| **Effort** | 3 files, ~6 lines each |

---

### CRM-003 🔴 Add runtime validation DTOs to auth controller

| Field | Value |
|-------|-------|
| **Files** | `auth.controller.ts` |
| **Current** | All login/signup/forgot-password/OTP endpoints use TypeScript types (compile-time only, erased at runtime) with zero validation. Password minimum is 6 characters (below OWASP/NIST 8-char recommendation). |
| **Expected** | `class-validator` DTOs with `@IsEmail()`, `@MinLength(8)`, `@Matches()` decorators. Password policy: minimum 8 characters, at least 1 number and 1 special character. |
| **Acceptance** | 1. POST to `/auth/login` with invalid email format → 400 with validation message. 2. POST with password < 8 chars → 400. 3. Valid credentials → 200 as before. |
| **Effort** | 1 file + 1 DTO file, ~40 lines |

---

### CRM-004 🔴 Implement audit logging for auth + all entity mutations

| Field | Value |
|-------|-------|
| **Files** | All service files |
| **Current** | Only **one** audit log exists in the entire codebase: `leads.service.ts:396` logs lead UPDATE actions. No audit trail for: logins, failed logins, password resets, user creation/modification, role changes, bookings, site visits, data exports, or any other entity mutations. |
| **Expected** | Audit logging for: all authentication events (success + failure), all CRUD operations on leads/bookings/visits/tasks/users, all data exports. Store in `auditLog` table with: actor ID, action type, entity type, entity ID, before/after snapshot, timestamp, IP address. |
| **Acceptance** | 1. Login → `auditLog` has entry with action=LOGIN. 2. Failed login → entry with action=LOGIN_FAILED. 3. Create booking → entry with action=CREATE, entity=booking, before=null, after={booking data}. 4. API audit endpoint returns filtered/sorted logs. |
| **Effort** | Cross-cutting — add `AuditService` and inject in every service (~8 hours) |

---

### CRM-005 🟡 Raise password minimum to 8 characters

| Field | Value |
|-------|-------|
| **File** | `auth.service.ts:134` |
| **Current** | Password minimum length is 6 characters |
| **Expected** | Minimum 8 characters + at least 1 number + at least 1 special character. Must match frontend validation. |
| **Effort** | 2 files (frontend + backend), ~10 lines |

---

### CRM-006 🟡 Add Next.js middleware for server-side route protection

| Field | Value |
|-------|-------|
| **File** | `middleware.ts` (does not exist) |
| **Current** | No Next.js middleware. Dashboard relies entirely on client-side `useEffect` in `(dashboard)/layout.tsx` — causes flash of unauthenticated content before `fetchMe()` resolves. |
| **Expected** | Middleware at root that checks for auth token cookie on all `/dashboard/*`, `/api/*` routes. Redirects to `/login` if missing. Public paths (`/login`, `/forgot-password`, `/reset-password`) are excluded. |
| **Acceptance** | 1. Visit `/dashboard` without auth → immediate redirect to `/login` (no flash). 2. Visit with valid auth → renders normally. 3. Visit `/login` → renders normally. |
| **Effort** | 1 file, ~40 lines |

---

### CRM-007 🟡 Enable CSP headers

| Field | Value |
|-------|-------|
| **File** | `main.ts:26`, web CSP config |
| **Current** | Helmet's CSP is explicitly disabled with `contentSecurityPolicy: false`. No CSP meta tag or header at the web layer. No XSS protection from CSP at either layer. |
| **Expected** | Strict CSP enabled: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `connect-src 'self' wss:`. Nonce-based for scripts if inline scripts are required. |
| **Acceptance** | 1. All pages load without CSP violations. 2. Inline script injection in URL bar is blocked. |
| **Effort** | 2 files (API + web), ~30 lines |

---

### CRM-008 🟡 Sanitize file upload path param

| Field | Value |
|-------|-------|
| **File** | `inventory.controller.ts:18-19` |
| **Current** | The upload destination directory is built from `req.params.id` — if `id` contains `../`, files can be written outside intended directory. No sanitization. |
| **Expected** | Strip path traversal sequences (`../`, `..\\`, absolute paths) from `req.params.id` before using it in file path construction. |
| **Acceptance** | 1. Upload with id=`../../etc/passwd` → safe path, not overwritten. 2. Normal id → works as before. |
| **Effort** | 1 file, 3 lines |

---

### CRM-009 🟡 Fix dashboard flash-of-wrong-content

| Field | Value |
|-------|-------|
| **File** | `dashboard/page.tsx` |
| **Current** | `useAuthStore.isLoading` is never checked. When `user` is null (initial load), `ManagerView`/`AgentView` branching renders AgentView briefly before auth resolves. |
| **Expected** | Check `isLoading` before role-based render. Show a loading spinner while auth is resolving. |
| **Acceptance** | 1. Hard refresh on `/dashboard` → shows spinner, never flashes AgentView. 2. Auth resolves → correct view renders. |
| **Effort** | 1 file, ~5 lines |

---

### CRM-010 🟡 Replace silent `catch {}` blocks with user-facing errors

| Field | Value |
|-------|-------|
| **Files** | All pages with `catch {}` or `catch (e) { /* no toast */ }` |
| **Current** | Widespread pattern across the codebase: empty catch blocks or catch blocks that set error state but display nothing to the user. Users never know when API calls fail. |
| **Expected** | Every catch block shows a toast notification with the error message (from server response or a generic fallback). |
| **Acceptance** | 1. Trigger any API failure. 2. Toast appears with error message. |
| **Effort** | Cross-cutting — add to every catch block (~30 files) |

---

### CRM-011 🟡 Fix auth redirect race condition (root cause of routing bugs)

| Field | Value |
|-------|-------|
| **File** | `(dashboard)/layout.tsx`, `authStore.ts` |
| **Current** | When JWT expires (every 15 min), auth interceptor clears localStorage and redirects to `/login`. But Next.js client-side navigation doesn't always land there cleanly — it briefly shows Reports content (or other stale pages) before the redirect completes. This is the **root cause** of most "page redirects to Reports" bugs reported by agents. |
| **Expected** | 1. Add silent token refresh on page load (before rendering). 2. Show a full-page loading state while auth status is being determined. 3. Never render dashboard content when unauthenticated. |
| **Acceptance** | 1. Expired token → silent refresh (if refresh token valid). 2. Both expired → loading state → redirect to `/login`. No flash of dashboard content. |
| **Effort** | 3 files, ~60 lines |

---

### CRM-012 🟡 Fix reports "Site Visits" tab crash

| Field | Value |
|-------|-------|
| **Files** | `reports.controller.ts`, `page.tsx` |
| **Current** | Clicking "Site Visits" tab in `/reports` crashes the entire page. API returns flat keys (`total`, `byProject`, etc.) but frontend expects `visits.summary.totalVisits`. `visits.summary` is `undefined` → `TypeError` → React error boundary. |
| **Acceptance** | 1. Click "Site Visits" tab → renders chart with data (or empty state). 2. No error boundary shown. |
| **Effort** | 1 file, 2 lines (wrap API response under `summary` key) |

---

### CRM-013 🟡 Fix reports "Bookings" and "Conversion" tab crashes

| Field | Value |
|-------|-------|
| **Files** | `reports.controller.ts` |
| **Current** | Same schema mismatch as Site Visits: bookings and conversion endpoints return flat keys, frontend expects `*.summary.*`. Will crash when clicked. |
| **Acceptance** | 1. Click "Bookings" tab → renders. 2. Click "Conversion" tab → renders. No crashes. |
| **Effort** | 2 files, ~4 lines |

---

### CRM-014 🟡 Handle 2 missing report API endpoints

| Field | Value |
|-------|-------|
| **Files** | `reports.controller.ts` (or remove tabs) |
| **Current** | `GET /reports/followups` and `GET /reports/activity` return 404. Frontend tabs show loading forever. |
| **Expected** | Either: implement both endpoints with real queries, or remove the tabs from the frontend. |
| **Acceptance** | Both tabs either load data or are removed (not stuck loading). |
| **Effort** | 2 new controller methods + service queries, or 2 lines frontend removal |

---

## Sprint 5 — UX & Missing Features (17 tickets)

### CRM-020 🟡 Wire Exotel telephony settings to API

| Field | Value |
|-------|-------|
| **File** | `settings/page.tsx` (Telephony section) |
| **Current** | Account SID, API Key, API Secret fields exist but "Save & Activate" button just calls `setSaved(true)` — no API call. No backend endpoint for storing Exotel config. |
| **Expected** | Save button POSTs to API. Backend stores config (encrypted). "Test Connection" validates credentials. |
| **Effort** | Frontend + backend, ~80 lines |

### CRM-021 🟡 Wire Company details settings to API

| Field | Value |
|-------|-------|
| **File** | `settings/page.tsx` (Company section) |
| **Current** | Company name, address, phone, email fields with hardcoded defaults. Save button does nothing. |
| **Expected** | Save button POSTs to `/users/company` or similar. Backend stores/persists company info. |
| **Effort** | Frontend + backend, ~60 lines |

### CRM-022 🟡 Wire Notification preferences to API

| Field | Value |
|-------|-------|
| **File** | `settings/page.tsx` (Notifications section) |
| **Current** | Toggle switches with `defaultChecked`. No API call. No persistence — refreshes reset to defaults. |
| **Expected** | Toggle switches persist preference to API. On page load, real values are fetched. |
| **Effort** | Frontend + backend, ~60 lines |

### CRM-023 🟡 Wire Active Sessions display to API

| Field | Value |
|-------|-------|
| **File** | `settings/page.tsx` (Security section) |
| **Current** | Hardcoded session list: `["Chrome · MacBook Pro", "iPhone Safari"]`. No API call. |
| **Expected** | Sessions fetched from backend (JWT `iat` + user agent). "Revoke" button works. |
| **Effort** | Frontend + backend, ~50 lines |

### CRM-024 🟡 Wire Invite Member button to API

| Field | Value |
|-------|-------|
| **File** | `settings/page.tsx` (Team tab) |
| **Current** | "Invite Member" button has no `onClick` handler. Does nothing. |
| **Expected** | Click opens modal with email input. Submit sends invite email (via backend). |
| **Effort** | Frontend + backend, ~60 lines |

### CRM-025 🟡 Wire Field Mapping save to API in Integrations

| Field | Value |
|-------|-------|
| **File** | `settings/integrations/page.tsx` |
| **Current** | "Save Mapping" button just calls `toast.success('Mapping saved')` with no API call. Entire dialog is UI decoration. |
| **Expected** | Save Mapping POSTs field mapping config to backend API. |
| **Effort** | 2 files, ~30 lines |

### CRM-026 🟡 Add onClick handlers to Test Webhook + View Logs buttons

| Field | Value |
|-------|-------|
| **File** | `settings/integrations/page.tsx` |
| **Current** | Both buttons render but have no `onClick` handler — they do nothing when clicked. |
| **Expected** | Test Webhook sends test payload to webhook URL. View Logs fetches and displays recent webhook deliveries. |
| **Effort** | 1 file, ~40 lines |

### CRM-027 🟡 Implement User Management CRUD

| Field | Value |
|-------|-------|
| **File** | Does not exist |
| **Current** | No user management page. Team Members tab in settings is read-only — no create/edit/delete users, no role changes, no activate/deactivate. |
| **Expected** | Full user management with: create user (email, role, name), edit user details, change role dropdown, activate/deactivate toggle, delete user with confirmation. |
| **Effort** | New page + API endpoints, ~200 lines |

### CRM-028 🟢 Add pagination to all list views

| Field | Value |
|-------|-------|
| **Files** | `leads/page.tsx`, `tasks/page.tsx`, `bookings/page.tsx`, `site-visits/page.tsx`, `communication/page.tsx`, `whatsapp/campaigns/page.tsx` |
| **Current** | Most list views fetch all records at once. As data grows, this will cause slow page loads and excessive memory usage. |
| **Expected** | Server-side pagination (cursor-based). Page size of 20/50/100 configurable. Previous/next buttons + page indicator. |
| **Effort** | Cross-cutting, ~150 lines across 6 pages + API changes |

### CRM-029 🟢 Add loading skeleton states to pages missing them

| Field | Value |
|-------|-------|
| **Files** | `settings/integrations/page.tsx` (FB token load) |
| **Current** | Integration page has no loading spinner for Facebook token load — state initializes to empty string silently while API call is in flight. |
| **Expected** | Show skeleton or spinner while API resolves. |
| **Effort** | 1 file, ~10 lines |

### CRM-030 🟢 Add empty states to pages missing them

| Field | Value |
|-------|-------|
| **Files** | Various pages |
| **Current** | Some pages render nothing when data is empty (no "No records" message, no illustration). Pages confirmed missing: `settings/pipeline/page.tsx`, `employees/page.tsx`. |
| **Expected** | Every list/table page has an explicit empty state with icon + helpful message + CTA when applicable. |
| **Effort** | ~2 files, ~15 lines each |

### CRM-031 🟢 Remove `localStorage.clear()` on logout

| Field | Value |
|-------|-------|
| **File** | `authStore.ts` |
| **Current** | `logout()` calls `localStorage.clear()` — this is nuclear and removes ALL app state from storage, including non-auth items. |
| **Expected** | Remove only auth-specific keys (`accessToken`, `refreshToken`, `user`). |
| **Effort** | 1 file, 2 lines |

### CRM-032 🟢 Fix hydration error on Integrations page

| Field | Value |
|-------|-------|
| **File** | `settings/integrations/page.tsx` |
| **Current** | `<button>` nested inside `<button>` — Base UI `DialogTrigger` wrapping a `Button` component. Produces React hydration error in console. |
| **Expected** | `DialogTrigger` uses `asChild` or `span` wrapper to avoid nested buttons. |
| **Effort** | 1 file, ~5 lines |

### CRM-033 🟢 Fix Calculator page routing

| Field | Value |
|-------|-------|
| **File** | `calculator/page.tsx` |
| **Current** | `/calculator` shows Reports & Analytics content (auth redirect race condition). |
| **Expected** | `/calculator` shows EMI, plot price, and affordability calculators. |
| **Effort** | Depends on fixing CRM-011 (root cause) |

### CRM-034 🟢 Fix `/employees` route (or add redirect)

| Field | Value |
|-------|-------|
| **File** | Route config |
| **Current** | `/employees` shows Reports content. Leaderboard actually works at `/dashboard`. |
| **Expected** | Either create the route or set up a redirect to `/dashboard#leaderboard`. |
| **Effort** | 1 file, ~5 lines |

### CRM-035 🟢 Fix integrated Settings tab navigation

| Field | Value |
|-------|-------|
| **File** | `settings/page.tsx` |
| **Current** | "Notifications" tab → `/notes`, "Team Members" → `/leads`. Tab `onClick={() => setActive(id)}` is interrupted by parent layout auth check before state update renders. |
| **Expected** | Each tab switches content pane client-side without navigation. |
| **Effort** | 1 file, ~20 lines |

### CRM-036 🟢 Fix WhatsApp routes (chatbot, automation)

| Field | Value |
|-------|-------|
| **File** | Route/page files |
| **Current** | `/whatsapp/chatbot` and `/whatsapp/automation` redirect to Reports (auth race condition). |
| **Expected** | Both pages render correctly with their real content. |
| **Effort** | Depends on fixing CRM-011 (root cause) |

---

## Sprint 6 — Performance & Realtime (10 tickets)

### CRM-040 🟢 Incremental socket updates instead of full re-fetch

| Field | Value |
|-------|-------|
| **Files** | All pages with socket listeners |
| **Current** | WebSocket events trigger re-fetch of ALL list endpoints. A single lead update re-fetches leads, tasks, KPIs, notifications — even if unrelated. |
| **Expected** | Socket events carry entity ID + type. Client updates the specific item in-place (patch state) instead of refetching everything. Only re-fetch if data integrity is critical. |
| **Effort** | Cross-cutting, ~100 lines across socket handlers |

### CRM-041 🟢 Debounce cleanup on unmount in leads list search

| Field | Value |
|-------|-------|
| **File** | `leads/page.tsx` |
| **Current** | Search input uses debounce timer but timer is not cleaned up on component unmount — can set state on unmounted component. |
| **Expected** | `useEffect` cleanup clears debounce timer on unmount. |
| **Effort** | 1 file, ~5 lines |

### CRM-042 🟢 Add React error boundaries per page

| Field | Value |
|-------|-------|
| **Files** | All page directories |
| **Current** | Single global ErrorBoundary. When one page crashes (e.g., Reports Site Visits tab), the entire app shows blank error state. |
| **Expected** | Per-page ErrorBoundary wrapper. Each page error shows a page-specific fallback (not app-wide). One page crash doesn't affect others. |
| **Effort** | 1 shared component + wrapper in each page layout, ~30 lines total |

### CRM-043 🟢 Bundle-size audit — tree-shake unused imports

| Field | Value |
|-------|-------|
| **Files** | All pages |
| **Current** | Multiple pages import `recharts` (BarChart, PieChart, LineChart, etc.) but often use only 1-2 chart types. |
| **Expected** | Named imports only for used chart types. Run `next build` with bundle analyzer to verify. |
| **Effort** | Audit + fix, ~15 files |

### CRM-044 🟢 Add database indexes on frequently queried fields

| Field | Value |
|-------|-------|
| **File** | `prisma/schema.prisma` |
| **Current** | No explicit indexes on frequently-filtered fields: `lead.status`, `lead.assignedTo`, `booking.createdAt`, `task.assignedTo`, `siteVisit.scheduledDate`. |
| **Expected** | Indexes on all frequently queried/filtered/sorted fields. Run `EXPLAIN ANALYZE` to verify. |
| **Effort** | 1 file, ~10 lines |

### CRM-045 🟢 Implement cursor-based pagination on API list endpoints

| Field | Value |
|-------|-------|
| **Files** | All controller list methods |
| **Current** | Most list endpoints return all records. No pagination parameters. As data grows, response sizes will degrade performance. |
| **Expected** | Cursor-based pagination (`cursor`, `limit` params). Default limit of 50. Return `nextCursor` for infinite scroll. |
| **Effort** | Each list endpoint, ~10 lines each |

### CRM-046 🟢 Remove dead `withCredentials: true` from axios config

| Field | Value |
|-------|-------|
| **File** | `lib/api.ts` |
| **Current** | `withCredentials: true` is set but unused — auth uses `Authorization: Bearer` header, not cookies. This is dead/wasteful config that adds CORS preflight `OPTIONS` requests. |
| **Expected** | Remove `withCredentials: true` from axios defaults. |
| **Effort** | 1 file, 1 line |

### CRM-047 🟢 Remove unused `AgentStats` interface

| Field | Value |
|-------|-------|
| **File** | Dashboard types file |
| **Current** | `AgentStats` interface defined but never used anywhere. |
| **Expected** | Remove dead code. |
| **Effort** | 1 file, 2 lines |

### CRM-048 🟢 Fix static asset 404s (12 occurrences)

| Field | Value |
|-------|-------|
| **Files** | Asset references |
| **Current** | 12 console errors: "Failed to load resource: 404" — missing fonts, icons, or other static assets. |
| **Expected** | All static assets resolve correctly (HTTP 200). |
| **Effort** | Audit + fix asset references |

### CRM-049 🟢 Add WebSocket reconnection with exponential backoff

| Field | Value |
|-------|-------|
| **File** | Socket handler utility |
| **Current** | No explicit reconnection strategy visible. If WebSocket drops, client may never reconnect until page refresh. |
| **Expected** | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s). Show connection status indicator. |
| **Effort** | 1 utility file, ~40 lines |

---

## Sprint 7 — Mobile, Accessibility & Polish (17 tickets)

### CRM-050 🔴 Fix sidebar on mobile (slide-over drawer)

| Field | Value |
|-------|-------|
| **File** | `Sidebar.tsx` |
| **Current** | Sidebar takes 224px (60% of 375px viewport). No proper backdrop overlay. Hamburger is 34×34px (below 44×44px Apple HIG minimum). Cannot close sidebar by tapping outside when on mobile. |
| **Expected** | 1. Replace fixed overlay with slide-over drawer (like iOS Settings). 2. Add proper translucent backdrop that closes drawer on tap. 3. Hamburger button ≥ 44×44px. |
| **Effort** | 1 file, ~50 lines |

### CRM-051 🔴 Add skip-to-content link for keyboard users

| File | `layout.tsx` |
| **Current** | No skip link. Keyboard users must Tab through 47+ sidebar items before reaching main content. |
| **Expected** | First tabbable element on every page is a "Skip to main content" link that jumps to `#main-content`. |
| **Effort** | 1 file, ~10 lines |

### CRM-052 🔴 Make sidebar keyboard-accessible

| File | `Sidebar.tsx` |
| **Current** | Sidebar `<Link>` elements use Next.js `<Link>` (renders `<a>` tags) but many are skipped in Tab order. No `tabIndex` management. No visible `:focus-visible` outline. |
| **Expected** | All sidebar links keyboard-accessible. Visible focus indicator (`:focus-visible` outline 2px). `aria-current="page"` on active route. |
| **Effort** | 1 file, ~15 lines |

### CRM-053 🔴 Fix dashboard stat grid at mobile (2 columns)

| File | Dashboard `manager-view.tsx` |
| **Current** | 4-column grid forces stat cards to ~70px at 375px. Text in cards is unreadable. |
| **Expected** | 2-column grid at ≤640px viewport. Cards have enough width for label + value. |
| **Effort** | 1 file, ~5 lines (Tailwind responsive class) |

### CRM-054 🔴 Fix pipeline kanban at mobile (single column)

| File | `leads/page.tsx` |
| **Current** | 13 stage columns in horizontal scroll. Lead card text clips (phone, city, source on one line). Budget values `₹1,00,00,00,00,000` overflow card width. |
| **Expected** | Stacked single-column layout at ≤640px. Each stage is a collapsible section. Lead cards are full-width with proper wrapping. |
| **Effort** | 1 file, ~20 lines |

### CRM-055 🟡 Add ARIA labels to sidebar

| File | `Sidebar.tsx` |
| **Current** | Sidebar has no `role="navigation"` or `aria-label`. Hamburger button has no `aria-controls` linking to sidebar, no `aria-expanded`. |
| **Expected** | `role="navigation"` and `aria-label="Main navigation"` on sidebar `<nav>`. `aria-controls="sidebar-id"` and `aria-expanded` on hamburger button. |
| **Effort** | 1 file, ~10 lines |

### CRM-056 🟡 Add focus trap to modals

| Files | All modal components |
| **Current** | Modals (Create Lead, Schedule Visit, New Booking, etc.) may not trap keyboard focus. Tab can escape modal to background content. Close with Escape not guaranteed. |
| **Expected** | All modals: trap focus within modal when open. Close on Escape. Return focus to trigger element on close. |
| **Effort** | ~5 modal files, ~15 lines each |

### CRM-057 🟡 Add `aria-label` to icon-only buttons

| Files | All pages with icon-only buttons |
| **Current** | Several icon-only buttons (filter, menu, export, edit) lack `aria-label`. Not announced by screen readers. |
| **Expected** | Every icon-only button has an `aria-label` describing its action. |
| **Effort** | ~10 files, ~15 total changes |

### CRM-058 🟡 Fix reports tabs on mobile (horizontal scroll)

| File | `reports/page.tsx` |
| **Current** | 10 report tab buttons overflow beyond 375px viewport with no horizontal scroll mechanism. Tabs are unreachable at mobile width. |
| **Expected** | Tab container has `overflow-x: auto` with `-webkit-overflow-scrolling: touch`. Active tab is visible. |
| **Effort** | 1 file, ~5 lines (CSS) |

### CRM-059 🟡 Fix settings tabs on mobile (horizontal scroll)

| File | `settings/page.tsx` |
| **Current** | 7 settings tab buttons overflow horizontally on 375px. |
| **Expected** | Same fix as reports tabs: `overflow-x: auto` with touch scrolling. |
| **Effort** | 1 file, ~5 lines (CSS) |

### CRM-060 🟢 Fix "Forgot password?" link tap target

| File | `login/page.tsx` |
| **Current** | "Forgot password?" link is ~28px tall (< 44px minimum tap target on mobile). |
| **Expected** | Tap target ≥ 44×44px (increase padding/font size or use a block-level element). |
| **Effort** | 1 file, ~3 lines |

### CRM-061 🟢 Fix site visits stat element spacing

| File | `site-visits/page.tsx` |
| **Current** | Clickable stat elements have no visible spacing between number and label text. |
| **Expected** | Add gap/margin between number and label. |
| **Effort** | 1 file, ~3 lines |

### CRM-062 🟢 Add keyboard shortcut for notifications

| File | Notifications component |
| **Current** | Notifications region has `aria-live="polite"` (correct) but no documented keyboard shortcut. |
| **Expected** | Alt+N keyboard shortcut opens notifications dropdown. Document in UI or tooltip. |
| **Effort** | 1 file, ~7 lines |

### CRM-063 🟢 Add `aria-current="page"` to sidebar active route

| File | `Sidebar.tsx` |
| **Current** | Active sidebar link has visual indicator (bg color) but no `aria-current="page"` attribute for screen readers. |
| **Expected** | `aria-current="page"` on the active sidebar link. |
| **Effort** | 1 file, ~5 lines |

### CRM-064 🟢 Fix lead card budget text overflow at mobile

| File | `leads/page.tsx` |
| **Current** | Large budget values cause horizontal overflow on lead cards at mobile width. |
| **Expected** | Budget text wraps or truncates with ellipsis. Card does not overflow. |
| **Effort** | 1 file, ~3 lines (Tailwind class) |

### CRM-065 🟢 Add loading spinner to auth check on initial load

| File | `(dashboard)/layout.tsx` |
| **Current** | While `fetchMe()` is resolving, layout either shows nothing or flashes dashboard briefly. |
| **Expected** | Centered spinner during auth check. |
| **Effort** | 1 file, ~10 lines |

### CRM-066 🟢 Ensure pipeline stage drag handle is accessible at mobile

| File | `settings/pipeline/page.tsx` |
| **Current** | Drag handle may be too small for touch interaction at mobile. No keyboard reorder alternative. |
| **Expected** | Minimum 44×44px drag handle. Support up/down arrow key reorder when stage is focused. |
| **Effort** | 1 file, ~15 lines |

---

## Summary by Sprint

| Sprint | Tickets | Focus |
|--------|---------|-------|
| Sprint 4 | 14 (2 🔴, 11 🟡, 1 🟢) | Critical bugs, security |
| Sprint 5 | 17 (14 🟡, 3 🟢) | UX holes, missing features |
| Sprint 6 | 10 (9 🟢, 1 🟡) | Performance, realtime |
| Sprint 7 | 17 (4 🔴, 5 🟡, 8 🟢) | Mobile, accessibility, polish |
| **Total** | **58** | |

### Legend
🔴 Critical — Blocks users, must fix immediately
🟡 High — Major UX break or security risk
🟢 Medium/Low — Polish, performance, best practice
