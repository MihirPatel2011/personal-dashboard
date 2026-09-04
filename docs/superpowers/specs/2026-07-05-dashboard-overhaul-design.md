# Personal Dashboard Overhaul — Design

**Date:** 2026-07-05
**Status:** Approved by Mihir (layout: action-first; data: keep in Firebase; check-in: AM/PM)

## Purpose

Refocus the Apex dashboard on Mihir's actual workflow: capture work/side-hustle
information, goals, notes and the Mortgage CRM in one place, and make "what needs
to happen next" visible at a glance. Task management, habits and focus timing move
off-app (Reminders + pen & paper), so those modules are removed.

## 1. Removals (UI only — Firebase data is NOT deleted)

Remove these sections completely: routes, sidebar + mobile-nav entries, pages,
components, utils, and DataContext subscriptions/CRUD.

| Section | Routes | Files to delete |
|---|---|---|
| Habits | `/habits` | `pages/Habits.jsx`, `components/habits/HabitsWidget.jsx`, `utils/habitStats.js` |
| Focus (Tasks/Timer/Stats) | `/focus/*` | `pages/focus/*` (4 files), `components/focus/GlobalQuickAdd.jsx`, `utils/focusStats.js`, `utils/parseTask.js` |
| Bullet Journal | `/journal/*` | `pages/bujo/*` (7 files), `components/bujo/*` (7 files), `utils/bujo.js` |

Details:

- `DataContext`: remove `focusAreas`, `focusProjects`, `focusTasks`, `focusSessions`,
  `bujoEntries`, `bujoCollections`, `bujoWeeklyGoals` state, listeners and CRUD.
  Remove the one-time `journalSpreads` cleanup line (no more destructive calls).
  Habits page manages its own subscription — deleting the page is sufficient.
  Add a `checkins` subscription (see §3).
- `Sidebar`: remove Wellness/Focus/Journal entries. Resulting nav:
  **Dashboard · Goals · Notes & Ideas · Mortgage CRM (Pipeline, Clients,
  Follow-ups, Tasks, Notes, Performance, Settings)**. Tasks link is new (page
  existed but was unreachable except via dashboard).
- `MobileNav`: tabs become **Home · Goals · Mortgage · More** (More sheet: Notes &
  Ideas, theme toggle, sign out).
- Remove the floating global quick-add (it created focus tasks).
- Prune now-unused CSS in `index.css` and unused constants (`PRIORITY_MAP` etc.
  where only focus used them).
- Firebase nodes (`habits`, `focusTasks`, …) remain untouched for reversibility.

## 2. Main Dashboard — action-first layout

Top to bottom:

1. **Header row**: greeting + date (as now) with the **AM/PM check-in** control
   inline on the right.
2. **Today action list** (centrepiece): merged list of
   - CRM tasks that are overdue or due today (not Done/Cancelled), and
   - follow-ups where `actionNeeded()` is true (waiting on me + due/undated),
   sorted overdue-first then by due date. Each row: type chip (Task/Follow-up),
   title/client, due label, one-click complete (task → Done; follow-up → opens
   Follow-ups page), and click-through to the relevant page.
   Empty state: "Nothing due — you're clear."
3. **KPI row** (4 cards, clickable): Goals on track · Pipeline value ·
   Follow-ups needing action · Overdue CRM tasks.
4. **Three columns**: Goals (pace bars, as now) · Pipeline snapshot (recent
   loans + stage badges) · Recent Notes & Ideas (personal notes, newest first,
   with a quick "New note" button navigating to `/notes`).

## 3. Daily AM/PM check-in

Tracks whether Mihir actually did his morning and evening dashboard reviews.

- **Data**: RTDB node `checkins/{YYYY-MM-DD}` = `{ am: timestamp|null, pm: timestamp|null }`.
  DataContext exposes `checkins` (object keyed by date) and `setCheckin(dateKey, part)`
  (tap again to un-set, for mis-taps).
- **UI** (dashboard header): two pill buttons — ☀️ Morning, 🌙 Evening — filled
  when done today. Below/beside: last-7-days dot strip (full dot = both, half =
  one, empty = none) and current streak count (consecutive days with both).
- No reminders/notifications — the Reminders app owns alerting.

## 4. Goals — thousand separators + polish

- New shared component `components/common/NumberInput.jsx`: text input that
  formats with `en-AU` thousand separators live as you type (`250000` →
  `250,000`), strips commas on parse, supports optional `$` prefix styling,
  emits numeric value. Keyboard: digits, commas ignored on input, caret kept
  stable.
- Replace plain `<input type="number">` in: GoalModal annual target, LogModal
  amount, SubGoalEditModal target, SubGoalLogModal amount, sub-goal quick-add
  target field.
- Display stragglers fixed to use `formatNumber`/`formatCurrency`: sub-goal
  stepper `{displayAmt}/{sg.target}`, quick-add chips (`+10,000` not `+10000`),
  sub-goal entry `+{e.amt}`, and any other raw number renders found in Goals.
- Same `NumberInput` applied to CRM loan value inputs (Pipeline/Clients loan
  forms) — same class of number.
- No changes to goals data model or period logic.

## 5. Notes & Ideas

Kept structurally as-is (rich text, note/idea/area types, search, sort, export).
Only change: surfaced on the dashboard (§2.4).

## 6. Mortgage CRM — audit & fix (no new features)

- Add missing **Tasks** sidebar entry.
- With the dev server running, exercise every page — Pipeline, Clients,
  Follow-ups, Notes, Tasks, Performance, Settings, and Loan Compliance —
  through their CRUD flows; fix bugs, console errors, and rough edges found.
- Verify cross-cutting consistency: sidebar badge counts vs page counts,
  client↔loan/note/task/followup id back-references on delete, stage colours,
  and that Performance numbers reconcile with pipeline data.
- Fix list is emergent: anything found is fixed as part of this workstream and
  noted in the final report.

## Error handling & testing

- All Firebase writes keep the existing pattern: `try/catch` + toast on failure.
- No test framework exists in the repo; verification is manual via the Vite dev
  server and preview tools (console clean, flows exercised end-to-end), plus
  `npm run build` and lint passing.

## Out of scope

- Deleting any Firebase data; migrations.
- New CRM features (Today view page, stale-client alerts) — dashboard Today
  list covers triage.
- Reminders-app or calendar integration.
