# Profit by Faith — Site Changelog

---

## [2026-04-29] feat: rewrite Signal Consistency to use localStorage signal log

**Files changed:** `trades/index.html`

- Signal Consistency section now builds its own trade log from live NT8 signal polling instead of reading from `/api/journal`
- Uses the **same localStorage key format** as `PBFOverlay.html` — `pbf_trade_log_YYYY-MM-DD` — so data is stored consistently across both tools
- `pbfwTrackTransition(d)` detects `opp_state` changes: `ACTIVE` → appends a new log entry (time, dir, strategy, entry, stop, target, confluence score, result `--`); `HIT` → marks last unscored row `W`; `STOPPED` → marks it `L`
- Stat cards updated to show signal-appropriate metrics: Total Signals / Win Rate (arc gauge) / Decisive Trades (W·L·BE) / Win/Loss ratio
- Stat card labels updated dynamically from JS to match the signal data context
- Log table columns: time · dir · strategy · entry · stop · target · result — grouped by session date
- Each row is clickable to expand a drill-down drawer: date, time, direction, strategy, entry, stop, target, confluence score, result
- If `data.tally` is present in the NT8 signal JSON, stat cards use those live counters; otherwise computed from localStorage
- Empty state shows a helpful message explaining how to start logging
- `renderAnalyzerSection()` called on page load (renders empty state or stored sessions) and after every new signal/result is written

---

## [2026-04-29] feat: add Signal Consistency stat cards and trade log to analyzer section

**Files changed:** `trades/index.html`, `trades/journal.js`

- Added `Signal Consistency` sub-section inside `#pbf-analyzer-widget-section`, below the two-column widget layout
- 4 stat cards (Net P&L, Trade Win %, Day Win %, Avg Win/Avg Loss) populated from all-time `journalData`
- Expandable trade log table matching the Live Session Recap style — rows grouped by session date, click to drill down
- `renderAnalyzerSection()` hooked into `journal.js` `renderAll()` so it populates after journal data loads
- Added `.pbfw-consistency` CSS class for the sub-section separator

---

## [2026-04-29] fix: spacing between stat cards and cal-nav; bust journal cache

**Files changed:** `trades/index.html`

- Added `margin-bottom: 1.5rem` to `.stat-cards` — stat cards were touching the calendar navigation arrows and month title with no gap
- Added `margin-top: 0.5rem` to `.cal-nav` for additional breathing room
- Bumped `journal.js?v=9` → `?v=10` and `journal.css?v=9` → `?v=10` to force browsers to load updated files (old cached version lacked the `renderAnalyzerSection` hook in `renderAll()`)

---

## [2026-04-29] refactor: move This Month stat cards under Monthly Detail heading

**Files changed:** `trades/index.html`

- Removed the standalone `<!-- STAT CARDS — This Month -->` block (previously between Live Session Recap and the Analyzer Widget)
- Re-inserted the 4 stat cards directly inside the Monthly Detail section, between the `.section-hdr` and `.cal-nav` — they now appear immediately below the "Monthly Detail" heading and the month-level chip stats
- Added CSS overrides: `.sc-label` 0.7rem → 0.85rem, `.sc-sub` 0.72rem → 0.82rem, `.sc-gauge-val` 1.5rem → 1.8rem to match page font sizing

---

## [2026-04-29] feat: add PBF Trade Analyzer sections to homepage and trades page

**Files changed:** `index.html`, `trades/index.html`

- **Homepage (`index.html`):** Added `<section id="pbf-analyzer-hero">` below the existing hero section — blurred teaser card with "See It Live" overlay; unblurs and polls live signal when YouTube stream is detected or `?pbf_live=1` param is set; ET clock + market state pill; verse rotation; YouTube live detection via allorigins proxy every 90s; `YOUTUBE_CHANNEL_ID` set to `UCCRTRjVQmrCqBcrM8VED-wg`
- **Trades page (`trades/index.html`):** Added `<section id="pbf-analyzer-widget-section">` above Monthly Detail — full analyzer card (price, signal, score, levels, reference grid, analysis, conflict banner, verse); right column info panels (How It Works, Score Key, Prop Firm Accounts, Watch It Live CTA); always-visible, not gated by live stream; polls `localhost:8080/signal` every 2s

---

## [2026-04-27] refactor: move This Month stat cards above Monthly Detail calendar

**Files changed:** `trades/index.html`

- Swapped "This Month" stat cards and Monthly Detail calendar blocks
- New order: Live Session Recap → This Month stat cards → Monthly Calendar → Performance → Yearly Calendar → Overview → Statistics
- HTML blocks only, no IDs/classes/content changed

---

## [2026-04-27] refactor: move Overview directly under Yearly Calendar

**Files changed:** `trades/index.html`

- Swapped Global Overview and Statistics blocks — Overview now sits immediately after Yearly Calendar since clicking a year/month in the table filters the Overview cards
- Final order: Yearly Calendar → Overview → Statistics
- HTML blocks only, no IDs/classes/content changed

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
