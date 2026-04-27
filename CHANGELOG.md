# Profit by Faith — Site Changelog

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
