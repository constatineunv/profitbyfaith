# Profit by Faith — Site Changelog

---

## [2026-04-27] feat: add entry/exit time and trade drill-down to recap table

**Files changed:** `trades/journal.js`, `trades/journal.css`, `trades/index.html`

- Added a **Time** column (entry time – exit time, HH:MM AM/PM) to every row in the Live Session Recap trade table, between the price column and the account column
- Updated `.recap-col-head` and `.recap-trade-row` grid templates from 6 → 7 columns to accommodate the new time column
- Each recap trade row is now **clickable** — clicking toggles an inline drill-down drawer that expands directly below the row (no modal, no side panel)
- The drawer shows: full entry time, full exit time, direction badge, entry/exit price, P&L (colored), tag badge, instrument, and account/firm badge
- Only one drawer is open at a time; clicking a different row collapses the previous one
- Drawer animates in/out using CSS `grid-template-rows: 0fr → 1fr` + opacity transition, matching the `.pbf-day-detail` animation pattern
- `functions/api/journal.js` already returns full `entryTime`/`exitTime` strings (e.g. "4/27/2026 9:31:15 AM") — confirmed no API changes needed
- Bumped to `?v=9` to bust browser cache

---

## [2026-04-27] refactor: reorder journal sections for daily trader workflow

**Files changed:** `trades/index.html`

- New section order: Live Session Recap → Monthly Detail (cal-grid) → This Month stat cards → Performance/Equity Chart → Yearly Calendar → Statistics → Global Overview
- Split the old combined `bottom-grid` wrapper (Statistics + Performance side-by-side) into two independent `<div class="wrap section-gap">` blocks so each section can appear in a different position
- No IDs, classes, or content changed — HTML blocks moved only
- Bumped to `?v=8`

---

## [2026-04-27] refactor: move Statistics + Performance above Live Session Recap

**Files changed:** `trades/index.html`

- Moved the `<!-- STATISTICS + PERFORMANCE -->` block (Statistics panel + Performance/equity chart) to render directly above the Live Session Recap section
- New page order: Trade Journal header → Statistics + Performance → Live Session Recap → Monthly Stat Cards → Monthly Calendar → Global Overview → Yearly Calendar
- No JS or CSS changes — purely an HTML section reorder
- Bumped to `?v=7` to bust browser cache

---

## [2026-04-27] feat: auto-refresh recap every 5 min for live daily session updates

**Files changed:** `trades/journal.js`

- Added `setInterval` (5-minute poll) at boot that silently re-fetches `/api/journal` and rebuilds only the recap section
- Full calendar/charts are NOT re-rendered on poll — only `buildRecap()` runs
- Poll is silent-fail: if the network request fails the rest of the page stays functional
- Combined with the API's 5-min cache (`max-age=300`), the recap will reflect new trades within ~10 minutes of them being uploaded to the sheet
- Works across all weekdays automatically — no manual trigger needed

---

## [2026-04-27] feat: recap to top; add account to API; fix firm grouping for TPT/Bulenox

**Files changed:** `functions/api/journal.js`, `trades/index.html`, `trades/journal.js`

- Moved Live Session Recap to be the first section on the page (right under Trade Journal header)
- API worker (`functions/api/journal.js`) now includes `account` field in every trade object — this was the bug preventing Bulenox/TPT per-firm grouping from working
- `firmClass`/`firmLabel` updated: Bulenox checked first (`bx-`/`bulenox`), then TPT (`take`/`profit539`/`tpt`), then Apex as default
- Day detail panel insertion point moved back to after the calendar `.wrap` (not the recap)
- Bumped to `?v=6` to bust browser cache

---

## [2026-04-27] feat: add live session recap section above monthly calendar

**Files changed:** `trades/index.html`, `trades/journal.css`, `trades/journal.js`

- Added `#live-recap` section (`.recap-section`) rendered above the Monthly Detail calendar
- `buildRecap()` — new JS function that reads from existing `journalData`; auto-selects today if data exists, otherwise falls back to the most recent day
- Per-day stat grid: Session P&L, Trades, Win Rate, Best, Worst, Avg Win
- Per-trade P&L bar chart (`recapChart`) using Chart.js — green/grey/red bars by trade outcome
- Trade table grouped by account (Apex / TakeProfitTrader / Bulenox) with firm badges, dir badges, and good/bad/ugly tags
- All CSS appended to `journal.css`; no existing rules modified

---

## [2026-04-27] feat: inline day detail panel replacing slide-in drawer

**Files changed:** `trades/journal.js`, `trades/journal.css`

- Replaced slide-in side drawer with inline `#pbf-day-detail` block rendered below the calendar on day click
- `SESSION_DATA` constant — per-date verse, firm badges, and recommended tutorial links
- `buildInlineEquityChart()` — mini Chart.js line chart for the clicked day's trade sequence
- `saveDayNote()` helper for localStorage note persistence
- `openPanel()` and `closePanel()` fully replaced; old `#day-panel` / `#dp-overlay` elements left in place but unused
- Gold highlight (`.pbf-selected`) applied to clicked calendar cell
- All CSS appended to `journal.css`; no existing rules modified
