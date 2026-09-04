# Focus Log Module — Design

**Date:** 2026-07-06
**Status:** Approved by Mihir (DB: RTDB node, not Firestore; build now, deploy on request)

## Purpose

Fast capture of focus blocks ("what I worked on, when") plus stats that answer
"when am I most focused and on what". Self-contained module; nothing else in
the dashboard is touched or restyled. Mobile-first (works in phone browsers;
no Capacitor exists in this project).

## 1. Data — RTDB node `focusLogs/{pushId}`

Follows the app's existing pattern: global node, auth-gated, live `onValue`
subscription in `DataContext`. Fields:

| Field | Type | Rule |
|---|---|---|
| `startTime` | `'YYYY-MM-DDTHH:mm'` | required; capture bar prefills now; editable (datetime-local input) |
| `endTime` | `'YYYY-MM-DDTHH:mm'` or `''` | optional |
| `durationMin` | number or `null` | computed on save: `round((end − start) / 60000)`; `null` without endTime; negative → treat as invalid, block save |
| `activity` | string | required, free text, stored exactly as typed |
| `category` | string | required, one of `FOCUS_CATEGORIES` |
| `client` | string | optional; auto-suggested from activity (see §2), user-clearable |
| `done` | boolean | default `false`; toggled from the list |
| `createdAt` | ms epoch | `Date.now()` (app convention) |

`FOCUS_CATEGORIES` in `src/constants/index.js` (edit there):
`Broking – Submission, Broking – Approval/Bank, Broking – Settlement,
Broking – Client Contact, Compliance, Marketing/Content, Side Project, Admin, Other`.

DataContext additions: `focusLogs` state + listener (TOTAL 10→11),
`addFocusLog`, `updateFocusLog`, `deleteFocusLog`. Note for Firebase console
(manual, outside this repo): add `"focusLogs": { ".indexOn": "startTime" }`
to RTDB rules.

## 2. Capture UI — Log tab (speed first)

Route `/focus` → `FocusLogLayout` (same sub-nav pattern as MortgageLayout)
with tabs **Log** (`/focus/log`) and **Stats** (`/focus/stats`).

Capture bar (sticky top of Log tab):
- **Start** `datetime-local`, prefilled with now, refreshed after each save.
- **End** `datetime-local`, optional; when both set, computed duration shows
  inline (`1h 25m`); end before start shows the duration in red and blocks save.
- **Activity** text input — Enter saves (when activity + category valid),
  clears activity/end/client, resets start to now, keeps focus in activity.
- **Category** dropdown + one-tap chips for all 9 categories (chip = select +
  visual active state). Last-used category stays selected for the next entry.
- **Client auto-suggest**: leading text before the first ` - ` / ` – ` in the
  activity (`/^([^-–]{1,30}?)\s*[-–]\s+/`, trimmed) appears as a dismissible
  chip ("Client: Zack ×"). If not dismissed, it saves to `client`. Activity
  text is stored in full either way.

List below the bar: entries grouped by calendar day of `startTime`, newest
day first, entries within a day newest first. Date header (`Monday, Jul 6`),
rows show `HH:mm–HH:mm` (or just start), activity, small category tag, client
tag when present, duration when present. Circle checkbox toggles `done`
(strikethrough when true). Row actions: inline edit (row expands to the same
fields as the capture bar; Save/Cancel) and delete (ConfirmDialog). Toast on
every write failure (app pattern).

## 3. Stats tab

Period toggle: **30 days** (rolling, today−29…today) · **Week** (current,
Mon-start) · **Month** · **Quarter** · **Year** (current calendar periods).
All computed client-side from the already-subscribed `focusLogs` (filter by
`startTime` within range).

Timed/untimed rule (applies to every chart): if the period contains ≥1 entry
with `durationMin`, charts are **minutes-based** and untimed entries are
excluded, with a caption "excludes N untimed entries"; if the period has zero
timed entries, charts fall back to **entry counts** and say so.

1. **Focus-by-hour heatmap** — 24-cell strip (00–23), cell intensity =
   minutes (or counts) for entries *starting* that hour; scale relative to
   the period max; hour labels every 6h; tap/hover shows exact value.
2. **Peak-window callout** — from the max heatmap cell + its dominant
   category: "Most focused: 2–3pm, mostly Broking – Submission." Empty
   period → "No entries in this period yet."
3. **Category breakdown** — recharts donut, share per category, legend with
   values; colours from a fixed 9-colour map derived from the app's chart
   palette (Performance.jsx colours + goal colours), stable per category.
4. **Volume trend** — recharts bar chart: per-day for 30d/week/month,
   per-week for quarter, per-month for year; y = hours (or entries).
5. **Top clients** — top 5 client strings (case-insensitive grouping,
   original casing displayed) by minutes (or count); entries without client
   excluded; horizontal bar list like the Performance lender chart.

## 4. Navigation & files

- Sidebar: new "Focus" section label + "Focus Log" item (Timer icon) above
  Mortgage CRM; mobile More sheet gains "Focus Log".
- Routes in `App.jsx`: `/focus` → layout, index → `/focus/log`.
- New files: `src/pages/focuslog/FocusLogLayout.jsx`, `LogPage.jsx`,
  `StatsPage.jsx`, `src/utils/focusLog.js` (duration, client-parse, grouping,
  period ranges, all stat computations — pure functions, node-testable).
- CSS appended to `index.css` under a `/* Focus Log */` banner; existing
  tokens/classes only, mobile breakpoints for the capture bar (fields wrap).

## 5. Error handling & verification

- Writes: try/catch + toast (app pattern). Invalid duration blocks save.
- Pure stat/parse functions sanity-checked with node (same as parseCrmTask).
- Browser verification against live data via logged-in session: capture an
  entry with tokens/end-time, check list grouping, edit it, toggle done,
  check Stats renders across all periods, delete the test entry (no residue).
- Build + lint clean (no new errors). **No deploy until Mihir asks.**

## Out of scope

- Firestore, per-user data subtrees, Capacitor packaging, reminders/alerts,
  dashboard-page widgets for focus stats, editing category list via UI.
