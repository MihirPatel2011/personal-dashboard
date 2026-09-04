# CRM Task Quick-Add — Design

**Date:** 2026-07-06
**Status:** Approved by Mihir (placement: Tasks page + Dashboard Today; input style: smart tokens)

## Purpose

Adding a CRM task currently requires opening a 7-field modal. Mihir captures
tasks constantly during morning/evening reviews, so capture must be one line +
Enter. The full modal remains for detailed edits.

## 1. Parser — `src/utils/parseCrmTask.js`

Pure function, no React:

```
parseCrmTask(input, clients) -> { title, clientId, priority, dueDate, matchedClient }
```

Token rules (all case-insensitive, tokens removed from the title once consumed):

- **Client `@token`** — the word after `@`. Match against `clients[].name`:
  a client matches when any word of its name starts with the token. Ties go to
  the alphabetically first client name. On match: `clientId` set,
  `matchedClient` = client name (for the preview chip). No match: token stays
  in the title verbatim (nothing silently lost), `clientId` = ''.
- **Priority `!token`** — `!urgent`→Urgent, `!high`→High, `!med`/`!medium`→Medium,
  `!low`→Low. Unknown `!x` stays in the title. Default priority: Medium.
- **Due date** — first occurrence of: `today`; `tomorrow`/`tmrw`/`tom`;
  weekday name (`mon`…`sunday`, full or 3-letter) → next occurrence, where
  today's own weekday means today; `D/M` or `D/M/YYYY` (e.g. `15/8`) → that
  date, current year, rolled to next year if already past. Produces
  `YYYY-MM-DD`. Date words only consume standalone words (word boundaries), so
  "call about Monday's settlement" is not parsed — but bare `monday` is.
  Default: no due date.
- **Title** — whatever remains, whitespace-collapsed. Empty title ⇒ not submittable.

Created task shape (matches existing `addCrmTask` usage):
`{ title, clientId, type: '', priority, status: 'To Do', dueDate, notes: '' }`.

## 2. Quick-add bar — `src/components/mortgage/QuickAddTask.jsx`

- Props: `{ defaultDueToday?: boolean, autoFocus?: boolean }`. Reads
  `clients`/`addCrmTask` from `useData()` itself so mounting is one line.
- Single text input, placeholder:
  `Add task… e.g. Chase payslips @jane !high tomorrow`.
- Live preview chips under the input while typing (only for what's parsed):
  client name chip, priority chip (existing badge colours), due-date chip.
  Unmatched `@token` shows a muted "no client match" chip.
- **Enter** → validate title non-empty → `addCrmTask(parsed)` with existing
  try/catch + toast pattern → clear input, keep focus. **Esc** → clear.
- `defaultDueToday`: when no date token was typed, `dueDate` = today. Used on
  the dashboard so captured tasks land in the Today list immediately; the
  preview shows the implied "Today" chip so it's never a surprise.

## 3. Placement

1. **CRM Tasks page** (`src/pages/mortgage/CRMTasks.jsx`): bar renders above
   the task list, full-width, `defaultDueToday` off.
2. **Dashboard Today card** (`src/pages/Dashboard.jsx`): same bar at the
   bottom of the Today section, `defaultDueToday` on.

## 4. Error handling & verification

- Firebase failures: existing toast pattern.
- No test framework: verify via dev preview against live data — parse preview
  chips for `@`/`!`/date tokens, then a full round trip (create one clearly
  named test task, confirm it appears in the Tasks list, Today list and badge
  counts, delete it). `npm run build` + lint must pass.
- Deploy: commit to main, push, `npm run deploy`.

## Out of scope

- Editing via tokens, recurring tasks, task types in quick-add, global hotkey.
