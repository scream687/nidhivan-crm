# Nidhivan CRM — Mobile Responsiveness & Accessibility Audit (Phase 1)

**Date:** 2026-07-03
**Viewport:** 375×812px (iPhone-like)
**Browser:** Chromium via agent-browser
**Auth:** Admin (nidhivanproperty@gmail.com)

---

## PART 1: MOBILE RESPONSIVENESS (375px)

### 1. Login Page (`/login`)
| Check | Status | Notes |
|-------|--------|-------|
| Text truncation | ✅ PASS | No truncation |
| Horizontal scroll | ✅ PASS | None |
| Tap targets | ❌ FAIL | "Forgot password?" link is ~28px tall (< 44px) |
| Form field usability | ✅ PASS | Proper spacing, inputs are full-width |
| Viewport meta | ✅ PASS | `viewport-fit=cover` present |
| Screenshot | 📄 `audit-output/01-login.png` |

### 2. Dashboard (`/dashboard`)
| Check | Status | Notes |
|-------|--------|-------|
| Sidebar navigation | ❌ FAIL | Hamburger toggle is **34×34px** (below 44×44px minimum). No visible backdrop to close sidebar on mobile. |
| Horizontal scroll | ✅ PASS | None |
| Content layout | ❌ FAIL | At 375px, stat cards in 4-column grid get **70px each** — text inside is unreadable at this size. |
| Stat cards | ❌ FAIL | 4-column grid forces cards to 70px; labels overlap or truncate. |
| Date filter buttons | ⚠️ MINOR | 3 filter buttons ("7 Days", "30 Days", "90 Days") are 52px wide — borderline tap target size. |
| Screenshot | 📄 `audit-output/02-dashboard.png` |

### 3. Leads Page (`/leads`)
| Check | Status | Notes |
|-------|--------|-------|
| Pipeline stage labels | ❌ FAIL | 13 stage columns in horizontal scroll. Each stage card is ~151px wide. Some text overflows. |
| Lead card content | ❌ FAIL | Lead info (name, lead#, phone, city, source) crammed into one line — overlaps and clips. |
| "Add Lead" button | ✅ PASS | Properly sized, tappable |
| Search input | ✅ PASS | Full-width, usable |
| Filters button | ⚠️ MINOR | Some icons have no accessible label |
| Screenshot | 📄 `audit-output/03-leads.png` |

### 4. Lead Detail (`/leads/[id]`)
| Check | Status | Notes |
|-------|--------|-------|
| Back button | ✅ PASS | Accessible |
| Customer summary | ❌ FAIL | Large budget values ("₹1,00,00,00,00,000") cause horizontal overflow |
| Quick action buttons | ⚠️ MINOR | Some action icons lack text labels |
| Timeline | ⚠️ MINOR | Entries stack but may overflow on long text |
| Screenshot | 📄 `audit-output/03a-lead-detail.png` |

### 5. Site Visits (`/site-visits`)
| Check | Status | Notes |
|-------|--------|-------|
| List/Calendar toggle | ✅ PASS | Works at mobile |
| Empty state | ✅ PASS | Properly displayed |
| Stat boxes | ❌ FAIL | Clickable "0Scheduled", "0Completed" elements have no spacing between number and label text |
| Screenshot | 📄 `audit-output/04-site-visits.png` |

### 6. Bookings (`/bookings`)
| Check | Status | Notes |
|-------|--------|-------|
| Empty state | ✅ PASS | Properly displayed |
| Screenshot | 📄 `audit-output/05-bookings.png` |

### 7. Reports (`/reports`)
| Check | Status | Notes |
|-------|--------|-------|
| Tabs | ❌ FAIL | 10 tab buttons packed in a row — overflow beyond viewport with no horizontal scroll |
| Date picker | ⚠️ MINOR | Spinbutton inputs (Day/Month/Year) are tiny at mobile |
| Chart rendering | ✅ PASS | Charts are responsive |
| Screenshot | 📄 `audit-output/06-reports.png` |

### 8. WhatsApp (`/whatsapp`)
| Check | Status | Notes |
|-------|--------|-------|
| Inbox | ✅ PASS | Conversation list fills width |
| Screenshot | 📄 `audit-output/07-whatsapp.png` |

### 9. WhatsApp Chatbot (`/whatsapp/chatbot`)
| Check | Status | Notes |
|-------|--------|-------|
| Flow editor | ⚠️ MINOR | Content renders but drag nodes may be small |
| Screenshot | 📄 `audit-output/08-whatsapp-chatbot.png` |

### 10. Settings (`/settings`)
| Check | Status | Notes |
|-------|--------|-------|
| Profile form | ✅ PASS | All inputs are full-width and tappable |
| Tab buttons | ❌ FAIL | 7 settings tabs ("My Profile", "Team Members", etc.) overflow horizontally on 375px |
| Save button | ✅ PASS | Full-width, properly sized |
| Screenshot | 📄 `audit-output/09-settings.png` |

### 11. Pipeline Settings (`/settings/pipeline`)
| Check | Status | Notes |
|-------|--------|-------|
| Stage list | ⚠️ MINOR | Stage cards are responsive but drag handle may be too small |
| Screenshot | 📄 `audit-output/10-settings-pipeline.png` |

### 12. Calculator (`/calculator`)
| Check | Status | Notes |
|-------|--------|-------|
| Form inputs | ✅ PASS | Properly sized for mobile |
| Screenshot | 📄 `audit-output/11-calculator.png` |

### 13. Employees (`/employees`)
| Check | Status | Notes |
|-------|--------|-------|
| Employee cards | ✅ PASS | Responsively stacked |
| Screenshot | 📄 `audit-output/12-employees.png` |

---

## PART 1 SUMMARY: MOBILE ISSUES

| # | Page | Severity | Issue |
|---|------|----------|-------|
| M1 | Global | 🔴 HIGH | **Sidebar (224px) takes 60% of 375px viewport.** No reliable backdrop overlay to close it on mobile. Hamburger toggle is 34×34px (< 44px minimum). Tapping open sidebar area accidentally navigates (links are behind backdrop). |
| M2 | Global | 🔴 HIGH | **Hamburger toggle is 34×34px** — violates iOS Human Interface Guidelines 44×44px minimum tap target. |
| M3 | Dashboard | 🟡 MEDIUM | **4-column stat grid** forces cards to 70px. Labels unreadable. Should collapse to 2 columns at ≤640px. |
| M4 | Leads | 🟡 MEDIUM | **Pipeline kanban** shows 13 columns in horizontal scroll. Individual lead card text clips (phone, city, source on one line). |
| M5 | Leads | 🟡 MEDIUM | **Lead card text overflow** — budget "₹1,00,00,00,00,000" exceeds card width. |
| M6 | Reports | 🟡 MEDIUM | **10 report tabs overflow** viewport with no horizontal scroll mechanism. |
| M7 | Settings | 🟡 MEDIUM | **7 settings tabs overflow** horizontally on 375px. |
| M8 | Site Visits | 🔵 LOW | **Clickable stat elements** lack visible spacing between number and label text. |
| M9 | Login | 🔵 LOW | **"Forgot password?" link** is ~28px tall (below 44px recommended). |

---

## PART 2: KEYBOARD ACCESSIBILITY

### Tab Navigation Flow (tested on `/leads`)

The keyboard tab cycle follows this pattern:
1. **Hamburger toggle button** (has focus outline: white 1px auto)
2. **→ BODY** (NO focus indicator)
3. **→ Unlabeled button** (has focus outline)
4. **→ BODY** (NO focus indicator)
5. **→ Recurring cycle** through body and scattered buttons

### Findings

| # | Page | Severity | Issue |
|---|------|----------|-------|
| K1 | Global | 🔴 HIGH | **No skip-to-content link** — keyboard users must tab through 47+ sidebar items before reaching main content. |
| K2 | Global | 🔴 HIGH | **Keyboard focus jumps to BODY repeatedly** — most interactive elements (sidebar links, lead cards, action buttons) are not reachable via Tab. Of 47 tabbable elements, only ~4 are actually focusable via sequential Tab. |
| K3 | Global | 🟡 MEDIUM | **No visible focus indicator on sidebar `<Link>` elements** — they use Next.js `<Link>` which renders `<a>` elements, but no `:focus-visible` outline is applied. |
| K4 | Global | 🟡 MEDIUM | **Sidebar `<Link>` elements have `tabIndex` issues** — many sidebar navigation items are `<a>` tags but are skipped in Tab order. |
| K5 | Global | 🟡 MEDIUM | **Notifications region** has `tabIndex="-1"` and `aria-live="polite"` — correctly hidden from tab flow but no keyboard shortcut (Alt+T not documented). |
| K6 | Forms | 🟡 MEDIUM | **"Add Lead" modal not tested** — sidebar overlay prevents clicking the button at mobile viewport. |
| K7 | Settings | 🟡 MEDIUM | **Profile form** inputs are reachable via Tab (text inputs, Save button), but settings tabs are not keyboard-accessible. |
| K8 | Leads Pipeline | 🟡 MEDIUM | **Pipeline stage columns** are not keyboard navigable — no arrow key support for horizontal scrolling through stages. |
| K9 | Login | 🟡 MEDIUM | **Login form** inputs are Tab-reachable but the "Forgot password?" button is skipped in some layouts. |

### ARIA / Focus Management Gaps

| # | Severity | Issue |
|---|----------|-------|
| A1 | 🔴 HIGH | **No `role="navigation"`** or `aria-label` on sidebar |
| A2 | 🔴 HIGH | **No `aria-controls`** on hamburger button linking to sidebar |
| A3 | 🟡 MEDIUM | **`aria-expanded`** missing on sidebar toggle button |
| A4 | 🟡 MEDIUM | **Sidebar links** lack `aria-current="page"` for active route |
| A5 | 🔵 LOW | **`aria-live="polite"`** on notifications region is correct but no keyboard shortcut is documented for users |
| A6 | 🟡 MEDIUM | **No focus trap** tested on modals (Add Lead, Schedule Visit). Could not verify due to sidebar overlay issue. |
| A7 | 🟡 MEDIUM | **Empty buttons** (icon-only with no `aria-label`) found in UI — not announced by screen readers |

---

## SCREENSHOT INVENTORY

| File | Page | Viewport |
|------|------|----------|
| `01-login.png` | Login | 375×812 |
| `02-dashboard.png` | Dashboard | 375×812 |
| `03-leads.png` | Leads | 375×812 |
| `03a-lead-detail.png` | Lead Detail (Rishabh Sharama) | 375×812 |
| `04-site-visits.png` | Site Visits | 375×812 |
| `05-bookings.png` | Bookings | 375×812 |
| `06-reports.png` | Reports | 375×812 |
| `07-whatsapp.png` | WhatsApp | 375×812 |
| `08-whatsapp-chatbot.png` | WhatsApp Chatbot | 375×812 |
| `09-settings.png` | Settings | 375×812 |
| `10-settings-pipeline.png` | Pipeline Settings | 375×812 |
| `11-calculator.png` | Calculator | 375×812 |
| `12-employees.png` | Employees | 375×812 |

---

## CRITICAL ISSUES (Priority Fix)

1. **Sidebar at mobile** (M1, M2, K1, K2, A1, A2, A3)
   - Replace fixed 224px sidebar with slide-over drawer
   - Add proper backdrop overlay to close sidebar
   - Make hamburger button 44×44px minimum
   - Add `aria-controls`, `aria-expanded` for accessibility
   - Add skip-to-content link

2. **Keyboard navigation** (K2, K3, K4)
   - Ensure all interactive elements have `tabIndex` managed properly
   - Add visible `:focus-visible` outlines to all focusable elements
   - Fix sidebar `<Link>` elements to be keyboard-accessible

3. **Responsive grids** (M3, M4)
   - Dashboard stat grid: use 2 columns on mobile
   - Pipeline kanban: use single-column stacked layout on mobile

4. **Icon-only buttons without labels** (A7)
   - Add `aria-label` to all icon-only buttons (filter, menu, export)

---

## TESTING NOTES

- Rate limiting (5 req/min) on login API made automated re-auth difficult — switched to direct token injection via localStorage
- Next.js SPA routing with `pushstate` was unreliable — used `window.location.href` for navigation which caused full page reloads
- Sidebar overlay (z-index 30) intercepts clicks on mobile, making it hard to interact with main content
- Auth tokens expire after 15 minutes — required 2 token refreshes during testing
